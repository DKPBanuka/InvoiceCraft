
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useInvoices } from '@/hooks/use-invoices';
import InvoiceForm from '@/components/invoice-form';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { Invoice } from '@/lib/types';

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const { getInvoice, isLoading } = useInvoices();
  const [invoice, setInvoice] = useState<Invoice | undefined>(undefined);

  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    if (!isLoading && id) {
      const foundInvoice = getInvoice(id);
      if (foundInvoice) {
        setInvoice(foundInvoice);
      } else {
        // If invoice not found, redirect to home
        router.push('/');
      }
    }
  }, [id, getInvoice, isLoading, router]);

  if (isLoading || !invoice) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
       <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">
              Edit Invoice {invoice.id}
            </h1>
            <p className="text-muted-foreground">
              Update the details for your invoice.
            </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
        </Button>
      </div>
      <InvoiceForm invoice={invoice} />
    </div>
  );
}
