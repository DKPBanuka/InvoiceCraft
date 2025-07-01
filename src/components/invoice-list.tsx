
"use client";

import Link from 'next/link';
import type { Invoice, InvoiceStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface InvoiceListProps {
  invoices: Invoice[];
}

const statusStyles: { [key in InvoiceStatus]: string } = {
    Paid: 'bg-accent text-accent-foreground border-transparent',
    Unpaid: 'bg-yellow-100 text-yellow-800 border-transparent dark:bg-yellow-900/50 dark:text-yellow-300',
    'Partially Paid': 'bg-blue-200 text-blue-800 border-transparent dark:bg-blue-900/50 dark:text-blue-300',
    Cancelled: 'bg-gray-200 text-gray-500 border-transparent dark:bg-gray-700 dark:text-gray-300',
};

export default function InvoiceList({ invoices }: InvoiceListProps) {
  const calculateTotal = (invoice: Invoice) => {
    const subtotal = invoice.lineItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
    const discountAmount = subtotal * ((invoice.discount || 0) / 100);
    return subtotal - discountAmount;
  };

  if (invoices.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        <p>No invoices match your search.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
      {invoices.map((invoice) => (
        <Link href={`/invoice/${invoice.id}`} key={invoice.id} className="group">
          <Card className={cn("h-full transition-all duration-300 ease-in-out group-hover:shadow-lg group-hover:-translate-y-1 bg-white", invoice.status === 'Cancelled' && 'opacity-60 bg-gray-50')}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-headline text-primary">{invoice.id}</CardTitle>
                <Badge className={cn('text-xs', statusStyles[invoice.status])}>
                  {invoice.status}
                </Badge>
              </div>
              <CardDescription className="pt-1">{invoice.customerName}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-end justify-between text-sm">
                <div>
                    <p className="text-muted-foreground">Invoice Date</p>
                    <p className="font-medium">{format(new Date(invoice.createdAt), 'PPP')}</p>
                </div>
                <div className="text-right">
                    <p className="text-muted-foreground">Total</p>
                    <p className="text-lg font-semibold font-headline">
                        Rs.{calculateTotal(invoice).toFixed(2)}
                    </p>
                </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
