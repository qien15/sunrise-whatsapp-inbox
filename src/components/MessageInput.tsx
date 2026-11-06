import React, { useState, useEffect } from 'react';
import {
  Conversation,
  CSWCountdown,
  MessageSource,
  ApprovedTemplate,
} from '../types/inbox';
import { APPROVED_TEMPLATES } from '../hooks/useInboxStore';
import { useAuth } from '../context/AuthContext';

export interface MessageInputProps {
  conversation: Conversation;
  cswCountdown: CSWCountdown;
  sendKillSwitchActive: boolean;
  onSendMessage: (params: {
    content: string;
    source?: MessageSource;
    templateName?: string;
    overrideWarning?: boolean;
    actingAsRecruiter?: string;
    isDelegated?: boolean;
  }) => void;
  onLogTemplateVariableFilled?: (
    conversationId: string,
    templateName: string,
    paramsMap: Record<string, string>,
    actingAs?: string
  ) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  conversation,
  cswCountdown,
  sendKillSwitchActive,
  onSendMessage,
  onLogTemplateVariableFilled,
}) => {
  const { currentUser, isLeadOrAdmin, recruiters } = useAuth();

  const [inputText, setInputText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ApprovedTemplate | null>(null);
  const [templateParamValues, setTemplateParamValues] = useState<Record<string, string>>({});
  const [unlockedCoexistenceWarning, setUnlockedCoexistenceWarning] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Recruit line specific: Admin/Lead takeover control
  const isRecruitLine = conversation.line === 'recruit';
  const assignedRecruiter = conversation.contact.assignedTo || 'Wong Qi En';

  // Default takeover to true if Lead is viewing a conversation assigned to someone else
  const [isTakeoverMode, setIsTakeoverMode] = useState<boolean>(() => {
    return isRecruitLine && isLeadOrAdmin && assignedRecruiter !== currentUser?.name;
  });

  const [targetRecruiter, setTargetRecruiter] = useState<string>(assignedRecruiter);

  // Synchronize when conversation changes
  useEffect(() => {
    setSelectedTemplate(null);
    setTemplateParamValues({});
    setInputText('');
    setUnlockedCoexistenceWarning(false);
    setErrorToast(null);

    const currentAssigned = conversation.contact.assignedTo || 'Wong Qi En';
    setTargetRecruiter(currentAssigned);
    if (conversation.line === 'recruit' && isLeadOrAdmin) {
      setIsTakeoverMode(currentAssigned !== currentUser?.name);
    } else {
      setIsTakeoverMode(false);
    }
  }, [conversation.id, conversation.contact.assignedTo, isLeadOrAdmin, currentUser?.name, conversation.line]);

  const isCoexistenceLine = conversation.line === 'bd' || conversation.line === 'recruit';
  const isOptedOut = conversation.contact.consentStatus === 'opt_out';
  const isWindowActive = cswCountdown.isActive;

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

  const handleParamChange = (param: string, value: string) => {
    const updated = {
      ...templateParamValues,
      [param]: value,
    };
    setTemplateParamValues(updated);
  };

  const handleParamBlur = () => {
    if (isRecruitLine && selectedTemplate && onLogTemplateVariableFilled) {
      const actingAs = isTakeoverMode ? targetRecruiter : currentUser?.name;
      onLogTemplateVariableFilled(
        conversation.id,
        selectedTemplate.name,
        templateParamValues,
        actingAs
      );
    }
  };

  const getCompiledTemplateContent = () => {
    if (!selectedTemplate) return '';
    let result = selectedTemplate.body;
    Object.entries(templateParamValues).forEach(([key, val]) => {
      result = result.replace(key, val || `[${key}]`);
    });
    return result;
  };

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

      const isDelegatedSend = isRecruitLine && isLeadOrAdmin && isTakeoverMode;
      const actingAs = isDelegatedSend ? targetRecruiter : undefined;

      // Expired CSW must use approved Meta template
      if (!isWindowActive) {
        if (!selectedTemplate) {
          setErrorToast('24小时服务窗口已过期，请在下方选择审批通过的 Meta 模板！');
          return;
        }

        const compiled = getCompiledTemplateContent();

        // Log template variable filling if not already recorded
        if (isRecruitLine && onLogTemplateVariableFilled) {
          onLogTemplateVariableFilled(
            conversation.id,
            selectedTemplate.name,
            templateParamValues,
            actingAs
          );
        }

        onSendMessage({
          content: compiled,
          source: 'web_human',
          templateName: selectedTemplate.name,
          overrideWarning: true,
          actingAsRecruiter: actingAs,
          isDelegated: isDelegatedSend,
        });

        setSelectedTemplate(null);
        setTemplateParamValues({});
        return;
      }

      // Active window standard message
      if (!inputText.trim()) return;

      onSendMessage({
        content: inputText.trim(),
        source: 'web_human',
        overrideWarning: unlockedCoexistenceWarning,
        actingAsRecruiter: actingAs,
        isDelegated: isDelegatedSend,
      });

      setInputText('');
    } catch (err: any) {
      setErrorToast(err?.message || '发送失败');
    }
  };

  return (
    <div className="border-t border-slate-200 bg-white p-3 shrink-0 select-none">
      {/* Global Error Toast */}
      {errorToast && (
        <div className="mb-2 bg-red-500 text-white text-xs px-3 py-1.5 rounded-md flex items-center justify-between shadow-sm animate-fade-in">
          <span>⚠️ {errorToast}</span>
          <button
            onClick={() => setErrorToast(null)}
            className="text-white hover:text-red-200 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Global Kill Switch Block */}
      {sendKillSwitchActive && (
        <div className="mb-2 p-2.5 bg-red-600 text-white rounded-lg flex items-center justify-between text-xs font-semibold shadow-inner">
          <div className="flex items-center space-x-2">
            <span className="text-base">🚨</span>
            <span>全局紧急停止开关 (SEND_KILL_SWITCH) 已开启，所有发信渠道已被强行切断！</span>
          </div>
          <span className="px-2 py-0.5 bg-red-800 rounded text-[10px]">系统制动保护中</span>
        </div>
      )}

      {/* 2. Opt-out Blocker */}
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

      {/* 3. RECRUIT 专线隔离专属：管理员/老板接管控制与自动记录指示条 */}
      {isRecruitLine && !isOptedOut && (
        <div className="mb-2.5 p-2 bg-gradient-to-r from-purple-50 via-indigo-50/70 to-blue-50 border border-purple-200/80 rounded-lg text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-1.5">
              <span className="px-1.5 py-0.5 bg-purple-600 text-white font-bold rounded text-[10px] tracking-wide">
                RECRUIT 专线控制
              </span>
              <span className="text-slate-700 font-semibold text-[11px]">
                操作人：{currentUser?.name || 'Staff'} ({currentUser?.role || 'Recruiter'})
              </span>
            </div>

            {/* Audit Status Tag */}
            <div className="flex items-center space-x-1 text-[10px] text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>自动审计日志 (Auto-Logging) 已启用</span>
            </div>
          </div>

          {/* Admin / Lead Takeover Controls */}
          {isLeadOrAdmin ? (
            <div className="mt-1.5 pt-1.5 border-t border-purple-200/60 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold text-indigo-900 flex items-center space-x-1">
                  <span>⚡</span>
                  <span>管理层发送身份：</span>
                </span>

                <div className="inline-flex rounded-md shadow-2xs bg-white p-0.5 border border-purple-200">
                  <button
                    type="button"
                    onClick={() => setIsTakeoverMode(true)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-all ${
                      isTakeoverMode
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-purple-700'
                    }`}
                  >
                    代表招聘官代发 (On Behalf)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTakeoverMode(false)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-all ${
                      !isTakeoverMode
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-indigo-700'
                    }`}
                  >
                    以 {currentUser?.name || 'Lead'} 直接回复
                  </button>
                </div>
              </div>

              {/* Target Recruiter Selector (When Takeover is Active) */}
              {isTakeoverMode && (
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] text-slate-500">代表账户：</span>
                  <select
                    value={targetRecruiter}
                    onChange={(e) => setTargetRecruiter(e.target.value)}
                    className="bg-white border border-purple-300 rounded px-2 py-1 text-[11px] font-bold text-purple-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    {recruiters.map((rec) => (
                      <option key={rec.id} value={rec.name}>
                        {rec.name} ({rec.role}) {rec.name === assignedRecruiter ? '★ 负责顾问' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            // Standard Recruiter View
            <div className="mt-1 text-[11px] text-slate-600 flex items-center justify-between">
              <span>
                当前以 <strong className="text-slate-900">{currentUser?.name}</strong> 专属招聘官身份回复。负责顾问：{assignedRecruiter}。
              </span>
              <span className="text-[10px] text-slate-400">
                (仅 Lead/管理员 可启用代表代发权限)
              </span>
            </div>
          )}

          {/* Prompt Preview */}
          <div className="mt-1.5 text-[10px] text-purple-800 bg-white/70 px-2.5 py-1 rounded border border-purple-100 flex items-center justify-between">
            <div>
              <span className="font-semibold text-purple-900">发送标签预判：</span>
              {isLeadOrAdmin && isTakeoverMode ? (
                <span className="ml-1 text-amber-700 font-bold">
                  “由 {currentUser?.name} 代表 {targetRecruiter} 发送”
                </span>
              ) : (
                <span className="ml-1 text-blue-700 font-bold">
                  “由 {currentUser?.name || 'Staff'} 直接回复”
                </span>
              )}
            </div>
            <span className="text-slate-400">
              {isLeadOrAdmin && isTakeoverMode
                ? '候选人 WhatsApp 视口将直接显示招聘官名称，系统后台完整归档操作痕迹'
                : '以操作人个人实名凭据投递至候选人'}
            </span>
          </div>
        </div>
      )}

      {/* 4. BD Coexistence Line Cost Warning (Isolated strictly from Recruit takeover logic) */}
      {conversation.line === 'bd' && !unlockedCoexistenceWarning && !isOptedOut && (
        <div className="mb-2 p-2 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center space-x-2">
            <span className="text-base">⚠️</span>
            <div>
              <span className="font-bold">BD 专线共存提示：</span>
              <span>建议优先使用手机 WhatsApp App 免费回复。网页发信将产生 API 计费！</span>
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

      {/* 5. Expired 24h CSW Window -> Template Forced Selector */}
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
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-blue-900">
                  模板变量填入：
                </div>
                {isRecruitLine && (
                  <span className="text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    变量修改将自动计入审计日志
                  </span>
                )}
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
                      onChange={(e) => handleParamChange(param, e.target.value)}
                      onBlur={handleParamBlur}
                      placeholder={`输入 ${param}`}
                      className="flex-1 w-full truncate px-2 py-1 border border-slate-200 rounded text-xs text-gray-800 placeholder-slate-400 focus:ring-1 focus:ring-blue-500 outline-none"
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

      {/* 6. Input Bar */}
      <div className="flex items-center space-x-2">
        {/* Quick attachment button */}
        <button
          type="button"
          disabled={!isWindowActive || isOptedOut || sendKillSwitchActive}
          className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-40 disabled:hover:text-slate-400 transition-colors"
          title="添加附件 / 职位描述 PDF"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
        </button>

        {/* Text Input (Locked when CSW Expired) */}
        <input
          type="text"
          value={
            isWindowActive
              ? inputText
              : selectedTemplate
              ? '已选择审批模板 (点击右侧发送模板)'
              : '24H 窗口已过期，请在上方选择模板'
          }
          onChange={(e) => isWindowActive && setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={
            !isWindowActive ||
            isOptedOut ||
            sendKillSwitchActive ||
            (conversation.line === 'bd' && !unlockedCoexistenceWarning)
          }
          placeholder={
            !isWindowActive
              ? '窗口已过期：普通文字输入已锁定'
              : conversation.line === 'bd' && !unlockedCoexistenceWarning
              ? '共存防呆：请先点击上方“已知晓，解锁网页发送”'
              : isRecruitLine && isTakeoverMode && isLeadOrAdmin
              ? `[以 ${currentUser?.name} 代表 ${targetRecruiter} 发送] 输入消息回复候选人 (按 Enter 发送)...`
              : '输入消息回复候选人 (按 Enter 发送)...'
          }
          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all"
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={
            sendKillSwitchActive ||
            isOptedOut ||
            (conversation.line === 'bd' && !unlockedCoexistenceWarning) ||
            (isWindowActive && !inputText.trim()) ||
            (!isWindowActive && !selectedTemplate)
          }
          className={`px-4 py-2 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all disabled:bg-slate-300 disabled:cursor-not-allowed ${
            isRecruitLine && isTakeoverMode && isLeadOrAdmin
              ? 'bg-purple-600 hover:bg-purple-500 active:bg-purple-700'
              : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700'
          }`}
        >
          <span>
            {!isWindowActive
              ? '发送模板'
              : isRecruitLine && isTakeoverMode && isLeadOrAdmin
              ? '代发回复'
              : '发送'}
          </span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </div>
  );
};

