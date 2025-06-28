
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Archive, Search, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInventory } from '@/hooks/use-inventory';
import InventoryList from '@/components/inventory-list';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ItemStatus } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';

export default function InventoryPage() {
  const { inventory, isLoading: inventoryLoading, deleteInventoryItem } = useInventory();
  const { user, isLoading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'All'>('All');

  const isLoading = inventoryLoading || authLoading;

  const filteredInventory = useMemo(() => {
    return inventory.filter(
      (item) => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
        return matchesSearch && matchesStatus;
      }
    );
  }, [inventory, searchTerm, statusFilter]);

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
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Inventory
          </h1>
          <p className="text-muted-foreground">
            Manage your item stock and prices.
          </p>
        </div>
        <div className="flex gap-2">
            {user?.role === 'admin' && (
                <Link href="/reports" passHref>
                    <Button variant="outline">
                        <LineChart className="mr-2 h-4 w-4" />
                        Stock Analysis
                    </Button>
                </Link>
            )}
            {user?.role === 'admin' && (
                <Link href="/inventory/new" passHref>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Item
                </Button>
                </Link>
            )}
        </div>
      </div>

      {inventory.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                type="text"
                placeholder="Search by item name..."
                className="w-full bg-white py-3 pl-10 pr-4 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select onValueChange={(value) => setStatusFilter(value as ItemStatus | 'All')} defaultValue="All">
                <SelectTrigger className="bg-white shadow-sm">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Awaiting Inspection">Awaiting Inspection</SelectItem>
                    <SelectItem value="Damaged">Damaged</SelectItem>
                    <SelectItem value="For Repair">For Repair</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <InventoryList inventory={filteredInventory} deleteInventoryItem={deleteInventoryItem} />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-white/50 p-12 text-center">
          <Archive className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-xl font-semibold font-headline">No items in inventory</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {user?.role === 'admin' ? "Get started by adding your first item." : "No inventory items to display."}
          </p>
          {user?.role === 'admin' && (
            <Link href="/inventory/new" passHref>
                <Button className="mt-6">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
                </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
