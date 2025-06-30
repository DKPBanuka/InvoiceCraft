
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './auth-context';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Conversation } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface ChatContextType {
  conversations: Conversation[];
  totalUnreadCount: number;
  isLoadingConversations: boolean;
}

const ChatContext = createContext<ChatContextType>({
  conversations: [],
  totalUnreadCount: 0,
  isLoadingConversations: true,
});

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setIsLoadingConversations(false);
      return;
    }

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const convos = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Conversation[];

        convos.sort((a, b) => {
          const timeA = a.lastMessageTimestamp?.toMillis() || 0;
          const timeB = b.lastMessageTimestamp?.toMillis() || 0;
          return timeB - timeA;
        });

        setConversations(convos);
        setIsLoadingConversations(false);
      },
      (error) => {
        console.error('Error fetching conversations:', error);
        toast({ title: 'Error', description: 'Could not fetch conversations.', variant: 'destructive' });
        setIsLoadingConversations(false);
      }
    );

    return () => unsubscribe();
  }, [user, toast]);

  const totalUnreadCount = useMemo(() => {
    if (!user) return 0;
    return conversations.reduce((total, convo) => {
      return total + (convo.unreadCounts?.[user.uid] || 0);
    }, 0);
  }, [conversations, user]);

  return (
    <ChatContext.Provider value={{ conversations, totalUnreadCount, isLoadingConversations }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => useContext(ChatContext);
