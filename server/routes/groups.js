import express from "express";
import { ObjectId } from "mongodb";
import RepoMongodb from "../databaseConnections/MongoDB/mongodb_connection.js";
import s3 from "../databaseConnections/AWS/s3_connection.js";
import { generateEmbedding } from "../controller/embeddingService.js";
import {
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import pool from "../data/database.js"; // PostgreSQL connection for users_info
import { transporter } from "../config/mailer.js"; // Email transporter
import bcrypt from "bcrypt";
import { generatePassword } from "../utils/passwordGenerator.js";

const router = express.Router();
const groupsCollection = RepoMongodb.collection("groups");
const blocksCollection = RepoMongodb.collection("blocks"); // For dynamic panelist count
const programsCollection = RepoMongodb.collection("programs");
const recordsCollection = RepoMongodb.collection("records");


// -------- Helper: Move file between S3 buckets --------
async function moveFileBetweenBuckets(sourceBucket, destBucket, sourceKey, destKey) {
  // Copy file
  await s3.send(
    new CopyObjectCommand({
      CopySource: `${sourceBucket}/${sourceKey}`,
      Bucket: destBucket,
      Key: destKey,
    })
  );

  // Delete original
  await s3.send(
    new DeleteObjectCommand({
      Bucket: sourceBucket,
      Key: sourceKey,
    })
  );
}

// -------- Helper: Generate Document ID --------
async function generateDocumentId(program_id) {
  const year = new Date().getFullYear();
  const counterId = `${year}-${program_id}`; // ensures reset each year

  const result = await RepoMongodb.collection("counters").findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" } // or returnOriginal: false in v3
  );

  let counterDoc = result.value;
  
  // Fallback: fetch manually if not returned
  if (!counterDoc) {
    counterDoc = await RepoMongodb.collection("counters").findOne({ _id: counterId });
  }

  if (!counterDoc) {
    throw new Error(`Failed to fetch counter for ${counterId}`);
  }

  const nextNumber = counterDoc.seq.toString().padStart(4, "0");
  return `${year}-${program_id}-${nextNumber}`;
}





// Helper: Deep merge objects
function deepMerge(target, source) {
  for (const key in source) {
    if (Array.isArray(source[key])) {
      if (key === "members") {
        target[key] = [...source[key]];
      } else if (key === "s3_key") {
        target[key] = [...(target[key] || []), ...source[key]];
      } else {
        target[key] = [...source[key]];
      }
    } else if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      target[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// Helper: Update group progress based on milestone completion
async function updateGroupProgress(groupId) {
  try {
    const group = await groupsCollection.findOne({ group_id: groupId });
    if (!group) return;

    let newProgress = group.progress;

    // Check if any milestone has been started (has files or approvals)
    const hasStartedWork = group.milestones.some(m => 
      m.status === true || 
      m.approved_by?.length > 0 || 
      m.verified?.faculty_in_charge?.approved === true ||
      m.verified?.chairperson?.some?.(c => c.approved === true)
    );

    // Get block once for panelist count (used in upload_manuscript verification)
    const block = await blocksCollection.findOne({ block_id: group.block_id });
    const requiredPanelistCount = block?.panelists?.length || 0;

    // Check if all milestones are fully completed AND approved by chairperson AND dean
    const allMilestonesComplete = group.milestones.every(m => {
      const hasFiles = m.s3_key && m.s3_key.length > 0;
      const hasStatus = m.status === true;
      
      let hasVerification = false;
      if (m.type === "upload_manuscript") {
        // Needs all panelist approvals AND faculty approval
        hasVerification = m.approved_by?.length >= requiredPanelistCount && 
                          m.verified?.faculty_in_charge?.approved === true;
      } else if (m.type === "describe_work") {
        // describe_work doesn't need files, just status
        return hasStatus;
      } else {
        // Other milestones need files and status
        return hasFiles && hasStatus;
      }
      
      return hasFiles && hasStatus && hasVerification;
    }) && 
    group.chairperson_approval?.approved === true &&
    group.dean_approval?.approved === true;

    if (allMilestonesComplete) {
      newProgress = "completed";
    } else if (hasStartedWork && group.progress === "not_started") {
      newProgress = "ongoing";
    }

    // Update progress if it changed
    if (newProgress !== group.progress) {
      await groupsCollection.updateOne(
        { group_id: groupId },
        { 
          $set: { 
            progress: newProgress,
            updated_at: new Date()
          }
        }
      );
    }
  } catch (err) {
    console.error("Error updating group progress:", err);
  }
}

// Route: Get all groups (limit 50 for safety) or filter by block_id
router.get("/", async (req, res) => {
  try {
    const { block_id } = req.query;
    
    let query = {};
    if (block_id) {
      query = { block_id: block_id };
      console.log(`📚 Fetching groups for block: ${block_id}`);
    }
    
    const results = await groupsCollection.find(query).limit(50).toArray();
    console.log(`✅ Found ${results.length} groups`);
    
    res.status(200).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching groups" });
  }
});

// Route: Get groups by Faculty-in-Charge email
router.get("/by-fic/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const { program_id } = req.query;

    if (!email) {
      return res.status(400).json({ error: "Email parameter is required" });
    }

    console.log(`📚 Fetching FIC groups for: ${email}, program: ${program_id || 'all'}`);

    // Find blocks where faculty is FIC
    const blockQuery = { faculty_in_charge_email: email };
    if (program_id) {
      blockQuery.program_id = program_id;
    }

    const blocks = await blocksCollection.find(blockQuery).toArray();
    const blockIds = blocks.map(b => b.block_id);

    console.log(`✅ Found ${blocks.length} blocks:`, blockIds);

    if (blockIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Find all groups in these blocks
    const groups = await groupsCollection.find({ 
      block_id: { $in: blockIds } 
    }).toArray();

    console.log(`✅ Found ${groups.length} groups for FIC`);

    // Enrich groups with block info and calculate forApproval
    const enrichedGroups = groups.map(group => {
      const block = blocks.find(b => b.block_id === group.block_id);
      
      // Calculate forApproval count for FIC
      // FIC needs to approve upload_manuscript after all panelists
      const uploadManuscript = group.milestones?.find(m => m.type === "upload_manuscript");
      const requiredPanelistCount = block?.panelists?.length || 3;
      
      let forApproval = 0;
      if (uploadManuscript) {
        const panelistsApproved = uploadManuscript.approved_by?.length || 0;
        const facultyApproved = uploadManuscript.verified?.faculty_in_charge?.approved || false;
        
        // If all panelists approved but faculty hasn't
        if (panelistsApproved >= requiredPanelistCount && !facultyApproved) {
          forApproval = 1;
        }
      }

      return {
        ...group,
        block_code: block?.block_code,
        academic_year: block?.academic_year,
        forApproval
      };
    });

    res.json({ success: true, data: enrichedGroups });
  } catch (err) {
    console.error("❌ Error fetching FIC groups:", err);
    res.status(500).json({ error: "Error fetching groups" });
  }
});

// Route: Get groups by Chairperson email (for Stage 6 approval)
router.get("/by-chairperson/:email", async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ error: "Email parameter is required" });
    }

    console.log(`📋 Fetching chairperson groups for: ${email}`);

    // Step 1: Get chairperson's program_id from programs collection
    const program = await programsCollection.findOne({ chairperson_email: email });
    
    if (!program) {
      console.log(`⚠️ No program found where ${email} is chairperson`);
      return res.json({ success: true, data: [] });
    }

    console.log(`✅ Chairperson manages program: ${program.program_id}`);

    // Step 2: Get all blocks in that program
    const blocks = await blocksCollection.find({ 
      program_id: program.program_id 
    }).toArray();
    
    const blockIds = blocks.map(b => b.block_id);
    console.log(`✅ Found ${blocks.length} blocks in program`);

    if (blockIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Step 3: Get all groups in those blocks
    const groups = await groupsCollection.find({ 
      block_id: { $in: blockIds } 
    }).toArray();

    console.log(`✅ Found ${groups.length} total groups in program`);

    // Step 4: Filter groups where milestones 2-5 are complete (need chairperson approval)
    const pendingGroups = groups.filter(g => {
      const m1 = g.milestones?.find(m => m.type === 'upload_manuscript');
      const m2 = g.milestones?.find(m => m.type === 'complete_copyright');
      const m3 = g.milestones?.find(m => m.type === 'pass_turnitin');
      const m4 = g.milestones?.find(m => m.type === 'upload_all_docs');
      const m5 = g.milestones?.find(m => m.type === 'describe_work');
      
      // Must have: FIC approved manuscript + all other milestones completed
      const manuscriptApproved = m1?.verified?.faculty_in_charge?.approved === true;
      const copyrightComplete = m2?.status === true;
      const turnitinComplete = m3?.status === true;
      const allDocsComplete = m4?.status === true;
      const workDescribed = m5?.status === true;
      
      // Check group-level chairperson approval (not milestone-level)
      const notApprovedByChairperson = g.chairperson_approval?.approved !== true;
      
      return manuscriptApproved && copyrightComplete && turnitinComplete && 
             allDocsComplete && workDescribed && notApprovedByChairperson;
    });

    console.log(`📊 ${pendingGroups.length} groups pending chairperson approval`);

    // Enrich groups with block info and forApproval count
    const enrichedGroups = pendingGroups.map(group => {
      const block = blocks.find(b => b.block_id === group.block_id);
      
      return {
        ...group,
        block_code: block?.block_code,
        academic_year: block?.academic_year,
        forApproval: 1 // All groups in this list need approval
      };
    });

    res.json({ success: true, data: enrichedGroups });
  } catch (err) {
    console.error("❌ Error fetching chairperson groups:", err);
    res.status(500).json({ error: "Error fetching groups" });
  }
});

// Route: Get groups by Panelist email
router.get("/by-panelist/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const { program_id } = req.query;

    if (!email) {
      return res.status(400).json({ error: "Email parameter is required" });
    }

    console.log(`👥 Fetching panelist groups for: ${email}, program: ${program_id || 'all'}`);

    // Find blocks where faculty is a panelist
    const blockQuery = { panelists_email: email };
    if (program_id) {
      blockQuery.program_id = program_id;
    }

    const blocks = await blocksCollection.find(blockQuery).toArray();
    const blockIds = blocks.map(b => b.block_id);

    console.log(`✅ Found ${blocks.length} blocks:`, blockIds);

    if (blockIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Find all groups in these blocks
    const groups = await groupsCollection.find({ 
      block_id: { $in: blockIds } 
    }).toArray();

    console.log(`✅ Found ${groups.length} groups for panelist`);

    // Enrich groups with block info and calculate forApproval
    const enrichedGroups = groups.map(group => {
      const block = blocks.find(b => b.block_id === group.block_id);
      
      // Calculate forApproval count for panelist
      // Panelist needs to approve upload_manuscript if they haven't yet
      const uploadManuscript = group.milestones?.find(m => m.type === "upload_manuscript");
      
      let forApproval = 0;
      if (uploadManuscript) {
        const hasApproved = uploadManuscript.approved_by?.some(
          approval => approval.panelist_id === email || approval.name?.includes(email)
        );
        
        // If manuscript has files and panelist hasn't approved yet
        if (uploadManuscript.s3_key?.length > 0 && !hasApproved) {
          forApproval = 1;
        }
      }

      return {
        ...group,
        block_code: block?.block_code,
        academic_year: block?.academic_year,
        forApproval
      };
    });

    res.json({ success: true, data: enrichedGroups });
  } catch (err) {
    console.error("❌ Error fetching panelist groups:", err);
    res.status(500).json({ error: "Error fetching groups" });
  }
});

// Route: Get groups by Dean email (for final Stage 6 approval & archiving)
router.get("/by-dean/:email", async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ error: "Email parameter is required" });
    }

    console.log(`👨‍💼 Fetching dean groups for: ${email}`);

    // Step 1: Get dean's department_id from users_info (where department_head matches)
    const deanResult = await pool.query(
      'SELECT department_head FROM users_info WHERE email = $1',
      [email]
    );

    if (deanResult.rows.length === 0 || !deanResult.rows[0].department_head) {
      console.log(`⚠️ No department found for dean: ${email}`);
      return res.json({ success: true, data: [] });
    }

    const departmentId = deanResult.rows[0].department_head;
    console.log(`✅ Dean manages department: ${departmentId}`);

    // Step 2: Get all programs in that department
    const programs = await programsCollection.find({ 
      department_id: departmentId 
    }).toArray();
    
    const programIds = programs.map(p => p.program_id);
    console.log(`✅ Found ${programs.length} programs in department`);

    if (programIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Step 3: Get all blocks in those programs
    const blocks = await blocksCollection.find({ 
      program_id: { $in: programIds } 
    }).toArray();
    
    const blockIds = blocks.map(b => b.block_id);
    console.log(`✅ Found ${blocks.length} blocks in programs`);

    if (blockIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Step 4: Get all groups in those blocks
    const groups = await groupsCollection.find({ 
      block_id: { $in: blockIds } 
    }).toArray();

    console.log(`✅ Found ${groups.length} total groups in department`);

    // Step 5: Filter groups where chairperson approved all milestones (ready for dean approval)
    const pendingGroups = groups.filter(g => {
      const m1 = g.milestones?.find(m => m.type === 'upload_manuscript');
      const m2 = g.milestones?.find(m => m.type === 'complete_copyright');
      const m3 = g.milestones?.find(m => m.type === 'pass_turnitin');
      const m4 = g.milestones?.find(m => m.type === 'upload_all_docs');
      const m5 = g.milestones?.find(m => m.type === 'describe_work');
      
      // Must have: FIC approved manuscript + all milestones complete + chairperson approved all
      const manuscriptApproved = m1?.verified?.faculty_in_charge?.approved === true;
      const copyrightComplete = m2?.status === true;
      const turnitinComplete = m3?.status === true;
      const allDocsComplete = m4?.status === true;
      const workDescribed = m5?.status === true;
      
      // Check group-level chairperson approval (not milestone-level)
      const chairpersonApproved = g.chairperson_approval?.approved === true;
      
      // Not yet approved by dean
      const notApprovedByDean = g.dean_approval?.approved !== true;
      
      return manuscriptApproved && copyrightComplete && turnitinComplete && 
             allDocsComplete && workDescribed && chairpersonApproved && notApprovedByDean;
    });

    console.log(`📊 ${pendingGroups.length} groups pending dean approval`);

    // Enrich groups with block info and forApproval count
    const enrichedGroups = pendingGroups.map(group => {
      const block = blocks.find(b => b.block_id === group.block_id);
      const program = programs.find(p => p.program_id === block?.program_id);
      
      return {
        ...group,
        block_code: block?.block_code,
        academic_year: block?.academic_year,
        program_name: program?.program_name,
        department_name: program?.department_name,
        forApproval: 1 // All groups in this list need approval
      };
    });

    res.json({ success: true, data: enrichedGroups });
  } catch (err) {
    console.error("❌ Error fetching dean groups:", err);
    res.status(500).json({ error: "Error fetching groups" });
  }
});

// Route: Get single group by group_id
router.get("/:group_id", async (req, res) => {
  try {
    const group = await groupsCollection.findOne({ group_id: req.params.group_id });

    if (!group) {
      return res.status(404).json({ success: false, error: "Group not found" });
    }

    // Fetch block information for additional context
    const block = await blocksCollection.findOne({ block_id: group.block_id });
    
    // Enrich group data with block information
    const enrichedGroup = {
      ...group,
      academic_year: block?.academic_year,
      block_code: block?.block_code
    };

    res.status(200).json({ success: true, data: enrichedGroup });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Error fetching group" });
  }
});

// Route: Create new group
router.post("/", async (req, res) => {
  try {
    const { block_id, title, leader, members } = req.body;

    if (!block_id || !leader?.email) {
      return res
        .status(400)
        .json({ error: "block_id and leader.email are required" });
    }

    console.log(`\n🔄 Starting group creation for block: ${block_id}`);
    console.log(`👤 Leader: ${leader.email} (${leader.firstname} ${leader.surname})`);

    // 3. Validate all members are PUP-ians (role_id = 2) and not in other groups
    const membersArray = Array.isArray(members) ? members : [];
    const memberEmails = membersArray.map(m => m.email);

    // Check for duplicate members within this group
    const uniqueEmails = new Set([leader.email, ...memberEmails]);
    if (uniqueEmails.size !== memberEmails.length + 1) {
      return res.status(400).json({ error: "Duplicate members found in group (including leader)" });
    }

    // Helper function to process a user (create if needed, validate if exists)
    const processUser = async (user, isLeader = false) => {
      const roleLabel = isLeader ? 'Leader' : 'Member';
      console.log(`\n📝 Processing ${roleLabel}: ${user.email}`);
      
      // Check if user exists
      const existingUser = await pool.query(
        'SELECT user_id, role_id, group_id, firstname, lastname, email FROM users_info WHERE email = $1',
        [user.email]
      );

      if (existingUser.rows.length > 0) {
        // User exists - validate
        const userData = existingUser.rows[0];
        console.log(`✅ User exists: ${userData.firstname} ${userData.lastname} (role_id: ${userData.role_id})`);

        // Validate they're a PUP-ian (role_id = 2) or group leader (role_id = 6)
        // Leaders can be role_id = 6 if they're switching groups or re-creating
        if (userData.role_id !== 2 && userData.role_id !== 6) {
          throw new Error(`${roleLabel} ${user.email} must be a PUP-ian (role_id = 2 or 6), but has role_id ${userData.role_id}`);
        }

        // Validate not in another group
        if (userData.group_id) {
          throw new Error(`${roleLabel} ${user.email} is already in group ${userData.group_id}`);
        }

        // If this is a leader, they should have the proper role
        if (isLeader && userData.role_id === 2) {
          console.log(`🔄 Promoting ${user.email} from PUP-ian (2) to group leader (6)`);
        }

        return {
          exists: true,
          userData,
          needsCredentialEmail: false,
          needsRoleUpdate: isLeader && userData.role_id !== 6 // Leader needs role update to 6
        };
      } else {
        // User doesn't exist - create account
        console.log(`🆕 User not found. Creating new student account for ${user.email}`);
        
        // Validate required fields for new user
        if (!user.firstname || !user.surname) {
          throw new Error(`${roleLabel} ${user.email} requires firstname and surname for account creation`);
        }

        // Generate password
        const generatedPassword = generatePassword(12);
        console.log(`🔐 Generated password for ${user.email}`);

        // Hash password
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(generatedPassword, salt);

        // Create user with appropriate role:
        // Leader: role_id = 6 (Group Leader)
        // Member: role_id = 2 (PUP-ian)
        const roleId = isLeader ? 6 : 2;
        const roleLabel = isLeader ? 'group leader' : 'PUP-ian';
        
        const newUserResult = await pool.query(
          'INSERT INTO users_info (firstname, lastname, email, password_hash, role_id) VALUES ($1, $2, $3, $4, $5) RETURNING user_id, firstname, lastname, email, role_id',
          [user.firstname, user.surname, user.email.toLowerCase(), hashedPassword, roleId]
        );

        const newUser = newUserResult.rows[0];
        console.log(`✅ Created new ${roleLabel}: ${newUser.firstname} ${newUser.lastname} (user_id: ${newUser.user_id}, role_id: ${newUser.role_id})`);

        return {
          exists: false,
          userData: newUser,
          needsCredentialEmail: true,
          generatedPassword,
          needsRoleUpdate: false // Already created with correct role
        };
      }
    };

    // 1. Process leader
    const leaderProcessed = await processUser(leader, true);
    const leaderData = leaderProcessed.userData;

    // 2. Process all members
    const membersProcessed = [];
    for (const member of membersArray) {
      const memberProcessed = await processUser(member, false);
      membersProcessed.push(memberProcessed);
    }

    // 4. Get block details for email
    const block = await blocksCollection.findOne({ block_id });
    if (!block) {
      return res.status(404).json({ error: "Block not found" });
    }

    const groupCount = await groupsCollection.countDocuments({ block_id });
    const group_id = `${block_id}_${groupCount + 1}`;

    const now = new Date();

    const newGroup = {
      _id: new ObjectId(),
      group_id,
      block_id,
      title: title || null,
      abstract: req.body.abstract || null,
      access_level: req.body.access_level || null,
      tags: [],
      leader,
      members: membersArray,
      milestones: [
        {
          type: "upload_manuscript",
          status: false,
          s3_key: [],
          approved_by: [],
          verified: {
            faculty_in_charge: { approved: false, approved_at: null },
          },
          created_at: now,
          updated_at: now,
        },
        {
          type: "complete_copyright",
          status: false,
          s3_key: [],
          verified: {  chairperson: [] },
          created_at: now,
          updated_at: now,
        },
        {
          type: "pass_turnitin",
          status: false,
          s3_key: [],
          verified: {  chairperson: [] },
          created_at: now,
          updated_at: now,
        },
        {
          type: "upload_all_docs",
          status: false,
          s3_key: [],
          verified: {  chairperson: [] },
          created_at: now,
          updated_at: now,
        },
        {
          type: "describe_work",
          status: false,
          verified: {  chairperson: [] },
          created_at: now,
          updated_at: now,
        },
      ],
      progress: "not_started",
      chairperson_approval: {
        approved: false,
        approved_by: null,
        approved_at: null,
        rejected: false,
        rejection_reason: null,
        rejected_milestone: null
      },
      dean_approval: {
        approved: false,
        approved_by: null,
        approved_at: null,
        rejected: false,
        rejection_reason: null,
        rejected_milestone: null
      },
      created_at: now,
      updated_at: now,
    };

    await groupsCollection.insertOne(newGroup);

    // 5. Update leader's role_id to 6 (Group Leader) and set group_id
    await pool.query(
      'UPDATE users_info SET group_id = $1, role_id = 6 WHERE email = $2',
      [group_id, leader.email]
    );
    console.log(`✅ Updated leader: ${leader.email} → group_id: ${group_id}, role_id: 6 (Group Leader)`);

    // 6. Update all members' group_id (members stay as role_id = 2 - PUP-ian)
    for (const member of membersArray) {
      await pool.query(
        'UPDATE users_info SET group_id = $1 WHERE email = $2',
        [group_id, member.email]
      );
      console.log(`✅ Updated member's group_id: ${member.email} → ${group_id} (role_id: 2 - PUP-ian)`);
    }

    // 7. Get program details for email
    const program = await programsCollection.findOne({ program_id: block.program_id });
    const programName = program?.program_name || block.program_id;

    // 8. Prepare member list for emails
    const leaderName = `${leaderData.firstname} ${leaderData.lastname}`;
    const memberList = membersProcessed.map(mp => 
      `- ${mp.userData.firstname} ${mp.userData.lastname} (${mp.userData.email})`
    ).join('\n');

    const panelistList = block.panelists?.map((name, index) => 
      `- ${name} (${block.panelists_email[index]})`
    ).join('\n') || 'To be assigned';

    // Legal/Privacy footer for all emails
    const emailFooter = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ CONFIDENTIALITY NOTICE & LEGAL DISCLAIMER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This email and any attachments are confidential and intended solely for 
the person(s) named above. This communication may contain privileged or 
confidential information.

If you are NOT the intended recipient:
• Please DO NOT read, copy, forward, or use this email
• Delete this email immediately
• Notify us at: thesiskopup@gmail.com

Unauthorized use, disclosure, or distribution of this communication is 
strictly prohibited and may be unlawful.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

© ${new Date().getFullYear()} ThesISKO - Polytechnic University of the Philippines
For support: thesiskopup@gmail.com
    `;

    // 9. Send email to leader using unified email service
    try {
      // Use unified email service
      const { sendEmail } = await import('../services/emailService.js');

      if (leaderProcessed.needsCredentialEmail) {
        // NEW USER: Send credential + group info
        await sendEmail({
          to: leader.email,
          subject: `Welcome to ThesISKO - You're the Leader of Group ${group_id}`,
          template: 'groupCreation',
          data: {
            headerIcon: '👑',
            headerTitle: `Welcome to ThesISKO!`,
            recipientName: leaderName,
            message: `Your ThesISKO account has been created and you've been assigned as a Group Leader!`,
            isLeader: true,
            hasCredentials: true,
            username: leader.email,
            password: leaderProcessed.generatedPassword,
            groupId: group_id,
            blockId: block_id,
            programName: programName,
            academicYear: block.academic_year || 'Current',
            membersLabel: 'Your Group Members',
            membersList: memberList || 'No members yet',
            facultyInfo: `${block.faculty_in_charge || 'To be assigned'} (${block.faculty_in_charge_email || ''})`,
            panelistsList: panelistList,
            loginUrl: process.env.FRONTEND_URL || 'http://localhost:4200'
          }
        });
        /* OLD EMAIL TEMPLATE - Kept for reference
        leaderEmailSubject = `Welcome to ThesISKO - You're the Leader of Group ${group_id}`;
        leaderEmailBody = `
Dear ${leaderName},

Your ThesISKO account has been created by your Faculty-in-Charge, and you've been assigned as a Group Leader!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR LOGIN CREDENTIALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: ${leader.email}
Password: ${leaderProcessed.generatedPassword}

⚠️ IMPORTANT: Please change your password after your first login.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GROUP ASSIGNMENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You have been assigned as the GROUP LEADER for:

Group ID: ${group_id}
Block: ${block_id}
Program: ${programName}
Academic Year: ${block.academic_year || 'Current'}

Your Group Members:
${memberList || 'No members yet'}

Faculty-in-Charge:
${block.faculty_in_charge || 'To be assigned'} (${block.faculty_in_charge_email || ''})

Research Panelists:
${panelistList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

As group leader, you can:
✓ Submit thesis manuscript
✓ Upload documents
✓ Track progress
✓ Manage group information

Login here: ${process.env.FRONTEND_URL || 'http://localhost:4200'}/login

Questions? Contact your Faculty-in-Charge.

Best regards,
ThesISKO System
${emailFooter}
        `; */
      } else {
        // EXISTING USER: Just group info
        await sendEmail({
          to: leader.email,
          subject: `You are now the Leader of Group ${group_id}`,
          template: 'groupCreation',
          data: {
            headerIcon: '👑',
            headerTitle: `Group Assignment`,
            recipientName: leaderName,
            message: `Congratulations! You have been assigned as the Group Leader.`,
            isLeader: true,
            hasCredentials: false,
            groupId: group_id,
            blockId: block_id,
            programName: programName,
            academicYear: block.academic_year || 'Current',
            membersLabel: 'Your Group Members',
            membersList: memberList || 'No members yet',
            facultyInfo: `${block.faculty_in_charge || 'To be assigned'} (${block.faculty_in_charge_email || ''})`,
            panelistsList: panelistList,
            loginUrl: process.env.FRONTEND_URL || 'http://localhost:4200'
          }
        });
        /* OLD EMAIL TEMPLATE - Kept for reference
        leaderEmailSubject = `You are now the Leader of Group ${group_id}`;
        leaderEmailBody = `
Dear ${leaderName},

Congratulations! You have been assigned as the Group Leader for:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Group ID: ${group_id}
Block: ${block_id}
Program: ${programName}
Academic Year: ${block.academic_year || 'Current'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

As the group leader, you can now:
✓ Submit your thesis manuscript
✓ Upload required documents  
✓ Track milestone progress
✓ Manage group information
✓ View faculty feedback

Your group members:
${memberList || 'No members yet'}

Faculty-in-Charge:
${block.faculty_in_charge || 'To be assigned'} (${block.faculty_in_charge_email || ''})

Research Panelists:
${panelistList}

Please log in to your account to get started.

If you have questions, contact your Faculty-in-Charge.

Best regards,
ThesISKO System
${emailFooter}
        `; */
      }

      console.log(`✅ Leader ${leaderProcessed.needsCredentialEmail ? 'credential + group' : 'group'} email sent to: ${leader.email}`);
    } catch (emailErr) {
      console.error('⚠️ Failed to send leader email:', emailErr);
      // Don't fail the entire operation
    }

    // 10. Send email to all members using unified email service
    for (let i = 0; i < membersArray.length; i++) {
      const member = membersArray[i];
      const memberProcessed = membersProcessed[i];
      const memberData = memberProcessed.userData;
      const memberName = `${memberData.firstname} ${memberData.lastname}`;

      try {
        // Use unified email service (already imported above)
        const { sendEmail } = await import('../services/emailService.js');

        if (memberProcessed.needsCredentialEmail) {
          // NEW USER: Send credential + group info
          await sendEmail({
            to: member.email,
            subject: `Welcome to ThesISKO - You've been added to Group ${group_id}`,
            template: 'groupCreation',
            data: {
              headerIcon: '🎓',
              headerTitle: 'Welcome to ThesISKO!',
              recipientName: memberName,
              message: `Your ThesISKO account has been created and you've been added to a thesis group!`,
              isLeader: false,
              hasCredentials: true,
              username: member.email,
              password: memberProcessed.generatedPassword,
              groupId: group_id,
              blockId: block_id,
              programName: programName,
              academicYear: block.academic_year || 'Current',
              leaderInfo: `${leaderName} (${leader.email})`,
              membersLabel: 'Your fellow group members',
              membersList: memberList,
              facultyInfo: `${block.faculty_in_charge || 'To be assigned'} (${block.faculty_in_charge_email || ''})`,
              panelistsList: panelistList,
              loginUrl: process.env.FRONTEND_URL || 'http://localhost:4200'
            }
          });
          /* OLD EMAIL TEMPLATE - Kept for reference
          memberEmailSubject = `Welcome to ThesISKO - You've been added to Group ${group_id}`;
          memberEmailBody = `
Dear ${memberName},

Your ThesISKO account has been created by your Faculty-in-Charge, and you've been added to a thesis group!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR LOGIN CREDENTIALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: ${member.email}
Password: ${memberProcessed.generatedPassword}

⚠️ IMPORTANT: Please change your password after your first login.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GROUP ASSIGNMENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You have been added to a thesis group:

Group ID: ${group_id}
Block: ${block_id}
Program: ${programName}
Academic Year: ${block.academic_year || 'Current'}

Group Leader:
${leaderName} (${leader.email})

Your fellow group members:
${memberList}

Faculty-in-Charge:
${block.faculty_in_charge || 'To be assigned'} (${block.faculty_in_charge_email || ''})

Research Panelists:
${panelistList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your group leader will coordinate thesis submissions and milestone tracking.

Login here: ${process.env.FRONTEND_URL || 'http://localhost:4200'}/login

Questions? Contact your group leader or Faculty-in-Charge.

Best regards,
ThesISKO System
${emailFooter}
          `; */
        } else {
          // EXISTING USER: Just group info
          await sendEmail({
            to: member.email,
            subject: `You have been added to Group ${group_id}`,
            template: 'groupCreation',
            data: {
              headerIcon: '🎓',
              headerTitle: 'Group Assignment',
              recipientName: memberName,
              message: `You have been added to a thesis group!`,
              isLeader: false,
              hasCredentials: false,
              groupId: group_id,
              blockId: block_id,
              programName: programName,
              academicYear: block.academic_year || 'Current',
              leaderInfo: `${leaderName} (${leader.email})`,
              membersLabel: 'Your fellow group members',
              membersList: memberList,
              facultyInfo: `${block.faculty_in_charge || 'To be assigned'} (${block.faculty_in_charge_email || ''})`,
              panelistsList: panelistList,
              loginUrl: process.env.FRONTEND_URL || 'http://localhost:4200'
            }
          });
          /* OLD EMAIL TEMPLATE - Kept for reference
          memberEmailSubject = `You have been added to Group ${group_id}`;
          memberEmailBody = `
Dear ${memberName},

You have been added to a thesis group!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Group ID: ${group_id}
Block: ${block_id}
Program: ${programName}
Academic Year: ${block.academic_year || 'Current'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Group Leader:
${leaderName} (${leader.email})

Your fellow group members:
${memberList}

Faculty-in-Charge:
${block.faculty_in_charge || 'To be assigned'} (${block.faculty_in_charge_email || ''})

Research Panelists:
${panelistList}

Your group leader will coordinate thesis submissions and milestone tracking.
Please log in to your account to view your group details.

If you have questions, contact your group leader or Faculty-in-Charge.

Best regards,
ThesISKO System
${emailFooter}
          `; */
        }

        console.log(`✅ Member ${memberProcessed.needsCredentialEmail ? 'credential + group' : 'group'} email sent to: ${member.email}`);
      } catch (emailErr) {
        console.error(`⚠️ Failed to send email to member ${member.email}:`, emailErr);
        // Don't fail the entire operation
      }
    }

    res.status(201).json({
      message: "Group created successfully",
      group: newGroup,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error creating group" });
  }
});

// Route: Update milestone files (add, remove, or replace)
router.patch("/:groupId/milestones/:milestoneType/files", async (req, res) => {
  try {
    const { groupId, milestoneType } = req.params;
    const { action, files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "files must be a non-empty array" });
    }

    // Enforce PDF only validation
    const invalid = files.filter((f) => !f.toLowerCase().endsWith(".pdf"));
    if (invalid.length > 0) {
      return res.status(400).json({ error: "Only PDF files are allowed" });
    }

    // Build the base update query
    let updateQuery;
    if (action === "add") {
      updateQuery = { $addToSet: { "milestones.$.s3_key": { $each: files } } };
    } else if (action === "remove") {
      updateQuery = { $pull: { "milestones.$.s3_key": { $in: files } } };
    } else if (action === "replace") {
      updateQuery = { $set: { "milestones.$.s3_key": files } };
    } else {
      return res
        .status(400)
        .json({ error: "Invalid action. Use add, remove, or replace." });
    }

    // Update milestone status based on file operations
    if (action === "add" && files.length > 0) {
      updateQuery.$set = {
        ...updateQuery.$set,
        "milestones.$.status": true, // Mark as complete when files are added
        "milestones.$.updated_at": new Date(),
      };
    } else if (action === "remove") {
      // Use MongoDB aggregation to check remaining files in a single operation
      const pipeline = [
        { $match: { group_id: groupId } },
        { $unwind: "$milestones" },
        { $match: { "milestones.type": milestoneType } },
        {
          $project: {
            remainingFiles: {
              $filter: {
                input: "$milestones.s3_key",
                cond: { $not: { $in: ["$$this", files] } }
              }
            }
          }
        }
      ];
      
      const result = await groupsCollection.aggregate(pipeline).toArray();
      const hasRemainingFiles = result[0]?.remainingFiles?.length > 0;
      
      updateQuery.$set = {
        ...updateQuery.$set,
        "milestones.$.status": hasRemainingFiles,
        "milestones.$.updated_at": new Date(),
      };
    } else if (action === "replace") {
      // For replace action, status depends on whether files array is empty
      updateQuery.$set = {
        ...updateQuery.$set,
        "milestones.$.status": files.length > 0,
        "milestones.$.updated_at": new Date(),
      };
    }

    // If no $set was created yet, initialize it
    if (!updateQuery.$set) {
      updateQuery.$set = {
        "milestones.$.updated_at": new Date(),
      };
    }

    // Execute the database update
    const result = await groupsCollection.updateOne(
      { group_id: groupId, "milestones.type": milestoneType },
      updateQuery
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Group or milestone not found" });
    }

    const updatedGroup = await groupsCollection.findOne({ group_id: groupId });

    // Update group progress asynchronously (fire and forget)
    updateGroupProgress(groupId).catch(err => 
      console.error(`Background progress update failed for group ${groupId}:`, err)
    );

    res.json({
      message: `Files ${action}d successfully for ${milestoneType}`,
      group: updatedGroup,
    });
  } catch (err) {
    console.error("Error updating milestone files:", err);
    res.status(500).json({ error: "Error updating milestone files" });
  }
});

// Route: Faculty rejection for upload_manuscript milestone
router.patch("/:groupId/milestones/upload_manuscript/faculty-reject", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, reason } = req.body;

    if (!name || !reason) {
      return res.status(400).json({ error: "name and reason are required" });
    }

    // Set rejection status and clear faculty approval (but preserve panelist approvals)
    const updateResult = await groupsCollection.updateOne(
      { group_id: groupId, "milestones.type": "upload_manuscript" },
      {
        $set: {
          "milestones.$.status": false, // Mark as incomplete so group can resubmit
          "milestones.$.verified.faculty_in_charge.approved": false,
          "milestones.$.verified.faculty_in_charge.rejected": true,
          "milestones.$.verified.faculty_in_charge.rejection_reason": reason,
          "milestones.$.verified.faculty_in_charge.rejected_by": name,
          "milestones.$.verified.faculty_in_charge.rejected_at": new Date(),
          "milestones.$.updated_at": new Date()
        }
        // NOTE: We do NOT clear "milestones.$.approved_by" array
        // This preserves panelist approvals so they don't need to re-approve
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: "Group or milestone not found" });
    }

    // Update group progress
    updateGroupProgress(groupId).catch(err => 
      console.error(`Background progress update failed for group ${groupId}:`, err)
    );

    res.json({ 
      message: "Manuscript rejected. Group can resubmit. Panelist approvals preserved.",
      reason 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error recording faculty rejection" });
  }
});

// Route: Panelist rejection for upload_manuscript milestone
router.patch("/:groupId/milestones/upload_manuscript/panelist-reject", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { panelist_id, name, reason } = req.body;

    if (!panelist_id || !name || !reason) {
      return res.status(400).json({ error: "panelist_id, name, and reason are required" });
    }

    // Remove this panelist's approval if they had approved before
    // Then add rejection record
    await groupsCollection.updateOne(
      { group_id: groupId, "milestones.type": "upload_manuscript" },
      {
        $pull: {
          "milestones.$.approved_by": { panelist_id }
        }
      }
    );

    // Add rejection record
    const updateResult = await groupsCollection.updateOne(
      { group_id: groupId, "milestones.type": "upload_manuscript" },
      {
        $push: {
          "milestones.$.rejected_by": {
            panelist_id,
            name,
            reason,
            rejected_at: new Date()
          }
        },
        $set: {
          "milestones.$.status": false, // Mark as incomplete so group can resubmit
          "milestones.$.updated_at": new Date()
        }
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: "Group or milestone not found" });
    }

    res.json({ 
      message: "Panelist rejection recorded. Group can resubmit.",
      reason 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error recording panelist rejection" });
  }
});

// Route: Faculty approval for upload_manuscript milestone
router.patch("/:groupId/milestones/upload_manuscript/faculty-approve", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    // First check if all panelists have approved
    const group = await groupsCollection.findOne({ group_id: groupId });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Get the block to find actual panelist count (flexible)
    const block = await blocksCollection.findOne({ block_id: group.block_id });
    if (!block) {
      return res.status(404).json({ error: "Block not found" });
    }

    const milestone = group.milestones.find(m => m.type === "upload_manuscript");
    const requiredPanelistCount = block.panelists?.length || 0;
    
    console.log(`🔍 Backend - Group: ${groupId}, Block: ${group.block_id}`);
    console.log(`📊 Backend - Required panelist count: ${requiredPanelistCount}`);
    console.log(`✅ Backend - Approved count: ${milestone.approved_by?.length || 0}`);
    console.log(`👥 Backend - Panelists in block:`, block.panelists);
    console.log(`📧 Backend - Panelist emails:`, block.panelists_email);
    
    if (milestone.approved_by.length < requiredPanelistCount) {
      return res.status(400).json({ 
        error: `All ${requiredPanelistCount} panelists must approve before faculty can approve` 
      });
    }

    const updateResult = await groupsCollection.updateOne(
      { group_id: groupId, "milestones.type": "upload_manuscript" },
      {
        $set: {
          "milestones.$.verified.faculty_in_charge.approved": true,
          "milestones.$.verified.faculty_in_charge.approved_at": new Date(),
          "milestones.$.verified.faculty_in_charge.approved_by": name,
          "milestones.$.verified.faculty_in_charge.rejected": false, // Clear rejection flag
          "milestones.$.updated_at": new Date()
        },
        $unset: {
          "milestones.$.verified.faculty_in_charge.rejection_reason": "",
          "milestones.$.verified.faculty_in_charge.rejected_by": "",
          "milestones.$.verified.faculty_in_charge.rejected_at": ""
        }
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: "Group or milestone not found" });
    }

    // Update group progress asynchronously (fire and forget)
    updateGroupProgress(groupId).catch(err => 
      console.error(`Background progress update failed for group ${groupId}:`, err)
    );

    res.json({ message: "Faculty approval recorded" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error recording faculty approval" });
  }
});

// Route: Chairperson approval for various milestones
router.patch("/:groupId/milestones/:milestoneType/chairperson-approve", async (req, res) => {
  try {
    const { groupId, milestoneType } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    // Validate milestone type
    const validMilestones = ["complete_copyright", "pass_turnitin", "upload_all_docs", "describe_work"];
    if (!validMilestones.includes(milestoneType)) {
      return res.status(400).json({ error: "Invalid milestone type for chairperson approval" });
    }

    const updateResult = await groupsCollection.updateOne(
      { group_id: groupId, "milestones.type": milestoneType },
      {
        $push: {
          "milestones.$.verified.chairperson": {
            approved: true,
            approved_at: new Date(),
            approved_by: name
          }
        },
        $set: { "milestones.$.updated_at": new Date() }
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: "Group or milestone not found" });
    }

    // Update group progress asynchronously (fire and forget)
    updateGroupProgress(groupId).catch(err => 
      console.error(`Background progress update failed for group ${groupId}:`, err)
    );

    res.json({ message: "Chairperson approval recorded" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error recording chairperson approval" });
  }
});

// Route: Panelist approval for upload_manuscript milestone
router.patch("/:groupId/milestones/upload_manuscript/approve", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { panelist_id, name } = req.body;

    if (!panelist_id || !name) {
      return res
        .status(400)
        .json({ error: "panelist_id and name are required" });
    }

    const updateResult = await groupsCollection.updateOne(
      { group_id: groupId, "milestones.type": "upload_manuscript" },
      {
        $addToSet: {
          "milestones.$.approved_by": {
            panelist_id,
            name,
            approved_at: new Date(),
          },
        },
        $set: { "milestones.$.updated_at": new Date() },
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: "Group or milestone not found" });
    }

    res.json({ message: "Panelist approval recorded" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error recording panelist approval" });
  }
});

// Route: Chairperson final approval (approves all milestones 2-5 at once)
router.patch("/:groupId/chairperson-approve-final", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { chairperson_name } = req.body;

    if (!chairperson_name) {
      return res.status(400).json({ error: "chairperson_name is required" });
    }

    console.log(`\n👨‍💼 Chairperson approval for group: ${groupId} by ${chairperson_name}`);

    // Validate: All milestones 1-5 must be complete
    const group = await groupsCollection.findOne({ group_id: groupId });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if FIC approved manuscript (milestone 1)
    const manuscript = group.milestones.find(m => m.type === 'upload_manuscript');
    if (!manuscript?.verified?.faculty_in_charge?.approved) {
      return res.status(400).json({ error: "Manuscript must be approved by Faculty-in-Charge first" });
    }

    // Check if milestones 2-5 are submitted (have files or data)
    const copyright = group.milestones.find(m => m.type === 'complete_copyright');
    const turnitin = group.milestones.find(m => m.type === 'pass_turnitin');
    const allDocs = group.milestones.find(m => m.type === 'upload_all_docs');
    const describeWork = group.milestones.find(m => m.type === 'describe_work');

    if (!copyright?.s3_key?.length) {
      return res.status(400).json({ error: "Copyright form not uploaded" });
    }
    if (!turnitin?.s3_key?.length) {
      return res.status(400).json({ error: "Turnitin result not uploaded" });
    }
    if (!allDocs?.s3_key?.length) {
      return res.status(400).json({ error: "All documents not uploaded" });
    }
    if (!describeWork?.status) {
      return res.status(400).json({ error: "Work description not submitted" });
    }

    // Approve at group level
    await groupsCollection.updateOne(
      { group_id: groupId },
      {
        $set: {
          "chairperson_approval.approved": true,
          "chairperson_approval.approved_by": chairperson_name,
          "chairperson_approval.approved_at": new Date(),
          "chairperson_approval.rejected": false,
          "chairperson_approval.rejection_reason": null,
          "chairperson_approval.rejected_milestone": null,
          "updated_at": new Date()
        }
      }
    );

    console.log(`✅ Chairperson ${chairperson_name} approved group ${groupId}`);

    res.json({ 
      success: true,
      message: "Chairperson approval recorded. Group ready for Dean review.",
      group_id: groupId 
    });
  } catch (err) {
    console.error("❌ Error recording chairperson approval:", err);
    res.status(500).json({ error: "Error recording chairperson approval" });
  }
});

// Route: Chairperson rejection (specify milestone to fix)
router.patch("/:groupId/chairperson-reject", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { chairperson_name, reason, milestone_to_fix } = req.body;

    if (!chairperson_name || !reason || !milestone_to_fix) {
      return res.status(400).json({ error: "chairperson_name, reason, and milestone_to_fix are required" });
    }

    const validMilestones = ['complete_copyright', 'pass_turnitin', 'upload_all_docs', 'describe_work'];
    if (!validMilestones.includes(milestone_to_fix)) {
      return res.status(400).json({ error: "Invalid milestone. Must be one of: complete_copyright, pass_turnitin, upload_all_docs, describe_work" });
    }

    console.log(`\n❌ Chairperson ${chairperson_name} rejecting group: ${groupId}, milestone: ${milestone_to_fix}`);

    // Mark as rejected at group level
    await groupsCollection.updateOne(
      { group_id: groupId },
      {
        $set: {
          "chairperson_approval.approved": false,
          "chairperson_approval.rejected": true,
          "chairperson_approval.rejection_reason": reason,
          "chairperson_approval.rejected_milestone": milestone_to_fix,
          "chairperson_approval.rejected_by": chairperson_name,
          "chairperson_approval.rejected_at": new Date(),
          "updated_at": new Date()
        }
      }
    );

    // Also mark the specific milestone as incomplete so it can be resubmitted
    await groupsCollection.updateOne(
      { group_id: groupId, "milestones.type": milestone_to_fix },
      {
        $set: {
          "milestones.$.status": false,
          "milestones.$.updated_at": new Date()
        }
      }
    );

    console.log(`✅ Chairperson rejection recorded for group ${groupId}`);

    res.json({ 
      success: true,
      message: `Group rejected. Student must resubmit: ${milestone_to_fix}`,
      milestone: milestone_to_fix,
      reason 
    });
  } catch (err) {
    console.error("❌ Error recording chairperson rejection:", err);
    res.status(500).json({ error: "Error recording chairperson rejection" });
  }
});

// Route: Dean approval (triggers automatic archiving)
router.patch("/:groupId/dean-approve", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { dean_name } = req.body;

    if (!dean_name) {
      return res.status(400).json({ error: "dean_name is required" });
    }

    console.log(`\n👨‍💼 Dean approval for group: ${groupId} by ${dean_name}`);

    // Validate: Chairperson must have approved first
    const group = await groupsCollection.findOne({ group_id: groupId });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!group.chairperson_approval?.approved) {
      return res.status(400).json({ error: "Chairperson must approve first" });
    }

    // Approve at group level
    await groupsCollection.updateOne(
      { group_id: groupId },
      {
        $set: {
          "dean_approval.approved": true,
          "dean_approval.approved_by": dean_name,
          "dean_approval.approved_at": new Date(),
          "dean_approval.rejected": false,
          "dean_approval.rejection_reason": null,
          "dean_approval.rejected_milestone": null,
          "updated_at": new Date()
        }
      }
    );

    console.log(`✅ Dean ${dean_name} approved group ${groupId}`);

    // Update group progress
    await updateGroupProgress(groupId);

    // Trigger automatic archiving (internal call to repository endpoint)
    console.log(`📦 Triggering automatic archiving for group ${groupId}...`);
    
    try {
      // Get updated group with all data
      const updatedGroup = await groupsCollection.findOne({ group_id: groupId });
      
      // Resolve block → program
      const block = await blocksCollection.findOne({ block_id: updatedGroup.block_id });
      if (!block) throw new Error("Block not found");

      const program = await programsCollection.findOne({ program_id: block.program_id });
      if (!program) throw new Error("Program not found");

      // Build authors array
      const authors = [];
      if (updatedGroup.leader) {
        authors.push(`${updatedGroup.leader.surname}, ${updatedGroup.leader.firstname}`);
      }
      if (Array.isArray(updatedGroup.members)) {
        updatedGroup.members.forEach((m) => {
          if (m.surname && m.firstname) {
            authors.push(`${m.surname}, ${m.firstname}`);
          }
        });
      }

      // Get manuscript file
      const manuscript = updatedGroup.milestones.find(m => m.type === "upload_manuscript");
      if (!manuscript || !manuscript.s3_key?.length) {
        throw new Error("No manuscript found");
      }

      const originalKey = manuscript.s3_key[0];
      const fileName = originalKey.split("/").pop();

      // Generate document_id
      const document_id = await generateDocumentId(block.program_id);

      // Move file to repository bucket with group_id in path
      const sourceBucket = process.env.THESISKO_DOCUMENTS_BUCKET;
      const destBucket = process.env.THESISKO_REPOSITORY_BUCKET;
      const newKey = `repository-files/${groupId}/${document_id}/${fileName}`;

      await moveFileBetweenBuckets(sourceBucket, destBucket, originalKey, newKey);

      // Generate embedding
      const textToEmbed = `${updatedGroup.title || ""} ${updatedGroup.abstract || ""}`.trim();
      let embedding = null;
      if (textToEmbed.length > 0) {
        embedding = await generateEmbedding(textToEmbed);
      }

      // Build repository doc
      const recordDoc = {
        _id: new ObjectId(),
        document_id,
        title: updatedGroup.title || null,
        abstract: updatedGroup.abstract || null,
        tags: Array.isArray(updatedGroup.tags) ? updatedGroup.tags : [],
        access_level: updatedGroup.access_level || "restricted",
        authors,
        file_key: newKey,
        program_id: block.program_id,
        program_name: program.program_name,
        department: program.department,
        created_at: new Date(),
        updated_at: new Date(),
        abstract_embedding: embedding,
      };

      // Insert into records
      await recordsCollection.insertOne(recordDoc);

      console.log(`✅ Archived successfully: ${document_id}`);

      res.json({ 
        success: true,
        message: "Dean approval recorded and thesis archived successfully",
        group_id: groupId,
        document_id,
        archived: true
      });
    } catch (archiveErr) {
      console.error("❌ Archiving failed:", archiveErr);
      // Approval still recorded, but archiving failed
      res.status(500).json({ 
        error: "Dean approval recorded but archiving failed. Please contact administrator.",
        group_id: groupId,
        approved: true,
        archived: false,
        archiveError: archiveErr.message
      });
    }
  } catch (err) {
    console.error("❌ Error recording dean approval:", err);
    res.status(500).json({ error: "Error recording dean approval" });
  }
});

// Route: Dean rejection (specify milestone to fix)
router.patch("/:groupId/dean-reject", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { dean_name, reason, milestone_to_fix } = req.body;

    if (!dean_name || !reason || !milestone_to_fix) {
      return res.status(400).json({ error: "dean_name, reason, and milestone_to_fix are required" });
    }

    const validMilestones = ['complete_copyright', 'pass_turnitin', 'upload_all_docs', 'describe_work'];
    if (!validMilestones.includes(milestone_to_fix)) {
      return res.status(400).json({ error: "Invalid milestone. Must be one of: complete_copyright, pass_turnitin, upload_all_docs, describe_work" });
    }

    console.log(`\n❌ Dean ${dean_name} rejecting group: ${groupId}, milestone: ${milestone_to_fix}`);

    // Mark as rejected at group level
    await groupsCollection.updateOne(
      { group_id: groupId },
      {
        $set: {
          "dean_approval.approved": false,
          "dean_approval.rejected": true,
          "dean_approval.rejection_reason": reason,
          "dean_approval.rejected_milestone": milestone_to_fix,
          "dean_approval.rejected_by": dean_name,
          "dean_approval.rejected_at": new Date(),
          "chairperson_approval.approved": false, // Reset chairperson approval
          "updated_at": new Date()
        }
      }
    );

    // Also mark the specific milestone as incomplete so it can be resubmitted
    await groupsCollection.updateOne(
      { group_id: groupId, "milestones.type": milestone_to_fix },
      {
        $set: {
          "milestones.$.status": false,
          "milestones.$.updated_at": new Date()
        }
      }
    );

    console.log(`✅ Dean rejection recorded for group ${groupId}`);

    res.json({ 
      success: true,
      message: `Group rejected. Student must resubmit: ${milestone_to_fix}`,
      milestone: milestone_to_fix,
      reason 
    });
  } catch (err) {
    console.error("❌ Error recording dean rejection:", err);
    res.status(500).json({ error: "Error recording dean rejection" });
  }
});

// Route: Manually refresh group progress
router.patch("/:groupId/refresh-progress", async (req, res) => {
  try {
    const { groupId } = req.params;
    
    await updateGroupProgress(groupId);
    const updatedGroup = await groupsCollection.findOne({ group_id: groupId });
    
    if (!updatedGroup) {
      return res.status(404).json({ error: "Group not found" });
    }
    
    res.json({ 
      message: "Progress refreshed successfully", 
      progress: updatedGroup.progress 
    });
  } catch (err) {
    console.error(`Error refreshing progress for group ${groupId}:`, err);
    res.status(500).json({ error: "Error refreshing group progress" });
  }
});

// Route: Generic group update (unchanged)
router.patch("/:group_id", async (req, res) => {
  try {
    const { group_id } = req.params;

    const existingDoc = await groupsCollection.findOne({ group_id });
    if (!existingDoc) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Handle leader change - update roles in PostgreSQL
    if (req.body.leader && req.body.leader.email !== existingDoc.leader?.email) {
      const oldLeaderEmail = existingDoc.leader?.email;
      const newLeaderEmail = req.body.leader.email;

      console.log(`\n👑 Leader change detected for group ${group_id}`);
      console.log(`   Old leader: ${oldLeaderEmail}`);
      console.log(`   New leader: ${newLeaderEmail}`);

      // Revert old leader: role_id 6 (Group Leader) → 2 (PUP-ian), keep group_id
      if (oldLeaderEmail) {
        await pool.query(
          'UPDATE users_info SET role_id = 2 WHERE email = $1 AND role_id = 6',
          [oldLeaderEmail]
        );
        console.log(`   ✅ Demoted old leader ${oldLeaderEmail}: role_id 6 (Group Leader) → 2 (PUP-ian)`);
      }

      // Promote new leader: role_id 2 (PUP-ian) → 6 (Group Leader), ensure group_id is set
      if (newLeaderEmail) {
        await pool.query(
          'UPDATE users_info SET role_id = 6, group_id = $1 WHERE email = $2',
          [group_id, newLeaderEmail]
        );
        console.log(`   ✅ Promoted new leader ${newLeaderEmail}: role_id 2 (PUP-ian) → 6 (Group Leader)`);
      }
    }

    const updateFields = {};
    if (req.body.title !== undefined) updateFields.title = req.body.title;
     if (req.body.access_level !== undefined) updateFields.access_level = req.body.access_level;
    if (req.body.leader) updateFields.leader = req.body.leader;
    if (req.body.members) updateFields.members = req.body.members;
    if (req.body.abstract !== undefined) updateFields.abstract = req.body.abstract;
    if (req.body.tags && Array.isArray(req.body.tags)) updateFields.tags = req.body.tags;

    if (req.body.milestones && typeof req.body.milestones === "object") {
      updateFields.milestones = deepMerge(
        { ...existingDoc.milestones },
        req.body.milestones
      );
    }

    if (req.body.progress) {
      const validEnums = ["not_started", "ongoing", "completed", "rejected"];
      if (!validEnums.includes(req.body.progress)) {
        return res.status(400).json({ error: "Invalid progress value" });
      }
      updateFields.progress = req.body.progress;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updateFields.updated_at = new Date();

    await groupsCollection.updateOne({ group_id }, { $set: updateFields });
    const updatedDoc = await groupsCollection.findOne({ group_id });

    res.json({
      message: "Group updated successfully",
      group: updatedDoc,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating group" });
  }
});

// Route: Delete group
router.delete("/:group_id", async (req, res) => {
  try {
    const { group_id } = req.params;
    console.log(`\n🗑️ Deleting group: ${group_id}`);

    // 1. Get group details first (before deleting)
    const group = await groupsCollection.findOne({ group_id });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // 2. Revert leader's role from 6 (Group Leader) to 2 (PUP-ian) and clear group_id
    if (group.leader && group.leader.email) {
      await pool.query(
        'UPDATE users_info SET role_id = 2, group_id = NULL WHERE email = $1 AND role_id = 6',
        [group.leader.email]
      );
      console.log(`✅ Reverted leader ${group.leader.email}: role_id 6 (Group Leader) → 2 (PUP-ian), group_id cleared`);
    }

    // 3. Clear group_id for all members (they're already role_id = 2 - PUP-ian)
    if (Array.isArray(group.members)) {
      for (const member of group.members) {
        if (member.email) {
          await pool.query(
            'UPDATE users_info SET group_id = NULL WHERE email = $1',
            [member.email]
          );
          console.log(`✅ Cleared group_id for member: ${member.email}`);
        }
      }
    }

    // 4. Delete group from MongoDB
    const result = await groupsCollection.deleteOne({ group_id });

    res.status(200).json({
      message: `Group ${group_id} deleted successfully. Leader reverted to PUP-ian role.`,
      deletedId: group_id,
      leaderReverted: group.leader?.email || null,
      membersCleared: group.members?.length || 0
    });
  } catch (err) {
    console.error('❌ Error deleting group:', err);
    res.status(500).json({ error: "Error deleting group" });
  }
});


// -------- Route: Copy to Repository (Manual trigger - requires dean approval) --------
router.post("/:group_id/repository", async (req, res) => {
  try {
    const { group_id } = req.params;

    // 1. Get group
    const group = await groupsCollection.findOne({ group_id });
    if (!group) return res.status(404).json({ error: "Group not found" });

    // 1.5 VALIDATE: Must have chairperson AND dean approval
    if (!group.chairperson_approval?.approved) {
      return res.status(403).json({ error: "Chairperson approval required before archiving" });
    }
    if (!group.dean_approval?.approved) {
      return res.status(403).json({ error: "Dean approval required before archiving" });
    }

    console.log(`📦 Manual archiving triggered for group: ${group_id}`);

    // 2. Resolve block → program
    const block = await blocksCollection.findOne({ block_id: group.block_id });
    if (!block) return res.status(404).json({ error: "Block not found" });

    const program = await programsCollection.findOne({ program_id: block.program_id });
    if (!program) return res.status(404).json({ error: "Program not found" });

    // 3. Authors
    const authors = [];
    if (group.leader) {
      authors.push(`${group.leader.surname}, ${group.leader.firstname}`);
    }
    if (Array.isArray(group.members)) {
      group.members.forEach((m) => {
        if (m.surname && m.firstname) {
          authors.push(`${m.surname}, ${m.firstname}`);
        }
      });
    }

    // 4. Manuscript file
    const manuscript = group.milestones.find(m => m.type === "upload_manuscript");
    if (!manuscript || !manuscript.s3_key?.length) {
      return res.status(400).json({ error: "No manuscript found" });
    }

    const originalKey = manuscript.s3_key[0];
    const fileName = originalKey.split("/").pop();

    // 5. Generate document_id
    const document_id = await generateDocumentId(block.program_id);

    // 6. Move file to repository bucket with group_id in path
    const sourceBucket = process.env.THESISKO_DOCUMENTS_BUCKET;
    const destBucket = process.env.THESISKO_REPOSITORY_BUCKET;
    const newKey = `repository-files/${group_id}/${document_id}/${fileName}`;

    await moveFileBetweenBuckets(sourceBucket, destBucket, originalKey, newKey);

    // 7. Generate embedding (title + abstract)
    const textToEmbed = `${group.title || ""} ${group.abstract || ""}`.trim();
    let embedding = null;
    if (textToEmbed.length > 0) {
      embedding = await generateEmbedding(textToEmbed);
    }

    // 8. Build repository doc
    const recordDoc = {
      _id: new ObjectId(),
      document_id,
      title: group.title || null,
      abstract: group.abstract || null,
      tags: Array.isArray(group.tags) ? group.tags : [],
      access_level: group.access_level || "restricted",
      authors,
      file_key: newKey,
      program_id: block.program_id,
      program_name: program.program_name,
      department: program.department,
      created_at: new Date(),
      updated_at: new Date(),
      abstract_embedding: embedding,
    };

    // 9. Insert into records
    await recordsCollection.insertOne(recordDoc);

    res.json({
      message: "Record successfully created in repository",
      record: recordDoc,
    });
  } catch (err) {
    console.error("❌ Error copying to repository:", err);
    res.status(500).json({ error: "Error copying to repository" });
  }
});

export default router;