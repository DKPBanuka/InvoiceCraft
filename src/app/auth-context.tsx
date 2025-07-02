
"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { AuthUser } from '@/lib/types';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signOut: () => {},
});

const unprotectedRoutes = ['/login', '/signup'];

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            username: userData.username || firebaseUser.email?.split('@')[0] || `user_${firebaseUser.uid.substring(0,5)}`,
            role: userData.role || 'staff',
          });
        } else {
          // User document does not exist, create it with a default role
          const username = firebaseUser.email?.split('@')[0] || `user_${firebaseUser.uid.substring(0,5)}`;
          const newUser: AuthUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              username: username,
              role: 'staff',
          };
          await setDoc(userDocRef, { email: newUser.email, role: newUser.role, username: newUser.username });
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
      if (!isLoading) {
        const isProtectedRoute = !unprotectedRoutes.includes(pathname);
        if (!user && isProtectedRoute) {
          router.push('/login');
        }
        if (user && unprotectedRoutes.includes(pathname)) {
          router.push('/');
        }
        if (user && user.role !== 'admin' && pathname.startsWith('/users')) {
          router.push('/');
        }
        if (user && user.role !== 'admin' && pathname.startsWith('/reports')) {
          router.push('/');
        }
        if (user && user.role !== 'admin' && pathname.startsWith('/suppliers')) {
          router.push('/');
        }
      }
  }, [user, isLoading, pathname, router]);


  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // To avoid flicker on protected routes before redirect
  if (!user && !unprotectedRoutes.includes(pathname)) {
     return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
