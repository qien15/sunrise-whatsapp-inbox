import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type TeamMemberId = 'sean' | 'kalap' | 'qien' | 'badariah' | 'yeeyuan';

export interface TeamMember {
  id: TeamMemberId;
  name: string;
  chineseName: string;
  aliases: string[]; // Match URL query `?as=qien` or `?as=wongqien`
  role: string;
  title: string;
  department: string;
  email: string;
  avatarUrl: string;
  badgeColor: string; // Tailwind color class
  accentColor: string;
  allowedLines: ('official' | 'bd' | 'recruit')[];
  description: string;
  initials: string;
}

export type ViewScope = 'all' | 'my_assigned';

export const TEAM_MEMBERS: Record<TeamMemberId, TeamMember> = {
  sean: {
    id: 'sean',
    name: 'Sean Tan',
    chineseName: '陈立轩',
    aliases: ['sean', 'seantan', 'lead', 'admin'],
    role: 'Lead',
    title: 'Lead / 所有线路全权',
    department: 'Executive & Architecture',
    email: 'sean.tan@sunriserecruit.hk',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    accentColor: '#f59e0b',
    allowedLines: ['official', 'bd', 'recruit'],
    description: '全权系统架构师与总猎头主管，具备 Official 线路人工接管与全局 Kill Switch 权限。',
    initials: 'ST',
  },
  kalap: {
    id: 'kalap',
    name: 'Lok Ka Lap',
    chineseName: '骆家立',
    aliases: ['kalap', 'lokkalap', 'gateway', 'integrations'],
    role: 'Gateway & Integrations',
    title: 'Gateway & Integrations 专家',
    department: 'Engineering / Dualhook',
    email: 'kalap.lok@sunriserecruit.hk',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    accentColor: '#10b981',
    allowedLines: ['bd', 'official'],
    description: '负责 BD 手机共存线路与 Dualhook 硬件网关链路健康，监控手机端与云端同步。',
    initials: 'KL',
  },
  qien: {
    id: 'qien',
    name: 'Wong Qi En',
    chineseName: '黄启恩',
    aliases: ['qien', 'wongqien', 'inbox', 'web'],
    role: 'Inbox & Web Lead',
    title: 'Inbox & Web 前端负责人',
    department: 'Candidate Engagement',
    email: 'qien.wong@sunriserecruit.hk',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    accentColor: '#3b82f6',
    allowedLines: ['official', 'recruit'],
    description: '负责 Web 收件箱核心体验、CSW 24小时会话窗口模板调度及高级技术人才跟进。',
    initials: 'QE',
  },
  badariah: {
    id: 'badariah',
    name: 'Nur Badariah',
    chineseName: '巴达丽亚',
    aliases: ['badariah', 'nurbadariah', 'ai', 'automation'],
    role: 'Automation & AI',
    title: 'Automation & AI 算法工程师',
    department: 'n8n & AI Workflows',
    email: 'badariah.nur@sunriserecruit.hk',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    accentColor: '#a855f7',
    allowedLines: ['official'],
    description: '负责 n8n 自动化机器人应答工作流、意图识别与 Human Takeover 机器人接管互斥机制。',
    initials: 'NB',
  },
  yeeyuan: {
    id: 'yeeyuan',
    name: 'Hok Yee Yuan',
    chineseName: '霍绮媛',
    aliases: ['yeeyuan', 'hokyeeyuan', 'ops', 'qa'],
    role: 'Ops & QA Lead',
    title: 'Ops & QA 合规与质量主管',
    department: 'Operations & Compliance',
    email: 'yeeyuan.hok@sunriserecruit.hk',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    accentColor: '#f43f5e',
    allowedLines: ['recruit', 'official', 'bd'],
    description: '负责 Recruit 线路招聘流程质检、Meta 政策合规审计（Opt-out/Consent 退订守卫）。',
    initials: 'YY',
  },
};

const STORAGE_KEY_USER = 'sunrise_recruit_current_agent';
const STORAGE_KEY_SCOPE = 'sunrise_recruit_view_scope';

interface AuthContextType {
  currentUser: TeamMember | null;
  isAuthenticated: boolean;
  isLeadOrAdmin: boolean;
  canTakeoverRecruit: (line?: string) => boolean;
  recruiters: TeamMember[];
  viewScope: ViewScope;
  setViewScope: (scope: ViewScope) => void;
  loginAs: (idOrAlias: string) => boolean;
  switchUser: (id: TeamMemberId) => void;
  logout: () => void;
  teamMembers: TeamMember[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [viewScope, setViewScopeState] = useState<ViewScope>('all');
  const [hasInitialized, setHasInitialized] = useState(false);

  // Helper to find member by id or alias
  const findMember = (key: string): TeamMember | null => {
    const cleanKey = key.trim().toLowerCase();
    for (const member of Object.values(TEAM_MEMBERS)) {
      if (member.id === cleanKey || member.aliases.includes(cleanKey)) {
        return member;
      }
    }
    return null;
  };

  // 1. Check URL param `?as=person` on initial mount, fallback to localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const asParam = params.get('as');

    if (asParam) {
      const matched = findMember(asParam);
      if (matched) {
        setCurrentUser(matched);
        localStorage.setItem(STORAGE_KEY_USER, matched.id);
        // By default, if entering via `?as=person`, prefer personal assigned view
        setViewScopeState('my_assigned');
        localStorage.setItem(STORAGE_KEY_SCOPE, 'my_assigned');
        setHasInitialized(true);
        return;
      }
    }

    // Fallback: check localStorage
    const savedUserId = localStorage.getItem(STORAGE_KEY_USER);
    if (savedUserId && TEAM_MEMBERS[savedUserId as TeamMemberId]) {
      setCurrentUser(TEAM_MEMBERS[savedUserId as TeamMemberId]);
    }

    const savedScope = localStorage.getItem(STORAGE_KEY_SCOPE) as ViewScope;
    if (savedScope === 'all' || savedScope === 'my_assigned') {
      setViewScopeState(savedScope);
    }

    setHasInitialized(true);
  }, []);

  const loginAs = (idOrAlias: string): boolean => {
    const matched = findMember(idOrAlias);
    if (matched) {
      setCurrentUser(matched);
      localStorage.setItem(STORAGE_KEY_USER, matched.id);
      return true;
    }
    return false;
  };

  const switchUser = (id: TeamMemberId) => {
    const member = TEAM_MEMBERS[id];
    if (member) {
      setCurrentUser(member);
      localStorage.setItem(STORAGE_KEY_USER, member.id);
      // Update URL query string seamlessly without full reload
      const url = new URL(window.location.href);
      url.searchParams.set('as', member.id);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY_USER);
    const url = new URL(window.location.href);
    url.searchParams.delete('as');
    window.history.replaceState({}, '', url.toString());
  };

  const setViewScope = (scope: ViewScope) => {
    setViewScopeState(scope);
    localStorage.setItem(STORAGE_KEY_SCOPE, scope);
  };

  const isLeadOrAdmin = !!currentUser && (
    currentUser.role.toLowerCase().includes('lead') ||
    currentUser.role.toLowerCase().includes('admin') ||
    currentUser.id === 'sean'
  );

  // Line isolation check: strictly recruit line only, and caller must be lead/admin
  const canTakeoverRecruit = (line?: string): boolean => {
    if (line && line !== 'recruit') return false;
    return isLeadOrAdmin;
  };

  const recruiters = Object.values(TEAM_MEMBERS).filter((m) =>
    m.allowedLines.includes('recruit')
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLeadOrAdmin,
        canTakeoverRecruit,
        recruiters,
        viewScope,
        setViewScope,
        loginAs,
        switchUser,
        logout,
        teamMembers: Object.values(TEAM_MEMBERS),
      }}
    >
      {hasInitialized && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

