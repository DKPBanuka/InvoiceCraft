
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { ReturnItem } from '@/lib/types';
import { useInventory } from './use-inventory';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, serverTimestamp, query, orderBy, limit, getDocs, where, writeBatch } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { returnServerSchema, updateReturnServerSchema } from '@/lib/schemas';


const RETURNS_COLLECTION = 'returns';
const USERS_COLLECTION = 'users';
const NOTIFICATIONS_COLLECTION = 'notifications';

export function useReturns() {
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { inventory } = useInventory();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
     if (!user) {
        setIsLoading(false);
        setReturns([]);
        return;
    };
    
    let q = query(collection(db, RETURNS_COLLECTION), orderBy("createdAt", "desc"));
    if (user.role === 'staff') {
      q = query(q, where('createdBy', '==', user.uid));
    }

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const returnsData: ReturnItem[] = snapshot.docs.map(doc => {
          const data = doc.data();

          const createdAtTs = data.createdAt;
          let normalizedCreatedAt: string;
          if (createdAtTs && typeof createdAtTs.toDate === 'function') {
            normalizedCreatedAt = createdAtTs.toDate().toISOString();
          } else if (createdAtTs && typeof createdAtTs.seconds === 'number') {
            normalizedCreatedAt = new Date(createdAtTs.seconds * 1000).toISOString();
          } else if (typeof createdAtTs === 'string' && !isNaN(new Date(createdAtTs).getTime())) {
            normalizedCreatedAt = createdAtTs;
          } else if (doc.metadata.hasPendingWrites) {
            normalizedCreatedAt = new Date().toISOString();
          } else {
            normalizedCreatedAt = new Date().toISOString();
          }

          const resolutionDateTs = data.resolutionDate;
          let normalizedResolutionDate: string | undefined = undefined;
          if (resolutionDateTs) {
             if (resolutionDateTs && typeof resolutionDateTs.toDate === 'function') {
                normalizedResolutionDate = resolutionDateTs.toDate().toISOString();
            } else if (resolutionDateTs && typeof resolutionDateTs.seconds === 'number') {
                normalizedResolutionDate = new Date(resolutionDateTs.seconds * 1000).toISOString();
            } else if (typeof resolutionDateTs === 'string' && !isNaN(new Date(resolutionDateTs).getTime())) {
                normalizedResolutionDate = resolutionDateTs;
            }
          }
          
          return {
            id: doc.id,
            ...data,
            createdAt: normalizedCreatedAt,
            resolutionDate: normalizedResolutionDate,
          } as ReturnItem;
        });
        setReturns(returnsData);
        setIsLoading(false);
      },
      (error) => {
        console.error("Firebase snapshot error:", error);
        toast({ title: "Error loading returns", description: "Could not fetch returns from the database.", variant: "destructive" });
        setIsLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [toast, user]);

  const generateReturnId = useCallback(async () => {
    const year = new Date().getFullYear();
    const prefix = `RTN-${year}-`;
    
    const q = query(
      collection(db, RETURNS_COLLECTION), 
      orderBy('returnId', 'desc'), 
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    let lastIdNum = 0;
    if (!querySnapshot.empty) {
        const lastId = querySnapshot.docs[0].data().returnId;
        if (lastId.startsWith(prefix)) {
            lastIdNum = parseInt(lastId.split('-').pop() || '0');
        }
    }
    
    const nextId = lastIdNum + 1;
    return `${prefix}${String(nextId).padStart(4, '0')}`;
  }, []);

  const addReturn = useCallback(async (returnData: Omit<ReturnItem, 'id' | 'createdAt' | 'inventoryItemName' | 'status' | 'returnId' | 'createdBy' | 'createdByName'>) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to log a return.", variant: "destructive" });
      return;
    }
    
    const validationResult = returnServerSchema.safeParse(returnData);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map(e => e.message).join('\n');
      toast({ title: "Invalid Return Data", description: errorMessage, variant: "destructive" });
      return;
    }

    const inventoryItem = inventory.find(i => i.id === returnData.inventoryItemId);
    if (!inventoryItem) {
        toast({ title: "Error", description: "Selected inventory item not found.", variant: "destructive" });
        return;
    }

    try {
        const newReturnId = await generateReturnId();
        const newReturn: Omit<ReturnItem, 'id'> = {
          ...validationResult.data,
          returnId: newReturnId,
          createdAt: new Date().toISOString(), // This will be replaced by serverTimestamp
          inventoryItemName: inventoryItem.name,
          status: 'Awaiting Inspection',
          createdBy: user.uid,
          createdByName: user.username || 'N/A'
        };
        
        const batch = writeBatch(db);
        const newReturnRef = doc(collection(db, RETURNS_COLLECTION));
        batch.set(newReturnRef, { ...newReturn, createdAt: serverTimestamp() });
        
        const message = `${user.username} created a new return ${newReturnId}.`;
        const usersSnapshot = await getDocs(query(collection(db, USERS_COLLECTION), where('role', 'in', ['admin', 'staff'])));
        usersSnapshot.docs.forEach(userDoc => {
          if (userDoc.id !== user.uid) {
              const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
              batch.set(notificationRef, {
                  recipientUid: userDoc.id, senderName: user.username, message,
                  link: `/returns/${newReturnRef.id}`, read: false, createdAt: serverTimestamp(), type: 'return'
              });
          }
        });

        await batch.commit();
        
        toast({
          title: "Return Logged",
          description: `Return ${newReturn.returnId} has been created.`,
        });
        router.push('/returns');
    } catch (error)
        {
        console.error("Error adding return:", error);
        toast({ title: "Error", description: "Failed to log the return.", variant: "destructive" });
    }
  }, [inventory, toast, router, generateReturnId, user]);

  const getReturn = useCallback((id: string) => {
    return returns.find(item => item.id === id);
  }, [returns]);

  const updateReturn = useCallback(async (id: string, updatedData: Partial<Pick<ReturnItem, 'status' | 'notes'>>) => {
    const returnItem = returns.find(r => r.id === id);
    if (!returnItem) return;
    
    if (!user || !['admin', 'staff'].includes(user.role)) {
        toast({ title: "Permission Denied", description: "You are not authorized to update returns.", variant: "destructive"});
        return;
    }
    
    if (user.role === 'staff' && updatedData.status && updatedData.status !== returnItem.status) {
        toast({ title: "Permission Denied", description: "Only admins can change the return status.", variant: "destructive"});
        return;
    }

    const validationResult = updateReturnServerSchema.safeParse(updatedData);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map(e => e.message).join('\n');
      toast({ title: "Invalid Data", description: errorMessage, variant: "destructive" });
      return;
    }

    try {
      const batch = writeBatch(db);
      const returnDocRef = doc(db, RETURNS_COLLECTION, id);

      const isClosing = updatedData.status === 'Completed / Closed';
      const updatePayload: any = { ...validationResult.data };

      if (isClosing && !returnItem.resolutionDate) {
        updatePayload.resolutionDate = serverTimestamp();
      }

      batch.update(returnDocRef, updatePayload);

      const message = `${user.username} updated return ${returnItem.returnId}.`;
      const usersSnapshot = await getDocs(query(collection(db, USERS_COLLECTION), where('role', 'in', ['admin', 'staff'])));
      
      usersSnapshot.docs.forEach(userDoc => {
          if (userDoc.id !== user.uid) {
              const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
              batch.set(notificationRef, {
                  recipientUid: userDoc.id,
                  senderName: user.username,
                  message: message,
                  link: `/returns/${id}`,
                  read: false,
                  createdAt: serverTimestamp(),
                  type: 'return'
              });
          }
      });

      await batch.commit();

      toast({
        title: "Return Updated",
        description: `Return ${returnItem.returnId} has been successfully updated.`,
      });
      router.push(`/returns`);
    } catch (error) {
      console.error("Error updating return:", error);
      toast({ title: "Error", description: "Failed to update the return.", variant: "destructive" });
    }
  }, [returns, toast, router, user]);


  return { returns, isLoading, addReturn, getReturn, updateReturn };
}
