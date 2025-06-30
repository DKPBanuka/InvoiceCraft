
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInvoices } from '@/hooks/use-invoices';
import InvoiceList from '@/components/invoice-list';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';
import { exportToCsv } from '@/lib/utils';


export default function DashboardPage() {
  const { invoices, isLoading: invoicesLoading } = useInvoices();
  const { user, isLoading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Unpaid'>('All');

  const isLoading = invoicesLoading || authLoading;

  const activeInvoices = useMemo(() => {
    return invoices.filter(invoice => invoice.status !== 'Cancelled');
  }, [invoices]);
  
  const { paidCount, unpaidCount } = useMemo(() => {
    const paid = activeInvoices.filter(i => i.status === 'Paid').length;
    const unpaid = activeInvoices.filter(i => i.status === 'Unpaid').length;
    return { paidCount: paid, unpaidCount: unpaid };
  }, [activeInvoices]);

  const filteredInvoices = useMemo(() => {
    return activeInvoices.filter(
      (invoice) => {
        const matchesStatus = statusFilter === 'All' || invoice.status === statusFilter;
        const matchesSearch = 
            invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch && matchesStatus;
      }
    );
  }, [activeInvoices, searchTerm, statusFilter]);

  const handleExport = () => {
    const dataToExport = filteredInvoices.map(invoice => {
        const subtotal = invoice.lineItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const discountAmount = subtotal * ((invoice.discount || 0) / 100);
        const total = subtotal - discountAmount;

        return {
            id: invoice.id,
            customerName: invoice.customerName,
            customerPhone: invoice.customerPhone || '',
            status: invoice.status,
            createdAt: format(new Date(invoice.createdAt), 'yyyy-MM-dd'),
            total: total.toFixed(2),
        };
    });

    const headers = {
        id: 'Invoice #',
        customerName: 'Customer Name',
        customerPhone: 'Customer Phone',
        status: 'Status',
        createdAt: 'Date',
        total: 'Total Amount (Rs.)',
    };

    exportToCsv(dataToExport, `invoices-${new Date().toISOString().split('T')[0]}`, headers);
  };

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
            You have {unpaidCount} unpaid and {paidCount} paid invoices.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
            </Button>
            <Link href="/invoice/new" passHref>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Invoice
              </Button>
            </Link>
        </div>
      </div>

      {activeInvoices.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                type="text"
                placeholder="Search by customer, invoice #, or phone"
                className="w-full bg-white py-3 pl-10 pr-4 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select onValueChange={(value) => setStatusFilter(value as 'All' | 'Paid' | 'Unpaid')} defaultValue="All">
                <SelectTrigger className="bg-white shadow-sm">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                </SelectContent>
            </Select>
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
