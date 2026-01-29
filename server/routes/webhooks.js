import express from 'express';
import { Webhook } from 'svix';
import { Resend } from 'resend';

const router = express.Router();

// Initialize Resend client for fetching email content
let resendClient = null;
try {
  if (process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
} catch (error) {
  console.error('⚠️ Failed to initialize Resend client:', error.message);
}

/**
 * Resend inbound webhook handler (raw body required).
 * Mount in server.js with express.raw({ type: 'application/json' }) so req.body is Buffer.
 * Verifies signature using RESEND_WEBHOOK_SECRET (Svix-style headers: svix-id, svix-timestamp, svix-signature).
 */
export async function handleResendInbound(req, res) {
  try {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) {
      console.error('❌ RESEND_WEBHOOK_SECRET is not set');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    const rawBody = req.body instanceof Buffer
      ? req.body.toString('utf8')
      : (typeof req.body === 'string' ? req.body : '');
    if (!rawBody) {
      return res.status(400).json({ error: 'Missing body' });
    }

    const headers = {
      'svix-id': req.headers['svix-id'],
      'svix-timestamp': req.headers['svix-timestamp'],
      'svix-signature': req.headers['svix-signature'],
    };
    if (!headers['svix-id'] || !headers['svix-timestamp'] || !headers['svix-signature']) {
      return res.status(401).json({ error: 'Invalid webhook signature', message: 'Missing Svix headers' });
    }

    const wh = new Webhook(secret);
    try {
      wh.verify(rawBody, headers);
    } catch (verifyError) {
      console.error('❌ Resend webhook signature verification failed:', verifyError.message);
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(rawBody);
    
    console.log('📧 Resend Inbound Email Webhook Received:');
    console.log('Event Type:', event.type);
    console.log('Event Data:', JSON.stringify(event, null, 2));

    // Verify this is an email.received event
    if (event.type !== 'email.received') {
      console.log('⚠️ Ignoring non-email.received event:', event.type);
      return res.status(200).json({ received: true, message: 'Event ignored' });
    }

    // Extract email metadata from the webhook payload
    const emailData = event.data;
    const emailId = emailData.id;
    const from = emailData.from;
    const to = emailData.to;
    const subject = emailData.subject;
    const createdAt = emailData.created_at;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📬 INBOUND EMAIL RECEIVED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email ID:', emailId);
    console.log('From:', from);
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Created At:', createdAt);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Fetch full email content using Resend Receiving API
    if (resendClient && emailId) {
      try {
        // Note: Resend Receiving API endpoint structure
        // You may need to adjust this based on Resend's actual API
        const emailContent = await resendClient.emails.get(emailId);
        
        console.log('📄 Full Email Content Retrieved:');
        console.log('HTML Body Length:', emailContent?.html?.length || 0);
        console.log('Text Body Length:', emailContent?.text?.length || 0);
        console.log('Attachments:', emailContent?.attachments?.length || 0);

        // TODO: Process the email content here
        // Examples:
        // - Save to database
        // - Forward to another service
        // - Trigger automation
        // - Send notification
        // - Parse and extract data

        // Example: Log full content (remove in production)
        if (process.env.NODE_ENV === 'development') {
          console.log('Email HTML:', emailContent?.html?.substring(0, 200) + '...');
        }

      } catch (apiError) {
        console.error('⚠️ Failed to fetch email content from Resend API:', apiError.message);
        // Continue processing with metadata only
      }
    }

    // Respond immediately to Resend (within 5 seconds)
    // Process email asynchronously if needed
    res.status(200).json({
      received: true,
      message: 'Webhook processed successfully',
      emailId: emailId
    });

    // TODO: Add your email processing logic here
    // This runs after the response is sent
    processInboundEmail({
      emailId,
      from,
      to,
      subject,
      createdAt,
      event
    });

  } catch (error) {
    console.error('❌ Error processing Resend inbound webhook:', error);
    if (!res.headersSent) {
      res.status(200).json({
        received: true,
        error: 'Processing failed but webhook acknowledged'
      });
    }
  }
}

/**
 * POST /webhooks/resend/inbound is mounted in server.js with raw body + handleResendInbound.
 * Router below is for any other webhook routes.
 */

/**
 * Process inbound email asynchronously
 * Add your business logic here
 */
async function processInboundEmail(emailData) {
  try {
    console.log('🔄 Processing inbound email:', emailData.emailId);
    
    // TODO: Implement your email processing logic
    // Examples:
    // 
    // 1. Save to database
    // await saveEmailToDatabase(emailData);
    //
    // 2. Forward to Zapier/Make.com webhook
    // await forwardToAutomation(emailData);
    //
    // 3. Send notification
    // await sendNotification(emailData);
    //
    // 4. Parse and extract structured data
    // const extractedData = await parseEmail(emailData);
    //
    // 5. Trigger workflow
    // await triggerWorkflow(emailData);

    console.log('✅ Email processing completed');
  } catch (error) {
    console.error('❌ Error in processInboundEmail:', error);
  }
}

export default router;
