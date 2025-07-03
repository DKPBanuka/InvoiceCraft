
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useInventory } from '@/hooks/use-inventory';
import InventoryForm from '@/components/inventory-form';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { InventoryItem } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';

export default function EditInventoryItemPage() {
  const router = useRouter();
  const params = useParams();
  const { getInventoryItem, isLoading: inventoryLoading } = useInventory();
  const { user, isLoading: authLoading } = useAuth();
  const [item, setItem] = useState<InventoryItem | undefined>(undefined);
  
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const isLoading = inventoryLoading || authLoading;
  
  useEffect(() => {
    if (user?.role !== 'admin') {
        router.push('/inventory');
    }
  }, [user, router]);

  useEffect(() => {
    if (!inventoryLoading && id) {
      const foundItem = getInventoryItem(id);
      if (foundItem) {
        setItem(foundItem);
      } else {
        router.push('/inventory');
      }
    }
  }, [id, getInventoryItem, inventoryLoading, router]);

  if (isLoading || !item) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
       <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">
              Edit Item
            </h1>
            <p className="text-muted-foreground">
              Update the details for '{item.name}'.
            </p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/inventory/${id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to View
        </Button>
      </div>
      <InventoryForm item={item} />
    </div>
  );
}
