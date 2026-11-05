import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Conversation,
  Message,
  LineFilterType,
  LineType,
  QuotaStats,
  SystemConfig,
  CSWCountdown,
  ApprovedTemplate,
  MessageSource,
} from '../types/inbox';

// 24 Hours in Milliseconds
const CSW_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Real-time 24-hour Customer Service Window (CSW) Calculation Helper
 * Evaluates whether outbound freeform messages are allowed based on last candidate inbound message.
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

/**
 * Pre-approved Meta Message Templates for Expired CSW Outbound
 */
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

// Initial mock conversations demonstrating 1+2 architecture & edge cases
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
      assignedTo: 'Sarah Wong',
      notes: '已有 2 轮面试通过，在等待薪酬包评估，目前由 n8n Bot 自动回复中。',
    },
    lastMessage: {
      id: 'm_off_01',
      content: '请问目前的薪资待遇包大致范围是？',
      source: 'candidate',
      timestamp: Date.now() - 1000 * 60 * 35, // 35 mins ago
      status: 'read',
    },
    unreadCount: 1,
    lastInboundAt: Date.now() - 1000 * 60 * 35,
    lastOutboundAt: Date.now() - 1000 * 60 * 34,
    humanTakeover: false, // Default n8n Bot
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
      assignedTo: 'Kevin Lau (BD Head)',
      notes: 'Coexistence 线路：主要由 BD 手机 App 实时沟通。请避免网页发信产生计费。',
    },
    lastMessage: {
      id: 'm_bd_01',
      content: '周五下午 3 点我们安排猎头服务合同签署评审。',
      source: 'phone_app',
      timestamp: Date.now() - 1000 * 60 * 120, // 2 hours ago
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
      assignedTo: 'Alex Ho',
      notes: '上一次对话超过 26 小时，24 小时 CSW 会话窗口已过期，必须使用 Meta 已审批模板唤醒。',
    },
    lastMessage: {
      id: 'm_rec_01',
      content: '收到，我有空看看职位描述。',
      source: 'candidate',
      timestamp: Date.now() - 1000 * 60 * 60 * 27, // 27 hours ago (Expired CSW!)
      status: 'read',
    },
    unreadCount: 0,
    lastInboundAt: Date.now() - 1000 * 60 * 60 * 27,
    lastOutboundAt: Date.now() - 1000 * 60 * 60 * 26,
    humanTakeover: false,
    updatedAt: Date.now() - 1000 * 60 * 60 * 26,
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
      consentStatus: 'opt_out', // OPTED OUT!
      consentUpdatedAt: Date.now() - 1000 * 60 * 60 * 48,
      assignedTo: 'System Guard',
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
      pricing: { billable: true, category: 'service', estimatedCostUSD: 0.0 }, // Service within 24h
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
};

/**
 * useInboxStore Hook:
 * Provides state and actions for the WhatsApp Unified Inbox,
 * including CSW Countdown, Kill Switch, Line Filter, Human Takeover & Send safeguards.
 */
export function useInboxStore() {
  const [lineFilter, setLineFilter] = useState<LineFilterType>('all');
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [selectedConversationId, setSelectedConversationId] = useState<string>(INITIAL_CONVERSATIONS[0].id);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [searchQuery, setSearchQuery] = useState('');
  const [isWaMeModalOpen, setIsWaMeModalOpen] = useState(false);

  // Quota & System Config State
  const [quotaStats, setQuotaStats] = useState<QuotaStats>({
    usedServiceMessages: 432,
    monthlyLimit: 1000,
    periodStart: '2026-11-01',
    periodEnd: '2026-11-30',
    warningThreshold: 900,
  });

  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    sendKillSwitch: false, // Default: sending allowed
    dryRunMode: false,
    healthStatus: 'healthy',
    dualhookStatus: {
      bdPhoneOnline: true,
      recruitPhoneOnline: true,
    },
  });

  // Current active conversation
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConversationId) || conversations[0] || null;
  }, [conversations, selectedConversationId]);

  // Current conversation messages
  const activeMessages = useMemo(() => {
    if (!activeConversation) return [];
    return messagesMap[activeConversation.id] || [];
  }, [activeConversation, messagesMap]);

  // Live CSW Countdown ticker that ticks every 1000ms
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

  // Filtered conversation list
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchesLine = lineFilter === 'all' || c.line === lineFilter;
      const matchesSearch =
        searchQuery.trim() === '' ||
        c.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contact.waId.includes(searchQuery) ||
        (c.lastMessage && c.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesLine && matchesSearch;
    });
  }, [conversations, lineFilter, searchQuery]);

  // Toggle Global Emergency Send Kill Switch
  const toggleSendKillSwitch = useCallback(() => {
    setSystemConfig((prev) => ({
      ...prev,
      sendKillSwitch: !prev.sendKillSwitch,
    }));
  }, []);

  // Toggle Human Takeover for the active conversation
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
              humanTakeoverBy: nextTakeover ? 'Current Operator (Staff)' : undefined,
            };
          }
          return c;
        })
      );
    },
    [activeConversation]
  );

  // Send message action with safeguards
  const sendMessage = useCallback(
    (params: {
      content: string;
      source?: MessageSource;
      templateName?: string;
      overrideWarning?: boolean;
    }) => {
      if (!activeConversation) {
        throw new Error('未选择活跃会话');
      }

      // Safeguard 1: Kill Switch
      if (systemConfig.sendKillSwitch) {
        throw new Error('全局紧急停止开关 [SEND_KILL_SWITCH] 已启用，已阻断所有消息发送！');
      }

      // Safeguard 2: Opt-out consent check
      if (activeConversation.contact.consentStatus === 'opt_out') {
        throw new Error('该联系人已退订 (Opt-out)，严禁向其发送任何消息以避免合规处罚！');
      }

      const csw = calculateCSWStatus(activeConversation.lastInboundAt);

      // Safeguard 3: Expired CSW requires template
      if (!csw.isActive && !params.templateName) {
        throw new Error('24小时服务窗口 (CSW) 已过期，必须使用 Meta 已审批消息模板发送！');
      }

      const now = Date.now();
      const newMessageId = `msg_${now}_${Math.random().toString(36).substring(2, 7)}`;

      const newMessage: Message = {
        id: newMessageId,
        conversationId: activeConversation.id,
        line: activeConversation.line,
        source: params.source || 'web_human',
        content: params.content,
        status: 'sent',
        timestamp: now,
        templateName: params.templateName,
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

      // Append message
      setMessagesMap((prev) => ({
        ...prev,
        [activeConversation.id]: [...(prev[activeConversation.id] || []), newMessage],
      }));

      // Update conversation state
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

      // Update service quota if billable
      setQuotaStats((prev) => ({
        ...prev,
        usedServiceMessages: prev.usedServiceMessages + 1,
      }));

      return newMessage;
    },
    [activeConversation, systemConfig.sendKillSwitch]
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
  };
}

