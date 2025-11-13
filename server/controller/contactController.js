import { sendEmail } from '../services/emailService.js';

/**
 * Submit contact form - sends email to superadmin
 * POST /contact
 * Body: { name, email, subject, message }
 */
export const submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required: name, email, subject, and message'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Import database pool
    const pool = (await import('../data/database.js')).default;

    // Find superadmin user (role_id = 5)
    const superadminResult = await pool.query(
      `SELECT 
        ui.user_id,
        ui.email,
        ui.firstname,
        ui.lastname
      FROM users_info ui
      WHERE ui.role_id = 5
      LIMIT 1`
    );

    if (superadminResult.rows.length === 0) {
      console.error('❌ No superadmin found in database');
      return res.status(500).json({
        success: false,
        error: 'Superadmin not found. Please contact system administrator.'
      });
    }

    const superadmin = superadminResult.rows[0];
    const superadminEmail = superadmin.email;
    const superadminName = `${superadmin.firstname} ${superadmin.lastname}`.trim() || 'Super Admin';

    console.log(`📧 Sending contact form message from ${email} to superadmin: ${superadminEmail}`);

    // Format the message content
    const emailContent = `
You have received a new contact form submission from ThesISKO website.

From: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
This message was sent from the "Got some concerns? Connect with us!" section on the About page.
    `.trim();

    // Send email to superadmin using the general template
    await sendEmail({
      to: superadminEmail,
      subject: `[ThesISKO Contact Form] ${subject}`,
      template: 'general',
      data: {
        title: `[ThesISKO Contact Form] ${subject}`,
        headerIcon: '📧',
        headerTitle: 'New Contact Form Submission',
        recipientName: superadminName,
        message: 'You have received a new contact form submission.',
        mainContent: emailContent,
        footerNote: 'Please respond directly to the user at their provided email address.'
      }
    });

    console.log('✅ Contact form email sent successfully');

    res.json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon!'
    });

  } catch (error) {
    console.error('❌ Error submitting contact form:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error message:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to send message. Please try again later.'
    });
  }
};

