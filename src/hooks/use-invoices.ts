
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import type { Invoice, InvoiceStatus, Payment, InventoryItem } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, serverTimestamp, writeBatch, query, orderBy, limit, getDocs, increment, where, arrayUnion, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { invoiceServerSchema, invoiceServerObjectSchema, paymentServerSchema } from '@/lib/schemas';

const INVOICES_COLLECTION = 'invoices';
const INVENTORY_COLLECTION = 'inventory';
const USERS_COLLECTION = 'users';
const NOTIFICATIONS_COLLECTION = 'notifications';
const STOCK_MOVEMENTS_COLLECTION = 'stockMovements';

const calculateTotal = (invoice: Pick<Invoice, 'lineItems' | 'discountType' | 'discountValue'>): number => {
    const subtotal = invoice.lineItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
    let discountAmount = 0;
    if (invoice.discountType === 'percentage') {
        discountAmount = subtotal * ((invoice.discountValue || 0) / 100);
    } else if (invoice.discountType === 'fixed') {
        discountAmount = invoice.discountValue || 0;
    }
    return subtotal - discountAmount;
};

const calculatePaid = (invoice: Pick<Invoice, 'payments'>): number => {
    return invoice.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
};

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

    const { initialPayment, status, ...dataToValidate } = newInvoiceData;
    const validationResult = invoiceServerSchema.safeParse(dataToValidate);

    if (!validationResult.success) {
        const errorMessage = validationResult.error.errors.map(e => e.message).join('\n');
        toast({ title: "Invalid Invoice Data", description: errorMessage, variant: "destructive" });
        return;
    }
    
    const totalAmount = calculateTotal(newInvoiceData);
    if (status === 'Partially Paid') {
        if (!initialPayment || initialPayment <= 0 || initialPayment >= totalAmount) {
            toast({ title: "Invalid Payment", description: "For partially paid invoices, the payment must be greater than zero and less than the total.", variant: "destructive" });
            return;
        }
    }

    try {
      const batch = writeBatch(db);
      
      for (const lineItem of validationResult.data.lineItems) {
        if (lineItem.type === 'product' && lineItem.inventoryItemId) {
            const itemDocRef = doc(db, INVENTORY_COLLECTION, lineItem.inventoryItemId);
            const itemSnap = await getDoc(itemDocRef);
            if (!itemSnap.exists() || itemSnap.data().quantity < lineItem.quantity) {
                toast({
                    title: "Stock Unavailable",
                    description: `Not enough stock for ${lineItem.description}. Only ${itemSnap.data()?.quantity || 0} available.`,
                    variant: "destructive"
                });
                return;
            }
        }
      }

      const invoiceId = await generateInvoiceNumber();
      const finalInvoiceData = { ...newInvoiceData };
      finalInvoiceData.payments = [];

      if (finalInvoiceData.status === 'Paid') {
        const payment: Payment = {
          id: crypto.randomUUID(), amount: totalAmount, date: new Date().toISOString(), method: 'Cash',
          notes: 'Initial full payment on creation.', createdBy: user.uid, createdByName: user.username,
        };
        finalInvoiceData.payments = [payment];
      } else if (finalInvoiceData.status === 'Partially Paid' && finalInvoiceData.initialPayment && finalInvoiceData.initialPayment > 0) {
        const payment: Payment = {
          id: crypto.randomUUID(), amount: finalInvoiceData.initialPayment, date: new Date().toISOString(), method: 'Cash',
          notes: 'Initial partial payment on creation.', createdBy: user.uid, createdByName: user.username,
        };
        finalInvoiceData.payments = [payment];
      }

      const { initialPayment: removed, ...invoiceToSave } = finalInvoiceData;
      const invoiceDocRef = doc(db, INVOICES_COLLECTION, invoiceId);
      const cleanedData = cleanDataForFirebase({
        ...invoiceToSave, id: invoiceId, createdAt: serverTimestamp(),
        lineItems: newInvoiceData.lineItems.map(item => ({...item, id: item.id || crypto.randomUUID()})),
        createdBy: user.uid, createdByName: user.username,
      });

      batch.set(invoiceDocRef, cleanedData);

      for (const lineItem of newInvoiceData.lineItems) {
        if (lineItem.inventoryItemId && lineItem.type === 'product') {
            const itemDocRef = doc(db, INVENTORY_COLLECTION, lineItem.inventoryItemId);
            batch.update(itemDocRef, { quantity: increment(-lineItem.quantity) });
            
            const movementRef = doc(collection(db, STOCK_MOVEMENTS_COLLECTION));
            batch.set(movementRef, {
                inventoryItemId: lineItem.inventoryItemId,
                type: 'sale',
                quantity: lineItem.quantity,
                referenceId: invoiceId,
                createdAt: serverTimestamp(),
                createdByName: user.username,
            });

            const itemSnap = await getDoc(itemDocRef);
            if (itemSnap.exists()) {
                const itemData = itemSnap.data() as InventoryItem;
                const newQuantity = itemData.quantity - lineItem.quantity;
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
        }
      }
      
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
      toast({ title: "Invoice Created", description: `Invoice ${invoiceId} has been successfully created.` });
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

    const validationResult = invoiceServerObjectSchema.partial().safeParse(updatedData);
    if (!validationResult.success) {
        const errorMessage = validationResult.error.errors.map(e => e.message).join('\n');
        toast({ title: "Invalid Invoice Data", description: errorMessage, variant: "destructive" });
        return;
    }

    try {
      const batch = writeBatch(db);
      const invoiceDocRef = doc(db, INVOICES_COLLECTION, id);

      const stockAdjustments = new Map<string, number>();
      originalInvoice.lineItems.forEach(item => {
          if (item.inventoryItemId) {
              stockAdjustments.set(item.inventoryItemId, (stockAdjustments.get(item.inventoryItemId) || 0) + item.quantity);
          }
      });
      updatedData.lineItems?.forEach(item => {
          if (item.inventoryItemId) {
              stockAdjustments.set(item.inventoryItemId, (stockAdjustments.get(item.inventoryItemId) || 0) - item.quantity);
          }
      });
      
      for (const [itemId, quantityChange] of stockAdjustments.entries()) {
          if (quantityChange !== 0) {
              const itemDocRef = doc(db, INVENTORY_COLLECTION, itemId);
              const itemSnap = await getDoc(itemDocRef);
              if (!itemSnap.exists()) {
                  toast({ title: "Error", description: `Inventory item ${itemId} not found.`, variant: "destructive"});
                  return;
              }
              const currentStock = itemSnap.data().quantity;
              if (currentStock - quantityChange < 0) {
                  toast({ title: "Stock Unavailable", description: `Not enough stock for ${itemSnap.data().name}.`, variant: "destructive"});
                  return;
              }
          }
      }

      for (const [itemId, quantityChange] of stockAdjustments.entries()) {
          if (quantityChange !== 0) {
              const itemDocRef = doc(db, INVENTORY_COLLECTION, itemId);
              batch.update(itemDocRef, { quantity: increment(-quantityChange) });
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

      const finalUpdateData = cleanDataForFirebase({
          ...updatedData, status: newStatus,
          lineItems: updatedData.lineItems?.map(item => ({...item, id: item.id || crypto.randomUUID()}))
      });
      batch.update(invoiceDocRef, finalUpdateData);

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
      toast({ title: "Invoice Updated", description: `Invoice ${id} has been successfully updated.` });
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
        const invoiceDocRef = doc(db, INVOICES_COLLECTION, id);
        batch.update(invoiceDocRef, { status: 'Cancelled' });

        invoiceToCancel.lineItems.forEach(lineItem => {
            if (lineItem.inventoryItemId && lineItem.type === 'product') {
                const itemDocRef = doc(db, INVENTORY_COLLECTION, lineItem.inventoryItemId);
                batch.update(itemDocRef, { quantity: increment(lineItem.quantity) });

                const movementRef = doc(collection(db, STOCK_MOVEMENTS_COLLECTION));
                batch.set(movementRef, {
                    inventoryItemId: lineItem.inventoryItemId,
                    type: 'cancellation',
                    quantity: lineItem.quantity,
                    referenceId: id,
                    createdAt: serverTimestamp(),
                    createdByName: user.username,
                });
            }
        });

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
        toast({ title: "Invoice Cancelled", description: `Invoice ${id} has been cancelled.` });
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

    const validationResult = paymentServerSchema.safeParse(paymentData);
    if (!validationResult.success) {
        const errorMessage = validationResult.error.errors.map(e => e.message).join('\n');
        toast({ title: "Invalid Payment Data", description: errorMessage, variant: "destructive" });
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
            ...validationResult.data,
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
