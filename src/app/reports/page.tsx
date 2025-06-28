
"use client";

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, TrendingDown, AlertTriangle } from 'lucide-react';
import { useInventory } from '@/hooks/use-inventory';
import { differenceInDays, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { InventoryItem } from '@/lib/types';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useAuth } from '@/contexts/auth-context';

// Helper function to format currency
const formatCurrency = (amount: number) => {
    return `Rs.${amount.toFixed(2)}`;
}

// Reports Display Component
function ReportsDisplay({ inventory }: { inventory: InventoryItem[] }) {
    const today = useMemo(() => new Date(), []);

    const summaryStats = useMemo(() => {
        const totalCostValue = inventory.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
        const totalRetailValue = inventory.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const lowStockItemsCount = inventory.filter(item => item.quantity <= item.reorderPoint && item.quantity > 0).length;
        
        return { totalCostValue, totalRetailValue, lowStockItemsCount };
    }, [inventory]);

    const lowStockItems = useMemo(() => {
        return inventory
            .filter(item => item.quantity <= item.reorderPoint && item.quantity > 0)
            .sort((a, b) => (a.quantity - a.reorderPoint) - (b.quantity - b.reorderPoint));
    }, [inventory]);

    const inventoryAging = useMemo(() => {
        const agedItems = inventory
            .filter(item => item.quantity > 0)
            .map(item => ({
                ...item,
                age: differenceInDays(today, new Date(item.createdAt)),
            }))
            .sort((a, b) => b.age - a.age);
        
        const buckets = {
            '0-30 Days': agedItems.filter(i => i.age <= 30),
            '31-90 Days': agedItems.filter(i => i.age > 30 && i.age <= 90),
            '91-180 Days': agedItems.filter(i => i.age > 90 && i.age <= 180),
            '180+ Days': agedItems.filter(i => i.age > 180),
        };
        return buckets;
    }, [inventory, today]);
    

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Inventory Value (Cost)</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalCostValue)}</div>
                <p className="text-xs text-muted-foreground">Total capital invested in stock</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Inventory Value (Retail)</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalRetailValue)}</div>
                <p className="text-xs text-muted-foreground">Potential revenue from current stock</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{summaryStats.lowStockItemsCount}</div>
                <p className="text-xs text-muted-foreground">Items needing reordering</p>
            </CardContent>
        </Card>
      </div>

      {/* Reports in Tabs */}
       <Tabs defaultValue="low-stock">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
                <TabsTrigger value="inventory-aging">Inventory Aging</TabsTrigger>
            </TabsList>
            <TabsContent value="low-stock" className="pt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Low Stock Report</CardTitle>
                        <CardDescription>Items at or below their reorder point.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    {lowStockItems.length > 0 ? (
                        <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-right">Stock</TableHead>
                                <TableHead className="text-right">Reorder Point</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {lowStockItems.map(item => (
                                <TableRow key={item.id}>
                                <TableCell>{item.name}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">{item.reorderPoint}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No low stock items. Well done!</p>
                    )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="inventory-aging" className="pt-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>Inventory Aging</CardTitle>
                        <CardDescription>How long items have been in stock.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {Object.entries(inventoryAging).map(([bucket, items]) => (
                            <div key={bucket}>
                                <h4 className="font-semibold mb-2">{bucket} ({items.length} items)</h4>
                                {items.length > 0 ? (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead>Age</TableHead>
                                                    <TableHead className="text-right">Stock</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                            {items.map(item => (
                                                <TableRow key={item.id}>
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                </TableRow>
                                            ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">No items in this age bracket.</p>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}


export default function ReportsPage() {
  const router = useRouter();
  const { inventory, isLoading: inventoryLoading } = useInventory();
  const { user, isLoading: authLoading } = useAuth();

  const isLoading = inventoryLoading || authLoading;

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (user?.role !== 'admin') {
      router.push('/');
      return null;
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Track performance and identify trends.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
      {isLoading ? (
         <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
      ) : (
        <ReportsDisplay inventory={inventory} />
      )}
    </div>
  );
}
