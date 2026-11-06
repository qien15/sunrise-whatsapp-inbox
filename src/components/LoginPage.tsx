import React, { useState } from 'react';
import { useAuth, TEAM_MEMBERS, TeamMemberId, TeamMember, ViewScope } from '../context/AuthContext';

interface LoginPageProps {
  onSuccessLogin?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccessLogin }) => {
  const { loginAs, setViewScope, teamMembers } = useAuth();
  const [selectedScope, setSelectedScope] = useState<ViewScope>('my_assigned');
  const [manualInput, setManualInput] = useState('');
  const [loginTab, setLoginTab] = useState<'cards' | 'form'>('cards');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleMemberSelect = (memberId: TeamMemberId) => {
    setViewScope(selectedScope);
    const success = loginAs(memberId);
    if (success) {
      // Update browser URL query to mirror ?as=memberId
      const url = new URL(window.location.href);
      url.searchParams.set('as', memberId);
      window.history.replaceState({}, '', url.toString());
      onSuccessLogin?.();
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!manualInput.trim()) {
      setErrorMessage('请输入成员姓名或别名 (如 qien, kalap, sean)');
      return;
    }

    setViewScope(selectedScope);
    const success = loginAs(manualInput.trim());
    if (success) {
      const url = new URL(window.location.href);
      url.searchParams.set('as', manualInput.trim().toLowerCase());
      window.history.replaceState({}, '', url.toString());
      onSuccessLogin?.();
    } else {
      setErrorMessage(
        `未找到身份 "${manualInput}"。支持的别名: sean, kalap, qien, badariah, yeeyuan`
      );
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800/80 px-8 flex items-center justify-between bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center font-bold text-slate-950 text-base shadow-md shadow-orange-500/20">
            SR
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm tracking-tight text-slate-100">
                Sunrise Recruit
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                Unified Gateway
              </span>
            </div>
            <p className="text-[11px] text-slate-400">WhatsApp 多号码统一网关工作台</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300">Dualhook & Meta API 在线</span>
          </span>
          <span className="text-slate-700">|</span>
          <span className="font-mono text-slate-500 text-[11px]">1+2 混合线路模式</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl">
          {/* Headline & Description */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-3">
              <span>🔐</span>
              <span>团队成员专属工作台登入 (Agent Switcher)</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              选择您的 Recruiter / 顾问身份
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-2 max-w-xl mx-auto">
              系统将根据您的权限载入对应线路、会话视角（View As）以及 n8n 机器人的人工接管权限。
            </p>
          </div>

          {/* Initial View Mode Scope Selector */}
          <div className="flex items-center justify-center mb-6">
            <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center space-x-1 text-xs">
              <span className="text-slate-500 px-3 text-[11px] font-medium">默认登录视角:</span>
              <button
                type="button"
                onClick={() => setSelectedScope('my_assigned')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  selectedScope === 'my_assigned'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                👤 优先查看我的负责对话 (My Assigned)
              </button>
              <button
                type="button"
                onClick={() => setSelectedScope('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  selectedScope === 'all'
                    ? 'bg-slate-700 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🌐 查看全部线路对话 (All Lines)
              </button>
            </div>
          </div>

          {/* Mode Tabs: Quick Cards vs Form */}
          <div className="flex justify-center mb-6">
            <div className="flex space-x-4 border-b border-slate-800 pb-2 text-xs">
              <button
                onClick={() => setLoginTab('cards')}
                className={`font-semibold pb-1.5 transition-colors relative ${
                  loginTab === 'cards'
                    ? 'text-amber-400 border-b-2 border-amber-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                快速身份卡片登入 (5 位成员)
              </button>
              <button
                onClick={() => setLoginTab('form')}
                className={`font-semibold pb-1.5 transition-colors relative ${
                  loginTab === 'form'
                    ? 'text-amber-400 border-b-2 border-amber-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                别名或邮箱表单登录
              </button>
            </div>
          </div>

          {/* Tab 1: Member Cards Grid */}
          {loginTab === 'cards' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {teamMembers.map((member) => {
                const isLead = member.id === 'sean';

                return (
                  <div
                    key={member.id}
                    onClick={() => handleMemberSelect(member.id)}
                    className="group relative bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:translate-y-[-2px] flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Avatar & Badges */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-800 group-hover:ring-amber-500/50 transition-all"
                          />
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                                {member.name}
                              </span>
                              <span className="text-xs text-slate-400 font-medium">
                                ({member.chineseName})
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400 block">
                              @{member.id}
                            </span>
                          </div>
                        </div>

                        {/* Role Badge */}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${member.badgeColor}`}
                        >
                          {member.role}
                        </span>
                      </div>

                      {/* Title & Department */}
                      <div className="mb-2.5">
                        <div className="text-xs font-semibold text-slate-200 flex items-center space-x-1">
                          <span>{member.title}</span>
                          {isLead && (
                            <span className="text-[10px] text-amber-400 font-bold ml-1">★ 核心全权</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{member.department}</div>
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 mb-3">
                        {member.description}
                      </p>
                    </div>

                    {/* Footer: Allowed lines & Quick Switch Button */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <div className="flex items-center space-x-1">
                        {member.allowedLines.map((line) => (
                          <span
                            key={line}
                            className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase font-mono text-[9px]"
                          >
                            {line}
                          </span>
                        ))}
                      </div>

                      <span className="text-amber-400 group-hover:text-amber-300 font-semibold flex items-center space-x-1">
                        <span>一键进入</span>
                        <span>→</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Manual Form Login */}
          {loginTab === 'form' && (
            <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <form onSubmit={handleManualSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs">
                    {errorMessage}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    成员别名 (Alias) 或邮箱
                  </label>
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="例如: qien / kalap / sean / badariah"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    支持按简写直接匹配系统登记成员
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    内部访问密码 (可选/本地开发默认免密)
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    defaultValue="sunrise2026"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-md shadow-amber-500/20"
                >
                  确认登录并载入会话工作台
                </button>
              </form>
            </div>
          )}

          {/* URL Parameter Direct Link Instructions & Shortcuts */}
          <div className="mt-8 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl text-center">
            <div className="text-xs font-semibold text-slate-400 flex items-center justify-center space-x-1.5 mb-2">
              <span>💡</span>
              <span>支持通过 URL 参数直接自动免密切入专属视图模式：</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { label: 'Qi En 视图', url: '?as=qien' },
                { label: 'Ka Lap 视图', url: '?as=kalap' },
                { label: 'Sean 全权视图', url: '?as=sean' },
                { label: 'Badariah 视图', url: '?as=badariah' },
                { label: 'Yee Yuan 视图', url: '?as=yeeyuan' },
              ].map((item) => (
                <a
                  key={item.url}
                  href={item.url}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700 transition-colors"
                >
                  {item.label} <span className="text-amber-400/80">{item.url}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-slate-900 px-8 flex items-center justify-between text-[11px] text-slate-500">
        <span>Sunrise Recruit Unified WhatsApp Web Inbox © 2026</span>
        <span>Coexistence Multi-Line Gateway Architecture</span>
      </footer>
    </div>
  );
};

