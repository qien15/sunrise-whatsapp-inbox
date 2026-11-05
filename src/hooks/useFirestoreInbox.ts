import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import { Conversation, Message, LineFilterType } from '../types/inbox';

/**
 * Production Firestore Real-time Listener Hook
 * 
 * Subscribes to:
 * 1. `conversations` collection with line filtering
 * 2. Active `messages` subcollection `conversations/{conversationId}/messages`
 */
export function useFirestoreInbox(db: Firestore | null, initialLine: LineFilterType = 'all') {
  const [lineFilter, setLineFilter] = useState<LineFilterType>(initialLine);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Subscribe to conversations collection
  useEffect(() => {
    if (!db) return;

    let convQuery = query(
      collection(db, 'conversations'),
      orderBy('updatedAt', 'desc')
    );

    if (lineFilter !== 'all') {
      convQuery = query(
        collection(db, 'conversations'),
        where('line', '==', lineFilter),
        orderBy('updatedAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(convQuery, (snapshot) => {
      const list: Conversation[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Conversation);
      });
      setConversations(list);
      setLoading(false);

      // Auto-select first conversation if none selected
      if (!selectedConversationId && list.length > 0) {
        setSelectedConversationId(list[0].id);
      }
    });

    return () => unsubscribe();
  }, [db, lineFilter, selectedConversationId]);

  // 2. Subscribe to active conversation's messages stream
  useEffect(() => {
    if (!db || !selectedConversationId) {
      setMessages([]);
      return;
    }

    const messagesQuery = query(
      collection(db, `conversations/${selectedConversationId}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((docSnap) => {
        msgs.push({ id: docSnap.id, ...docSnap.data() } as Message);
      });
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [db, selectedConversationId]);

  // 3. Human Takeover toggle updater
  const toggleHumanTakeover = async (conversationId: string, currentTakeover: boolean) => {
    if (!db) return;
    const docRef = doc(db, 'conversations', conversationId);
    await updateDoc(docRef, {
      humanTakeover: !currentTakeover,
      humanTakeoverAt: !currentTakeover ? Date.now() : null,
      updatedAt: Date.now(),
    });
  };

  // 4. Send message to Firestore
  const sendFirestoreMessage = async (
    conversationId: string,
    messagePayload: Partial<Message>
  ) => {
    if (!db) return;

    // Append to messages subcollection
    await addDoc(collection(db, `conversations/${conversationId}/messages`), {
      ...messagePayload,
      timestamp: Date.now(),
      serverTimestamp: serverTimestamp(),
    });

    // Update conversation parent doc
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      'lastMessage.content': messagePayload.content,
      'lastMessage.source': messagePayload.source,
      'lastMessage.timestamp': Date.now(),
      'lastMessage.status': 'sent',
      lastOutboundAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  return {
    lineFilter,
    setLineFilter,
    conversations,
    selectedConversationId,
    setSelectedConversationId,
    messages,
    loading,
    toggleHumanTakeover,
    sendFirestoreMessage,
  };
}

