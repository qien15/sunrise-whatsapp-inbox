import React, { useState, useRef, useEffect } from 'react';
import { LineFilterType, QuotaStats, SystemConfig } from '../types/inbox';
import { useAuth, TeamMemberId, ViewScope } from '../context/AuthContext';

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
  const { currentUser, viewScope, setViewScope, switchUser, logout, teamMembers } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleCopyDirectLink = () => {
    if (!currentUser) return;
    const url = `${window.location.origin}${window.location.pathname}?as=${currentUser.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between px-5 select-none shrink-0 z-30">
      {/* Left: Brand & Line Filter Tabs */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center font-bold text-slate-950 text-base shadow-md shadow-orange-500/20">
            SR
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm tracking-tight text-slate-100">
                Sunrise Recruit
              </span>
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

      {/* Right Controls: Quota Bar, Health Indicator, Kill Switch, wa.me, and Recruiter Switcher */}
      <div className="flex items-center space-x-4">
        {/* Free Quota Progress Bar (1000 Service limit, >900 alert) */}
        <div className="flex flex-col w-40 bg-slate-800/60 p-2 rounded-lg border border-slate-700/40">
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
              ⚠️ 额度已超 90%
            </span>
          )}
        </div>

        {/* DRY_RUN Indicator & Channel Status */}
        <div className="flex items-center space-x-1.5 bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-700/40 text-xs">
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
          <span className="text-slate-300 font-medium">Dualhook</span>
          {systemConfig.dryRunMode && (
            <span className="px-1 py-0.2 bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded text-[9px] font-mono">
              DRY_RUN
            </span>
          )}
        </div>

        {/* wa.me Lead Generation Tool Button */}
        <button
          onClick={onOpenWaMeModal}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
          <span>wa.me</span>
        </button>

        {/* Emergency Kill Switch Button */}
        <button
          onClick={onToggleKillSwitch}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md ${
            isKillSwitchActive
              ? 'bg-red-600 text-white ring-2 ring-red-400 ring-offset-2 ring-offset-slate-900 animate-pulse'
              : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-red-500 hover:text-red-400'
          }`}
          title={isKillSwitchActive ? '紧急制动中：所有线路发信已阻断！点击解除' : '一键阻断所有线路发信 (SEND_KILL_SWITCH)'}
        >
          <svg className={`w-3.5 h-3.5 ${isKillSwitchActive ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
          <span>{isKillSwitchActive ? 'KILL' : '紧急制动'}</span>
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-800" />

        {/* CURRENT RECRUITER & AGENT SWITCHER DROPDOWN */}
        {currentUser && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-2.5 p-1.5 pl-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-all text-left shadow-sm group"
            >
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover ring-1 ring-amber-500/40"
              />
              <div className="flex flex-col text-xs leading-none pr-1">
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-slate-100 group-hover:text-amber-300 transition-colors">
                    {currentUser.name}
                  </span>
                  <span className={`text-[9px] px-1 py-0.2 rounded font-semibold border ${currentUser.badgeColor}`}>
                    {currentUser.role}
                  </span>
                </div>
                <div className="flex items-center space-x-1 mt-1 text-[10px] text-slate-400">
                  <span>视角:</span>
                  <span className={viewScope === 'my_assigned' ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                    {viewScope === 'my_assigned' ? '我的负责' : '全部'}
                  </span>
                </div>
              </div>
              <svg
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isUserMenuOpen ? 'rotate-180 text-amber-400' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu Modal */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* Header Info */}
                <div className="p-2.5 bg-slate-800/80 rounded-xl mb-2.5 border border-slate-700/60">
                  <div className="flex items-center space-x-3">
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-500/50"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-xs text-white truncate">
                          {currentUser.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          ({currentUser.chineseName})
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                        {currentUser.email}
                      </div>
                      <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
                        {currentUser.title}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 1. View Scope Switcher: My Assigned vs All */}
                <div className="mb-3">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 px-1">
                    当前聊天记录查看视角 (View As):
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setViewScope('my_assigned')}
                      className={`py-1.5 px-2 rounded-md text-xs font-medium transition-all text-center ${
                        viewScope === 'my_assigned'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      👤 仅我负责的对话
                    </button>
                    <button
                      onClick={() => setViewScope('all')}
                      className={`py-1.5 px-2 rounded-md text-xs font-medium transition-all text-center ${
                        viewScope === 'all'
                          ? 'bg-slate-700 text-white font-bold shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      🌐 查看全部线路对话
                    </button>
                  </div>
                </div>

                {/* 2. Fast Switch Recruiter to other team members */}
                <div className="mb-3">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 px-1">
                    快速切换团队身份 (Switch Recruiter):
                  </div>
                  <div className="space-y-1">
                    {teamMembers.map((member) => {
                      const isCurrent = member.id === currentUser.id;
                      return (
                        <button
                          key={member.id}
                          onClick={() => {
                            switchUser(member.id);
                            setIsUserMenuOpen(false);
                          }}
                          className={`w-full p-2 rounded-lg text-left flex items-center justify-between text-xs transition-all ${
                            isCurrent
                              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold'
                              : 'hover:bg-slate-800 text-slate-300 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                              {member.initials}
                            </span>
                            <span className="truncate">{member.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">@{member.id}</span>
                          </div>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${member.badgeColor}`}
                          >
                            {member.role}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Direct Link Share & Logout */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <button
                    onClick={handleCopyDirectLink}
                    className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center space-x-1 py-1 px-1.5 rounded hover:bg-slate-800 transition-colors"
                    title="复制带有 ?as=身份 的快捷直达网址"
                  >
                    <span>🔗</span>
                    <span>{copiedLink ? '已复制直连 URL ✓' : '复制直达链接 (?as=)'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-medium py-1 px-2 rounded hover:bg-rose-500/10 transition-colors"
                  >
                    退出/重选身份
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
