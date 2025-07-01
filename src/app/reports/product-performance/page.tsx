
"use client";

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useInventory } from '@/hooks/use-inventory';
import { useInvoices } from '@/hooks/use-invoices';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { InventoryItem, Invoice } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

const formatCurrency = (amount: number) => `Rs.${amount.toFixed(2)}`;

interface ProductPerformanceData {
    id: string;
    name: string;
    unitsSold: number;
    revenue: number;
    cost: number;
    profit: number;
}

function ProductPerformanceReport({ inventory, invoices }: { inventory: InventoryItem[], invoices: Invoice[] }) {
    const productPerformanceData: ProductPerformanceData[] = useMemo(() => {
        const performanceMap: { [key: string]: ProductPerformanceData } = {};

        inventory.forEach(item => {
            performanceMap[item.id] = {
                id: item.id,
                name: item.name,
                unitsSold: 0,
                revenue: 0,
                cost: 0,
                profit: 0
            };
        });

        invoices
            .filter(i => i.status !== 'Cancelled')
            .flatMap(i => i.lineItems)
            .filter(li => li.type === 'product' && li.inventoryItemId)
            .forEach(lineItem => {
                const item = inventory.find(i => i.id === lineItem.inventoryItemId);
                if (item && performanceMap[item.id]) {
                    const lineItemRevenue = lineItem.quantity * lineItem.price;
                    const lineItemCost = lineItem.quantity * item.costPrice;

                    performanceMap[item.id].unitsSold += lineItem.quantity;
                    performanceMap[item.id].revenue += lineItemRevenue;
                    performanceMap[item.id].cost += lineItemCost;
                    performanceMap[item.id].profit += (lineItemRevenue - lineItemCost);
                }
            });

        return Object.values(performanceMap).sort((a, b) => b.revenue - a.revenue);

    }, [inventory, invoices]);

    const chartData = useMemo(() => {
        return productPerformanceData.slice(0, 10).sort((a,b) => a.revenue - b.revenue);
    }, [productPerformanceData]);
    
    const chartConfig = {
        revenue: { label: "Revenue", color: "hsl(var(--primary))" },
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Top 10 Products by Revenue</CardTitle>
                    <CardDescription>A look at your most profitable items.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[350px] w-full">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                            <CartesianGrid horizontal={false} />
                            <XAxis type="number" dataKey="revenue" tickFormatter={(value) => `Rs.${value / 1000}k`} />
                            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tickMargin={8} width={150} />
                            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Full Product Performance Breakdown</CardTitle>
                    <CardDescription>Detailed sales data for every product in your inventory.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-right">Units Sold</TableHead>
                                    <TableHead className="text-right">Total Revenue</TableHead>
                                    <TableHead className="text-right">Total Cost</TableHead>
                                    <TableHead className="text-right">Total Profit</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {productPerformanceData.map(product => (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell className="text-right">{product.unitsSold}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(product.revenue)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(product.cost)}</TableCell>
                                        <TableCell className="text-right font-semibold">{formatCurrency(product.profit)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function ProductPerformancePage() {
    const router = useRouter();
    const { inventory, isLoading: inventoryLoading } = useInventory();
    const { user, isLoading: authLoading } = useAuth();
    const { invoices, isLoading: invoicesLoading } = useInvoices();

    const isLoading = inventoryLoading || authLoading || invoicesLoading;

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (user?.role !== 'admin') {
        router.push('/');
        return null;
    }

    return (
        <div className="container mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
            <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">
                    Product Performance
                </h1>
                <p className="text-muted-foreground">
                    Analyze which products are driving your business.
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
                <ProductPerformanceReport inventory={inventory} invoices={invoices} />
            )}
        </div>
    );
}
