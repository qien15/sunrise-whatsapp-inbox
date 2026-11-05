import React from 'react';
import { Conversation, LineType } from '../types/inbox';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string;
  onSelectConversation: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelectConversation,
  searchQuery,
  onSearchChange,
}) => {
  // Format relative timestamp helper
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // Line badge rendering
  const renderLineBadge = (line: LineType) => {
    switch (line) {
      case 'official':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-600 border border-blue-500/30">
            Official
          </span>
        );
      case 'bd':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
            BD
          </span>
        );
      case 'recruit':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-600 border border-purple-500/30">
            Recruit
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <aside className="w-80 h-full bg-white border-r border-slate-200 flex flex-col select-none shrink-0">
      {/* Search Header */}
      <div className="p-3.5 border-b border-slate-100 bg-slate-50/50">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索联系人、号码、最新消息..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <svg
            className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Conversation List Counter */}
      <div className="px-4 py-2 text-[11px] font-medium text-slate-400 bg-slate-50 flex items-center justify-between border-b border-slate-100">
        <span>会话列表 ({conversations.length})</span>
        <span className="text-[10px] text-slate-400 font-mono">conversations/{`{line}_{key}`}</span>
      </div>

      {/* Cards Scroll Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {conversations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            暂无匹配的会话记录
          </div>
        ) : (
          conversations.map((item) => {
            const isSelected = item.id === selectedId;
            const isOptOut = item.contact.consentStatus === 'opt_out';

            return (
              <div
                key={item.id}
                onClick={() => onSelectConversation(item.id)}
                className={`p-3.5 transition-all duration-150 cursor-pointer relative flex items-start space-x-3 ${
                  isSelected
                    ? 'bg-blue-50/70 border-l-4 border-l-blue-600'
                    : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                }`}
              >
                {/* Contact Avatar */}
                <div className="relative shrink-0">
                  <img
                    src={
                      item.contact.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        item.contact.name
                      )}&background=random`
                    }
                    alt={item.contact.name}
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200"
                  />
                  {/* Human Takeover Active Indicator */}
                  {item.line === 'official' && item.humanTakeover && (
                    <span
                      title="当前为人工接管状态 (Bot 已暂停)"
                      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 border-2 border-white rounded-full flex items-center justify-center text-[7px] text-white font-bold"
                    >
                      H
                    </span>
                  )}
                </div>

                {/* Content Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1.5 truncate">
                      <span className="font-semibold text-xs text-slate-900 truncate">
                        {item.contact.name}
                      </span>
                      {renderLineBadge(item.line)}
                      {isOptOut && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-red-100 text-red-600">
                          已退订
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                      {formatTime(item.lastMessage?.timestamp || item.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <p className="text-slate-500 truncate text-[11px] leading-relaxed pr-2">
                      {item.lastMessage ? (
                        <>
                          {item.lastMessage.source === 'bot' && (
                            <span className="text-purple-600 font-medium mr-1">[Bot]</span>
                          )}
                          {item.lastMessage.source === 'phone_app' && (
                            <span className="text-emerald-600 font-medium mr-1">[手机App]</span>
                          )}
                          {item.lastMessage.content}
                        </>
                      ) : (
                        <span className="italic text-slate-400">暂无消息</span>
                      )}
                    </p>

                    {/* Unread Badge */}
                    {item.unreadCount > 0 && (
                      <span className="shrink-0 bg-blue-600 text-white font-bold text-[10px] rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                        {item.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

