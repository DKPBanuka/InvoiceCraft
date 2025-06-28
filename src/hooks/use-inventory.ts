
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { InventoryItem } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, increment } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const INVENTORY_COLLECTION = 'inventory';

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
          const item = {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
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
      await addDoc(collection(db, INVENTORY_COLLECTION), {
        ...itemData,
        createdAt: serverTimestamp(),
      });
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
      const { addStock, ...restOfData } = updatedData;
      const updatePayload: any = { ...restOfData };
      if (addStock && addStock !== 0) {
        updatePayload.quantity = increment(addStock);
      }
      
      await updateDoc(itemDocRef, updatePayload);
      
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
      await deleteDoc(doc(db, INVENTORY_COLLECTION, id));
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
