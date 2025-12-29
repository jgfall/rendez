'use client';

import { useState } from 'react';
import { Copy, Check, MessageCircle, Link as LinkIcon } from 'lucide-react';
import { Button, Input } from '@/components/ui';

interface CopyActionsProps {
  proposalUrl: string;
  clientName: string;
  tourName: string;
}

export function CopyActions({ proposalUrl, clientName, tourName }: CopyActionsProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

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
      </div>
    </div>
  );
}

