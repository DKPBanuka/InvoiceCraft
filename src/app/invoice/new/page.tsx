
"use client";

import { useRouter } from 'next/navigation';
import InvoiceForm from '@/components/invoice-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NewInvoicePage() {
  const router = useRouter();

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            New Invoice
          </h1>
          <p className="text-muted-foreground">
            Fill in the details below to create a new invoice.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
      <InvoiceForm />
    </div>
  );
}
