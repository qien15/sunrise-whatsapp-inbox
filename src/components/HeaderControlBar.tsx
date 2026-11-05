import React from 'react';
import { LineFilterType, QuotaStats, SystemConfig } from '../types/inbox';

interface HeaderControlBarProps {
  currentLineFilter: LineFilterType;
  onSelectLineFilter: (filter: LineFilterType) => void;
  quotaStats: QuotaStats;
  systemConfig: SystemConfig;
  onToggleKillSwitch: () => void;
  onOpenWaMeModal: () => void;
}

export const HeaderControlBar: React.FC<HeaderControlBarProps> = ({
  currentLineFilter,
  onSelectLineFilter,
  quotaStats,
  systemConfig,
  onToggleKillSwitch,
  onOpenWaMeModal,
}) => {
  const percentUsed = Math.min(
    100,
    Math.round((quotaStats.usedServiceMessages / quotaStats.monthlyLimit) * 100)
  );
  const isQuotaWarning = quotaStats.usedServiceMessages >= quotaStats.warningThreshold;
  const isKillSwitchActive = systemConfig.sendKillSwitch;

  const lines: { key: LineFilterType; label: string; badgeColor: string }[] = [
    { key: 'all', label: '全部线路', badgeColor: 'bg-slate-600' },
    { key: 'official', label: 'Official 官方 API', badgeColor: 'bg-blue-600' },
    { key: 'bd', label: 'BD 手机共存', badgeColor: 'bg-emerald-600' },
    { key: 'recruit', label: 'Recruit 手机共存', badgeColor: 'bg-purple-600' },
  ];

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between px-5 select-none shrink-0 z-20">
      {/* Brand & Line Tabs */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center font-bold text-slate-950 text-base shadow-md shadow-orange-500/20">
            SR
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm tracking-tight text-slate-100">Sunrise Recruit</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                v2.4
              </span>
            </div>
            <p className="text-[11px] text-slate-400">WhatsApp 多号码统一消息网关</p>
          </div>
        </div>

        {/* Global Line Filter Tabs */}
        <nav className="flex items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
          {lines.map((item) => {
            const isSelected = currentLineFilter === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onSelectLineFilter(item.key)}
                className={`relative px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-slate-700 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${item.badgeColor}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right Controls: Quota Bar, Health Indicator, Kill Switch, wa.me Modal */}
      <div className="flex items-center space-x-5">
        {/* Free Quota Progress Bar (1000 Service limit, >900 alert) */}
        <div className="flex flex-col w-44 bg-slate-800/60 p-2 rounded-lg border border-slate-700/40">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-slate-400">免费服务额度</span>
            <span
              className={`font-mono font-medium ${
                isQuotaWarning ? 'text-amber-400 font-bold' : 'text-slate-300'
              }`}
            >
              {quotaStats.usedServiceMessages}/{quotaStats.monthlyLimit}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isQuotaWarning ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
          {isQuotaWarning && (
            <span className="text-[9px] text-amber-400 mt-0.5 tracking-tight animate-pulse">
              ⚠️ 额度已超 90%，即将转入超额计费
            </span>
          )}
        </div>

        {/* DRY_RUN Indicator & Channel Status */}
        <div className="flex items-center space-x-2 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/40 text-xs">
          <span className="flex h-2 w-2 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                systemConfig.healthStatus === 'healthy' ? 'bg-emerald-400' : 'bg-red-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                systemConfig.healthStatus === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
          </span>
          <span className="text-slate-300 font-medium">Dualhook 健康</span>
          {systemConfig.dryRunMode && (
            <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded text-[10px] font-mono">
              DRY_RUN
            </span>
          )}
          <button
            title="查看账号健康日志与异常详情"
            className="text-slate-400 hover:text-slate-200 transition-colors ml-1"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        </div>

        {/* wa.me Lead Generation Tool Button */}
        <button
          onClick={onOpenWaMeModal}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
          <span>wa.me 工具</span>
        </button>

        {/* Emergency Kill Switch Button */}
        <button
          onClick={onToggleKillSwitch}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md ${
            isKillSwitchActive
              ? 'bg-red-600 text-white ring-2 ring-red-400 ring-offset-2 ring-offset-slate-900 animate-pulse'
              : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-red-500 hover:text-red-400'
          }`}
          title={
            isKillSwitchActive
              ? '紧急制动中：所有线路发信已阻断！点击解除'
              : '一键阻断所有线路发信 (SEND_KILL_SWITCH)'
          }
        >
          <svg
            className={`w-3.5 h-3.5 ${isKillSwitchActive ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
          <span>
            {isKillSwitchActive ? 'KILL SWITCH: 已阻断' : '紧急停止开关'}
          </span>
        </button>
      </div>
    </header>
  );
};

