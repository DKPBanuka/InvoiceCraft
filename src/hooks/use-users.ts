
"use client";

import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { AuthUser } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const USERS_COLLECTION = 'users';

export function useUsers() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      setIsLoading(false);
      setUsers([]);
      if (currentUser) {
          toast({ title: "Permission Denied", description: "You are not authorized to view users.", variant: "destructive" });
      }
      return;
    }

    const unsubscribe = onSnapshot(collection(db, USERS_COLLECTION), 
      (snapshot) => {
        const usersData: AuthUser[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            uid: doc.id,
            email: data.email,
            username: data.username,
            role: data.role,
          } as AuthUser;
        });
        setUsers(usersData);
        setIsLoading(false);
      },
      (error) => {
        console.error("Firebase snapshot error:", error);
        toast({ title: "Error loading users", description: "Could not fetch users from the database.", variant: "destructive" });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toast, currentUser]);
  
  return { users, isLoading };
}
