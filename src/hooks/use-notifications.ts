
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { AppNotification } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy, writeBatch, doc } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const NOTIFICATIONS_COLLECTION = 'notifications';

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('recipientUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const notificationsData: AppNotification[] = snapshot.docs.map(doc => {
          const data = doc.data();
          const ts = data.createdAt;
          let normalizedCreatedAt: string;

          if (ts && typeof ts.toDate === 'function') {
            normalizedCreatedAt = ts.toDate().toISOString();
          } else if (ts && typeof ts.seconds === 'number') {
            normalizedCreatedAt = new Date(ts.seconds * 1000).toISOString();
          } else if (typeof ts === 'string' && !isNaN(new Date(ts).getTime())) {
            normalizedCreatedAt = ts;
          } else if (doc.metadata.hasPendingWrites) {
            normalizedCreatedAt = new Date().toISOString();
          } else {
            normalizedCreatedAt = new Date().toISOString();
          }

          return {
            id: doc.id,
            ...data,
            createdAt: normalizedCreatedAt,
          } as AppNotification;
        });
        setNotifications(notificationsData);
        setIsLoading(false);
      },
      (error) => {
        console.error("Firebase notification snapshot error:", error);
        toast({ title: "Error loading notifications", variant: "destructive" });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, toast]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = useCallback(async () => {
    if (!user || unreadCount === 0) return;

    const batch = writeBatch(db);
    const unreadNotifications = notifications.filter(n => !n.read);

    unreadNotifications.forEach(notification => {
      const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notification.id);
      batch.update(notificationRef, { read: true });
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      toast({ title: "Error updating notifications", variant: "destructive" });
    }
  }, [user, notifications, unreadCount, toast]);

  return { notifications, isLoading, unreadCount, markAllAsRead };
}
