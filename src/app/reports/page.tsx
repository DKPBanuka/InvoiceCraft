
"use client";

import { useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, TrendingDown, AlertTriangle, TrendingUp, PackageCheck, ChevronRight } from 'lucide-react';
import { useInventory } from '@/hooks/use-inventory';
import { useInvoices } from '@/hooks/use-invoices';
import { differenceInDays, formatDistanceToNow, format, subDays, eachDayOfInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { InventoryItem, Invoice, LineItem } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';

const formatCurrency = (amount: number) => `Rs.${amount.toFixed(2)}`;

function SalesChart({ invoices }: { invoices: Invoice[] }) {
    const salesData = useMemo(() => {
        const today = new Date();
        const last30Days = eachDayOfInterval({ start: subDays(today, 29), end: today });

        const salesByDay = invoices
            .filter(i => i.status !== 'Cancelled')
            .reduce((acc, invoice) => {
                const date = format(new Date(invoice.createdAt), 'yyyy-MM-dd');
                const subtotal = invoice.lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
                const discountAmount = subtotal * ((invoice.discount || 0) / 100);
                const total = subtotal - discountAmount;
                
                acc[date] = (acc[date] || 0) + total;
                return acc;
            }, {} as Record<string, number>);

        return last30Days.map(date => {
            const formattedDate = format(date, 'yyyy-MM-dd');
            return {
                date: format(date, 'MMM d'),
                sales: salesByDay[formattedDate] || 0,
            };
        });
    }, [invoices]);
    
    const chartConfig = {
        sales: { label: "Sales", color: "hsl(var(--primary))" },
    };

    return (
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <LineChart data={salesData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `Rs.${value / 1000}k`} />
                <Tooltip content={<ChartTooltipContent indicator="dot" formatter={(value) => formatCurrency(value as number)} />} />
                <Line type="monotone" dataKey="sales" stroke="var(--color-sales)" strokeWidth={2} dot={false} />
            </LineChart>
        </ChartContainer>
    );
}

function TopProductsChart({ invoices }: { invoices: Invoice[] }) {
    const topProducts = useMemo(() => {
        const productSales = invoices
            .filter(i => i.status !== 'Cancelled')
            .flatMap(i => i.lineItems)
            .reduce((acc, item) => {
                acc[item.description] = (acc[item.description] || 0) + item.quantity;
                return acc;
            }, {} as Record<string, number>);

        return Object.entries(productSales)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, total]) => ({ name, total }));
    }, [invoices]);

    const chartConfig = {
        total: { label: "Units Sold", color: "hsl(var(--primary))" },
    };

    return (
         <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={topProducts} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" dataKey="total" hide/>
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tickMargin={8} width={120} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={4} />
            </BarChart>
         </ChartContainer>
    );
}

function LowStockItems({ inventory }: { inventory: InventoryItem[] }) {
     const lowStockItems = useMemo(() => {
        return inventory
            .filter(item => item.quantity <= item.reorderPoint && item.quantity > 0)
            .sort((a, b) => (a.quantity - a.reorderPoint) - (b.quantity - b.reorderPoint));
    }, [inventory]);

    return (
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
    );
}

function InventoryAging({ inventory }: { inventory: InventoryItem[] }) {
    const today = useMemo(() => new Date(), []);
    const inventoryAging = useMemo(() => {
        const agedItems = inventory
            .filter(item => item.quantity > 0)
            .map(item => ({ ...item, age: differenceInDays(today, new Date(item.createdAt)) }))
            .sort((a, b) => b.age - a.age);
        
        return {
            '0-30 Days': agedItems.filter(i => i.age <= 30),
            '31-90 Days': agedItems.filter(i => i.age > 30 && i.age <= 90),
            '91-180 Days': agedItems.filter(i => i.age > 90 && i.age <= 180),
            '180+ Days': agedItems.filter(i => i.age > 180),
        };
    }, [inventory, today]);
    
    return (
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
    );
}

function ReportsDisplay({ inventory, invoices }: { inventory: InventoryItem[], invoices: Invoice[] }) {
    const summaryStats = useMemo(() => {
        const totalCostValue = inventory.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
        const totalRetailValue = inventory.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const potentialProfit = totalRetailValue - totalCostValue;
        const lowStockItemsCount = inventory.filter(item => item.quantity <= item.reorderPoint && item.quantity > 0).length;
        const totalUnitsSold = invoices
            .filter(i => i.status !== 'Cancelled')
            .flatMap(i => i.lineItems)
            .reduce((sum, item) => sum + item.quantity, 0);
        
        return { totalCostValue, totalRetailValue, lowStockItemsCount, potentialProfit, totalUnitsSold };
    }, [inventory, invoices]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inventory Value (Cost)</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalCostValue)}</div>
                <p className="text-xs text-muted-foreground">Invested capital in stock</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inventory Value (Retail)</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalRetailValue)}</div>
                <p className="text-xs text-muted-foreground">Potential revenue from stock</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Potential Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summaryStats.potentialProfit)}</div>
                <p className="text-xs text-muted-foreground">Potential earnings from stock</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Units Sold</CardTitle>
                <PackageCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{summaryStats.totalUnitsSold}</div>
                <p className="text-xs text-muted-foreground">Across all invoices</p>
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
      
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Link href="/reports/sales-analysis" className="group block">
                <Card className="h-full transition-shadow duration-200 group-hover:shadow-lg">
                    <CardHeader className="relative">
                        <CardTitle>Sales Over Time</CardTitle>
                        <CardDescription>Revenue from the last 30 days. Click to see details.</CardDescription>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </CardHeader>
                    <CardContent>
                        <SalesChart invoices={invoices} />
                    </CardContent>
                </Card>
            </Link>
            <Link href="/reports/product-performance" className="group block">
                <Card className="h-full transition-shadow duration-200 group-hover:shadow-lg">
                    <CardHeader className="relative">
                        <CardTitle>Top Selling Products</CardTitle>
                        <CardDescription>Top 5 products by units sold. Click to see details.</CardDescription>
                         <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </CardHeader>
                    <CardContent>
                        <TopProductsChart invoices={invoices} />
                    </CardContent>
                </Card>
            </Link>
            <LowStockItems inventory={inventory} />
            <InventoryAging inventory={inventory} />
        </div>

    </div>
  );
}


export default function ReportsPage() {
  const router = useRouter();
  const { inventory, isLoading: inventoryLoading } = useInventory();
  const { user, isLoading: authLoading } = useAuth();
  const { invoices, isLoading: invoicesLoading } = useInvoices();

  const isLoading = inventoryLoading || authLoading || invoicesLoading;

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      router.push('/');
    }
  }, [user, authLoading, router]);

  if (isLoading || !user || user.role !== 'admin') {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
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
      <ReportsDisplay inventory={inventory} invoices={invoices} />
    </div>
  );
}
