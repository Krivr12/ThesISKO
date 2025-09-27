import pool from '../data/database.js';
import bcrypt from 'bcrypt';
import { generatePassword } from '../utils/passwordGenerator.js';
import { transporter } from '../config/mailer.js';

/**
 * Create a student group with leader and members
 * Faculty will provide:
 * - group_id: unique identifier for the group
 * - leader_email: email of the group leader
 * - leader_text: custom text field for leader (entered by faculty)
 * - members: array of objects with email and text fields
 * 
 * The function will:
 * 1. Validate all emails exist in users_info table
 * 2. Get student_ids for leader and members
 * 3. Generate group credentials (username = group_id, random password)
 * 4. Create group record in student_groups table
 * 5. Add members to group_members table
 * 6. Send email to leader with credentials and member list
 */
export const createStudentGroup = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { 
      group_id, 
      leader_email, 
      leader_text, 
      members // array of {email, text}
    } = req.body;

    // Validate required fields
    if (!group_id || !leader_email || !leader_text || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ 
        error: 'group_id, leader_email, leader_text, and members array are required' 
      });
    }

    // Validate members array structure
    for (const member of members) {
      if (!member.email || !member.text) {
        return res.status(400).json({ 
          error: 'Each member must have email and text fields' 
        });
      }
    }

    // Check if group_id already exists
    const [existingGroup] = await connection.execute(
      'SELECT group_id FROM student_groups WHERE group_id = ?',
      [group_id]
    );

    if (existingGroup.length > 0) {
      return res.status(409).json({ 
        error: 'Group ID already exists' 
      });
    }

    // Get leader information from users_info
    const [leaderResult] = await connection.execute(
      'SELECT user_id, student_id, firstname, lastname FROM users_info WHERE email = ? AND student_id IS NOT NULL',
      [leader_email]
    );

    if (leaderResult.length === 0) {
      return res.status(404).json({ 
        error: 'Leader email not found or not a student' 
      });
    }

    const leader = leaderResult[0];

    // Get all member information
    const memberEmails = members.map(m => m.email);
    const placeholders = memberEmails.map(() => '?').join(',');
    
    const [memberResults] = await connection.execute(
      `SELECT user_id, student_id, email, firstname, lastname 
       FROM users_info 
       WHERE email IN (${placeholders}) AND student_id IS NOT NULL`,
      memberEmails
    );

    if (memberResults.length !== members.length) {
      const foundEmails = memberResults.map(m => m.email);
      const missingEmails = memberEmails.filter(email => !foundEmails.includes(email));
      return res.status(404).json({ 
        error: 'Some member emails not found or not students', 
        missing_emails: missingEmails 
      });
    }

    // Generate password and hash it
    const plainPassword = generatePassword(8);
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Create group record in student_groups table
    await connection.execute(
      'INSERT INTO student_groups (group_id, leader_id, username, password) VALUES (?, ?, ?, ?)',
      [group_id, leader.student_id, group_id, hashedPassword]
    );

    // Add leader to group_members table with "Leader" label
    await connection.execute(
      'INSERT INTO group_members (group_id, user_id, label) VALUES (?, ?, ?)',
      [group_id, leader.user_id, leader_text]
    );

    // Add all members to group_members table
    for (let i = 0; i < members.length; i++) {
      const member = memberResults.find(m => m.email === members[i].email);
      await connection.execute(
        'INSERT INTO group_members (group_id, user_id, label) VALUES (?, ?, ?)',
        [group_id, member.user_id, members[i].text]
      );
    }

    // Update group_id in users_info for all group members (leader + members)
    const allUserIds = [leader.user_id, ...memberResults.map(m => m.user_id)];
    const userIdPlaceholders = allUserIds.map(() => '?').join(',');
    
    await connection.execute(
      `UPDATE users_info SET group_id = ? WHERE user_id IN (${userIdPlaceholders})`,
      [group_id, ...allUserIds]
    );

    // Prepare member list for email
    const memberList = memberResults.map((member, index) => {
      const memberText = members.find(m => m.email === member.email).text;
      return `${member.firstname} ${member.lastname} (${member.email}) - ${memberText}`;
    }).join('\n');

    // Send email to leader with group credentials
    const emailSubject = `Group Account Created - ${group_id}`;
    const emailBody = `
Dear ${leader.firstname} ${leader.lastname},

Your student group account has been created successfully!

Group Details:
Username: ${group_id}
Password: ${plainPassword}

Your Role: ${leader_text}

List of Members:
${memberList}

Please keep this information secure and share the login credentials with your group members as needed.

Best regards,
ThesISKO System
    `;

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: leader_email,
      subject: emailSubject,
      text: emailBody
    });

    await connection.commit();

    res.status(201).json({
      message: 'Student group created successfully',
      group_id: group_id,
      leader: {
        name: `${leader.firstname} ${leader.lastname}`,
        email: leader_email,
        role: leader_text
      },
      members_count: members.length,
      credentials_sent_to: leader_email
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error creating student group:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  } finally {
    connection.release();
  }
};

/**
 * Get group information including members
 */
export const getGroupInfo = async (req, res) => {
  try {
    const { group_id } = req.params;

    // Get group basic info
    const [groupResult] = await pool.execute(
      `SELECT sg.group_id, sg.leader_id, sg.username, sg.created_at,
              ui.firstname as leader_firstname, ui.lastname as leader_lastname, ui.email as leader_email
       FROM student_groups sg
       JOIN users_info ui ON sg.leader_id = ui.student_id
       WHERE sg.group_id = ?`,
      [group_id]
    );

    if (groupResult.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = groupResult[0];

    // Get all group members
    const [membersResult] = await pool.execute(
      `SELECT gm.label, ui.firstname, ui.lastname, ui.email, ui.student_id
       FROM group_members gm
       JOIN users_info ui ON gm.user_id = ui.user_id
       WHERE gm.group_id = ?
       ORDER BY gm.label`,
      [group_id]
    );

    res.status(200).json({
      group_id: group.group_id,
      username: group.username,
      created_at: group.created_at,
      leader: {
        student_id: group.leader_id,
        name: `${group.leader_firstname} ${group.leader_lastname}`,
        email: group.leader_email
      },
      members: membersResult.map(member => ({
        student_id: member.student_id,
        name: `${member.firstname} ${member.lastname}`,
        email: member.email,
        role: member.label
      }))
    });

  } catch (error) {
    console.error('Error getting group info:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

/**
 * Delete a student group and all related records
 */
export const deleteStudentGroup = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { group_id } = req.params;

    // Check if group exists
    const [groupResult] = await connection.execute(
      'SELECT group_id FROM student_groups WHERE group_id = ?',
      [group_id]
    );

    if (groupResult.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Get all user_ids in this group before deletion
    const [memberIds] = await connection.execute(
      'SELECT user_id FROM group_members WHERE group_id = ?',
      [group_id]
    );

    // Clear group_id from users_info for all members
    if (memberIds.length > 0) {
      const userIds = memberIds.map(m => m.user_id);
      const placeholders = userIds.map(() => '?').join(',');
      
      await connection.execute(
        `UPDATE users_info SET group_id = NULL WHERE user_id IN (${placeholders})`,
        userIds
      );
    }

    // Delete from student_groups (this will cascade delete group_members due to foreign key)
    await connection.execute(
      'DELETE FROM student_groups WHERE group_id = ?',
      [group_id]
    );

    await connection.commit();

    res.status(200).json({
      message: 'Student group deleted successfully',
      group_id: group_id,
      members_updated: memberIds.length
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error deleting student group:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  } finally {
    connection.release();
  }
};

/**
 * Get all student groups
 */
export const getAllGroups = async (req, res) => {
  try {
    const [groupsResult] = await pool.execute(
      `SELECT sg.group_id, sg.username, sg.created_at,
              ui.firstname as leader_firstname, ui.lastname as leader_lastname, ui.email as leader_email,
              COUNT(gm.user_id) as member_count
       FROM student_groups sg
       JOIN users_info ui ON sg.leader_id = ui.student_id
       LEFT JOIN group_members gm ON sg.group_id = gm.group_id
       GROUP BY sg.group_id, sg.username, sg.created_at, ui.firstname, ui.lastname, ui.email
       ORDER BY sg.created_at DESC`
    );

    const groups = groupsResult.map(group => ({
      group_id: group.group_id,
      username: group.username,
      created_at: group.created_at,
      leader: {
        name: `${group.leader_firstname} ${group.leader_lastname}`,
        email: group.leader_email
      },
      member_count: group.member_count
    }));

    res.status(200).json({
      groups: groups,
      total_count: groups.length
    });

  } catch (error) {
    console.error('Error getting all groups:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
