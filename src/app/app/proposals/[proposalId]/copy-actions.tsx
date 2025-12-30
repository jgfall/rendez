'use client';

import { useState } from 'react';
import { Copy, Check, MessageCircle, Link as LinkIcon, Mail } from 'lucide-react';
import { Button, Input } from '@/components/ui';

interface CopyActionsProps {
  proposalUrl: string;
  clientName: string;
  tourName: string;
  clientEmail?: string | null;
  guideName?: string;
}

export function CopyActions({ proposalUrl, clientName, tourName, clientEmail, guideName }: CopyActionsProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText(proposalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyWhatsApp = async () => {
    const message = `Hi ${clientName}! 👋\n\nI've prepared a personalized tour proposal for you: ${tourName}\n\nView your proposal here:\n${proposalUrl}\n\nLet me know if you have any questions!`;
    await navigator.clipboard.writeText(message);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2000);
  };

  const sendEmail = async () => {
    if (!clientEmail) {
      alert('Client email is required to send proposal link');
      return;
    }

    setSendingEmail(true);
    try {
      const response = await fetch('/api/email/send-proposal-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail,
          clientName,
          guideName: guideName || 'Your guide',
          tourName,
          proposalUrl,
        }),
      });

      const data = await response.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3000);
    } catch (err) {
      console.error('Failed to send email:', err);
      alert('Failed to send email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={proposalUrl}
          readOnly
          className="flex-1 font-mono text-sm"
        />
        <Button
          onClick={copyLink}
          variant={copiedLink ? 'secondary' : 'outline'}
          icon={copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        >
          {copiedLink ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          variant="outline"
          onClick={copyLink}
          icon={<LinkIcon className="h-4 w-4" />}
          className="justify-start"
        >
          Copy link
        </Button>
        <Button
          variant="outline"
          onClick={copyWhatsApp}
          icon={<MessageCircle className="h-4 w-4" />}
          className="justify-start"
        >
          {copiedWhatsApp ? 'Message copied!' : 'Copy WhatsApp message'}
        </Button>
        {clientEmail && (
          <Button
            variant="outline"
            onClick={sendEmail}
            loading={sendingEmail}
            icon={<Mail className="h-4 w-4" />}
            className="justify-start sm:col-span-2"
          >
            {emailSent ? 'Email sent!' : 'Send proposal link via email'}
          </Button>
        )}
      </div>
    </div>
  );
}

