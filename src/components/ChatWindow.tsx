import React, { useRef, useEffect, useState } from 'react';
import {
  Conversation,
  Message,
  CSWCountdown,
  MessageSource,
  AuditLogEntry,
} from '../types/inbox';
import { MessageInput } from './MessageInput';
import { useAuth } from '../context/AuthContext';

export interface ChatWindowProps {
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

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  messages,
  cswCountdown,
  onSendMessage,
  sendKillSwitchActive,
  auditLogs = [],
  onLogTemplateVariableFilled,
}) => {
  const { currentUser, isLeadOrAdmin } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);

  // Auto-scroll to bottom on messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close audit drawer on conversation change
  useEffect(() => {
    setShowAuditDrawer(false);
  }, [conversation?.id]);

  if (!conversation) {
    return (
      <main className="flex-1 h-full bg-slate-50 flex items-center justify-center text-slate-400 select-none">
        <div className="text-center">
          <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium">请从左侧选择一个会话开始沟通</p>
        </div>
      </main>
    );
  }

  const isRecruitLine = conversation.line === 'recruit';
  const isWindowActive = cswCountdown.isActive;
  const conversationAuditLogs = auditLogs.filter(
    (log) => log.conversationId === conversation.id
  );

  const formatMsgTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatAuditTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  };

  return (
    <main className="flex-1 h-full bg-slate-100 flex flex-col min-w-0 relative">
      {/* 1. Chat Header */}
      <div className="h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between select-none shadow-xs shrink-0 z-10">
        <div className="flex items-center space-x-3 truncate">
          <div className="flex flex-col truncate">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm text-slate-900 truncate">
                {conversation.contact.name}
              </span>
              <span className="text-xs font-mono text-slate-500">
                +{conversation.contact.waId}
              </span>

              {/* Line Badges */}
              {conversation.line === 'official' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">
                  Official 线路
                </span>
              )}
              {conversation.line === 'bd' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                  BD 手机共存
                </span>
              )}
              {conversation.line === 'recruit' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                  Recruit 招聘专线
                </span>
              )}

              {/* Assigned Recruiter Tag for Recruit Line */}
              {isRecruitLine && conversation.contact.assignedTo && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  顾问: {conversation.contact.assignedTo}
                </span>
              )}

              {/* Lead Takeover Indicator */}
              {isRecruitLine && isLeadOrAdmin && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1">
                  <span>⚡</span>
                  <span>Lead 接管权限激活</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-slate-400">
              <span>BSUID: {conversation.contact.bsuid || '未绑定'}</span>
              <span>•</span>
              <span>
                {conversation.line === 'official'
                  ? conversation.humanTakeover
                    ? '人工接管中 (Bot 已停用)'
                    : 'n8n Bot 自动托管中'
                  : conversation.line === 'recruit'
                  ? 'Recruit 专线：已开启操作人审计与多招聘官账户控制'
                  : 'Dualhook 手机 App 实时同步中'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Header Tools: Audit Log Drawer Toggle & CSW Ticker */}
        <div className="flex items-center space-x-3">
          {/* Recruit Line Audit Log View Button */}
          {isRecruitLine && (
            <button
              onClick={() => setShowAuditDrawer(!showAuditDrawer)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                showAuditDrawer
                  ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                  : 'bg-white hover:bg-purple-50 text-purple-700 border-purple-200 shadow-2xs'
              }`}
              title="查看该候选人的 Recruit 专线操作与审计流水"
            >
              <span>📜 专线审计流水</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  showAuditDrawer ? 'bg-white text-purple-800' : 'bg-purple-100 text-purple-800'
                }`}
              >
                {conversationAuditLogs.length}
              </span>
            </button>
          )}

          {/* 24-hour Customer Service Window (CSW) Live Ticker */}
          <div
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
              isWindowActive
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isWindowActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <div className="flex flex-col items-end">
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  24H CSW
                </span>
                <span className="font-mono font-bold">{cswCountdown.formattedRemaining}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Drawer Side/Top Overlay (When toggled on Recruit Line) */}
      {isRecruitLine && showAuditDrawer && (
        <div className="bg-purple-950 text-purple-100 p-3.5 border-b border-purple-800 shadow-lg animate-fade-in z-20">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-purple-800/80">
            <div className="flex items-center space-x-2">
              <span className="text-base">🛡️</span>
              <div>
                <h4 className="text-xs font-bold text-white">
                  Recruit 专线操作合规与安全审计流水 (Audit Trail)
                </h4>
                <p className="text-[10px] text-purple-300">
                  实时记录管理者接管代发、顾问直接回复、模板变量填入及候选人状态变动
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAuditDrawer(false)}
              className="text-purple-300 hover:text-white text-xs px-2 py-1 rounded hover:bg-purple-800"
            >
              关闭 ✕
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
            {conversationAuditLogs.length === 0 ? (
              <div className="text-center py-4 text-purple-300 text-xs">
                暂无当前会话的操作审计记录，发送消息或填入模板将自动生成
              </div>
            ) : (
              conversationAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-purple-900/60 p-2 rounded border border-purple-800 flex items-start justify-between text-[11px]"
                >
                  <div className="flex items-start space-x-2">
                    <span className="mt-0.5 text-xs">
                      {log.actionType === 'message_sent'
                        ? '💬'
                        : log.actionType === 'template_variable_filled'
                        ? '📝'
                        : '👤'}
                    </span>
                    <div>
                      <div className="font-medium text-white flex items-center space-x-1.5">
                        <span>{log.summary}</span>
                        {log.actingAsName && (
                          <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[9px] font-mono">
                            代发代理
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-purple-300 mt-0.5">
                        操作人: <span className="font-semibold text-purple-200">{log.operatorName}</span> ({log.operatorRole})
                        {log.details?.templateName && (
                          <span> • 模板: {log.details.templateName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-purple-400 shrink-0 ml-3">
                    {formatAuditTime(log.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. Message History Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400">
            暂无历史消息记录
          </div>
        ) : (
          messages.map((msg) => {
            const isCandidate = msg.source === 'candidate';
            const isBot = msg.source === 'bot';
            const isWebHuman = msg.source === 'web_human';
            const isPhoneApp = msg.source === 'phone_app';
            const isImported = msg.source === 'imported';

            return (
              <div
                key={msg.id}
                className={`flex flex-col group ${
                  isCandidate ? 'items-start' : isImported ? 'items-center' : 'items-end'
                }`}
              >
                {/* Imported Historical Message */}
                {isImported ? (
                  <div className="my-2 px-3 py-1 bg-slate-200/70 text-slate-600 rounded-full text-[11px] flex items-center space-x-1.5 border border-slate-300">
                    <span>🕓</span>
                    <span>{msg.content}</span>
                    <span className="text-[10px] text-slate-400">
                      {formatMsgTime(msg.timestamp)}
                    </span>
                  </div>
                ) : (
                  <div
                    className={`max-w-[72%] relative flex flex-col ${
                      isCandidate ? 'items-start' : 'items-end'
                    }`}
                  >
                    {/* Message Bubble */}
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm relative transition-all ${
                        isCandidate
                          ? 'bg-white text-slate-800 rounded-tl-sm border border-slate-200/80'
                          : isBot
                          ? 'bg-purple-600 text-white rounded-tr-sm shadow-purple-600/10'
                          : isPhoneApp
                          ? 'bg-emerald-600 text-white rounded-tr-sm shadow-emerald-600/10'
                          : 'bg-blue-600 text-white rounded-tr-sm shadow-blue-600/10'
                      }`}
                    >
                      {/* Source & Recruiter Identification Header */}
                      <div
                        className={`flex items-center space-x-1 mb-1 text-[10px] font-semibold ${
                          isCandidate
                            ? 'text-slate-400'
                            : isBot
                            ? 'text-purple-200'
                            : isPhoneApp
                            ? 'text-emerald-200'
                            : 'text-blue-200'
                        }`}
                      >
                        {isCandidate && <span>📥 候选人</span>}
                        {isBot && <span>🤖 n8n Bot 自动回复</span>}
                        {isPhoneApp && <span>📱 手机端共存 (Dualhook)</span>}
                        {isWebHuman && !isRecruitLine && (
                          <span>💻 网页端人工回复 ({msg.senderName || 'Staff'})</span>
                        )}

                        {/* Recruit Line Sender Header */}
                        {isWebHuman && isRecruitLine && (
                          <span>
                            💻 招聘官视口：{msg.senderName || conversation.contact.assignedTo || 'Staff'}
                          </span>
                        )}

                        {msg.templateName && (
                          <span className="ml-1 px-1 py-0.2 bg-black/20 rounded font-mono text-[9px]">
                            {msg.templateName}
                          </span>
                        )}
                      </div>

                      {/* Bubble Text */}
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>

                      {/* Bubble Timestamp & Delivery Status */}
                      <div
                        className={`flex items-center justify-end space-x-1 mt-1 text-[9px] ${
                          isCandidate ? 'text-slate-400' : 'text-white/70'
                        }`}
                      >
                        <span>{formatMsgTime(msg.timestamp)}</span>
                        {!isCandidate && (
                          <span>
                            {msg.status === 'read' && '✓✓'}
                            {msg.status === 'delivered' && '✓✓'}
                            {msg.status === 'sent' && '✓'}
                            {msg.status === 'pending' && '⏳'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* RECRUIT 专线隔离专属：操作人审计与代发标签 (Auto-Logging Badge) */}
                    {isRecruitLine && msg.audit && (
                      <div className="mt-1 flex items-center space-x-1 text-[10px] shadow-2xs">
                        {msg.audit.actionType === 'delegated_send' ? (
                          <div className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 font-semibold flex items-center space-x-1">
                            <span>🛡️</span>
                            <span>{msg.audit.displayText}</span>
                            <span className="text-[9px] text-amber-700 font-normal">
                              (管理员接管)
                            </span>
                          </div>
                        ) : (
                          <div className="px-2 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200 flex items-center space-x-1">
                            <span>👤</span>
                            <span>{msg.audit.displayText}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pricing Tooltip Badge (Visible on hover) */}
                    {msg.pricing && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 mt-1 flex items-center space-x-1 text-[10px] text-slate-500 bg-white/90 px-2 py-0.5 rounded shadow-xs border border-slate-200">
                        <span className="font-semibold text-slate-700">计费:</span>
                        <span
                          className={`font-mono ${
                            msg.pricing.billable ? 'text-amber-600 font-bold' : 'text-emerald-600'
                          }`}
                        >
                          {msg.pricing.billable
                            ? `收费 (${msg.pricing.category.toUpperCase()}) ~ $${msg.pricing.estimatedCostUSD || '0.015'}`
                            : '免费 (Free)'}
                        </span>
                        {msg.pricing.reason && (
                          <span className="text-slate-400 font-normal">({msg.pricing.reason})</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Message Input Area */}
      <MessageInput
        conversation={conversation}
        cswCountdown={cswCountdown}
        sendKillSwitchActive={sendKillSwitchActive}
        onSendMessage={onSendMessage}
        onLogTemplateVariableFilled={onLogTemplateVariableFilled}
      />
    </main>
  );
};

