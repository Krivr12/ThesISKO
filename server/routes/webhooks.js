import express from 'express';
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
 * Verify Resend webhook signature using signing secret (Svix).
 * Requires raw request body and svix-id, svix-timestamp, svix-signature headers.
 */
function verifyResendWebhook(req) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('RESEND_WEBHOOK_SECRET is not set');
  }
  const payload = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
  const id = req.headers['svix-id'];
  const timestamp = req.headers['svix-timestamp'];
  const signature = req.headers['svix-signature'];
  if (!id || !timestamp || !signature) {
    throw new Error('Missing Svix headers');
  }
  const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');
  return resend.webhooks.verify({
    payload,
    headers: { id, timestamp, signature },
    webhookSecret: secret,
  });
}

/**
 * POST /webhooks/resend/inbound
 * 
 * Webhook endpoint for Resend inbound email events.
 * Verifies webhook signature before processing.
 * Event type: email.received
 */
router.post('/resend/inbound', async (req, res) => {
  try {
    // Verify signature (prevents forged webhooks)
    let event;
    try {
      event = verifyResendWebhook(req);
    } catch (verifyErr) {
      console.error('❌ Resend webhook signature verification failed:', verifyErr.message);
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
    if (!event) {
      event = req.body;
    }
    
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

        // Email content processing - Future enhancement
        // Can be extended to:
        // - Save to database, forward to services, trigger automation, parse data

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

    // Email processing logic can be added here
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
    
    // Still return 200 to prevent Resend from retrying
    // (unless you want retries for transient errors)
    res.status(200).json({
      received: true,
      error: 'Processing failed but webhook acknowledged'
    });
  }
});

/**
 * Process inbound email asynchronously
 * Add your business logic here
 */
async function processInboundEmail(emailData) {
  try {
    console.log('🔄 Processing inbound email:', emailData.emailId);
    
    // Email processing logic - Future enhancement
    // Can be extended for:
    // - Database storage, automation forwarding, notifications, data parsing, workflow triggers

    console.log('✅ Email processing completed');
  } catch (error) {
    console.error('❌ Error in processInboundEmail:', error);
  }
}

export default router;
