
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInvoices } from '@/hooks/use-invoices';
import InvoiceList from '@/components/invoice-list';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';

export default function DashboardPage() {
  const { invoices, isLoading: invoicesLoading } = useInvoices();
  const { user, isLoading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const isLoading = invoicesLoading || authLoading;

  const activeInvoices = useMemo(() => {
    return invoices.filter(invoice => invoice.status !== 'Cancelled');
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return activeInvoices.filter(
      (invoice) =>
        invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activeInvoices, searchTerm]);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Invoices
          </h1>
          <p className="text-muted-foreground">
            {user?.role === 'admin' ? "Create and manage all invoices." : "Create and manage your invoices."}
          </p>
        </div>
        <Link href="/invoice/new" passHref>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      {activeInvoices.length > 0 ? (
        <>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by customer, invoice #, or phone"
              className="w-full rounded-full bg-white py-6 pl-10 pr-4 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <InvoiceList invoices={filteredInvoices} />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-white/50 p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-xl font-semibold font-headline">No active invoices</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started by creating your first invoice.
          </p>
          <Link href="/invoice/new" passHref>
            <Button className="mt-6">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
