import React, { useState } from 'react';
import { Conversation } from '../types/inbox';

interface ContactPanelProps {
  conversation: Conversation | null;
  onToggleHumanTakeover: (conversationId?: string) => void;
}

export const ContactPanel: React.FC<ContactPanelProps> = ({
  conversation,
  onToggleHumanTakeover,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!conversation) {
    return (
      <aside className="w-80 h-full bg-white border-l border-slate-200 p-6 flex items-center justify-center text-xs text-slate-400 select-none shrink-0">
        请选择会话查看联系人档案
      </aside>
    );
  }

  const { contact, line, humanTakeover } = conversation;
  const isOptedOut = contact.consentStatus === 'opt_out';
  const isOfficialLine = line === 'official';

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <aside
      className={`w-80 h-full bg-white border-l border-slate-200 flex flex-col select-none shrink-0 transition-colors duration-200 overflow-y-auto ${
        isOptedOut ? 'ring-2 ring-rose-500/50 bg-rose-50/10' : ''
      }`}
    >
      {/* 1. Header Profile Banner */}
      <div className="p-5 border-b border-slate-100 flex flex-col items-center text-center relative">
        {/* Opt-out alert top banner */}
        {isOptedOut && (
          <div className="w-full mb-3 p-2 bg-red-100 border border-red-300 text-red-700 rounded-lg text-xs flex items-center space-x-1.5 justify-center font-bold">
            <svg className="w-4 h-4 shrink-0 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>已退订 (OPT-OUT 状态)</span>
          </div>
        )}

        <div className="relative mb-3">
          <img
            src={
              contact.avatarUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                contact.name
              )}&background=random`
            }
            alt={contact.name}
            className="w-16 h-16 rounded-full object-cover ring-2 ring-slate-100 shadow-sm"
          />
          <span
            className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
              isOptedOut ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
          />
        </div>

        <h3 className="font-semibold text-sm text-slate-900">{contact.name}</h3>
        <p className="text-xs text-slate-500 mt-0.5 font-mono">+{contact.waId}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-2.5 justify-center">
          {contact.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* 2. Official Line Human Takeover Toggle Switch */}
      {isOfficialLine && (
        <div className="p-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-slate-800">官方线路接管控制</span>
              <span className="text-[10px] px-1 bg-blue-100 text-blue-700 rounded font-mono">
                Official
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                humanTakeover
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-purple-100 text-purple-800 border border-purple-300'
              }`}
            >
              {humanTakeover ? '人工接管中' : 'n8n Bot 托管'}
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-normal mb-3">
            {humanTakeover
              ? '当前由人工专属接待，n8n 自动化机器人流程已自动挂起停用。'
              : '当前由 n8n Bot 自动回复中，点击下方按钮可随时接管该候选人。'}
          </p>

          <button
            onClick={() => onToggleHumanTakeover(conversation.id)}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-sm ${
              humanTakeover
                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold'
            }`}
          >
            {humanTakeover ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>交还给 n8n 机器人</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>立即人工接管会话</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 3. Dual-track Identity Information */}
      <div className="p-4 border-b border-slate-100 space-y-3">
        <h4 className="text-xs font-bold text-slate-700 tracking-wider uppercase">
          双轨身份与通道详情
        </h4>

        {/* WhatsApp Mobile Number (waId) */}
        <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
          <div>
            <div className="text-[10px] text-slate-400 font-medium">WhatsApp 手机号 (waId)</div>
            <div className="font-mono text-slate-800 font-semibold mt-0.5">+{contact.waId}</div>
          </div>
          <button
            onClick={() => copyToClipboard(contact.waId, 'waId')}
            className="text-slate-400 hover:text-slate-700 text-xs px-2 py-1 rounded hover:bg-slate-200 transition-colors"
          >
            {copiedField === 'waId' ? '已复制 ✓' : '复制'}
          </button>
        </div>

        {/* Meta Business Scoped User ID (BSUID) */}
        <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
          <div className="truncate mr-2">
            <div className="text-[10px] text-slate-400 font-medium">Meta 企业级唯一 ID (BSUID)</div>
            <div className="font-mono text-slate-800 font-semibold mt-0.5 truncate text-[11px]">
              {contact.bsuid || '暂无 (纯手机通道)'}
            </div>
          </div>
          {contact.bsuid && (
            <button
              onClick={() => copyToClipboard(contact.bsuid!, 'bsuid')}
              className="text-slate-400 hover:text-slate-700 text-xs px-2 py-1 rounded hover:bg-slate-200 transition-colors shrink-0"
            >
              {copiedField === 'bsuid' ? '已复制 ✓' : '复制'}
            </button>
          )}
        </div>

        {/* Assigned Staff */}
        <div className="flex items-center justify-between text-xs p-1">
          <span className="text-slate-500">负责顾问：</span>
          <span className="font-medium text-slate-800">{contact.assignedTo || '待分配'}</span>
        </div>
      </div>

      {/* 4. Risk & Compliance Guardrails */}
      <div className="p-4 border-b border-slate-100 space-y-3">
        <h4 className="text-xs font-bold text-slate-700 tracking-wider uppercase">
          风控与合规状态
        </h4>

        <div className="p-3 rounded-lg border text-xs space-y-2 bg-slate-50">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">用户许可协议 (Consent):</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isOptedOut
                  ? 'bg-rose-100 text-rose-700 border border-rose-300'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
              }`}
            >
              {isOptedOut ? 'OPT-OUT (已退订)' : 'OPT-IN (已授权)'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500">Dualhook 硬件同步:</span>
            <span className="text-emerald-600 font-medium flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>同步活跃中</span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500">当前归属线路:</span>
            <span className="font-semibold text-slate-800 uppercase text-[10px]">
              {line} Line
            </span>
          </div>
        </div>
      </div>

      {/* 5. Recruiter Internal Notes */}
      <div className="p-4 flex-1">
        <h4 className="text-xs font-bold text-slate-700 tracking-wider uppercase mb-2">
          招聘顾问内部备忘
        </h4>
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 leading-relaxed min-h-[90px]">
          {contact.notes || '暂无内部备注。'}
        </div>
      </div>
    </aside>
  );
};

