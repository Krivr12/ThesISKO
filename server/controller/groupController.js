import pool from '../data/database.js';
import bcrypt from 'bcrypt';
import { generatePassword } from '../utils/passwordGenerator.js';
// Lazy import mailer to ensure environment variables are loaded first

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
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
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
    const existingGroupResult = await client.query(
      'SELECT group_id FROM student_groups WHERE group_id = $1',
      [group_id]
    );

    if (existingGroupResult.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Group ID already exists' 
      });
    }

    // Get leader information from users_info
    const leaderResult = await client.query(
      'SELECT user_id, student_id, firstname, lastname FROM users_info WHERE email = $1 AND student_id IS NOT NULL',
      [leader_email]
    );

    if (leaderResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Leader email not found or not a student' 
      });
    }

    const leader = leaderResult.rows[0];

    // Get all member information
    const memberEmails = members.map(m => m.email);
    const placeholders = memberEmails.map((_, index) => `$${index + 1}`).join(',');
    
    const memberResults = await client.query(
      `SELECT user_id, student_id, email, firstname, lastname 
       FROM users_info 
       WHERE email IN (${placeholders}) AND student_id IS NOT NULL`,
      memberEmails
    );

    if (memberResults.rows.length !== members.length) {
      const foundEmails = memberResults.rows.map(m => m.email);
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
    await client.query(
      'INSERT INTO student_groups (group_id, leader_id, username, password) VALUES ($1, $2, $3, $4)',
      [group_id, leader.student_id, group_id, hashedPassword]
    );

    // Add leader to group_members table with "Leader" label
    await client.query(
      'INSERT INTO group_members (group_id, user_id, label, name) VALUES ($1, $2, $3, $4)',
      [group_id, leader.user_id, 'Leader', leader_text]
    );

    // Add all members to group_members table
    for (let i = 0; i < members.length; i++) {
      const member = memberResults.rows.find(m => m.email === members[i].email);
      await client.query(
        'INSERT INTO group_members (group_id, user_id, label, name) VALUES ($1, $2, $3, $4)',
        [group_id, member.user_id, 'Member', members[i].text]
      );
    }

    // Update group_id in users_info for all group members (leader + members)
    const allUserIds = [leader.user_id, ...memberResults.rows.map(m => m.user_id)];
    const userIdPlaceholders = allUserIds.map((_, index) => `$${index + 2}`).join(',');
    
    await client.query(
      `UPDATE users_info SET group_id = $1 WHERE user_id IN (${userIdPlaceholders})`,
      [group_id, ...allUserIds]
    );

    // Commit the transaction first
    await client.query('COMMIT');

    // Prepare member list for email
    const memberList = memberResults.rows.map((member, index) => {
      const memberText = members.find(m => m.email === member.email).text;
      return `${member.firstname} ${member.lastname} (${member.email}) - ${memberText}`;
    }).join('<br>');

    // Send email to leader with group credentials (outside transaction)
    let emailSent = false;
    let emailError = null;
    
    try {
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

      // Attempting to send email to group leader

      // Lazy import transporter to ensure environment variables are loaded
      const { transporter } = await import('../config/mailer.js');
      
      const emailOptions = {
        from: `"ThesISKO System" <${process.env.MAIL_FROM || process.env.SMTP_USER}>`,
      to: leader_email,
      subject: emailSubject,
        text: emailBody,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Group Account Created - ThesISKO</title>
          </head>
          <body style="margin: 0; padding: 20px; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #800000 0%, #a52a2a 100%); padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                  🎓 Group Account Created!
                </h1>
                <p style="color: #f8f8f8; margin: 10px 0 0 0; font-size: 16px;">
                  Polytechnic University of the Philippines
                </p>
              </div>
              
              <!-- Main Content -->
              <div style="padding: 40px 30px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h2 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 24px;">
                    Hello ${leader.firstname} ${leader.lastname}! 👋
                  </h2>
                  <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0;">
                    Your student group account has been created successfully in the ThesISKO system!
                  </p>
                </div>
                
                <!-- Group Information Card -->
                <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border: 2px solid #800000; border-radius: 12px; padding: 25px; margin: 25px 0; position: relative;">
                  <div style="position: absolute; top: -12px; left: 20px; background: #800000; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold;">
                    👥 Group Login Credentials
                  </div>
                  
                  <div style="margin-top: 15px;">
                    <div style="margin-bottom: 15px; padding: 12px; background: #ffffff; border-radius: 8px; border-left: 4px solid #800000;">
                      <strong style="color: #495057; display: block; margin-bottom: 5px;">🆔 Group ID:</strong>
                      <span style="color: #2c3e50; font-size: 16px; font-family: 'Courier New', monospace;">${group_id}</span>
                    </div>
                    
                    <div style="margin-bottom: 15px; padding: 12px; background: #ffffff; border-radius: 8px; border-left: 4px solid #007bff;">
                      <strong style="color: #495057; display: block; margin-bottom: 5px;">👤 Username:</strong>
                      <span style="color: #2c3e50; font-size: 16px; font-family: 'Courier New', monospace;">${group_id}</span>
                    </div>
                    
                    <div style="padding: 12px; background: #ffffff; border-radius: 8px; border-left: 4px solid #28a745;">
                      <strong style="color: #495057; display: block; margin-bottom: 5px;">🔑 Password:</strong>
                      <span style="background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 8px 12px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; display: inline-block;">${plainPassword}</span>
                    </div>
                  </div>
                </div>
                
                <!-- Your Role -->
                <div style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 10px; padding: 20px; margin: 25px 0;">
                  <h3 style="color: #1976d2; margin: 0 0 10px 0; font-size: 18px;">
                    📝 Your Role:
                  </h3>
                  <p style="color: #333; margin: 0; font-size: 16px; font-weight: 600;">
                    ${leader_text}
                  </p>
                </div>
                
                <!-- Group Members -->
                <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 10px; padding: 20px; margin: 25px 0;">
                  <h3 style="color: #495057; margin: 0 0 15px 0; font-size: 18px;">
                    👥 Group Members:
                  </h3>
                  <div style="color: #333; line-height: 1.8; white-space: pre-line;">${memberList}</div>
                </div>
                
                <!-- Security Note -->
                <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; color: #856404; font-size: 14px;">
                    <strong>🔒 Important:</strong> Please keep this information secure and share the login credentials with your group members as needed for thesis submission and management.
                  </p>
                </div>
                
                <!-- Important Notice -->
                <div style="text-align: center; margin-top: 30px;">
                  <p style="color: #666; font-size: 15px; line-height: 1.6;">
                    If you have any questions, please contact your faculty advisor or system administrator.
                  </p>
                  <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #721c24; font-size: 14px;">
                      <strong>⚠️ Important:</strong> If this email is not intended for you, please ignore it or report it to 
                      <a href="mailto:thesiskopup@gmail.com" style="color: #800000; text-decoration: underline;">thesiskopup@gmail.com</a>
                    </p>
                  </div>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background: #2c3e50; padding: 20px; text-align: center;">
                <p style="color: #bdc3c7; margin: 0; font-size: 13px;">
                  This is an automated message from the ThesISKO System<br>
                  Polytechnic University of the Philippines | Manila, Philippines
                </p>
                <p style="color: #95a5a6; margin: 10px 0 0 0; font-size: 12px;">
                  Please do not reply to this email
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      };
      
      const result = await transporter.sendMail(emailOptions);
      // Email sent successfully

      emailSent = true;
      // Email sent successfully to group leader
    } catch (error) {
      emailError = error;
      console.error('Failed to send email:', error);
      console.error('Email error details:', {
        message: error.message,
        code: error.code,
        response: error.response
      });
    }

    res.status(201).json({
      message: 'Student group created successfully',
      group_id: group_id,
      leader: {
        name: `${leader.firstname} ${leader.lastname}`,
        email: leader_email,
        role: leader_text
      },
      members_count: members.length,
      email_status: {
        sent: emailSent,
        recipient: leader_email,
        error: emailError ? emailError.message : null
      },
      credentials_sent_to: emailSent ? leader_email : null,
      note: emailSent ? 'Group created and email sent successfully' : 'Group created but email failed to send'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating student group:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  } finally {
    client.release();
  }
};

/**
 * Get all student groups
 */
export const getAllGroups = async (req, res) => {
  try {
    // Get groups with member details
    const result = await pool.query(
      `SELECT sg.group_id, sg.username, sg.created_at,
              ui.firstname as leader_firstname, ui.lastname as leader_lastname, ui.email as leader_email,
              COUNT(gm.user_id) as member_count
       FROM student_groups sg
       JOIN users_info ui ON sg.leader_id = ui.student_id
       LEFT JOIN group_members gm ON sg.group_id = gm.group_id
       GROUP BY sg.group_id, sg.username, sg.created_at, ui.firstname, ui.lastname, ui.email
       ORDER BY sg.created_at DESC`
    );

    // Get member details for each group
    const groupsWithMembers = await Promise.all(
      result.rows.map(async (group) => {
        const membersResult = await pool.query(
          `SELECT gm.label, ui.email
           FROM group_members gm
           JOIN users_info ui ON gm.user_id = ui.user_id
           WHERE gm.group_id = $1`,
          [group.group_id]
        );

        const members = membersResult.rows.map(member => member.label);
        const memberEmails = membersResult.rows.map(member => member.email);

        return {
      group_id: group.group_id,
          title: `Group ${group.group_id}`, // Default title, can be updated later
          leader: `${group.leader_firstname} ${group.leader_lastname}`,
          leader_email: group.leader_email,
          members: members,
          member_emails: memberEmails,
          status: 'Ongoing', // Default status, can be updated based on your business logic
          submitted_at: group.created_at,
      username: group.username,
      member_count: group.member_count
        };
      })
    );

    res.status(200).json({
      groups: groupsWithMembers,
      total_count: groupsWithMembers.length
    });

  } catch (error) {
    console.error('Error getting all groups:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
