
"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ChevronLeft, ChevronRight, Package as PackageIcon, ArrowLeft } from 'lucide-react';
import { useInvoices } from '@/hooks/use-invoices';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, getDaysInMonth, startOfYear, endOfYear, eachMonthOfInterval, addYears, subYears } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bar, BarChart, LabelList, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { Invoice, InventoryItem } from '@/lib/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInventory } from '@/hooks/use-inventory';

const formatCurrency = (amount: number) => `Rs.${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function DetailedSalesAnalysis({ invoices }: { invoices: Invoice[] }) {
    const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
    const [currentDate, setCurrentDate] = useState(new Date());

    const { chartData, topProducts, summaryStats } = useMemo(() => {
        let filteredInvoices: Invoice[] = [];
        let interval: { start: Date, end: Date };
        
        if (viewMode === 'day') {
            interval = { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
        } else { // month view
            interval = { start: startOfYear(currentDate), end: endOfYear(currentDate) };
        }

        filteredInvoices = invoices.filter(i => {
             if (i.status === 'Cancelled' || !i.payments || i.payments.length === 0) return false;
             const paymentDates = i.payments.map(p => new Date(p.date));
             return paymentDates.some(pd => pd >= interval.start && pd <= interval.end);
        });

        const salesByUnit: { [key: string]: number } = {};
        
        filteredInvoices.flatMap(i => i.payments || []).forEach(p => {
            const paymentDate = new Date(p.date);
            if (paymentDate >= interval.start && paymentDate <= interval.end) {
                const key = viewMode === 'day' ? format(paymentDate, 'd') : format(paymentDate, 'MMM');
                salesByUnit[key] = (salesByUnit[key] || 0) + p.amount;
            }
        });
        
        let finalChartData: { name: string, revenue: number }[] = [];
        if (viewMode === 'day') {
            const daysInMonth = getDaysInMonth(currentDate);
            finalChartData = Array.from({ length: daysInMonth }, (_, i) => {
                const day = (i + 1).toString();
                return { name: day, revenue: salesByUnit[day] || 0 };
            });
        } else {
             finalChartData = eachMonthOfInterval({ start: startOfYear(currentDate), end: endOfYear(currentDate) }).map(month => {
                const monthKey = format(month, 'MMM');
                return { name: monthKey, revenue: salesByUnit[monthKey] || 0 };
             });
        }

        const productSales: { [key: string]: { revenue: number, quantity: number } } = {};
        filteredInvoices.flatMap(i => i.lineItems.filter(li => li.type === 'product')).forEach(item => {
            const revenue = item.price * item.quantity;
            if (!productSales[item.description]) {
                productSales[item.description] = { revenue: 0, quantity: 0 };
            }
            productSales[item.description].revenue += revenue;
            productSales[item.description].quantity += item.quantity;
        });
        
        const finalTopProducts = Object.entries(productSales)
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .slice(0, 5)
            .map(([name, data]) => ({ name, ...data }));
            
        const totalRevenue = finalChartData.reduce((acc, item) => acc + item.revenue, 0);
        const averageRevenue = totalRevenue > 0 ? totalRevenue / finalChartData.filter(d => d.revenue > 0).length : 0;

        return {
            chartData: finalChartData,
            topProducts: finalTopProducts,
            summaryStats: {
                total: totalRevenue,
                average: averageRevenue,
            }
        };

    }, [invoices, currentDate, viewMode]);

    const handlePrev = () => {
        if (viewMode === 'day') setCurrentDate(subMonths(currentDate, 1));
        else setCurrentDate(subYears(currentDate, 1));
    };

    const handleNext = () => {
        if (viewMode === 'day') setCurrentDate(addMonths(currentDate, 1));
        else setCurrentDate(addYears(currentDate, 1));
    };
    
    const navLabel = format(currentDate, viewMode === 'day' ? 'MMMM yyyy' : 'yyyy');
    
    const chartWidth = viewMode === 'day' ? chartData.length * 40 : '100%';

    return (
        <Card>
            <CardHeader>
                <Tabs defaultValue="day" onValueChange={(value) => setViewMode(value as 'day' | 'month')}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="day">Daily View</TabsTrigger>
                        <TabsTrigger value="month">Monthly View</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="flex items-center justify-between pt-4">
                    <Button variant="ghost" size="icon" onClick={handlePrev}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="font-semibold text-center">{navLabel}</div>
                    <Button variant="ghost" size="icon" onClick={handleNext}>
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="h-64 w-full overflow-x-auto overflow-y-hidden">
                    <div style={{ width: typeof chartWidth === 'string' ? chartWidth : `${chartWidth}px`, height: '100%' }}>
                         <ChartContainer config={{ revenue: { label: 'Revenue', color: 'hsl(var(--primary))' } }} className="h-full w-full [aspect-ratio:auto]">
                            <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                                 <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                 <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} interval={0} />
                                 <YAxis hide={true} domain={[0, 'dataMax + 1000']} />
                                 <Tooltip
                                    cursor={{ fill: 'hsl(var(--muted))' }}
                                    content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />}
                                 />
                                 <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]}>
                                    <LabelList 
                                        dataKey="revenue" 
                                        position="top" 
                                        fontSize={10} 
                                        formatter={(value: number) => value > 0 ? formatCurrency(value) : ''} 
                                    />
                                 </Bar>
                            </BarChart>
                         </ChartContainer>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="font-bold text-lg">{formatCurrency(summaryStats.total)}</p>
                    </div>
                     <div>
                        <p className="text-sm text-muted-foreground">Average Revenue/{viewMode}</p>
                        <p className="font-bold text-lg">{formatCurrency(summaryStats.average)}</p>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold mb-3">Top Selling Products ({viewMode === 'day' ? 'This Month' : 'This Year'})</h4>
                    <div className="space-y-3">
                        {topProducts.length > 0 ? topProducts.map(product => (
                            <div key={product.name} className="flex items-center gap-3">
                                <div className="p-2 bg-muted rounded-md">
                                    <PackageIcon className="h-5 w-5 text-muted-foreground"/>
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-sm">{product.name}</p>
                                    <p className="text-xs text-muted-foreground">{product.quantity} units sold</p>
                                </div>
                                <p className="font-semibold text-sm">{formatCurrency(product.revenue)}</p>
                            </div>
                        )) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No product sales data for this period.</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default function SalesAnalysisPage() {
    const router = useRouter();
    const { invoices, isLoading: invoicesLoading } = useInvoices();
    const { inventory, isLoading: inventoryLoading } = useInventory();
    const { user, isLoading: authLoading } = useAuth();
    const isLoading = invoicesLoading || authLoading || inventoryLoading;

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
                        Sales Analysis
                    </h1>
                    <p className="text-muted-foreground">
                        An interactive breakdown of your sales performance.
                    </p>
                </div>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </div>
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-96 w-full" />
                </div>
            ) : (
                <DetailedSalesAnalysis invoices={invoices} />
            )}
        </div>
    );
}
