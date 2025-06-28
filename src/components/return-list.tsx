
"use client";

import Link from 'next/link';
import type { ReturnItem, ReturnStatus } from '@/lib/types';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface ReturnListProps {
  returns: ReturnItem[];
}

const statusStyles: { [key in ReturnStatus]: string } = {
    'Awaiting Inspection': 'bg-yellow-100 text-yellow-800 border-transparent dark:bg-yellow-900/50 dark:text-yellow-300',
    'Under Repair': 'bg-blue-200 text-blue-800 border-transparent dark:bg-blue-900/50 dark:text-blue-300',
    'Ready for Pickup': 'bg-purple-200 text-purple-800 border-transparent dark:bg-purple-900/50 dark:text-purple-300',
    'To be Replaced': 'bg-orange-200 text-orange-800 border-transparent dark:bg-orange-900/50 dark:text-orange-300',
    'To be Refunded': 'bg-red-200 text-red-800 border-transparent dark:bg-red-900/50 dark:text-red-300',
    'Return to Supplier': 'bg-indigo-200 text-indigo-800 border-transparent dark:bg-indigo-900/50 dark:text-indigo-300',
    'Completed / Closed': 'bg-accent text-accent-foreground border-transparent',
};


export default function ReturnList({ returns }: ReturnListProps) {
  if (returns.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        <p>No returns match your search criteria.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop View: Table */}
      <div className="hidden md:block rounded-lg border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Return ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {returns.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-primary">{item.returnId}</TableCell>
                <TableCell>{item.customerName}</TableCell>
                <TableCell>{item.inventoryItemName}</TableCell>
                <TableCell>{format(new Date(item.createdAt), 'PPP')}</TableCell>
                <TableCell>
                  <Badge className={cn('text-xs', statusStyles[item.status])}>{item.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                    <Link href={`/returns/${item.id}`} passHref>
                        <Button variant="outline" size="sm">
                            View <ChevronRight className="h-4 w-4 -mr-1" />
                        </Button>
                    </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View: Cards */}
      <div className="md:hidden space-y-4">
        {returns.map((item) => (
          <Link href={`/returns/${item.id}`} key={item.id} className="group">
             <Card className="bg-white transition-shadow duration-200 group-hover:shadow-md">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{item.inventoryItemName}</CardTitle>
                        <Badge className={cn('text-xs', statusStyles[item.status])}>{item.status}</Badge>
                    </div>
                    <CardDescription className="pt-1 !-mb-2">
                        {item.returnId}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Customer</span>
                        <span className="font-medium">{item.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Logged</span>
                        <span className="font-medium">{format(new Date(item.createdAt), 'PPP')}</span>
                    </div>
                </CardContent>
             </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
