import express from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../databaseConnections/MongoDB/mongodb_connection.js';
import pool from '../data/database.js';
import s3 from '../databaseConnections/AWS/s3_connection.js';
import { generateEmbedding } from '../controller/embeddingService.js';
import {
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

const router = express.Router();

// Helper to get collections
const getSubmissionsCollection = () => {
  const db = getDb();
  return db.collection('submissions');
};

const getDocumentTypesCollection = () => {
  const db = getDb();
  return db.collection('document_types');
};

const getRecordsCollection = () => {
  const db = getDb();
  return db.collection('records');
};

// -------- Helper: Dynamically find file in submission files structure --------
/**
 * Dynamically finds a file in the submission's files structure.
 * This function handles the nested object structure where each file type
 * contains an object with s3_key and uploaded_at properties.
 * 
 * @param {Object} submission - The submission object
 * @param {string} requirementFileId - The file ID from requirements (e.g., 'manuscript_file')
 * @returns {Object|null} - File object with key, s3_key, and filename, or null if not found
 */
function findFileInSubmission(submission, requirementFileId) {
  const files = submission.files || {};
  
  console.log(`🔍 Looking for file: ${requirementFileId}`);
  console.log(`🔍 Available file types:`, Object.keys(files));
  
  // Strategy 1: Direct match with requirement ID
  if (files[requirementFileId] && files[requirementFileId].s3_key) {
    console.log(`✅ Found direct match: ${requirementFileId}`);
    return {
      key: requirementFileId,
      s3_key: files[requirementFileId].s3_key,
      filename: files[requirementFileId].s3_key.split('/').pop()
    };
  }
  
  // Strategy 2: Try common variations of the requirement ID
  const variations = [
    requirementFileId.replace('_file', ''), // manuscript_file -> manuscript
    requirementFileId.replace('_', ''), // manuscript_file -> manuscriptfile
    requirementFileId.split('_')[0], // manuscript_file -> manuscript
    requirementFileId.split('_').pop(), // manuscript_file -> file
  ];
  
  for (const variation of variations) {
    if (files[variation] && files[variation].s3_key) {
      console.log(`✅ Found variation match: ${variation} (was ${requirementFileId})`);
      return {
        key: requirementFileId,
        s3_key: files[variation].s3_key,
        filename: files[variation].s3_key.split('/').pop()
      };
    }
  }
  
  // Strategy 3: Search by label matching (case-insensitive)
  const requirementLabel = requirementFileId.replace(/_/g, ' ').toLowerCase();
  for (const [fileKey, fileData] of Object.entries(files)) {
    if (fileData && fileData.s3_key) {
      const fileKeyLower = fileKey.replace(/_/g, ' ').toLowerCase();
      if (fileKeyLower.includes(requirementLabel) || requirementLabel.includes(fileKeyLower)) {
        console.log(`✅ Found label match: ${fileKey} (was ${requirementFileId})`);
        return {
          key: requirementFileId,
          s3_key: fileData.s3_key,
          filename: fileData.s3_key.split('/').pop()
        };
      }
    }
  }
  
  // Strategy 4: Fuzzy matching - try to find files that contain key words
  const keywords = requirementFileId.split('_').filter(word => word !== 'file');
  for (const [fileKey, fileData] of Object.entries(files)) {
    if (fileData && fileData.s3_key) {
      const fileKeyLower = fileKey.toLowerCase();
      const matchesKeywords = keywords.some(keyword => 
        fileKeyLower.includes(keyword.toLowerCase())
      );
      
      if (matchesKeywords) {
        console.log(`✅ Found keyword match: ${fileKey} (was ${requirementFileId})`);
        return {
          key: requirementFileId,
          s3_key: fileData.s3_key,
          filename: fileData.s3_key.split('/').pop()
        };
      }
    }
  }
  
  // Strategy 5: List all available files for debugging
  console.log(`❌ Could not find file: ${requirementFileId}`);
  console.log(`🔍 Available files in submission:`, Object.keys(files));
  console.log(`🔍 Tried variations:`, variations);
  console.log(`🔍 Tried keywords:`, keywords);
  console.log(`🔍 Full files structure:`, JSON.stringify(files, null, 2));
  
  return null;
}

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

  const result = await getDb().collection("counters").findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" } // or returnOriginal: false in v3
  );

  let counterDoc = result.value;
  
  // Fallback: fetch manually if not returned
  if (!counterDoc) {
    counterDoc = await getDb().collection("counters").findOne({ _id: counterId });
  }

  if (!counterDoc) {
    throw new Error(`Failed to fetch counter for ${counterId}`);
  }

  const nextNumber = counterDoc.seq.toString().padStart(4, "0");
  return `${year}-${program_id}-${nextNumber}`;
}

// Helper function to generate submission ID
// Format: 2024-CCIS-BSIT-0001
const generateSubmissionId = async (department, program, year = null) => {
  const submissionsCollection = getSubmissionsCollection();
  const currentYear = year || new Date().getFullYear();
  
  // Count existing submissions for this department-program-year combination
  const prefix = `${currentYear}-${department}-${program}`;
  const existingCount = await submissionsCollection.countDocuments({
    submission_id: { $regex: `^${prefix}-` }
  });
  
  // Increment and pad with zeros (0001, 0002, etc.)
  const nextNumber = (existingCount + 1).toString().padStart(4, '0');
  
  return `${prefix}-${nextNumber}`;
};

// GET generate submission ID
router.get('/generate-id/:department/:program', async (req, res) => {
  try {
    const { department, program } = req.params;
    const submissionId = await generateSubmissionId(department, program);
    
    res.json({ 
      success: true, 
      submission_id: submissionId 
    });
  } catch (error) {
    console.error('Error generating submission ID:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate submission ID' 
    });
  }
});

// Helper to check for duplicate submissions
const checkDuplicates = async (title, authors) => {
  const submissionsCollection = getSubmissionsCollection();
  
  // Handle cases where title or authors might be undefined
  if (!title && (!authors || authors.length === 0)) {
    return [];
  }
  
  const query = [];
  
  // Search for similar titles (case-insensitive) if title exists
  if (title && title.trim()) {
    const titleRegex = new RegExp(title.trim(), 'i');
    query.push({ title: titleRegex });
  }
  
  // Search for similar authors if authors exist
  if (authors && Array.isArray(authors) && authors.length > 0) {
    query.push({ authors: { $in: authors } });
  }
  
  if (query.length === 0) {
    return [];
  }
  
  const duplicates = await submissionsCollection.find({
    $or: query
  }).limit(5).toArray();
  
  return duplicates;
};

// ==================== STUDENT ROUTES ====================

// POST create new submission
router.post('/create', async (req, res) => {
  try {
    const {
      submitter_email,
      document_type,
      department,
      program,
      files = {}
    } = req.body;

    console.log(`📝 New submission from: ${submitter_email}`);

    if (!submitter_email || !document_type || !department || !program) {
      return res.status(400).json({
        error: 'Missing required fields: submitter_email, document_type, department, program'
      });
    }

    const requirementsCollection = getDb().collection('requirements');
    const requirement = await requirementsCollection.findOne({
      document_type,
      is_active: true
    });

    if (!requirement) {
      return res.status(400).json({
        error: 'Invalid or inactive document type'
      });
    }

    // ✅ Check required file uploads
    const missingFiles = requirement.required_files
      .filter(f => f.required)
      .filter(f => !files[f.id] || !files[f.id].s3_key);

    if (missingFiles.length > 0) {
      return res.status(400).json({
        error: `Missing required files: ${missingFiles.map(f => f.label).join(', ')}`
      });
    }

    // ✅ Validate required fields dynamically (based on requirement schema)
    const missingFields = requirement.required_metadata
      ?.filter(f => f.required)
      ?.filter(f => !req.body[f] || req.body[f].trim() === '');

    if (missingFields?.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const submissionsCollection = getSubmissionsCollection();
    const submission_id = await generateSubmissionId(department, program);

    // ✅ Build submission document dynamically
    const submissionData = {};

    // First, handle standard fields that are always expected
    const standardFields = ['title', 'abstract', 'authors', 'tags', 'year', 'adviser', 'faculty_in_charge', 'panelists', 'access_level'];
    
    for (const field of standardFields) {
      if (req.body[field] !== undefined) {
        submissionData[field] = req.body[field];
      }
    }

    // Then, populate from dynamic field definitions (excluding standard fields)
    if (Array.isArray(requirement.required_metadata)) {
      for (const field of requirement.required_metadata) {
        // Skip if it's already handled as a standard field
        if (!standardFields.includes(field)) {
          const value = req.body[field];
          submissionData[field] = value ?? null;
        }
      }
    }

    // Transform files to include upload timestamps
    const fileEntries = Object.entries(files).reduce((acc, [key, value]) => {
      acc[key] = {
        s3_key: value.s3_key || value,
        uploaded_at: new Date()
      };
      return acc;
    }, {});

    // ✅ Final assembled submission
    const newSubmission = {
      _id: new ObjectId(),
      submission_id,
      document_type,
      submitter_email,
      department,
      program,
      files: fileEntries,

      // Dynamic fields
      ...submissionData,

      // Default workflow
      chairperson_approval: {
        approved: false,
        approved_by: null,
        approved_at: null,
        rejected: false,
        rejection_reason: null,
        rejected_files: []
      },
      dean_approval: {
        approved: false,
        approved_by: null,
        approved_at: null,
        rejected: false,
        rejection_reason: null,
        rejected_files: []
      },
      status: 'pending_chairperson',
      archived: false,
      archived_at: null,
      document_id: null,
      created_at: new Date(),
      updated_at: new Date()
    };

    await submissionsCollection.insertOne(newSubmission);

    console.log(`✅ Dynamic submission created: ${submission_id}`);

    res.json({
      success: true,
      message: 'Submission created successfully',
      submission_id,
      data: newSubmission
    });

  } catch (error) {
    console.error('❌ Error creating submission:', error);
    res.status(500).json({ error: 'Error creating submission' });
  }
});

// GET check for duplicate submissions
router.get('/check-duplicates', async (req, res) => {
  try {
    const { title, authors } = req.query;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const authorsArray = authors ? (Array.isArray(authors) ? authors : [authors]) : [];
    const duplicates = await checkDuplicates(title, authorsArray);

    res.json({ 
      success: true, 
      found: duplicates.length > 0,
      duplicates: duplicates.map(d => ({
        submission_id: d.submission_id,
        title: d.title,
        authors: d.authors,
        submitter_email: d.submitter_email,
        submitted_at: d.submitted_at,
        status: d.status
      }))
    });
  } catch (error) {
    console.error('❌ Error checking duplicates:', error);
    res.status(500).json({ error: 'Error checking duplicates' });
  }
});

// GET my submissions (by email)
router.get('/my-submissions/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const submissionsCollection = getSubmissionsCollection();
    const submissions = await submissionsCollection
      .find({ submitter_email: email })
      .sort({ submitted_at: -1 })
      .toArray();

    res.json({ success: true, data: submissions });
  } catch (error) {
    console.error('❌ Error fetching submissions:', error);
    res.status(500).json({ error: 'Error fetching submissions' });
  }
});

// PATCH resubmit (update files after rejection)
router.patch('/:submission_id/resubmit', async (req, res) => {
  try {
    const { submission_id } = req.params;
    const { files, updated_by } = req.body;

    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({ error: 'No files provided for resubmission' });
    }

    console.log(`🔄 Resubmission for: ${submission_id}`);

    const submissionsCollection = getSubmissionsCollection();
    const submission = await submissionsCollection.findOne({ submission_id });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Update only the files that were resubmitted
    const updatedFiles = { ...submission.files };
    Object.entries(files).forEach(([key, value]) => {
      updatedFiles[key] = {
        s3_key: value.s3_key || value,
        uploaded_at: new Date()
      };
    });

    // Reset the approval that rejected it
    let updateFields = {
      files: updatedFiles,
      updated_at: new Date()
    };

    if (submission.status === 'rejected_by_chairperson') {
      updateFields.status = 'pending_chairperson';
      updateFields['chairperson_approval.rejected'] = false;
      updateFields['chairperson_approval.rejection_reason'] = null;
      updateFields['chairperson_approval.rejected_files'] = [];
    } else if (submission.status === 'rejected_by_dean') {
      updateFields.status = 'pending_dean';
      updateFields['dean_approval.rejected'] = false;
      updateFields['dean_approval.rejection_reason'] = null;
      updateFields['dean_approval.rejected_files'] = [];
    }

    await submissionsCollection.updateOne(
      { submission_id },
      { $set: updateFields }
    );

    console.log(`✅ Resubmission processed for: ${submission_id}`);

    res.json({ 
      success: true, 
      message: 'Files resubmitted successfully',
      submission_id
    });
  } catch (error) {
    console.error('❌ Error processing resubmission:', error);
    res.status(500).json({ error: 'Error processing resubmission' });
  }
});

// ==================== CHAIRPERSON ROUTES ====================

// GET submissions pending chairperson approval
router.get('/pending-chairperson/:email', async (req, res) => {
  try {
    const { email } = req.params;

    console.log(`👨‍🏫 Fetching submissions pending chairperson approval for: ${email}`);

    // Get programs collection to find chairperson's programs
    const programsCollection = getDb().collection('programs');
    const programs = await programsCollection
      .find({ chairperson_email: email })
      .toArray();

    if (programs.length === 0) {
      console.log(`⚠️ No programs found for chairperson: ${email}`);
      return res.json({ success: true, data: [] });
    }

    // Extract program IDs that this chairperson is responsible for
    const programIds = programs.map(p => p.program_id);
    console.log(`📋 Chairperson ${email} is responsible for programs: ${programIds.join(', ')}`);

    // Find submissions for these programs that are pending chairperson approval
    const submissionsCollection = getSubmissionsCollection();
    const submissions = await submissionsCollection
      .find({ 
        status: 'pending_chairperson',
        program: { $in: programIds }
      })
      .sort({ submitted_at: -1 })
      .toArray();

    console.log(`📊 Found ${submissions.length} submissions pending chairperson approval for programs: ${programIds.join(', ')}`);

    res.json({ success: true, data: submissions });
  } catch (error) {
    console.error('❌ Error fetching chairperson submissions:', error);
    res.status(500).json({ error: 'Error fetching submissions' });
  }
});

// PATCH chairperson approve
router.patch('/:submission_id/chairperson-approve', async (req, res) => {
  try {
    const { submission_id } = req.params;
    const { chairperson_name } = req.body;

    if (!chairperson_name) {
      return res.status(400).json({ error: 'chairperson_name is required' });
    }

    console.log(`✅ Chairperson ${chairperson_name} approving: ${submission_id}`);

    const submissionsCollection = getSubmissionsCollection();

    const result = await submissionsCollection.updateOne(
      { submission_id },
      {
        $set: {
          'chairperson_approval.approved': true,
          'chairperson_approval.approved_by': chairperson_name,
          'chairperson_approval.approved_at': new Date(),
          'chairperson_approval.rejected': false,
          'chairperson_approval.rejection_reason': null,
          'chairperson_approval.rejected_files': [],
          status: 'pending_dean',
          updated_at: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    console.log(`✅ Chairperson approval recorded for: ${submission_id}`);

    res.json({ 
      success: true, 
      message: 'Submission approved by chairperson. Now pending dean approval.',
      submission_id
    });
  } catch (error) {
    console.error('❌ Error recording chairperson approval:', error);
    res.status(500).json({ error: 'Error recording approval' });
  }
});

// PATCH chairperson reject
router.patch('/:submission_id/chairperson-reject', async (req, res) => {
  try {
    const { submission_id } = req.params;
    const { chairperson_name, reason, rejected_files } = req.body;

    if (!chairperson_name || !reason) {
      return res.status(400).json({ error: 'chairperson_name and reason are required' });
    }

    console.log(`❌ Chairperson ${chairperson_name} rejecting: ${submission_id}`);

    const submissionsCollection = getSubmissionsCollection();

    // Get submission details for email
    const submission = await submissionsCollection.findOne({ submission_id });
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const rejectedFilesList = Array.isArray(rejected_files) ? rejected_files : [];

    const result = await submissionsCollection.updateOne(
      { submission_id },
      {
        $set: {
          'chairperson_approval.approved': false,
          'chairperson_approval.rejected': true,
          'chairperson_approval.rejection_reason': reason,
          'chairperson_approval.rejected_files': rejectedFilesList,
          'chairperson_approval.rejected_by': chairperson_name,
          'chairperson_approval.rejected_at': new Date(),
          status: 'rejected_by_chairperson',
          updated_at: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    console.log(`✅ Chairperson rejection recorded for: ${submission_id}`);

    // Send rejection email to student
    try {
      const { sendEmail } = await import('../services/emailService.js');
      
      await sendEmail({
        to: submission.submitter_email,
        subject: `Submission Rejected - ${submission_id}`,
        template: 'submissionRejection',
        data: {
          submissionId: submission_id,
          submissionTitle: submission.title,
          documentType: submission.document_type,
          program: submission.program,
          rejectedBy: chairperson_name,
          rejectionDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          rejectionReason: reason,
          rejectedFiles: rejectedFilesList,
          needsChairpersonApproval: false,
          frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200'
        }
      });

      console.log(`📧 Rejection email sent to: ${submission.submitter_email}`);
    } catch (emailError) {
      console.error('⚠️ Failed to send rejection email:', emailError);
      // Don't fail the rejection if email fails
    }

    res.json({ 
      success: true, 
      message: 'Submission rejected. Student can resubmit the required files.',
      submission_id,
      rejected_files: rejectedFilesList
    });
  } catch (error) {
    console.error('❌ Error recording chairperson rejection:', error);
    res.status(500).json({ error: 'Error recording rejection' });
  }
});

// ==================== DEAN ROUTES ====================

// GET submissions pending dean approval
router.get('/pending-dean/:email', async (req, res) => {
  try {
    const { email } = req.params;

    console.log(`👨‍💼 Fetching submissions pending dean approval for: ${email}`);

    const submissionsCollection = getSubmissionsCollection();
    const programsCollection = getDb().collection('programs');

    // Get all submissions with status pending_dean
    console.log(`🔍 Looking for submissions with status: pending_dean`);
    const allPendingSubmissions = await submissionsCollection.find({
      status: 'pending_dean'
    }).toArray();

    console.log(`📊 Found ${allPendingSubmissions.length} submissions with status pending_dean`);

    // Filter submissions based on dean's programs and enrich with program info
    const filteredSubmissions = [];
    
    for (const submission of allPendingSubmissions) {
      console.log(`🔍 Checking submission ${submission.submission_id} (department: ${submission.department})`);
      
      // Find program by matching department
      const program = await programsCollection.findOne({
        department_id: submission.department
      });
      
      if (program) {
        console.log(`📋 Found program ${program.program_id} for department ${submission.department}`);
        console.log(`👤 Program dean_email: ${program.dean_email}, Requested email: ${email}`);
        
        // Check if this dean is responsible for this program
        if (program.dean_email === email) {
          console.log(`✅ Dean ${email} is responsible for submission ${submission.submission_id}`);
          
          // Enrich submission with program info
          const enrichedSubmission = {
            ...submission,
            program_info: {
              program_name: program.program_name,
              department_name: program.department_name,
              chairperson_email: program.chairperson_email
            }
          };
          
          filteredSubmissions.push(enrichedSubmission);
        } else {
          console.log(`❌ Dean ${email} is NOT responsible for submission ${submission.submission_id}`);
        }
      } else {
        console.log(`⚠️ No program found for department: ${submission.department}`);
      }
    }

    console.log(`📊 Final result: ${filteredSubmissions.length} submissions for dean ${email}`);
    console.log(`📋 Filtered submissions:`, filteredSubmissions.map(s => ({ 
      id: s.submission_id, 
      program: s.program, 
      department: s.department,
      status: s.status,
      chairperson_approved_by: s.chairperson_approval?.approved_by
    })));

    res.json({ success: true, data: filteredSubmissions });
  } catch (error) {
    console.error('❌ Error fetching dean submissions:', error);
    res.status(500).json({ 
      error: 'Error fetching submissions',
      details: error.message 
    });
  }
});

// PATCH dean approve (triggers archiving)
router.patch('/:submission_id/dean-approve', async (req, res) => {
  try {
    const { submission_id } = req.params;
    const { dean_name } = req.body;

    if (!dean_name) {
      return res.status(400).json({ error: 'dean_name is required' });
    }

    console.log(`✅ Dean ${dean_name} approving: ${submission_id}`);

    const submissionsCollection = getSubmissionsCollection();
    const submission = await submissionsCollection.findOne({ submission_id });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Validate chairperson approved first
    if (!submission.chairperson_approval?.approved) {
      return res.status(400).json({ error: 'Chairperson must approve first' });
    }

    // Update submission with dean approval
    await submissionsCollection.updateOne(
      { submission_id },
      {
        $set: {
          'dean_approval.approved': true,
          'dean_approval.approved_by': dean_name,
          'dean_approval.approved_at': new Date(),
          'dean_approval.rejected': false,
          'dean_approval.rejection_reason': null,
          'dean_approval.rejected_files': [],
          status: 'approved',
          updated_at: new Date()
        }
      }
    );

    console.log(`✅ Dean approval recorded for: ${submission_id}`);

    // Archive to records collection
    try {
      const recordsCollection = getRecordsCollection();
      
      // Get program info to generate proper document_id
      const programsCollection = getDb().collection('programs');
      const program = await programsCollection.findOne({ program_id: submission.program });
      if (!program) {
        throw new Error('Program not found');
      }
      
      // Generate document_id using proper format: {year}-{program}-{generated number}
      const document_id = await generateDocumentId(program.program_id);

      // Get file requirements for archiving
      const requirementsCollection = getDb().collection('requirements');
      const requirement = await requirementsCollection.findOne({ 
        document_type: submission.document_type,
        is_active: true 
      });

      let filesToArchive = [];
      let missingRequiredFiles = [];

      if (requirement && requirement.required_files && requirement.required_files.length > 0) {
        // Use unified requirements for archiving
        console.log(`📋 File requirements for ${submission.document_type}:`, requirement.required_files);

        for (const fileReq of requirement.required_files) {
          console.log(`🔍 Checking file: ${fileReq.id}, to_be_archived: ${fileReq.to_be_archived}`);
          
          // Only process files marked for archiving
          if (!fileReq.to_be_archived) {
            console.log(`⏭️ Skipping ${fileReq.id} - not marked for archiving`);
            continue;
          }

          const fileKey = fileReq.id; // e.g., 'manuscript_file', 'turnitin_file', etc.
          
          // Use dynamic file finding function
          const foundFile = findFileInSubmission(submission, fileKey);
          
          if (foundFile) {
            // File exists, add to archive list
            console.log(`✅ Adding ${foundFile.key} to archive list: ${foundFile.s3_key}`);
            filesToArchive.push(foundFile);
          } else {
            // Required archive file is missing
            console.log(`❌ Missing required archive file: ${fileKey}`);
            missingRequiredFiles.push(fileReq.label || fileReq.id);
          }
        }

        console.log(`📦 Files to archive: ${filesToArchive.length}`, filesToArchive.map(f => f.key));

        // Check if any required archive files are missing
        if (missingRequiredFiles.length > 0) {
          throw new Error(`Missing required archive files: ${missingRequiredFiles.join(', ')}`);
        }

        if (filesToArchive.length === 0) {
          throw new Error('No archive files found in submission');
        }
      } else {
        // Fallback: Archive all available files (like the old workflow)
        console.log(`⚠️ No requirements found for ${submission.document_type}, using fallback archiving`);
        
        if (submission.files) {
          for (const [fileKey, file] of Object.entries(submission.files)) {
            if (file && file.s3_key) {
              console.log(`✅ Adding ${fileKey} to archive list (fallback): ${file.s3_key}`);
              filesToArchive.push({
                key: fileKey,
                s3_key: file.s3_key,
                filename: file.s3_key.split('/').pop()
              });
            }
          }
        }

        if (filesToArchive.length === 0) {
          throw new Error('No files found in submission to archive');
        }

        console.log(`📦 Files to archive (fallback): ${filesToArchive.length}`, filesToArchive.map(f => f.key));
      }

      // Move files to repository bucket with proper S3 path: {document_id}/{submission_id}/filename
      const sourceBucket = process.env.THESISKO_DOCUMENTS_BUCKET;
      const destBucket = process.env.THESISKO_REPOSITORY_BUCKET;
      const archivedFiles = [];

      for (const fileToArchive of filesToArchive) {
        const newKey = `repository-files/${document_id}/${fileToArchive.filename}`;
        console.log(`🔄 Moving file: ${fileToArchive.s3_key} → ${newKey}`);
        await moveFileBetweenBuckets(sourceBucket, destBucket, fileToArchive.s3_key, newKey);
        console.log(`✅ File moved successfully: ${fileToArchive.filename}`);
        archivedFiles.push({
          key: fileToArchive.key,
          file_key: newKey,
          filename: fileToArchive.filename
        });
      }

      // Generate embedding (title + abstract)
      const textToEmbed = `${submission.title || ''} ${submission.abstract || ''}`.trim();
      let embedding = null;
      if (textToEmbed.length > 0) {
        embedding = await generateEmbedding(textToEmbed);
      }

      // Build archived record dynamically based on submission document structure
      console.log(`📦 Building dynamic archive record for submission: ${submission_id}`);
      console.log(`📋 Submission fields:`, Object.keys(submission));
      
      // System fields that should always be included
      const systemFields = {
        _id: new ObjectId(),
        document_id,
        submission_id,
        abstract_embedding: embedding,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Fields to exclude from submission (system/approval fields)
      const excludeFields = [
        '_id', 'submission_id', 'chairperson_approval', 'dean_approval', 
        'status', 'archived', 'archived_at', 'document_id', 'created_at', 'updated_at'
      ];

      // Preserve all submission fields except excluded ones
      const preservedFields = Object.fromEntries(
        Object.entries(submission).filter(([key, value]) => 
          !excludeFields.includes(key)
        )
      );

      console.log(`✅ Preserved fields:`, Object.keys(preservedFields));
      console.log(`🚫 Excluded fields:`, excludeFields);

      // Calculate document_status based on year
      const currentYear = new Date().getFullYear();
      let year = submission.year;
      
      // If no year exists, set it to current year
      if (!year) {
        year = currentYear;
        console.log(`📅 Document has no year, setting to current year: ${year}`);
      }
      
      // Calculate age and set document_status
      const age = currentYear - year;
      const documentStatus = age >= 5 ? 'old' : 'active';
      console.log(`📊 Document year: ${year}, age: ${age}, status: ${documentStatus}`);

      // Build the archived record dynamically
      const archivedRecord = {
        ...systemFields,
        ...preservedFields,
        year: year, // Ensure year is set
        document_status: documentStatus, // Add document status
        files: archivedFiles // Override with archived files
      };

      console.log(`📄 Final archive record fields:`, Object.keys(archivedRecord));

      await recordsCollection.insertOne(archivedRecord);

      // Update submission with archive info
      await submissionsCollection.updateOne(
        { submission_id },
        {
          $set: {
            archived: true,
            archived_at: new Date(),
            document_id,
            archived_files: archivedFiles, // Store the new S3 keys
            status: 'archived'
          }
        }
      );

      console.log(`📦 Archived successfully: ${document_id}`);

      // Send approval email to student
      try {
        const { sendEmail } = await import('../services/emailService.js');
        
        // Generate archive link
        const archiveLink = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/records/${document_id}`;
        
        await sendEmail({
          to: submission.submitter_email,
          subject: `Submission Approved - ${submission_id}`,
          template: 'submissionApproval',
          data: {
            recipientName: submission.authors?.[0] || 'Student',
            submissionId: submission_id,
            submissionTitle: submission.title,
            documentType: submission.document_type,
            documentTypeLower: submission.document_type.toLowerCase(),
            program: submission.program,
            approvedBy: dean_name,
            approvalDate: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            documentId: document_id,
            archiveLink: archiveLink,
            frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200'
          }
        });

        console.log(`📧 Approval email sent to: ${submission.submitter_email}`);
      } catch (emailError) {
        console.error('⚠️ Failed to send approval email:', emailError);
        // Don't fail the approval if email fails
      }

      res.json({ 
        success: true, 
        message: 'Submission approved by dean and archived successfully',
        submission_id,
        document_id,
        archived: true
      });
    } catch (archiveError) {
      console.error('❌ Archiving failed:', archiveError);
      console.error('❌ Archive error details:', {
        message: archiveError.message,
        stack: archiveError.stack,
        submission_id,
        document_type: submission?.document_type
      });
      res.status(500).json({ 
        error: 'Approval recorded but archiving failed',
        details: archiveError.message,
        submission_id,
        approved: true,
        archived: false
      });
    }
  } catch (error) {
    console.error('❌ Error recording dean approval:', error);
    res.status(500).json({ error: 'Error recording approval' });
  }
});

// PATCH dean reject
router.patch('/:submission_id/dean-reject', async (req, res) => {
  try {
    const { submission_id } = req.params;
    const { dean_name, reason, rejected_files } = req.body;

    if (!dean_name || !reason) {
      return res.status(400).json({ error: 'dean_name and reason are required' });
    }

    console.log(`❌ Dean ${dean_name} rejecting: ${submission_id}`);

    const submissionsCollection = getSubmissionsCollection();

    // Get submission details for email
    const submission = await submissionsCollection.findOne({ submission_id });
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const rejectedFilesList = Array.isArray(rejected_files) ? rejected_files : [];

    const result = await submissionsCollection.updateOne(
      { submission_id },
      {
        $set: {
          'dean_approval.approved': false,
          'dean_approval.rejected': true,
          'dean_approval.rejection_reason': reason,
          'dean_approval.rejected_files': rejectedFilesList,
          'dean_approval.rejected_by': dean_name,
          'dean_approval.rejected_at': new Date(),
          'chairperson_approval.approved': false, // Reset chairperson approval
          status: 'rejected_by_dean',
          updated_at: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    console.log(`✅ Dean rejection recorded for: ${submission_id}`);

    // Send rejection email to student
    try {
      const { sendEmail } = await import('../services/emailService.js');
      
      await sendEmail({
        to: submission.submitter_email,
        subject: `Submission Rejected - ${submission_id}`,
        template: 'submissionRejection',
        data: {
          submissionId: submission_id,
          submissionTitle: submission.title,
          documentType: submission.document_type,
          program: submission.program,
          rejectedBy: dean_name,
          rejectionDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          rejectionReason: reason,
          rejectedFiles: rejectedFilesList,
          needsChairpersonApproval: true,
          frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200'
        }
      });

      console.log(`📧 Rejection email sent to: ${submission.submitter_email}`);
    } catch (emailError) {
      console.error('⚠️ Failed to send rejection email:', emailError);
      // Don't fail the rejection if email fails
    }

    res.json({ 
      success: true, 
      message: 'Submission rejected. Student must resubmit and get chairperson approval again.',
      submission_id,
      rejected_files: rejectedFilesList
    });
  } catch (error) {
    console.error('❌ Error recording dean rejection:', error);
    res.status(500).json({ error: 'Error recording rejection' });
  }
});

// ==================== SHARED ROUTES ====================

// GET all submissions with program and chairperson info (for approvals page)
router.get('/with-program-info', async (req, res) => {
  try {
    const { status, department, program, document_type } = req.query;

    const submissionsCollection = getSubmissionsCollection();
    const programsCollection = getDb().collection('programs');
    
    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (program) filter.program = program;
    if (document_type) filter.document_type = document_type;

    const submissions = await submissionsCollection
      .find(filter)
      .sort({ submitted_at: -1 })
      .toArray();

    // Get program info for each submission
    const submissionsWithProgramInfo = await Promise.all(
      submissions.map(async (submission) => {
        const programInfo = await programsCollection.findOne({ 
          program_id: submission.program 
        });
        
        return {
          ...submission,
          program_info: programInfo ? {
            program_name: programInfo.program_name,
            department_name: programInfo.department_name,
            chairperson_email: programInfo.chairperson_email
          } : null
        };
      })
    );

    res.json({ success: true, data: submissionsWithProgramInfo });
  } catch (error) {
    console.error('❌ Error fetching submissions with program info:', error);
    res.status(500).json({ error: 'Error fetching submissions' });
  }
});

// GET single submission by ID
router.get('/:submission_id', async (req, res) => {
  try {
    const { submission_id } = req.params;
    console.log(`🔍 Fetching submission: ${submission_id}`);

    const submissionsCollection = getSubmissionsCollection();
    
    // First, let's check if the collection exists and has documents
    const totalCount = await submissionsCollection.countDocuments();
    console.log(`📊 Total submissions in database: ${totalCount}`);
    
    // Try to find the submission
    const submission = await submissionsCollection.findOne({ submission_id });

    if (!submission) {
      console.log(`❌ Submission not found: ${submission_id}`);
      
      // Let's see what submissions exist
      const allSubmissions = await submissionsCollection.find({}).limit(5).toArray();
      console.log(`📋 Available submissions:`, allSubmissions.map(s => s.submission_id));
      
      return res.status(404).json({ error: 'Submission not found' });
    }

    console.log(`✅ Found submission: ${submission_id}`);
    console.log(`📋 Submission fields:`, Object.keys(submission));

    // Also get potential duplicates for warning
    const duplicates = await checkDuplicates(submission.title || '', submission.authors || []);
    
    res.json({ 
      success: true, 
      data: submission,
      potential_duplicates: duplicates.filter(d => d.submission_id !== submission_id)
    });
  } catch (error) {
    console.error('❌ Error fetching submission:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Error fetching submission' });
  }
});

// GET all submissions (with filters)
router.get('/', async (req, res) => {
  try {
    const { status, department, program, document_type } = req.query;

    const submissionsCollection = getSubmissionsCollection();
    
    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (program) filter.program = program;
    if (document_type) filter.document_type = document_type;

    const submissions = await submissionsCollection
      .find(filter)
      .sort({ submitted_at: -1 })
      .toArray();

    res.json({ success: true, data: submissions });
  } catch (error) {
    console.error('❌ Error fetching submissions:', error);
    res.status(500).json({ error: 'Error fetching submissions' });
  }
});

// ==================== REPOSITORY ROUTES ====================

// POST copy submission to repository (Manual trigger - requires dean approval)
router.post('/:submission_id/repository', async (req, res) => {
  try {
    const { submission_id } = req.params;

    // 1. Get submission
    const submissionsCollection = getSubmissionsCollection();
    const submission = await submissionsCollection.findOne({ submission_id });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    // 1.5 VALIDATE: Must have chairperson AND dean approval
    if (!submission.chairperson_approval?.approved) {
      return res.status(403).json({ error: 'Chairperson approval required before archiving' });
    }
    if (!submission.dean_approval?.approved) {
      return res.status(403).json({ error: 'Dean approval required before archiving' });
    }

    console.log(`📦 Manual archiving triggered for submission: ${submission_id}`);

    // 2. Get program info
    const programsCollection = getDb().collection('programs');
    const program = await programsCollection.findOne({ program_id: submission.program });
    if (!program) return res.status(404).json({ error: 'Program not found' });

    // 3. Get file requirements for archiving
    const requirementsCollection = getDb().collection('requirements');
    const requirement = await requirementsCollection.findOne({ 
      document_type: submission.document_type,
      is_active: true 
    });

    if (!requirement || !requirement.required_files || requirement.required_files.length === 0) {
      return res.status(400).json({ error: 'No file requirements configured for this document type' });
    }

    // Get the files to archive based on requirements
    const filesToArchive = [];
    const missingRequiredFiles = [];

    for (const fileReq of requirement.required_files) {
      // Only process files marked for archiving
      if (!fileReq.to_be_archived) {
        continue;
      }

      const fileKey = fileReq.id; // e.g., 'manuscript_file', 'abstract_file', etc.
      
      // Use dynamic file finding function
      const foundFile = findFileInSubmission(submission, fileKey);
      
      if (foundFile) {
        // File exists, add to archive list
        filesToArchive.push(foundFile);
      } else {
        // Required archive file is missing
        missingRequiredFiles.push(fileReq.label || fileReq.id);
      }
    }

    // Check if any required archive files are missing
    if (missingRequiredFiles.length > 0) {
      return res.status(400).json({ 
        error: `Missing required archive files: ${missingRequiredFiles.join(', ')}` 
      });
    }

    if (filesToArchive.length === 0) {
      return res.status(400).json({ error: 'No archive files found in submission' });
    }

    // 4. Generate document_id using program acronym
    const document_id = await generateDocumentId(program.program_id);

    // 5. Move files to repository bucket with submission_id in path
    const sourceBucket = process.env.THESISKO_DOCUMENTS_BUCKET;
    const destBucket = process.env.THESISKO_REPOSITORY_BUCKET;
    const archivedFiles = [];

    for (const fileToArchive of filesToArchive) {
      const newKey = `repository-files/${submission_id}/${document_id}/${fileToArchive.filename}`;
      await moveFileBetweenBuckets(sourceBucket, destBucket, fileToArchive.s3_key, newKey);
      archivedFiles.push({
        key: fileToArchive.key,
        file_key: newKey,
        filename: fileToArchive.filename
      });
    }

    // 6. Generate embedding (title + abstract)
    const textToEmbed = `${submission.title || ''} ${submission.abstract || ''}`.trim();
    let embedding = null;
    if (textToEmbed.length > 0) {
      embedding = await generateEmbedding(textToEmbed);
    }

    // 7. Build repository doc dynamically based on submission document structure
    console.log(`📦 Building dynamic repository record for submission: ${submission_id}`);
    console.log(`📋 Submission fields:`, Object.keys(submission));
    
    // System fields that should always be included
    const systemFields = {
      _id: new ObjectId(),
      document_id,
      submission_id,
      abstract_embedding: embedding,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Fields to exclude from submission (system/approval fields)
    const excludeFields = [
      '_id', 'submission_id', 'chairperson_approval', 'dean_approval', 
      'status', 'archived', 'archived_at', 'document_id', 'created_at', 'updated_at'
    ];

    // Preserve all submission fields except excluded ones
    const preservedFields = Object.fromEntries(
      Object.entries(submission).filter(([key, value]) => 
        !excludeFields.includes(key)
      )
    );

    console.log(`✅ Preserved fields:`, Object.keys(preservedFields));
    console.log(`🚫 Excluded fields:`, excludeFields);

    // Calculate document_status based on year
    const currentYear = new Date().getFullYear();
    let year = submission.year;
    
    // If no year exists, set it to current year
    if (!year) {
      year = currentYear;
      console.log(`📅 Document has no year, setting to current year: ${year}`);
    }
    
    // Calculate age and set document_status
    const age = currentYear - year;
    const documentStatus = age >= 5 ? 'old' : 'active';
    console.log(`📊 Document year: ${year}, age: ${age}, status: ${documentStatus}`);

    // Build the repository record dynamically
    const recordDoc = {
      ...systemFields,
      ...preservedFields,
      year: year, // Ensure year is set
      document_status: documentStatus, // Add document status
      files: archivedFiles // Override with archived files
    };

    console.log(`📄 Final repository record fields:`, Object.keys(recordDoc));

    // 8. Insert into records
    const recordsCollection = getRecordsCollection();
    await recordsCollection.insertOne(recordDoc);

    console.log(`✅ Repository record created successfully: ${document_id}`);

    res.json({
      success: true,
      message: 'Record successfully created in repository',
      submission_id,
      document_id,
      record: recordDoc,
    });
  } catch (err) {
    console.error('❌ Error copying to repository:', err);
    res.status(500).json({ error: 'Error copying to repository' });
  }
});

export default router;

