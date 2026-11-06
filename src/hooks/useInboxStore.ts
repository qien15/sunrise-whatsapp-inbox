import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Conversation,
  Message,
  LineType,
  LineFilterType,
  QuotaStats,
  SystemConfig,
  CSWCountdown,
  ApprovedTemplate,
  MessageSource,
  AuditLogEntry,
  MessageAudit,
  ConsentStatus,
} from '../types/inbox';
import { useAuth } from '../context/AuthContext';

// 24 Hours in Milliseconds
const CSW_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Real-time 24-hour Customer Service Window (CSW) Calculation Helper
 */
export function calculateCSWStatus(lastInboundAt?: number): CSWCountdown {
  if (!lastInboundAt) {
    return {
      isActive: false,
      remainingMs: 0,
      formattedRemaining: '无近期交互 (需模板)',
    };
  }

  const expiresAt = lastInboundAt + CSW_WINDOW_MS;
  const now = Date.now();
  const remainingMs = expiresAt - now;

  if (remainingMs <= 0) {
    return {
      isActive: false,
      remainingMs: 0,
      formattedRemaining: '窗口已过期 (需模板)',
      expiresAt,
    };
  }

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

  const formattedRemaining = `${hours.toString().padStart(2, '0')}h ${minutes
    .toString()
    .padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

  return {
    isActive: true,
    remainingMs,
    formattedRemaining,
    expiresAt,
  };
}

export const APPROVED_TEMPLATES: ApprovedTemplate[] = [
  {
    name: 'recruit_interview_invite',
    displayName: '面试邀约通知 (Utility)',
    category: 'UTILITY',
    language: 'zh_HK',
    body: '您好 {{name}}，我们是 Sunrise Recruit。您申请的 {{position}} 职位已有进一步安排，请问方便在 {{time}} 进行一次简短沟通吗？回复任意内容继续。',
    parameters: ['{{name}}', '{{position}}', '{{time}}'],
  },
  {
    name: 'bd_partnership_followup',
    displayName: 'BD 商务跟进确认 (Utility)',
    category: 'UTILITY',
    language: 'zh_HK',
    body: '尊敬的 {{company}} {{contact_name}}，Sunrise Recruit 为您整理的人才候选名录已发送至您的邮箱，请查收并告知合适面试时段。',
    parameters: ['{{company}}', '{{contact_name}}'],
  },
  {
    name: 'candidate_checkin_notice',
    displayName: '求职状态唤醒 (Marketing)',
    category: 'MARKETING',
    language: 'zh_HK',
    body: 'Hi {{name}}，Sunrise Recruit 最新更新了一批 {{industry}} 高薪职位，若您近期有看新机会的想法，可直接回复我们获取详情！退订请回复 STOP。',
    parameters: ['{{name}}', '{{industry}}'],
  },
];

// Initial mock conversations assigned to the 5 team members:
// - Sean Tan (Lead)
// - Lok Ka Lap (Gateway & BD)
// - Wong Qi En (Inbox & Web)
// - Nur Badariah (Automation & AI)
// - Hok Yee Yuan (Ops & QA)
const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'official_85291234567',
    line: 'official',
    contactKey: '85291234567',
    contact: {
      id: '85291234567',
      name: '陈大文 (Senior React Dev)',
      waId: '85291234567',
      bsuid: 'BSUID_META_HK_8829104',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      tags: ['Senior Frontend', 'High Priority', 'Offered'],
      consentStatus: 'opt_in',
      assignedTo: 'Wong Qi En', // Assigned to Wong Qi En
      notes: '已有 2 轮面试通过，在等待薪酬包评估，目前由 n8n Bot 自动回复中。',
    },
    lastMessage: {
      id: 'm_off_01',
      content: '请问目前的薪资待遇包大致范围是？',
      source: 'candidate',
      timestamp: Date.now() - 1000 * 60 * 35,
      status: 'read',
    },
    unreadCount: 1,
    lastInboundAt: Date.now() - 1000 * 60 * 35,
    lastOutboundAt: Date.now() - 1000 * 60 * 34,
    humanTakeover: false,
    updatedAt: Date.now() - 1000 * 60 * 34,
  },
  {
    id: 'bd_85298765432',
    line: 'bd',
    contactKey: '85298765432',
    contact: {
      id: '85298765432',
      name: 'Li Wing (HRD @ TechCorp)',
      waId: '85298765432',
      bsuid: 'BSUID_META_HK_9918231',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      tags: ['Corporate Client', 'FinTech', 'Annual Contract'],
      consentStatus: 'opt_in',
      assignedTo: 'Lok Ka Lap', // Assigned to Lok Ka Lap
      notes: 'Coexistence 线路：主要由 BD 手机 App 实时沟通。请避免网页发信产生计费。',
    },
    lastMessage: {
      id: 'm_bd_01',
      content: '周五下午 3 点我们安排猎头服务合同签署评审。',
      source: 'phone_app',
      timestamp: Date.now() - 1000 * 60 * 120,
      status: 'delivered',
    },
    unreadCount: 0,
    lastInboundAt: Date.now() - 1000 * 60 * 150,
    lastOutboundAt: Date.now() - 1000 * 60 * 120,
    humanTakeover: true,
    updatedAt: Date.now() - 1000 * 60 * 120,
  },
  {
    id: 'recruit_85293344556',
    line: 'recruit',
    contactKey: '85293344556',
    contact: {
      id: '85293344556',
      name: '黄志强 (DevOps Lead)',
      waId: '85293344556',
      bsuid: 'BSUID_META_HK_5544332',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
      tags: ['DevOps', 'AWS Certified', 'Cold Lead'],
      consentStatus: 'opt_in',
      assignedTo: 'Hok Yee Yuan', // Assigned to Hok Yee Yuan
      notes: '上一次对话超过 27 小时，24 小时 CSW 会话窗口已过期，必须使用 Meta 已审批模板唤醒。',
    },
    lastMessage: {
      id: 'm_rec_01',
      content: '收到，我有空看看职位描述。',
      source: 'candidate',
      timestamp: Date.now() - 1000 * 60 * 60 * 27,
      status: 'read',
    },
    unreadCount: 0,
    lastInboundAt: Date.now() - 1000 * 60 * 60 * 27,
    lastOutboundAt: Date.now() - 1000 * 60 * 60 * 26,
    humanTakeover: false,
    updatedAt: Date.now() - 1000 * 60 * 60 * 26,
  },
  {
    id: 'recruit_85295556677',
    line: 'recruit',
    contactKey: '85295556677',
    contact: {
      id: '85295556677',
      name: '林佩怡 (Senior Fullstack)',
      waId: '85295556677',
      bsuid: 'BSUID_META_HK_6677889',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
      tags: ['Fullstack', 'React + Go', 'Active Candidate'],
      consentStatus: 'opt_in',
      assignedTo: 'Wong Qi En', // Assigned to Wong Qi En
      notes: '候选人求职意向强烈，正在跟进科技金融机构架构师面试。会话窗口活跃中。',
    },
    lastMessage: {
      id: 'm_rec_02',
      content: 'Qi En 你好，我已经把更新后的 Github 链接发到简历里了，请问下周可以安排技术初试吗？',
      source: 'candidate',
      timestamp: Date.now() - 1000 * 60 * 25,
      status: 'read',
    },
    unreadCount: 1,
    lastInboundAt: Date.now() - 1000 * 60 * 25,
    lastOutboundAt: Date.now() - 1000 * 60 * 20,
    humanTakeover: false,
    updatedAt: Date.now() - 1000 * 60 * 20,
  },
  {
    id: 'official_85296677889',
    line: 'official',
    contactKey: '85296677889',
    contact: {
      id: '85296677889',
      name: '张小丽 (UI/UX Designer)',
      waId: '85296677889',
      bsuid: 'BSUID_META_HK_1122334',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
      tags: ['Opted Out', 'Do Not Contact'],
      consentStatus: 'opt_out',
      consentUpdatedAt: Date.now() - 1000 * 60 * 60 * 48,
      assignedTo: 'Nur Badariah', // Assigned to Nur Badariah
      notes: '已退订，风控系统全面阻断发送消息。',
    },
    lastMessage: {
      id: 'm_off_opt',
      content: 'STOP. Please do not message me again.',
      source: 'candidate',
      timestamp: Date.now() - 1000 * 60 * 60 * 48,
      status: 'read',
    },
    unreadCount: 0,
    lastInboundAt: Date.now() - 1000 * 60 * 60 * 48,
    humanTakeover: true,
    updatedAt: Date.now() - 1000 * 60 * 60 * 48,
  },
  {
    id: 'official_85292211443',
    line: 'official',
    contactKey: '85292211443',
    contact: {
      id: '85292211443',
      name: 'Alexander Wong (Managing Director)',
      waId: '85292211443',
      bsuid: 'BSUID_META_HK_7788990',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
      tags: ['C-Level Candidate', 'Direct Placement', 'VIP'],
      consentStatus: 'opt_in',
      assignedTo: 'Sean Tan', // Assigned to Sean Tan (Lead)
      notes: 'Sean 专属跟进的高级金融科技 Managing Director 候选人，官方纯 API 线路直连。',
    },
    lastMessage: {
      id: 'm_sean_01',
      content: 'Sean，下周二下午我可以与投资委主席面对面交流。',
      source: 'candidate',
      timestamp: Date.now() - 1000 * 60 * 18,
      status: 'read',
    },
    unreadCount: 1,
    lastInboundAt: Date.now() - 1000 * 60 * 18,
    lastOutboundAt: Date.now() - 1000 * 60 * 15,
    humanTakeover: true,
    updatedAt: Date.now() - 1000 * 60 * 15,
  },
];

const INITIAL_MESSAGES: Record<string, Message[]> = {
  official_85291234567: [
    {
      id: 'msg_101',
      conversationId: 'official_85291234567',
      line: 'official',
      source: 'imported',
      content: '[历史归档导入] 候选人于官网投递 Senior React 工程师岗位简历。',
      status: 'read',
      timestamp: Date.now() - 1000 * 60 * 60 * 20,
      pricing: { billable: false, category: 'free', reason: 'Historical Sync' },
    },
    {
      id: 'msg_102',
      conversationId: 'official_85291234567',
      line: 'official',
      source: 'bot',
      content: '您好 陈大文！感谢关注 Sunrise Recruit。我们已将您的简历同步给 Hiring Team。请问近期有换岗意向吗？',
      status: 'delivered',
      timestamp: Date.now() - 1000 * 60 * 50,
      pricing: { billable: true, category: 'utility', estimatedCostUSD: 0.015 },
    },
    {
      id: 'msg_103',
      conversationId: 'official_85291234567',
      line: 'official',
      source: 'candidate',
      content: '有的，主要是关注外资投行与 FinTech 公司的架构或前端 Tech Lead 岗位。请问目前的薪资待遇包大致范围是？',
      status: 'read',
      timestamp: Date.now() - 1000 * 60 * 35,
      pricing: { billable: false, category: 'service', reason: 'Inbound message free' },
    },
    {
      id: 'msg_104',
      conversationId: 'official_85291234567',
      line: 'official',
      source: 'bot',
      content: '收到！我们目前合作的顶级投行薪酬预算在 HKD 65k - 85k/Month 之间。如需猎头顾问详细对接，您可以直接输入具体面试意愿。',
      status: 'sent',
      timestamp: Date.now() - 1000 * 60 * 34,
      pricing: { billable: true, category: 'service', estimatedCostUSD: 0.0 },
    },
  ],
  bd_85298765432: [
    {
      id: 'msg_201',
      conversationId: 'bd_85298765432',
      line: 'bd',
      source: 'candidate',
      content: 'Kevin，关于你们 Sunrise 的季度招聘顾问协议，我们需要在第 4 条加一个试用期保证条款。',
      status: 'read',
      timestamp: Date.now() - 1000 * 60 * 150,
      pricing: { billable: false, category: 'free' },
    },
    {
      id: 'msg_202',
      conversationId: 'bd_85298765432',
      line: 'bd',
      source: 'phone_app',
      content: '周五下午 3 点我们安排猎头服务合同签署评审。我直接在 WhatsApp 手机端发你补充协议草案。',
      status: 'delivered',
      timestamp: Date.now() - 1000 * 60 * 120,
      pricing: { billable: false, category: 'free', reason: 'Sent via Phone App (Dualhook Zero Cost)' },
    },
  ],
  recruit_85293344556: [
    {
      id: 'msg_301',
      conversationId: 'recruit_85293344556',
      line: 'recruit',
      source: 'candidate',
      content: '收到，我有空看看职位描述。',
      status: 'read',
      timestamp: Date.now() - 1000 * 60 * 60 * 27,
      pricing: { billable: false, category: 'service' },
    },
  ],
  recruit_85295556677: [
    {
      id: 'msg_311',
      conversationId: 'recruit_85295556677',
      line: 'recruit',
      source: 'candidate',
      content: 'Qi En 你好，我已经把更新后的 Github 链接发到简历里了，请问下周可以安排技术初试吗？',
      status: 'read',
      timestamp: Date.now() - 1000 * 60 * 25,
      pricing: { billable: false, category: 'service' },
    },
    {
      id: 'msg_312',
      conversationId: 'recruit_85295556677',
      line: 'recruit',
      source: 'web_human',
      senderName: 'Wong Qi En',
      content: '好的佩怡，已收到你的最新代码仓库，稍后与架构师确认时间后发给你面试邀约。',
      status: 'delivered',
      timestamp: Date.now() - 1000 * 60 * 20,
      pricing: { billable: false, category: 'service' },
      audit: {
        operatorId: 'qien',
        operatorName: 'Wong Qi En',
        operatorRole: 'Inbox & Web Lead',
        actionType: 'direct_send',
        displayText: '由 Wong Qi En 直接回复',
        loggedAt: Date.now() - 1000 * 60 * 20,
      },
    },
  ],
  official_85296677889: [
    {
      id: 'msg_401',
      conversationId: 'official_85296677889',
      line: 'official',
      source: 'candidate',
      content: 'STOP. Please do not message me again.',
      status: 'read',
      timestamp: Date.now() - 1000 * 60 * 60 * 48,
      pricing: { billable: false, category: 'service' },
    },
  ],
  official_85292211443: [
    {
      id: 'msg_501',
      conversationId: 'official_85292211443',
      line: 'official',
      source: 'candidate',
      content: 'Sean，下周二下午我可以与投资委主席面对面交流。请提前将保密协议发至我的私人邮箱。',
      status: 'read',
      timestamp: Date.now() - 1000 * 60 * 18,
      pricing: { billable: false, category: 'service' },
    },
    {
      id: 'msg_502',
      conversationId: 'official_85292211443',
      line: 'official',
      source: 'web_human',
      senderName: 'Sean Tan',
      content: '收到 Alex，协议已准备完毕，稍后将正式向您发出加密版本。',
      status: 'sent',
      timestamp: Date.now() - 1000 * 60 * 15,
      pricing: { billable: true, category: 'service', estimatedCostUSD: 0.0 },
    },
  ],
};

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit_init_01',
    conversationId: 'recruit_85295556677',
    line: 'recruit',
    timestamp: Date.now() - 1000 * 60 * 20,
    operatorId: 'qien',
    operatorName: 'Wong Qi En',
    operatorRole: 'Inbox & Web Lead',
    actionType: 'message_sent',
    summary: '由 Wong Qi En 直接回复候选人',
    details: { content: '好的佩怡，已收到你的最新代码仓库...' },
  },
  {
    id: 'audit_init_02',
    conversationId: 'recruit_85293344556',
    line: 'recruit',
    timestamp: Date.now() - 1000 * 60 * 60 * 28,
    operatorId: 'yeeyuan',
    operatorName: 'Hok Yee Yuan',
    operatorRole: 'Ops & QA Lead',
    actionType: 'candidate_status_updated',
    summary: '由 Hok Yee Yuan 分配负责招聘官为 [Hok Yee Yuan]',
    details: { assignedTo: 'Hok Yee Yuan' },
  },
];

export function useInboxStore() {
  const { currentUser, viewScope } = useAuth();

  const [lineFilter, setLineFilter] = useState<LineFilterType>('all');
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [selectedConversationId, setSelectedConversationId] = useState<string>(
    INITIAL_CONVERSATIONS[0].id
  );
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [searchQuery, setSearchQuery] = useState('');
  const [isWaMeModalOpen, setIsWaMeModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  const [quotaStats, setQuotaStats] = useState<QuotaStats>({
    usedServiceMessages: 915,
    monthlyLimit: 1000,
    periodStart: '2026-11-01',
    periodEnd: '2026-11-30',
    warningThreshold: 900,
  });

  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    sendKillSwitch: false,
    dryRunMode: false,
    healthStatus: 'healthy',
    dualhookStatus: {
      bdPhoneOnline: true,
      recruitPhoneOnline: true,
    },
  });

  // Filter conversations taking into account:
  // 1. Line filter ('all' | 'official' | 'bd' | 'recruit')
  // 2. ViewScope ('all' | 'my_assigned' based on currentUser.name)
  // 3. Search query
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchesLine = lineFilter === 'all' || c.line === lineFilter;

      // View Scope matching:
      // If 'my_assigned', filter to contacts assigned to current team member
      const matchesScope =
        viewScope === 'all' ||
        !currentUser ||
        c.contact.assignedTo === currentUser.name;

      const matchesSearch =
        searchQuery.trim() === '' ||
        c.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contact.waId.includes(searchQuery) ||
        (c.lastMessage && c.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesLine && matchesScope && matchesSearch;
    });
  }, [conversations, lineFilter, viewScope, currentUser, searchQuery]);

  // Keep selectedConversationId pointing to a valid visible conversation
  useEffect(() => {
    if (filteredConversations.length > 0) {
      const exists = filteredConversations.some((c) => c.id === selectedConversationId);
      if (!exists) {
        setSelectedConversationId(filteredConversations[0].id);
      }
    }
  }, [filteredConversations, selectedConversationId]);

  const activeConversation = useMemo(() => {
    return (
      filteredConversations.find((c) => c.id === selectedConversationId) ||
      filteredConversations[0] ||
      null
    );
  }, [filteredConversations, selectedConversationId]);

  const activeMessages = useMemo(() => {
    if (!activeConversation) return [];
    return messagesMap[activeConversation.id] || [];
  }, [activeConversation, messagesMap]);

  // CSW Ticker
  const [cswCountdown, setCswCountdown] = useState<CSWCountdown>(() =>
    calculateCSWStatus(activeConversation?.lastInboundAt)
  );

  useEffect(() => {
    const updateCountdown = () => {
      setCswCountdown(calculateCSWStatus(activeConversation?.lastInboundAt));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeConversation?.lastInboundAt]);

  const toggleSendKillSwitch = useCallback(() => {
    setSystemConfig((prev) => ({
      ...prev,
      sendKillSwitch: !prev.sendKillSwitch,
    }));
  }, []);

  const toggleHumanTakeover = useCallback(
    (conversationId?: string) => {
      const targetId = conversationId || activeConversation?.id;
      if (!targetId) return;

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === targetId) {
            const nextTakeover = !c.humanTakeover;
            return {
              ...c,
              humanTakeover: nextTakeover,
              humanTakeoverAt: nextTakeover ? Date.now() : undefined,
              humanTakeoverBy: nextTakeover ? currentUser?.name || 'Staff' : undefined,
            };
          }
          return c;
        })
      );
    },
    [activeConversation, currentUser]
  );

  const logAuditEvent = useCallback(
    (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
      const newEntry: AuditLogEntry = {
        ...entry,
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
      };
      setAuditLogs((prev) => [newEntry, ...prev]);
      return newEntry;
    },
    []
  );

  const logTemplateVariableFilled = useCallback(
    (
      conversationId: string,
      templateName: string,
      paramsMap: Record<string, string>,
      actingAs?: string
    ) => {
      if (!currentUser) return;
      const isDelegated = !!actingAs && actingAs !== currentUser.name;
      const summary = isDelegated
        ? `由 ${currentUser.name} 代表 ${actingAs} 填入模板变量 (${templateName})`
        : `由 ${currentUser.name} 填入模板变量 (${templateName})`;

      logAuditEvent({
        conversationId,
        line: 'recruit',
        operatorId: currentUser.id,
        operatorName: currentUser.name,
        operatorRole: currentUser.role,
        actingAsName: isDelegated ? actingAs : undefined,
        actionType: 'template_variable_filled',
        summary,
        details: { templateName, paramsMap },
      });
    },
    [currentUser, logAuditEvent]
  );

  const updateCandidateStatus = useCallback(
    (
      conversationId: string,
      updates: {
        tags?: string[];
        assignedTo?: string;
        notes?: string;
        consentStatus?: ConsentStatus;
      }
    ) => {
      let targetLine: LineType = 'recruit';
      let prevAssigned = '';

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversationId) {
            targetLine = c.line;
            prevAssigned = c.contact.assignedTo || '';
            return {
              ...c,
              contact: {
                ...c.contact,
                ...updates,
              },
              updatedAt: Date.now(),
            };
          }
          return c;
        })
      );

      // Line isolation: strictly auto-log recruit line updates
      if (targetLine === 'recruit' && currentUser) {
        const summaries: string[] = [];
        if (updates.assignedTo && updates.assignedTo !== prevAssigned) {
          summaries.push(`由 ${currentUser.name} 调整负责招聘官为 [${updates.assignedTo}]`);
        }
        if (updates.tags) {
          summaries.push(`由 ${currentUser.name} 更新标签为 [${updates.tags.join(', ')}]`);
        }
        if (updates.notes !== undefined) {
          summaries.push(`由 ${currentUser.name} 更新内部备忘`);
        }
        if (updates.consentStatus) {
          summaries.push(`由 ${currentUser.name} 调整许可状态为 [${updates.consentStatus.toUpperCase()}]`);
        }

        if (summaries.length > 0) {
          logAuditEvent({
            conversationId,
            line: 'recruit',
            operatorId: currentUser.id,
            operatorName: currentUser.name,
            operatorRole: currentUser.role,
            actionType: 'candidate_status_updated',
            summary: summaries.join('；'),
            details: updates,
          });
        }
      }
    },
    [currentUser, logAuditEvent]
  );

  const sendMessage = useCallback(
    (params: {
      content: string;
      source?: MessageSource;
      templateName?: string;
      overrideWarning?: boolean;
      actingAsRecruiter?: string;
      isDelegated?: boolean;
    }) => {
      if (!activeConversation) {
        throw new Error('未选择活跃会话');
      }

      if (systemConfig.sendKillSwitch) {
        throw new Error('全局紧急停止开关 [SEND_KILL_SWITCH] 已启用，已阻断所有消息发送！');
      }

      if (activeConversation.contact.consentStatus === 'opt_out') {
        throw new Error('该联系人已退订 (Opt-out)，严禁向其发送任何消息！');
      }

      const csw = calculateCSWStatus(activeConversation.lastInboundAt);

      if (!csw.isActive && !params.templateName) {
        throw new Error('24小时服务窗口 (CSW) 已过期，必须使用 Meta 已审批消息模板发送！');
      }

      const now = Date.now();
      const newMessageId = `msg_${now}_${Math.random().toString(36).substring(2, 7)}`;

      // Line Isolation & Recruiter Takeover / Audit Logic
      let auditInfo: MessageAudit | undefined = undefined;
      let senderDisplayName = currentUser?.name || 'Staff Recruiter';

      if (activeConversation.line === 'recruit') {
        const operatorId = currentUser?.id || 'staff';
        const operatorName = currentUser?.name || 'Staff Recruiter';
        const operatorRole = currentUser?.role || 'Recruiter';
        const isDelegated =
          !!params.isDelegated &&
          !!params.actingAsRecruiter &&
          params.actingAsRecruiter !== operatorName;

        if (isDelegated) {
          const displayText = `由 ${operatorName} 代表 ${params.actingAsRecruiter} 发送`;
          senderDisplayName = params.actingAsRecruiter!;
          auditInfo = {
            operatorId,
            operatorName,
            operatorRole,
            actingAsName: params.actingAsRecruiter,
            actionType: 'delegated_send',
            displayText,
            loggedAt: now,
          };
        } else {
          const displayText = `由 ${operatorName} 直接回复`;
          senderDisplayName = operatorName;
          auditInfo = {
            operatorId,
            operatorName,
            operatorRole,
            actionType: params.templateName ? 'template_send' : 'direct_send',
            displayText,
            loggedAt: now,
          };
        }

        // Auto-log to Recruit line audit trail
        logAuditEvent({
          conversationId: activeConversation.id,
          line: 'recruit',
          operatorId,
          operatorName,
          operatorRole,
          actingAsName: auditInfo.actingAsName,
          actionType: 'message_sent',
          summary: `${auditInfo.displayText}${params.templateName ? ` (模板: ${params.templateName})` : ''}`,
          details: {
            content: params.content,
            templateName: params.templateName,
            isDelegated,
          },
        });
      }

      const newMessage: Message = {
        id: newMessageId,
        conversationId: activeConversation.id,
        line: activeConversation.line,
        source: params.source || 'web_human',
        senderName: senderDisplayName,
        content: params.content,
        status: 'sent',
        timestamp: now,
        templateName: params.templateName,
        audit: auditInfo,
        pricing: {
          billable: activeConversation.line === 'official' || !params.overrideWarning,
          category: params.templateName ? 'utility' : 'service',
          estimatedCostUSD: params.templateName ? 0.015 : 0.0,
          reason:
            activeConversation.line === 'official'
              ? 'Official Cloud API'
              : 'Web Inbox Dispatch (BD/Recruit Line)',
        },
      };

      setMessagesMap((prev) => ({
        ...prev,
        [activeConversation.id]: [...(prev[activeConversation.id] || []), newMessage],
      }));

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConversation.id) {
            return {
              ...c,
              lastMessage: {
                id: newMessage.id,
                content: newMessage.content,
                source: newMessage.source,
                timestamp: newMessage.timestamp,
                status: newMessage.status,
              },
              lastOutboundAt: now,
              updatedAt: now,
            };
          }
          return c;
        })
      );

      setQuotaStats((prev) => ({
        ...prev,
        usedServiceMessages: prev.usedServiceMessages + 1,
      }));

      return newMessage;
    },
    [activeConversation, systemConfig.sendKillSwitch, currentUser, logAuditEvent]
  );

  return {
    lineFilter,
    setLineFilter,
    conversations: filteredConversations,
    allConversations: conversations,
    selectedConversationId,
    setSelectedConversationId,
    activeConversation,
    activeMessages,
    searchQuery,
    setSearchQuery,
    cswCountdown,
    quotaStats,
    systemConfig,
    toggleSendKillSwitch,
    toggleHumanTakeover,
    sendMessage,
    isWaMeModalOpen,
    setIsWaMeModalOpen,
    auditLogs,
    logAuditEvent,
    logTemplateVariableFilled,
    updateCandidateStatus,
  };
}
