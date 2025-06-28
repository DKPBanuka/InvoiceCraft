
import type { Invoice, LineItem } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import Logo from './logo';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

interface InvoiceViewProps {
  invoice: Invoice;
}

const getWarrantyEndDate = (startDate: string, warrantyPeriod: string): string => {
    const date = new Date(startDate);
    if (warrantyPeriod === 'N/A') return 'N/A';
    
    const parts = warrantyPeriod.split(' ');
    if (parts.length !== 2) return 'N/A';

    const value = parseInt(parts[0], 10);
    const unit = parts[1];

    if (isNaN(value)) return 'N/A';

    if (unit.startsWith('Week')) {
      date.setDate(date.getDate() + value * 7);
    } else if (unit.startsWith('Month')) {
      date.setMonth(date.getMonth() + value);
    } else if (unit.startsWith('Year')) {
      date.setFullYear(date.getFullYear() + value);
    } else {
        return 'N/A';
    }
    return format(date, 'PPP');
};

export default function InvoiceView({ invoice }: InvoiceViewProps) {
  const subtotal = invoice.lineItems.reduce(
    (acc, item) => acc + item.quantity * item.price,
    0
  );
  const discountAmount = subtotal * (invoice.discount / 100);
  const tax = 0;
  const total = subtotal - discountAmount + tax;
  
  return (
    <Card className="print-container w-full rounded-xl shadow-lg bg-white">
      <CardHeader className="p-4 sm:p-6 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between gap-6">
          <div>
            <div className="no-print">
              <Logo />
            </div>
            <div className="hidden print:block">
               <h1 className="text-2xl font-bold font-headline text-foreground">
                    Tharindu Niroshan
                </h1>
                <p>0756438091</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <h2 className="text-3xl font-bold font-headline text-primary">INVOICE</h2>
            <p className="text-muted-foreground mt-1">{invoice.id}</p>
             <Badge className={cn(
                "mt-2 text-xs", 
                invoice.status === 'Paid' && 'bg-accent text-accent-foreground',
                invoice.status === 'Unpaid' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
                invoice.status === 'Cancelled' && 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
             )}>
                {invoice.status}
            </Badge>
          </div>
        </div>
        <Separator className="my-4 sm:my-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div className="flex flex-col gap-4">
                <div>
                    <p className="text-muted-foreground font-semibold">Billed To</p>
                    <p className="font-medium text-lg">{invoice.customerName}</p>
                    {invoice.customerPhone && (
                        <p className="text-muted-foreground">{invoice.customerPhone}</p>
                    )}
                </div>
                 <div>
                    <p className="text-muted-foreground font-semibold">Invoice Date</p>
                    <p>{format(new Date(invoice.createdAt), 'PPP')}</p>
                </div>
            </div>
            <div className="text-left sm:text-right no-print">
                <p className="text-muted-foreground font-semibold">From</p>
                <p className="font-medium">{invoice.createdByName}</p>
                <p>0756438091</p>
            </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 md:p-8 pt-0">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
              <TableRow className="bg-muted/50">
              <TableHead className="w-2/5 sm:w-auto whitespace-nowrap">Description</TableHead>
              <TableHead className="text-center whitespace-nowrap">Qty</TableHead>
              <TableHead className="text-right whitespace-nowrap">Unit Price</TableHead>
              <TableHead className="whitespace-nowrap">Warranty</TableHead>
              <TableHead className="text-right whitespace-nowrap">Amount</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
              {invoice.lineItems.map((item: LineItem) => {
              const warrantyEndDate = getWarrantyEndDate(invoice.createdAt, item.warrantyPeriod);
              return (
              <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">Rs.{item.price.toFixed(2)}</TableCell>
                  <TableCell>
                  <p className="font-medium">{item.warrantyPeriod}</p>
                  {warrantyEndDate !== 'N/A' && (
                      <p className="text-xs text-muted-foreground">Ends: {warrantyEndDate}</p>
                  )}
                  </TableCell>
                  <TableCell className="text-right">
                  Rs.{(item.quantity * item.price).toFixed(2)}
                  </TableCell>
              </TableRow>
              )})}
          </TableBody>
          </Table>
        </div>

        <Separator className="my-4 sm:my-6" />
        <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>Rs.{subtotal.toFixed(2)}</span>
                </div>
                 {invoice.discount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                        <span>Discount ({invoice.discount}%)</span>
                        <span>-Rs.{discountAmount.toFixed(2)}</span>
                    </div>
                 )}
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax (0%)</span>
                    <span>Rs.{tax.toFixed(2)}</span>
                </div>
                <Separator/>
                 <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span className="text-primary">Rs.{total.toFixed(2)}</span>
                </div>
            </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 sm:p-6 md:p-8 pt-0">
        <div className="text-sm text-muted-foreground no-print">
            <p>If you have any questions, please contact us at 0756438091.</p>
        </div>
      </CardFooter>
    </Card>
  );
}
