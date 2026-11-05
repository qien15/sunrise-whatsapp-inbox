import React, { useState, useRef, useEffect } from 'react';
import {
  Conversation,
  Message,
  CSWCountdown,
  MessageSource,
  ApprovedTemplate,
} from '../types/inbox';
import { APPROVED_TEMPLATES } from '../hooks/useInboxStore';

interface ChatViewportProps {
  conversation: Conversation | null;
  messages: Message[];
  cswCountdown: CSWCountdown;
  onSendMessage: (params: {
    content: string;
    source?: MessageSource;
    templateName?: string;
    overrideWarning?: boolean;
  }) => void;
  sendKillSwitchActive: boolean;
}

export const ChatViewport: React.FC<ChatViewportProps> = ({
  conversation,
  messages,
  cswCountdown,
  onSendMessage,
  sendKillSwitchActive,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ApprovedTemplate | null>(null);
  const [templateParamValues, setTemplateParamValues] = useState<Record<string, string>>({});
  const [unlockedCoexistenceWarning, setUnlockedCoexistenceWarning] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset unlocked state when switching conversations
  useEffect(() => {
    setUnlockedCoexistenceWarning(false);
    setSelectedTemplate(null);
    setTemplateParamValues({});
    setInputText('');
  }, [conversation?.id]);

  if (!conversation) {
    return (
      <main className="flex-1 h-full bg-slate-50 flex items-center justify-center text-slate-400 select-none">
        <div className="text-center">
          <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-sm font-medium">请从左侧选择一个会话开始沟通</p>
        </div>
      </main>
    );
  }

  const isCoexistenceLine = conversation.line === 'bd' || conversation.line === 'recruit';
  const isOptedOut = conversation.contact.consentStatus === 'opt_out';
  const isWindowActive = cswCountdown.isActive;

  // Handle template selection
  const handleSelectTemplate = (tpl: ApprovedTemplate) => {
    setSelectedTemplate(tpl);
    const initialParams: Record<string, string> = {};
    tpl.parameters.forEach((param) => {
      if (param.includes('name')) {
        initialParams[param] = conversation.contact.name;
      } else {
        initialParams[param] = '';
      }
    });
    setTemplateParamValues(initialParams);
  };

  // Compile final message content for template
  const getCompiledTemplateContent = () => {
    if (!selectedTemplate) return '';
    let result = selectedTemplate.body;
    Object.entries(templateParamValues).forEach(([key, val]) => {
      result = result.replace(key, val || `[${key}]`);
    });
    return result;
  };

  // Send action
  const handleSend = () => {
    try {
      setErrorToast(null);

      if (sendKillSwitchActive) {
        setErrorToast('全局紧急停止开关已启动，禁止发送！');
        return;
      }

      if (isOptedOut) {
        setErrorToast('该联系人已退订 (Opt-out)，无法发送！');
        return;
      }

      // If CSW is expired, must use template
      if (!isWindowActive) {
        if (!selectedTemplate) {
          setErrorToast('24小时服务窗口已过期，请在下方选择审批通过的 Meta 模板！');
          return;
        }
        const compiled = getCompiledTemplateContent();
        onSendMessage({
          content: compiled,
          source: 'web_human',
          templateName: selectedTemplate.name,
          overrideWarning: true,
        });
        setSelectedTemplate(null);
        setTemplateParamValues({});
        return;
      }

      // Active CSW standard message
      if (!inputText.trim()) return;

      onSendMessage({
        content: inputText.trim(),
        source: 'web_human',
        overrideWarning: unlockedCoexistenceWarning,
      });

      setInputText('');
    } catch (err: any) {
      setErrorToast(err?.message || '发送失败');
    }
  };

  // Format message bubble time
  const formatMsgTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <main className="flex-1 h-full bg-slate-100 flex flex-col min-w-0 relative">
      {/* 1. Chat Header */}
      <div className="h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between select-none shadow-sm shrink-0 z-10">
        <div className="flex items-center space-x-3 truncate">
          <div className="flex flex-col truncate">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm text-slate-900 truncate">
                {conversation.contact.name}
              </span>
              <span className="text-xs font-mono text-slate-500">
                +{conversation.contact.waId}
              </span>
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
                  Recruit 手机共存
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
                  : 'Dualhook 手机 App 实时同步中'}
              </span>
            </div>
          </div>
        </div>

        {/* 24-hour Customer Service Window (CSW) Live Ticker */}
        <div className="flex items-center space-x-3">
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

      {/* Global Error Toast */}
      {errorToast && (
        <div className="bg-red-500 text-white text-xs px-4 py-2 flex items-center justify-between shadow-md transition-all">
          <div className="flex items-center space-x-2">
            <span>⚠️ {errorToast}</span>
          </div>
          <button
            onClick={() => setErrorToast(null)}
            className="text-white hover:text-red-200 font-bold ml-4"
          >
            ✕
          </button>
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
                      {/* Source Badge Header */}
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
                        {isWebHuman && <span>💻 网页端人工回复</span>}
                        {msg.templateName && (
                          <span className="ml-1 px-1 py-0.2 bg-black/20 rounded font-mono text-[9px]">
                            {msg.templateName}
                          </span>
                        )}
                      </div>

                      {/* Bubble Text */}
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>

                      {/* Bubble Timestamp & Status */}
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

                    {/* Pricing Tooltip Badge (Visible on hover or subtle below) */}
                    {msg.pricing && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 mt-1 flex items-center space-x-1 text-[10px] text-slate-500 bg-white/90 px-2 py-0.5 rounded shadow border border-slate-200">
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

      {/* 3. Bottom Guardrails & Input Zone */}
      <div className="border-t border-slate-200 bg-white p-3 shrink-0 select-none">
        {/* Guardrail 1: Global Kill Switch Block */}
        {sendKillSwitchActive && (
          <div className="mb-2 p-2.5 bg-red-600 text-white rounded-lg flex items-center justify-between text-xs font-semibold shadow-inner">
            <div className="flex items-center space-x-2">
              <span className="text-base">🚨</span>
              <span>全局紧急停止开关 (SEND_KILL_SWITCH) 已开启，所有发信渠道已被强行切断！</span>
            </div>
            <span className="px-2 py-0.5 bg-red-800 rounded text-[10px]">系统制动保护中</span>
          </div>
        )}

        {/* Guardrail 2: Opt-out Blocker */}
        {isOptedOut && (
          <div className="mb-2 p-2.5 bg-rose-100 border border-rose-300 text-rose-800 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-base">🛑</span>
              <span className="font-semibold">
                候选人已明确退订 (Opt-out)，依据 WhatsApp 商业政策已严禁向其投递任何消息。
              </span>
            </div>
          </div>
        )}

        {/* Guardrail 3: BD/Recruit Coexistence Cost Warning & Unlock Button */}
        {isCoexistenceLine && !unlockedCoexistenceWarning && !isOptedOut && (
          <div className="mb-2 p-2.5 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center space-x-2">
              <span className="text-base">⚠️</span>
              <div>
                <span className="font-bold">BD/Recruit 共存线路提示：</span>
                <span>建议优先使用手机 WhatsApp App 免费直接回复。网页端直接发信将产生 API 计费！</span>
              </div>
            </div>
            <button
              onClick={() => setUnlockedCoexistenceWarning(true)}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold transition-colors shrink-0 shadow-sm"
            >
              已知晓，解锁网页发送
            </button>
          </div>
        )}

        {/* Guardrail 4: Expired 24h CSW Window -> Template Forced Selector */}
        {!isWindowActive && !isOptedOut && (
          <div className="mb-3 p-3 bg-slate-50 border border-slate-300 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>24 小时服务窗口已过期：禁止自由文字输入，必须选择 Meta 审批模板唤醒</span>
              </div>
              <span className="text-[10px] text-slate-400">Meta Utility / Marketing Template</span>
            </div>

            {/* Template Selection Dropdown / Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              {APPROVED_TEMPLATES.map((tpl) => {
                const isSelected = selectedTemplate?.name === tpl.name;
                return (
                  <button
                    key={tpl.name}
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`p-2 rounded-md text-left text-xs transition-all border ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold ring-1 ring-blue-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="truncate font-medium">{tpl.displayName}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tpl.category}</div>
                  </button>
                );
              })}
            </div>

            {/* Template Parameter Fill Form */}
            {selectedTemplate && (
              <div className="p-2.5 bg-white rounded border border-blue-200 mt-2 space-y-2">
                <div className="text-[11px] font-semibold text-blue-900">
                  模板变量填入：
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {selectedTemplate.parameters.map((param) => (
                    <div key={param} className="flex items-center space-x-2 text-xs">
                      <span className="font-mono text-slate-500 text-[11px] w-28 shrink-0">
                        {param}:
                      </span>
                      <input
                        type="text"
                        value={templateParamValues[param] || ''}
                        onChange={(e) =>
                          setTemplateParamValues((prev) => ({
                            ...prev,
                            [param]: e.target.value,
                          }))
                        }
                        placeholder={`输入 ${param}`}
                        className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  ))}
                </div>

                {/* Preview Box */}
                <div className="p-2 bg-slate-50 rounded text-xs text-slate-700 font-sans border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-medium mb-1">模板发送预览：</div>
                  {getCompiledTemplateContent()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input Bar */}
        <div className="flex items-center space-x-2">
          {/* Quick attachment button */}
          <button
            disabled={!isWindowActive || isOptedOut || sendKillSwitchActive}
            className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-40 disabled:hover:text-slate-400 transition-colors"
            title="添加附件 / 职位描述 PDF"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          {/* Text Input (Locked when CSW Expired) */}
          <input
            type="text"
            value={isWindowActive ? inputText : selectedTemplate ? '已选择审批模板 (点击右侧发送模板)' : '24H 窗口已过期，请在上方选择模板'}
            onChange={(e) => isWindowActive && setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={!isWindowActive || isOptedOut || sendKillSwitchActive || (isCoexistenceLine && !unlockedCoexistenceWarning)}
            placeholder={
              !isWindowActive
                ? '窗口已过期：普通文字输入已锁定'
                : isCoexistenceLine && !unlockedCoexistenceWarning
                ? '共存防呆：请先点击上方“已知晓，解锁网页发送”'
                : '输入消息回复候选人 (按 Enter 发送)...'
            }
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all"
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={
              sendKillSwitchActive ||
              isOptedOut ||
              (isCoexistenceLine && !unlockedCoexistenceWarning) ||
              (isWindowActive && !inputText.trim()) ||
              (!isWindowActive && !selectedTemplate)
            }
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all disabled:cursor-not-allowed"
          >
            <span>{!isWindowActive ? '发送模板' : '发送'}</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
};

