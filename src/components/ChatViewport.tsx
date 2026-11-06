import React from 'react';
import {
  Conversation,
  Message,
  CSWCountdown,
  MessageSource,
  AuditLogEntry,
} from '../types/inbox';
import { ChatWindow } from './ChatWindow';

export interface ChatViewportProps {
  conversation: Conversation | null;
  messages: Message[];
  cswCountdown: CSWCountdown;
  onSendMessage: (params: {
    content: string;
    source?: MessageSource;
    templateName?: string;
    overrideWarning?: boolean;
    actingAsRecruiter?: string;
    isDelegated?: boolean;
  }) => void;
  sendKillSwitchActive: boolean;
  auditLogs?: AuditLogEntry[];
  onLogTemplateVariableFilled?: (
    conversationId: string,
    templateName: string,
    paramsMap: Record<string, string>,
    actingAs?: string
  ) => void;
}

export const ChatViewport: React.FC<ChatViewportProps> = (props) => {
  return <ChatWindow {...props} />;
};

export { ChatWindow };
