
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { InventoryItem } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, serverTimestamp, increment, writeBatch, query, where, getDocs, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const INVENTORY_COLLECTION = 'inventory';
const USERS_COLLECTION = 'users';
const NOTIFICATIONS_COLLECTION = 'notifications';

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        setInventory([]);
        return;
    };

    const unsubscribe = onSnapshot(collection(db, INVENTORY_COLLECTION), 
      (snapshot) => {
        const inventoryData: InventoryItem[] = snapshot.docs.map(doc => {
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

          const item = {
            id: doc.id,
            ...data,
            createdAt: normalizedCreatedAt,
          } as InventoryItem;

          if (user.role === 'staff') {
              item.costPrice = 0; // Don't expose cost price to staff
          }
          return item;
        });
        setInventory(inventoryData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setIsLoading(false);
      },
      (error) => {
        console.error("Firebase snapshot error:", error);
        toast({ title: "Error loading inventory", description: "Could not fetch inventory from the database.", variant: "destructive" });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toast, user]);

  const addInventoryItem = useCallback(async (itemData: Omit<InventoryItem, 'id' | 'createdAt'>) => {
    if (user?.role !== 'admin') {
      toast({ title: "Permission Denied", description: "You do not have permission to add items.", variant: "destructive" });
      return;
    }
    try {
      const batch = writeBatch(db);
      const newDocRef = doc(collection(db, INVENTORY_COLLECTION));
      
      batch.set(newDocRef, {
        ...itemData,
        createdAt: serverTimestamp(),
      });
      
      const message = `${user.username} added a new item: ${itemData.name}.`;
      const usersSnapshot = await getDocs(query(collection(db, USERS_COLLECTION), where('role', '==', 'admin')));
      usersSnapshot.docs.forEach(userDoc => {
          if (userDoc.id !== user.uid) {
              const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
              batch.set(notificationRef, {
                  recipientUid: userDoc.id, senderName: user.username, message,
                  link: `/inventory`, read: false, createdAt: serverTimestamp(), type: 'inventory'
              });
          }
      });

      await batch.commit();

      toast({
        title: "Item Added",
        description: `${itemData.name} has been added to inventory.`,
      });
    } catch (error) {
      console.error("Error adding inventory item:", error);
      toast({ title: "Error", description: "Failed to add inventory item.", variant: "destructive" });
    }
  }, [toast, user]);

  const getInventoryItem = useCallback((id: string) => {
    const item = inventory.find(item => item.id === id);
    if (item && user?.role === 'staff') {
        item.costPrice = 0;
    }
    return item;
  }, [inventory, user]);

  const updateInventoryItem = useCallback(async (id: string, updatedData: Partial<Omit<InventoryItem, 'id' | 'quantity' | 'createdAt'>> & { addStock?: number }) => {
     if (user?.role !== 'admin') {
      toast({ title: "Permission Denied", description: "You do not have permission to update items.", variant: "destructive" });
      return;
    }
    const itemDocRef = doc(db, INVENTORY_COLLECTION, id);
    try {
      const batch = writeBatch(db);
      
      const itemSnap = await getDoc(itemDocRef);
      if (!itemSnap.exists()) {
          toast({ title: "Error", description: "Item not found.", variant: "destructive" });
          return;
      }
      const currentItemData = itemSnap.data() as InventoryItem;

      const { addStock, ...restOfData } = updatedData;
      const updatePayload: any = { ...restOfData };
      
      if (addStock && addStock !== 0) {
        updatePayload.quantity = increment(addStock);
        
        const newQuantity = currentItemData.quantity + addStock;
        // Check if stock just dropped below reorder point
        if (newQuantity <= currentItemData.reorderPoint && currentItemData.quantity > currentItemData.reorderPoint) {
            const message = `Low stock alert: ${currentItemData.name} has only ${newQuantity} items left.`;
            const usersSnapshot = await getDocs(query(collection(db, USERS_COLLECTION), where('role', '==', 'admin')));
            usersSnapshot.docs.forEach(userDoc => {
                const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
                batch.set(notificationRef, {
                    recipientUid: userDoc.id, senderName: "System", message,
                    link: `/inventory/${id}/edit`, read: false, createdAt: serverTimestamp(), type: 'low-stock'
                });
            });
        }
      }
      
      batch.update(itemDocRef, updatePayload);
      
      const message = `${user.username} updated item ${updatedData.name || currentItemData.name}.`;
      const usersSnapshot = await getDocs(query(collection(db, USERS_COLLECTION), where('role', '==', 'admin')));
      usersSnapshot.docs.forEach(userDoc => {
          if (userDoc.id !== user.uid) {
              const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
              batch.set(notificationRef, {
                  recipientUid: userDoc.id, senderName: user.username, message,
                  link: `/inventory/${id}/edit`, read: false, createdAt: serverTimestamp(), type: 'inventory'
              });
          }
      });
      
      await batch.commit();
      
      toast({
        title: "Item Updated",
        description: `Item has been successfully updated.`,
      });
    } catch (error) {
      console.error("Error updating inventory item:", error);
      toast({ title: "Error", description: "Failed to update inventory item.", variant: "destructive" });
    }
  }, [toast, user]);


  const deleteInventoryItem = useCallback(async (id: string) => {
    if (user?.role !== 'admin') {
      toast({ title: "Permission Denied", description: "You do not have permission to delete items.", variant: "destructive" });
      return;
    }
    const itemToDelete = inventory.find(item => item.id === id);
    if (!itemToDelete) return;

    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, INVENTORY_COLLECTION, id));
      
      const message = `${user.username} deleted item: ${itemToDelete.name}.`;
      const usersSnapshot = await getDocs(query(collection(db, USERS_COLLECTION), where('role', '==', 'admin')));
      usersSnapshot.docs.forEach(userDoc => {
          if (userDoc.id !== user.uid) {
              const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
              batch.set(notificationRef, {
                  recipientUid: userDoc.id, senderName: user.username, message,
                  link: `/inventory`, read: false, createdAt: serverTimestamp(), type: 'inventory'
              });
          }
      });

      await batch.commit();

      toast({
        title: "Item Deleted",
        description: `Item '${itemToDelete.name}' has been deleted.`,
      });
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      toast({ title: "Error", description: "Failed to delete inventory item.", variant: "destructive" });
    }
  }, [inventory, toast, user]);
  

  return { inventory, isLoading, addInventoryItem, getInventoryItem, updateInventoryItem, deleteInventoryItem };
}
