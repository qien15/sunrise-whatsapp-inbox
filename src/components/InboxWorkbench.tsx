import React from 'react';
import { useInboxStore } from '../hooks/useInboxStore';
import { HeaderControlBar } from './HeaderControlBar';
import { ConversationList } from './ConversationList';
import { ChatViewport } from './ChatViewport';
import { ContactPanel } from './ContactPanel';
import { WaMeToolModal } from './WaMeToolModal';

export const InboxWorkbench: React.FC = () => {
  const {
    lineFilter,
    setLineFilter,
    conversations,
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
  } = useInboxStore();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-900 font-sans">
      {/* Top Header & Global Control Bar */}
      <HeaderControlBar
        currentLineFilter={lineFilter}
        onSelectLineFilter={setLineFilter}
        quotaStats={quotaStats}
        systemConfig={systemConfig}
        onToggleKillSwitch={toggleSendKillSwitch}
        onOpenWaMeModal={() => setIsWaMeModalOpen(true)}
      />

      {/* 3-Column IM Workbench Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Conversation List */}
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Middle: Chat Viewport */}
        <ChatViewport
          conversation={activeConversation}
          messages={activeMessages}
          cswCountdown={cswCountdown}
          onSendMessage={sendMessage}
          sendKillSwitchActive={systemConfig.sendKillSwitch}
        />

        {/* Right: Contact Profile & Risk Panel */}
        <ContactPanel
          conversation={activeConversation}
          onToggleHumanTakeover={toggleHumanTakeover}
        />
      </div>

      {/* wa.me Lead Gen & QR Code Modal */}
      <WaMeToolModal
        isOpen={isWaMeModalOpen}
        onClose={() => setIsWaMeModalOpen(false)}
      />
    </div>
  );
};

