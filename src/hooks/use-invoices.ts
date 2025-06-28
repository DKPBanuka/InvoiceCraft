
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import type { Invoice, InvoiceStatus } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, serverTimestamp, writeBatch, query, orderBy, limit, getDocs, increment, where } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const INVOICES_COLLECTION = 'invoices';
const INVENTORY_COLLECTION = 'inventory';

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        setInvoices([]);
        return;
    };

    let q = query(collection(db, INVOICES_COLLECTION), orderBy("createdAt", "desc"));
    if (user.role === 'staff') {
      q = query(q, where('createdBy', '==', user.uid));
    }
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const invoicesData: Invoice[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
          } as Invoice;
        });
        setInvoices(invoicesData);
        setIsLoading(false);
      },
      (error) => {
        console.error("Firebase snapshot error:", error);
        toast({ title: "Error loading invoices", description: "Could not fetch invoices from the database.", variant: "destructive" });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toast, user]);

  const generateInvoiceNumber = useCallback(async () => {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    
    const q = query(
      collection(db, INVOICES_COLLECTION), 
      orderBy('id', 'desc'), 
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    let lastIdNum = 0;
    if (!querySnapshot.empty) {
        const lastId = querySnapshot.docs[0].id;
        if (lastId.startsWith(prefix)) {
            lastIdNum = parseInt(lastId.split('-').pop() || '0');
        }
    }
    
    const nextId = lastIdNum + 1;
    return `${prefix}${String(nextId).padStart(4, '0')}`;
  }, []);

  const addInvoice = useCallback(async (newInvoiceData: Omit<Invoice, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to create an invoice.", variant: "destructive" });
      return;
    }

    try {
      const invoiceId = await generateInvoiceNumber();
      const batch = writeBatch(db);

      // 1. Create Invoice
      const invoiceDocRef = doc(db, INVOICES_COLLECTION, invoiceId);
      batch.set(invoiceDocRef, {
        ...newInvoiceData,
        id: invoiceId,
        createdAt: serverTimestamp(),
        lineItems: newInvoiceData.lineItems.map(item => ({...item, id: crypto.randomUUID()})),
        createdBy: user.uid,
        createdByName: user.username,
      });

      // 2. Update inventory stock
      newInvoiceData.lineItems.forEach(lineItem => {
          if (lineItem.inventoryItemId) {
              const itemDocRef = doc(db, INVENTORY_COLLECTION, lineItem.inventoryItemId);
              batch.update(itemDocRef, { quantity: increment(-lineItem.quantity) });
          }
      });

      await batch.commit();

      toast({
        title: "Invoice Created",
        description: `Invoice ${invoiceId} has been successfully created.`,
      });
      router.push('/');
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast({ title: "Error", description: "Failed to create invoice.", variant: "destructive" });
    }
  }, [generateInvoiceNumber, router, toast, user]);
  
  const getInvoice = useCallback((id: string) => {
    return invoices.find(inv => inv.id === id);
  }, [invoices]);

  const updateInvoice = useCallback(async (id: string, updatedData: Partial<Omit<Invoice, 'id' | 'createdBy' | 'createdByName'>>) => {
    if (user?.role !== 'admin') {
        toast({ title: "Permission Denied", description: "You are not authorized to edit invoices.", variant: "destructive"});
        return;
    }
    const originalInvoice = invoices.find(inv => inv.id === id);
    if (!originalInvoice) return;

    try {
      const batch = writeBatch(db);
      const invoiceDocRef = doc(db, INVOICES_COLLECTION, id);

      const stockAdjustments = new Map<string, number>();

      // Add back original quantities
      originalInvoice.lineItems.forEach(item => {
          if (item.inventoryItemId) {
              stockAdjustments.set(item.inventoryItemId, (stockAdjustments.get(item.inventoryItemId) || 0) + item.quantity);
          }
      });
      
      // Subtract new quantities
      updatedData.lineItems?.forEach(item => {
          if (item.inventoryItemId) {
              stockAdjustments.set(item.inventoryItemId, (stockAdjustments.get(item.inventoryItemId) || 0) - item.quantity);
          }
      });
      
      // Apply stock adjustments to batch
      stockAdjustments.forEach((quantityChange, itemId) => {
          if (quantityChange !== 0) {
              const itemDocRef = doc(db, INVENTORY_COLLECTION, itemId);
              batch.update(itemDocRef, { quantity: increment(quantityChange) });
          }
      });

      // Update invoice data
      const finalUpdateData = {
          ...updatedData,
          lineItems: updatedData.lineItems?.map(item => ({...item, id: item.id || crypto.randomUUID()}))
      };
      batch.update(invoiceDocRef, finalUpdateData as any);

      await batch.commit();

      toast({
          title: "Invoice Updated",
          description: `Invoice ${id} has been successfully updated.`,
      });
      router.push(`/invoice/${id}`);
    } catch (error) {
        console.error("Error updating invoice:", error);
        toast({ title: "Error", description: "Failed to update invoice.", variant: "destructive" });
    }
  }, [invoices, router, toast, user]);

  const cancelInvoice = useCallback(async (id: string) => {
    if (user?.role !== 'admin') {
        toast({ title: "Permission Denied", description: "You are not authorized to cancel invoices.", variant: "destructive"});
        return;
    }
    const invoiceToCancel = invoices.find(inv => inv.id === id);
    if (!invoiceToCancel || invoiceToCancel.status === 'Cancelled') return;

    try {
        const batch = writeBatch(db);
        
        // 1. Update invoice status
        const invoiceDocRef = doc(db, INVOICES_COLLECTION, id);
        batch.update(invoiceDocRef, { status: 'Cancelled' });

        // 2. Restore inventory stock
        invoiceToCancel.lineItems.forEach(lineItem => {
        if (lineItem.inventoryItemId) {
            const itemDocRef = doc(db, INVENTORY_COLLECTION, lineItem.inventoryItemId);
            batch.update(itemDocRef, { quantity: increment(lineItem.quantity) });
        }
        });

        await batch.commit();
        
        toast({
            title: "Invoice Cancelled",
            description: `Invoice ${id} has been cancelled.`,
        });
        router.push('/');
    } catch (error) {
        console.error("Error cancelling invoice:", error);
        toast({ title: "Error", description: "Failed to cancel invoice.", variant: "destructive" });
    }
  }, [invoices, router, toast, user]);
  
  return { invoices, isLoading, addInvoice, getInvoice, updateInvoice, cancelInvoice, generateInvoiceNumber };
}
