
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import type { Invoice, InvoiceStatus, Payment, InventoryItem } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, serverTimestamp, writeBatch, query, orderBy, limit, getDocs, increment, where, arrayUnion, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const INVOICES_COLLECTION = 'invoices';
const INVENTORY_COLLECTION = 'inventory';
const USERS_COLLECTION = 'users';
const NOTIFICATIONS_COLLECTION = 'notifications';

const calculateTotal = (invoice: Pick<Invoice, 'lineItems' | 'discount'>): number => {
    const subtotal = invoice.lineItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
    const discountAmount = subtotal * ((invoice.discount || 0) / 100);
    return subtotal - discountAmount;
};

const calculatePaid = (invoice: Pick<Invoice, 'payments'>): number => {
    return invoice.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
};

/**
 * Recursively removes keys with `undefined` values from an object or array.
 * This is crucial for preparing data for Firestore, which does not support `undefined`.
 * @param obj The object or array to clean.
 * @returns A new object or array with `undefined` values removed.
 */
function cleanDataForFirebase(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(v => cleanDataForFirebase(v));
    }
    if (obj !== null && typeof obj === 'object' && !(obj instanceof Date) && typeof obj.toDate !== 'function') {
        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
            if (obj[key] !== undefined) {
                newObj[key] = cleanDataForFirebase(obj[key]);
            }
        }
        return newObj;
    }
    return obj;
}


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
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const invoicesData: Invoice[] = snapshot.docs.map(doc => {
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

  const addInvoice = useCallback(async (newInvoiceData: Omit<Invoice, 'id' | 'createdAt' | 'createdBy' | 'createdByName'> & { initialPayment?: number }) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to create an invoice.", variant: "destructive" });
      return;
    }

    try {
      const invoiceId = await generateInvoiceNumber();
      const batch = writeBatch(db);
      
      const finalInvoiceData = { ...newInvoiceData };

      // Initialize payments array
      finalInvoiceData.payments = [];

      // If status is 'Paid', automatically add a full payment record.
      if (finalInvoiceData.status === 'Paid') {
        const totalAmount = calculateTotal(finalInvoiceData);
        const payment: Payment = {
          id: crypto.randomUUID(),
          amount: totalAmount,
          date: new Date().toISOString(),
          method: 'Cash', // You can make this selectable later
          notes: 'Initial full payment on creation.',
          createdBy: user.uid,
          createdByName: user.username,
        };
        finalInvoiceData.payments = [payment];
      } else if (finalInvoiceData.status === 'Partially Paid' && finalInvoiceData.initialPayment && finalInvoiceData.initialPayment > 0) {
        // Handle partial payment
        const payment: Payment = {
          id: crypto.randomUUID(),
          amount: finalInvoiceData.initialPayment,
          date: new Date().toISOString(),
          method: 'Cash', // You can make this selectable later
          notes: 'Initial partial payment on creation.',
          createdBy: user.uid,
          createdByName: user.username,
        };
        finalInvoiceData.payments = [payment];
      }

      // 1. Create Invoice after cleaning it of undefined values
      const { initialPayment, ...invoiceToSave } = finalInvoiceData;
      const invoiceDocRef = doc(db, INVOICES_COLLECTION, invoiceId);
      const cleanedData = cleanDataForFirebase({
        ...invoiceToSave,
        id: invoiceId,
        createdAt: serverTimestamp(),
        lineItems: newInvoiceData.lineItems.map(item => ({...item, id: item.id || crypto.randomUUID()})),
        createdBy: user.uid,
        createdByName: user.username,
      });

      batch.set(invoiceDocRef, cleanedData);

      // 2. Update inventory stock and check for low stock
      for (const lineItem of newInvoiceData.lineItems) {
        if (lineItem.inventoryItemId) {
            const itemDocRef = doc(db, INVENTORY_COLLECTION, lineItem.inventoryItemId);
            
            // Fetch item data to check stock level *before* decrementing
            const itemSnap = await getDoc(itemDocRef);
            if (itemSnap.exists()) {
                const itemData = itemSnap.data() as InventoryItem;
                const newQuantity = itemData.quantity - lineItem.quantity;
                
                // If stock level crosses the reorder point, send notification
                if (newQuantity <= itemData.reorderPoint && itemData.quantity > itemData.reorderPoint) {
                    const message = `Low stock alert: ${itemData.name} has only ${newQuantity} items left.`;
                    const adminsSnapshot = await getDocs(query(collection(db, USERS_COLLECTION), where('role', '==', 'admin')));
                    adminsSnapshot.forEach(adminDoc => {
                        const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
                        batch.set(notificationRef, {
                            recipientUid: adminDoc.id, senderName: "System", message,
                            link: `/inventory/${lineItem.inventoryItemId}/edit`, read: false, createdAt: serverTimestamp(), type: 'low-stock'
                        });
                    });
                }
            }
            batch.update(itemDocRef, { quantity: increment(-lineItem.quantity) });
        }
      }
      
      // 3. Notify Admins about the new invoice
      const message = `${user.username} created a new invoice ${invoiceId} for ${newInvoiceData.customerName}.`;
      const usersSnapshot = await getDocs(query(collection(db, USERS_COLLECTION), where('role', '==', 'admin')));
      usersSnapshot.docs.forEach(userDoc => {
          if (userDoc.id !== user.uid) {
              const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
              batch.set(notificationRef, {
                  recipientUid: userDoc.id, senderName: user.username, message,
                  link: `/invoice/${invoiceId}`, read: false, createdAt: serverTimestamp(), type: 'invoice'
              });
          }
      });


      await batch.commit();

      toast({
        title: "Invoice Created",
        description: `Invoice ${invoiceId} has been successfully created.`,
      });
      router.push('/invoices');
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
      
      // Apply stock adjustments to batch and check for low stock
      for (const [itemId, quantityChange] of stockAdjustments.entries()) {
          if (quantityChange !== 0) {
              const itemDocRef = doc(db, INVENTORY_COLLECTION, itemId);

              // Low stock check only when stock decreases (negative change)
              if (quantityChange < 0) {
                  const itemSnap = await getDoc(itemDocRef);
                  if (itemSnap.exists()) {
                      const itemData = itemSnap.data() as InventoryItem;
                      const newQuantity = itemData.quantity + quantityChange;
                      if (newQuantity <= itemData.reorderPoint && itemData.quantity > itemData.reorderPoint) {
                          const message = `Low stock alert: ${itemData.name} has only ${newQuantity} items left.`;
                          const adminsSnapshot = await getDocs(query(collection(db, USERS_COLLECTION), where('role', '==', 'admin')));
                          adminsSnapshot.forEach(adminDoc => {
                              const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
                              batch.set(notificationRef, {
                                  recipientUid: adminDoc.id, senderName: "System", message,
                                  link: `/inventory/${itemId}/edit`, read: false, createdAt: serverTimestamp(), type: 'low-stock'
                              });
                          });
                      }
                  }
              }

              batch.update(itemDocRef, { quantity: increment(quantityChange) });
          }
      }

      const newTotal = calculateTotal(updatedData as Invoice);
      const amountPaid = calculatePaid(originalInvoice);
      let newStatus: InvoiceStatus = 'Unpaid';
      if (amountPaid >= newTotal) {
          newStatus = 'Paid';
      } else if (amountPaid > 0) {
          newStatus = 'Partially Paid';
      }

      // Update invoice data after cleaning it from undefined values
      const finalUpdateData = cleanDataForFirebase({
          ...updatedData,
          status: newStatus,
          lineItems: updatedData.lineItems?.map(item => ({...item, id: item.id || crypto.randomUUID()}))
      });
      batch.update(invoiceDocRef, finalUpdateData);

       // Notify Admins
      const message = `${user.username} updated invoice ${id}.`;
      const usersSnapshot = await getDocs(query(collection(db, USERS_COLLECTION), where('role', '==', 'admin')));
      usersSnapshot.docs.forEach(userDoc => {
          if (userDoc.id !== user.uid) {
              const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
              batch.set(notificationRef, {
                  recipientUid: userDoc.id, senderName: user.username, message,
                  link: `/invoice/${id}`, read: false, createdAt: serverTimestamp(), type: 'invoice'
              });
          }
      });

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

        // 3. Notify Admins
        const message = `${user.username} cancelled invoice ${id}.`;
        const usersSnapshot = await getDocs(query(collection(db, USERS_COLLECTION), where('role', '==', 'admin')));
        usersSnapshot.docs.forEach(userDoc => {
            if (userDoc.id !== user.uid) {
                const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
                batch.set(notificationRef, {
                    recipientUid: userDoc.id, senderName: user.username, message,
                    link: `/invoice/${id}`, read: false, createdAt: serverTimestamp(), type: 'invoice'
                });
            }
        });

        await batch.commit();
        
        toast({
            title: "Invoice Cancelled",
            description: `Invoice ${id} has been cancelled.`,
        });
        router.push('/invoices');
    } catch (error) {
        console.error("Error cancelling invoice:", error);
        toast({ title: "Error", description: "Failed to cancel invoice.", variant: "destructive" });
    }
  }, [invoices, router, toast, user]);
  
  const addPaymentToInvoice = useCallback(async (invoiceId: string, paymentData: Omit<Payment, 'id' | 'date' | 'createdBy' | 'createdByName'>) => {
    if (!user) {
        toast({title: "Error", description: "You must be logged in.", variant: "destructive"});
        return;
    }

    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
        toast({title: "Error", description: "Invoice not found.", variant: "destructive"});
        return;
    }

    try {
        const batch = writeBatch(db);
        const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);

        const newPayment: Payment = {
            ...paymentData,
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            createdBy: user.uid,
            createdByName: user.username,
        };

        const currentPayments = invoice.payments || [];
        const newPayments = [...currentPayments, newPayment];
        const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
        const totalAmount = calculateTotal(invoice);
        
        let newStatus: InvoiceStatus = 'Unpaid';
        if (totalPaid >= totalAmount) {
            newStatus = 'Paid';
        } else if (totalPaid > 0) {
            newStatus = 'Partially Paid';
        }

        batch.update(invoiceRef, {
            payments: newPayments,
            status: newStatus
        });
        
        const message = `${user.username} added a payment of Rs.${paymentData.amount.toFixed(2)} to invoice ${invoiceId}.`;
        const usersSnapshot = await getDocs(query(collection(db, USERS_COLLECTION), where('role', 'in', ['admin', 'staff'])));
        usersSnapshot.docs.forEach(userDoc => {
            if (userDoc.id !== user.uid) {
                const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
                batch.set(notificationRef, {
                    recipientUid: userDoc.id, senderName: user.username, message,
                    link: `/invoice/${invoiceId}`, read: false, createdAt: serverTimestamp(), type: 'invoice'
                });
            }
        });

        await batch.commit();

        toast({title: "Payment Added", description: "The payment has been successfully recorded."});
    } catch (error) {
        console.error("Error adding payment: ", error);
        toast({title: "Error", description: "Failed to add payment.", variant: "destructive"});
    }
  }, [user, invoices, toast]);

  return { invoices, isLoading, addInvoice, getInvoice, updateInvoice, cancelInvoice, generateInvoiceNumber, addPaymentToInvoice };
}
