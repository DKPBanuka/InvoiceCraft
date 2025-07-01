
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { useInvoices } from '@/hooks/use-invoices';
import InvoiceView from '@/components/invoice-view';
import { Button } from '@/components/ui/button';
import { Printer, Edit, ArrowLeft, Loader2, FileX2, HandCoins } from 'lucide-react';
import type { Invoice } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useAuth } from '@/contexts/auth-context';
import { AddPaymentDialog } from '@/components/add-payment-dialog';

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { getInvoice, isLoading: invoicesLoading, cancelInvoice, addPaymentToInvoice } = useInvoices();
  const { user, isLoading: authLoading } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | undefined>(undefined);

  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const isLoading = invoicesLoading || authLoading;

  useEffect(() => {
    if (!isLoading && id) {
      const foundInvoice = getInvoice(id);
      if (foundInvoice) {
        setInvoice(foundInvoice);
      } else {
        router.push('/');
      }
    }
  }, [id, getInvoice, isLoading, router]);
  
  const handlePrint = () => {
    if (!invoice) return;

    const originalTitle = document.title;
    const newTitle = `${invoice.customerName.replace(/\s+/g, '_')}_${invoice.id}`;
    document.title = newTitle;

    window.addEventListener('afterprint', () => {
        document.title = originalTitle;
    }, { once: true });

    setTimeout(() => {
        window.print();
    }, 100);
  };

  if (isLoading || !invoice) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isActionable = invoice.status !== 'Cancelled' && invoice.status !== 'Paid';

  return (
    <div className="bg-muted/30 min-h-screen">
        <div className="container mx-auto max-w-4xl py-6 sm:py-10 print:max-w-none print:p-0">
            <div className="mb-6 flex items-center justify-between gap-4 no-print">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <div className="flex flex-wrap justify-end items-center gap-2">
                    {isActionable && (
                        <AddPaymentDialog invoice={invoice} addPaymentToInvoice={addPaymentToInvoice}>
                            <Button size="sm">
                                <HandCoins className="h-4 w-4" />
                                <span className="sr-only sm:not-sr-only sm:ml-2">Add Payment</span>
                            </Button>
                        </AddPaymentDialog>
                    )}
                    {user?.role === 'admin' && invoice.status !== 'Cancelled' && (
                        <Link href={`/invoice/${id}/edit`} passHref>
                            <Button variant="outline" size="sm" className="w-9 px-0 sm:w-auto sm:px-3">
                                <Edit className="h-4 w-4" />
                                <span className="sr-only sm:not-sr-only">Edit</span>
                            </Button>
                        </Link>
                    )}
                    <Button onClick={handlePrint} size="sm" className="w-9 px-0 sm:w-auto sm:px-3">
                        <Printer className="h-4 w-4" />
                        <span className="sr-only sm:not-sr-only">Print</span>
                    </Button>
                     {user?.role === 'admin' && invoice.status !== 'Cancelled' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="w-9 px-0 sm:w-auto sm:px-3">
                              <FileX2 className="h-4 w-4" />
                              <span className="sr-only sm:not-sr-only">Cancel</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will cancel invoice {invoice.id}. This action cannot be undone, but it will preserve the invoice number. Stock levels for the items on this invoice will be restored.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Go Back</AlertDialogCancel>
                              <AlertDialogAction onClick={() => cancelInvoice(invoice.id)} className="bg-destructive hover:bg-destructive/90">
                                Confirm Cancellation
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </div>
            <InvoiceView invoice={invoice} />
        </div>
    </div>
  );
}
