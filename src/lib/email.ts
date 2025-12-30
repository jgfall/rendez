/**
 * Email utility functions using Resend
 * Handles transactional emails for the application
 */

import { Resend } from 'resend';

// Lazy initialization - only create Resend instance when API key is available
let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResend();
    if (!resend) {
      console.error('RESEND_API_KEY is not set');
      return { success: false, error: 'Email service not configured' };
    }

    const from = options.from || process.env.RESEND_FROM_EMAIL || 'Rendez <noreply@rendez.app>';

    const { data, error } = await resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully:', data?.id);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    };
  }
}

/**
 * Send booking request notification to guide
 */
export async function sendBookingRequestEmail(
  guideEmail: string,
  clientName: string,
  tourName: string,
  proposalUrl: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `New Booking Request: ${tourName}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">New Booking Request</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            <strong>${clientName}</strong> has requested to book your tour:
          </p>
          <h2 style="margin: 0 0 20px 0; color: #667eea; font-size: 22px;">${tourName}</h2>
          
          <a href="${proposalUrl}" 
             style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px;">
            View Proposal & Confirm
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Once you confirm the booking and mark the deposit as received, the client will receive confirmation details.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          This email was sent from Rendez. If you have any questions, please contact support.
        </p>
      </body>
    </html>
  `;

  return sendEmail({
    to: guideEmail,
    subject,
    html,
  });
}

/**
 * Send proposal link email to client
 */
export async function sendProposalLinkEmail(
  clientEmail: string,
  clientName: string,
  guideName: string,
  tourName: string,
  proposalUrl: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `Your Tour Proposal: ${tourName}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Your Tour Proposal</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            Hi <strong>${clientName}</strong>,
          </p>
          <p style="margin: 0 0 20px 0; font-size: 16px;">
            ${guideName} has created a personalized tour proposal for you:
          </p>
          <h2 style="margin: 0 0 20px 0; color: #667eea; font-size: 22px;">${tourName}</h2>
          
          <a href="${proposalUrl}" 
             style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px;">
            View Your Proposal
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Click the button above to view your proposal and complete your booking.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          This email was sent from Rendez. If you have any questions, please contact your guide.
        </p>
      </body>
    </html>
  `;

  return sendEmail({
    to: clientEmail,
    subject,
    html,
  });
}

/**
 * Send confirmation email to client
 */
export async function sendConfirmationEmail(
  clientEmail: string,
  clientName: string,
  guideName: string,
  tourName: string,
  proposalUrl: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `Booking Confirmed: ${tourName}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Booking Confirmed!</h1>
        </div>
        
        <div style="background: #f0fdf4; padding: 25px; border-radius: 8px; margin-bottom: 20px; border: 2px solid #10b981;">
          <p style="margin: 0 0 15px 0; font-size: 16px;">
            Hi <strong>${clientName}</strong>,
          </p>
          <p style="margin: 0 0 20px 0; font-size: 16px;">
            Great news! Your booking for <strong>${tourName}</strong> with ${guideName} has been confirmed.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #10b981;">✅ Deposit Received</p>
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              All tour details are now unlocked and available in your proposal.
            </p>
          </div>
          
          <a href="${proposalUrl}" 
             style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px;">
            View Full Details
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Your guide will reach out with any additional information before your tour.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          This email was sent from Rendez. If you have any questions, please contact your guide.
        </p>
      </body>
    </html>
  `;

  return sendEmail({
    to: clientEmail,
    subject,
    html,
  });
}

