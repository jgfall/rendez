import { NextRequest, NextResponse } from 'next/server';
import { sendProposalLinkEmail } from '@/lib/email';

/**
 * Send proposal link email to client
 */
export async function POST(request: NextRequest) {
  try {
    const { clientEmail, clientName, guideName, tourName, proposalUrl } = await request.json();

    if (!clientEmail || !clientName || !guideName || !tourName || !proposalUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await sendProposalLinkEmail(
      clientEmail,
      clientName,
      guideName,
      tourName,
      proposalUrl
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in send proposal link endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

