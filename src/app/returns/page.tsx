
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Archive, Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReturns } from '@/hooks/use-returns';
import ReturnList from '@/components/return-list';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import type { ReturnStatus } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { exportToCsv } from '@/lib/utils';

export default function ReturnsPage() {
  const { returns, isLoading } = useReturns();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | 'All'>('All');
  const [showCompleted, setShowCompleted] = useState(false);

  const openReturns = useMemo(() => {
    return returns.filter(r => r.status !== 'Completed / Closed');
  }, [returns]);

  const completedReturns = useMemo(() => {
    return returns.filter(r => r.status === 'Completed / Closed');
  }, [returns]);

  const filteredReturns = useMemo(() => {
    const source = showCompleted ? returns : openReturns;
    
    return source.filter(item => {
        const matchesSearch =
            item.inventoryItemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.originalInvoiceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.returnId.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
  }, [returns, openReturns, searchTerm, statusFilter, showCompleted]);


  const returnStatuses: ReturnStatus[] = ['Awaiting Inspection', 'Under Repair', 'Ready for Pickup', 'To be Replaced', 'To be Refunded', 'Return to Supplier', 'Completed / Closed'];

  const handleExport = () => {
    const dataToExport = filteredReturns.map(item => ({
        returnId: item.returnId,
        type: item.type,
        status: item.status,
        customerName: item.customerName,
        inventoryItemName: item.inventoryItemName,
        quantity: item.quantity,
        originalInvoiceId: item.originalInvoiceId || 'N/A',
        createdAt: format(new Date(item.createdAt), 'yyyy-MM-dd'),
        resolutionDate: item.resolutionDate ? format(new Date(item.resolutionDate), 'yyyy-MM-dd') : 'N/A',
    }));

    const headers = {
        returnId: 'Return ID',
        type: 'Type',
        status: 'Status',
        customerName: 'Customer Name',
        inventoryItemName: 'Item Name',
        quantity: 'Quantity',
        originalInvoiceId: 'Original Invoice #',
        createdAt: 'Date Logged',
        resolutionDate: 'Date Resolved',
    };

    exportToCsv(dataToExport, `returns-${new Date().toISOString().split('T')[0]}`, headers);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Return Management
          </h1>
          <p className="text-muted-foreground">
            Handle customer and supplier returns.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
            </Button>
            <Link href="/returns/new" passHref>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Return
              </Button>
            </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : returns.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                type="text"
                placeholder="Search by item, customer, invoice or return #"
                className="w-full bg-white py-3 pl-10 pr-4 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
             <Select onValueChange={(value) => setStatusFilter(value as ReturnStatus | 'All')} defaultValue="All">
                <SelectTrigger className="bg-white shadow-sm">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    {returnStatuses.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox id="show-completed" checked={showCompleted} onCheckedChange={(checked) => setShowCompleted(checked as boolean)} />
            <Label htmlFor="show-completed">Show Completed Returns ({completedReturns.length})</Label>
          </div>
          <ReturnList returns={filteredReturns} />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-white/50 p-12 text-center">
          <Archive className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-xl font-semibold font-headline">No returns logged</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started by logging your first return.
          </p>
          <Link href="/returns/new" passHref>
            <Button className="mt-6">
              <Plus className="mr-2 h-4 w-4" />
              Log Return
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
