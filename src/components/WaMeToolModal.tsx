import React, { useState, useId } from 'react';
import { LineType } from '../types/inbox';

interface WaMeToolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LINE_PHONE_CONFIG: Record<LineType, { label: string; phone: string }> = {
  official: { label: 'Official 官方直连号', phone: '85291234567' },
  bd: { label: 'BD 商务手机号', phone: '85298765432' },
  recruit: { label: 'Recruit 招聘顾问手机号', phone: '85293344556' },
};

export const WaMeToolModal: React.FC<WaMeToolModalProps> = ({ isOpen, onClose }) => {
  const [selectedLine, setSelectedLine] = useState<LineType>('official');
  const [customPhone, setCustomPhone] = useState(LINE_PHONE_CONFIG.official.phone);
  const [presetText, setPresetText] = useState(
    '您好 Sunrise Recruit，我想了解最新发布的 FinTech / Tech Lead 岗位机会！'
  );
  const [copied, setCopied] = useState(false);

  // Update phone when line changes
  const handleLineChange = (line: LineType) => {
    setSelectedLine(line);
    setCustomPhone(LINE_PHONE_CONFIG[line].phone);
  };

  // Generate wa.me link
  const cleanPhone = customPhone.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(presetText.trim());
  const generatedUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : '';

  const handleCopy = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.299.144.347.491 1.2.534 1.288.043.087.072.188.014.303-.058.116-.087.188-.173.289l-.26.303c-.087.087-.179.182-.077.357.101.174.45 0.742.966 1.201.664.592 1.224.775 1.397.862.173.087.275.072.376-.044.101-.116.433-.505.549-.679.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.13.332.202.043.073.043.419-.101.824z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900">wa.me 引流链接与二维码生成</h3>
              <p className="text-[11px] text-slate-500">为各招聘线路一键生成预设意图唤醒链接</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Target Line Selector */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              目标引流归属线路：
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(LINE_PHONE_CONFIG) as LineType[]).map((key) => {
                const conf = LINE_PHONE_CONFIG[key];
                const isSelected = selectedLine === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleLineChange(key)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-semibold text-xs">{conf.label}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">+{conf.phone}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Phone Input */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              WhatsApp 号码 (含国家区号，如 85291234567)：
            </label>
            <input
              type="text"
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Preset Inbound Text */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              候选人点击预设自动填入内容 (Pre-filled Text)：
            </label>
            <textarea
              rows={3}
              value={presetText}
              onChange={(e) => setPresetText(e.target.value)}
              placeholder="候选人点击链接唤起 WhatsApp 时的预设打招呼文本..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Generated Link & QR Code Preview */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-4">
            {/* SVG Visual QR Code Placeholder with clear scan visual */}
            <div className="w-24 h-24 bg-white p-2 rounded-lg border border-slate-200 shadow-xs flex flex-col items-center justify-center shrink-0">
              <svg className="w-20 h-20 text-slate-800" viewBox="0 0 100 100" fill="currentColor">
                {/* 3 corner finder patterns */}
                <rect x="5" y="5" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="4" />
                <rect x="11" y="11" width="16" height="16" />
                <rect x="67" y="5" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="4" />
                <rect x="73" y="11" width="16" height="16" />
                <rect x="5" y="67" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="4" />
                <rect x="11" y="73" width="16" height="16" />
                {/* Data blocks */}
                <rect x="42" y="10" width="6" height="6" />
                <rect x="52" y="10" width="6" height="6" />
                <rect x="42" y="24" width="6" height="6" />
                <rect x="52" y="20" width="6" height="12" />
                <rect x="10" y="42" width="8" height="8" />
                <rect x="24" y="42" width="6" height="6" />
                <rect x="38" y="42" width="12" height="12" />
                <rect x="58" y="42" width="6" height="18" />
                <rect x="72" y="42" width="18" height="6" />
                <rect x="42" y="65" width="10" height="10" />
                <rect x="58" y="65" width="6" height="6" />
                <rect x="70" y="65" width="12" height="12" />
                <rect x="42" y="80" width="18" height="8" />
                <rect x="70" y="82" width="16" height="6" />
              </svg>
            </div>

            {/* Link Text and Copy Button */}
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                生成的直连引流链接 (wa.me)
              </div>
              <div className="font-mono text-[11px] text-slate-800 bg-white p-2 rounded border border-slate-200 break-all select-all">
                {generatedUrl || '请输入有效号码'}
              </div>

              <div className="mt-2.5 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!generatedUrl}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold rounded text-xs transition-colors shadow-xs flex items-center space-x-1"
                >
                  <span>{copied ? '已复制链接 ✓' : '复制引流链接'}</span>
                </button>
                <a
                  href={generatedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded text-xs transition-colors"
                >
                  新窗口测试打开 ↗
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            完成并关闭
          </button>
        </div>
      </div>
    </div>
  );
};

