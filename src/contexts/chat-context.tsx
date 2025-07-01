
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
        const convos = snapshot.docs.map((doc) => {
          const data = doc.data();
          const ts = data.lastMessageTimestamp;
          let normalizedTs: any = ts; // Can be null, keep it that way if it is

          if (ts) {
            if (typeof ts.toDate !== 'function') {
              if (typeof ts.seconds === 'number') {
                normalizedTs = { toDate: () => new Date(ts.seconds * 1000) };
              } else {
                // It's some other format, maybe an ISO string from a previous faulty save. Try to parse.
                const parsedDate = new Date(ts);
                if (!isNaN(parsedDate.getTime())) {
                    normalizedTs = { toDate: () => parsedDate };
                } else {
                    // Unparseable, nullify it to prevent crash
                    normalizedTs = null;
                }
              }
            }
          } else if (doc.metadata.hasPendingWrites) {
            // If no timestamp and write is pending, use current time
            normalizedTs = { toDate: () => new Date() };
          }
          
          return {
            id: doc.id,
            ...data,
            lastMessageTimestamp: normalizedTs,
          };
        }) as Conversation[];

        convos.sort((a, b) => {
          const timeA = a.lastMessageTimestamp?.toDate().getTime() || 0;
          const timeB = b.lastMessageTimestamp?.toDate().getTime() || 0;
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
