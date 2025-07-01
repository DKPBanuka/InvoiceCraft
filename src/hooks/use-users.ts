
"use client";

import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { AuthUser } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const USERS_COLLECTION = 'users';

export function useUsers() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      setUsers([]);
      return;
    }

    let usersQuery;
    
    // Admins can see all users
    if (currentUser.role === 'admin') {
      usersQuery = query(collection(db, USERS_COLLECTION));
    } 
    // Staff can only see admins to start chats with
    else if (currentUser.role === 'staff') {
      usersQuery = query(collection(db, USERS_COLLECTION), where('role', '==', 'admin'));
    }
    else {
      setIsLoading(false);
      setUsers([]);
      return;
    }

    const unsubscribe = onSnapshot(usersQuery, 
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
