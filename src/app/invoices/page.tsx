
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInvoices } from '@/hooks/use-invoices';
import { useInventory } from '@/hooks/use-inventory';
import InvoiceList from '@/components/invoice-list';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Invoice, InvoiceStatus } from '@/lib/types';
import { format } from 'date-fns';
import { exportToCsv } from '@/lib/utils';

const calculateTotal = (invoice: Invoice): number => {
  const subtotal = invoice.lineItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
  let discountAmount = 0;
  if (invoice.discountType === 'percentage') {
      discountAmount = subtotal * ((invoice.discountValue || 0) / 100);
  } else if (invoice.discountType === 'fixed') {
      discountAmount = invoice.discountValue || 0;
  }
  return subtotal - discountAmount;
};

const calculatePaid = (invoice: Invoice): number => {
    return invoice.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
};

export default function InvoicesPage() {
  const { invoices, isLoading: invoicesLoading } = useInvoices();
  const { inventory, isLoading: inventoryLoading } = useInventory();
  const { user, isLoading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const isLoading = invoicesLoading || authLoading || inventoryLoading;

  const uniqueCategories = useMemo(() => {
    const categories = new Set(inventory.map(item => item.category).filter(Boolean));
    return ['All', ...Array.from(categories).sort()];
  }, [inventory]);

  const activeInvoices = useMemo(() => {
    return invoices.filter(invoice => invoice.status !== 'Cancelled');
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return activeInvoices.filter(
      (invoice) => {
        const matchesStatus = statusFilter === 'All' || invoice.status === statusFilter;
        const matchesSearch = 
            invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCategory = categoryFilter === 'All' || invoice.lineItems.some(lineItem => {
            const item = inventory.find(i => i.name === lineItem.description);
            return item && item.category === categoryFilter;
        });
        
        return matchesSearch && matchesStatus && matchesCategory;
      }
    );
  }, [activeInvoices, searchTerm, statusFilter, categoryFilter, inventory]);

  const handleExport = () => {
    const dataToExport = filteredInvoices.map(invoice => {
        const total = calculateTotal(invoice);
        const paid = calculatePaid(invoice);

        return {
            id: invoice.id,
            customerName: invoice.customerName,
            customerPhone: invoice.customerPhone || '',
            status: invoice.status,
            createdAt: format(new Date(invoice.createdAt), 'yyyy-MM-dd'),
            total: total.toFixed(2),
            paid: paid.toFixed(2),
            due: (total - paid).toFixed(2),
        };
    });

    const headers = {
        id: 'Invoice #',
        customerName: 'Customer Name',
        customerPhone: 'Customer Phone',
        status: 'Status',
        createdAt: 'Date',
        total: 'Total Amount (Rs.)',
        paid: 'Amount Paid (Rs.)',
        due: 'Amount Due (Rs.)'
    };

    exportToCsv(dataToExport, `invoices-${new Date().toISOString().split('T')[0]}`, headers);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
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
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
       <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">
              All Invoices
            </h1>
            <p className="text-muted-foreground">
              Browse and manage all your invoices.
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                type="text"
                placeholder="Search by customer, invoice #, or phone"
                className="w-full bg-white py-3 pl-10 pr-4 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select onValueChange={(value) => setStatusFilter(value as InvoiceStatus | 'All')} defaultValue="All">
                <SelectTrigger className="bg-white shadow-sm">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                </SelectContent>
            </Select>
            <Select onValueChange={(value) => setCategoryFilter(value)} defaultValue="All">
                <SelectTrigger className="bg-white shadow-sm">
                    <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                     {uniqueCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
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
