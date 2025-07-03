
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useInventory } from '@/hooks/use-inventory';
import { useStockMovements } from '@/hooks/use-stock-movements';
import { useAuth } from '@/contexts/auth-context';
import type { InventoryItem, StockMovement, ItemStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Edit, Trash2, Package, ShoppingCart, PackageCheck, Box, History } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';

const statusStyles: { [key in ItemStatus]: string } = {
    Available: 'bg-accent text-accent-foreground border-transparent',
    'Awaiting Inspection': 'bg-yellow-100 text-yellow-800 border-transparent dark:bg-yellow-900/50 dark:text-yellow-300',
    Damaged: 'bg-destructive/80 text-destructive-foreground border-transparent',
    'For Repair': 'bg-blue-200 text-blue-800 border-transparent dark:bg-blue-900/50 dark:text-blue-300',
};

const movementTypeStyles: { [key in StockMovement['type']]: string } = {
    addition: 'text-green-600',
    sale: 'text-red-600',
    cancellation: 'text-blue-600',
    return: 'text-purple-600',
    adjustment: 'text-orange-600',
};

function InfoRow({ label, value, children }: { label: string; value?: string | number | null; children?: React.ReactNode }) {
    return (
        <div className="flex justify-between items-center py-3 border-b last:border-b-0">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-semibold text-right">{children || value}</dd>
        </div>
    );
}

export default function ViewInventoryItemPage() {
  const router = useRouter();
  const params = useParams();
  const { getInventoryItem, isLoading: inventoryLoading, deleteInventoryItem } = useInventory();
  const { user, isLoading: authLoading } = useAuth();
  
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { movements, isLoading: movementsLoading } = useStockMovements(id);
  
  const [item, setItem] = useState<InventoryItem | null>(null);

  const isLoading = inventoryLoading || authLoading || movementsLoading;

  useEffect(() => {
    if (!inventoryLoading && id) {
      const foundItem = getInventoryItem(id);
      setItem(foundItem || null);
    }
  }, [id, getInventoryItem, inventoryLoading]);

  const { totalIn, totalSold, totalReturned } = useMemo(() => {
    if (!movements) return { totalIn: 0, totalSold: 0, totalReturned: 0 };
    const totalIn = movements
      .filter(m => m.type === 'addition' || m.type === 'cancellation')
      .reduce((sum, m) => sum + m.quantity, 0);
    const totalSold = movements
      .filter(m => m.type === 'sale')
      .reduce((sum, m) => sum + m.quantity, 0);
    const totalReturned = movements
      .filter(m => m.type === 'return')
      .reduce((sum, m) => sum + m.quantity, 0);
    return { totalIn, totalSold, totalReturned };
  }, [movements]);

  const handleDelete = () => {
    if (id) {
      deleteInventoryItem(id);
      router.push('/inventory');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!item) {
     return (
      <div className="container mx-auto max-w-2xl p-4 sm:p-6 lg:p-8 text-center">
         <h1 className="text-2xl font-bold">Item Not Found</h1>
         <p className="text-muted-foreground mt-2">The requested inventory item could not be found.</p>
         <Button onClick={() => router.push('/inventory')} className="mt-6">Go to Inventory</Button>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div className="container mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">{item.name}</h1>
          <p className="text-muted-foreground">Detailed view and history for this item.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          {isAdmin && (
            <>
              <Link href={`/inventory/${item.id}/edit`} passHref>
                <Button><Edit className="mr-2 h-4 w-4" /> Edit</Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete '{item.name}'. This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Stock In</CardTitle>
                <PackageCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totalIn}</div>
                <p className="text-xs text-muted-foreground">Total units brought in</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Units Sold</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totalSold}</div>
                <p className="text-xs text-muted-foreground">Across all invoices</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Returned Units</CardTitle>
                <Box className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totalReturned}</div>
                <p className="text-xs text-muted-foreground">Total units returned</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{item.quantity}</div>
                <p className="text-xs text-muted-foreground">Available units</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Item Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="text-sm">
                <InfoRow label="Brand" value={item.brand || 'N/A'} />
                <InfoRow label="Category" value={item.category} />
                <InfoRow label="Status">
                  <Badge className={cn('text-xs', statusStyles[item.status])}>{item.status}</Badge>
                </InfoRow>
                <InfoRow label="Selling Price" value={`Rs.${item.price.toFixed(2)}`} />
                {isAdmin && <InfoRow label="Cost Price" value={`Rs.${item.costPrice.toFixed(2)}`} />}
                <InfoRow label="Reorder Point" value={item.reorderPoint} />
                <InfoRow label="Warranty" value={item.warrantyPeriod} />
                <InfoRow label="Date Added" value={format(new Date(item.createdAt), 'PPP')} />
              </dl>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Stock Movement History</CardTitle>
                <CardDescription>A log of all stock changes for this item.</CardDescription>
            </CardHeader>
            <CardContent>
                {movements.length > 0 ? (
                    <div className="max-h-[500px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Reference</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {movements.map((movement) => (
                                    <TableRow key={movement.id}>
                                        <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(movement.createdAt), { addSuffix: true })}</TableCell>
                                        <TableCell>
                                            <span className="capitalize font-medium">{movement.type}</span>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                          { (movement.type === 'sale' || movement.type === 'cancellation') && movement.referenceId ? (
                                              <Link href={`/invoice/${movement.referenceId}`} className="text-primary hover:underline">{movement.referenceId}</Link>
                                          ) : (
                                              movement.referenceId || 'N/A'
                                          )}
                                        </TableCell>
                                        <TableCell className={cn('text-right font-bold', (movement.type === 'sale') ? movementTypeStyles.sale : movementTypeStyles.addition)}>
                                            {(movement.type === 'sale') ? '-' : '+'}{movement.quantity}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <p className="text-sm text-center text-muted-foreground py-8">No movement history found.</p>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
