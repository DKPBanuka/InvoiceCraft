
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Loader2, Wallet, TrendingUp, FileText, ChevronLeft, ChevronRight, Package as PackageIcon, Sparkles, Archive, Users, Undo2 } from 'lucide-react';
import { useInvoices } from '@/hooks/use-invoices';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDaysInMonth, startOfYear, endOfYear, eachMonthOfInterval, addYears, subYears } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bar, BarChart, LabelList, Tooltip, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { Invoice, LineItem } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInventory } from '@/hooks/use-inventory';
import { forecastSalesAction } from '@/app/actions';

const formatCurrency = (amount: number) => `Rs.${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// --- Helper Functions ---
const calculateTotal = (invoice: Pick<Invoice, 'lineItems' | 'discount'>): number => {
  const subtotal = invoice.lineItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
  const discountAmount = subtotal * ((invoice.discount || 0) / 100);
  return subtotal - discountAmount;
};

const calculatePaid = (invoice: Pick<Invoice, 'payments'>): number => {
    return invoice.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
};


// --- New Revenue Breakdown Component ---
function RevenueBreakdown({ invoices, inventory }: { invoices: Invoice[], inventory: any[] }) {
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

        // --- Chart Data Calculation ---
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

        // --- Top Products Calculation ---
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
            
        // --- Summary Stats ---
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
    
    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <Tabs defaultValue="day" onValueChange={(value) => setViewMode(value as 'day' | 'month')}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="day">Day</TabsTrigger>
                        <TabsTrigger value="month">Month</TabsTrigger>
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
            <CardContent className="space-y-6 flex-1 flex flex-col">
                <div className="h-52 w-full">
                     <ChartContainer config={{ revenue: { label: 'Revenue', color: 'hsl(var(--primary))' } }}>
                        <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                             <CartesianGrid vertical={false} strokeDasharray="3 3" />
                             <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
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

                <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="font-bold text-lg">{formatCurrency(summaryStats.total)}</p>
                    </div>
                     <div>
                        <p className="text-sm text-muted-foreground">Average Revenue</p>
                        <p className="font-bold text-lg">{formatCurrency(summaryStats.average)}</p>
                    </div>
                </div>

                <div className="flex-1 flex flex-col">
                    <h4 className="font-semibold mb-3">Top Selling Products</h4>
                    <div className="space-y-3 flex-1">
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

function SalesForecast({ invoices }: { invoices: Invoice[] }) {
    const [forecast, setForecast] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const salesDataForForecast = useMemo(() => {
        const salesByDay: { [key: string]: number } = {};
        const endDate = new Date();
        const startDate = subDays(endDate, 90); // Use last 90 days for forecast

        invoices.forEach(invoice => {
            if (invoice.status === 'Cancelled') return;
            
            const invoiceDate = new Date(invoice.createdAt);
            if (invoiceDate >= startDate && invoiceDate <= endDate) {
                 const dateKey = format(invoiceDate, 'yyyy-MM-dd');
                 const total = calculateTotal(invoice);
                 salesByDay[dateKey] = (salesByDay[dateKey] || 0) + total;
            }
        });
        
        return Object.entries(salesByDay).map(([date, total]) => ({ date, total }));

    }, [invoices]);

    const handleGenerateForecast = async () => {
        setIsLoading(true);
        setError(null);
        setForecast(null);
        try {
            const result = await forecastSalesAction({ salesData: salesDataForForecast });
            setForecast(result.forecast);
        } catch (err) {
            console.error(err);
            setError("Sorry, we couldn't generate a forecast at this time.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>AI Sales Forecast</CardTitle>
                <CardDescription>Get a 30-day sales projection based on your recent activity.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center items-center text-center p-6">
                {isLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : forecast ? (
                     <div className="text-sm text-left whitespace-pre-wrap font-mono bg-muted p-4 rounded-md w-full overflow-x-auto h-full">
                        {forecast}
                    </div>
                ) : (
                    <>
                        <Sparkles className="h-10 w-10 text-muted-foreground mb-4" />
                         <Button onClick={handleGenerateForecast} disabled={salesDataForForecast.length < 7}>
                            Generate Forecast
                        </Button>
                        {salesDataForForecast.length < 7 && <p className="text-xs text-muted-foreground mt-2">At least 7 days of sales data is needed for a forecast.</p>}
                        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
                    </>
                )}
            </CardContent>
        </Card>
    )
}


function DashboardAnalytics({ invoices }: { invoices: Invoice[] }) {
  const { totalOverdue, revenueThisMonth, invoicesThisMonth } = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    let overdue = 0;
    let revenue = 0;
    let sent = 0;

    invoices.forEach(inv => {
      const createdAt = new Date(inv.createdAt);
      const total = calculateTotal(inv);
      const paid = calculatePaid(inv);
      
      if (inv.status === 'Unpaid' || inv.status === 'Partially Paid') {
        overdue += (total - paid);
      }
      
      if (createdAt >= start && createdAt <= end) {
        sent++;
      }
      
      if (inv.payments) {
        inv.payments.forEach(p => {
          try {
            const paymentDate = new Date(p.date);
            if (paymentDate >= start && paymentDate <= end) {
              revenue += p.amount;
            }
          } catch(e) {
            console.error("Invalid payment date found", p);
          }
        });
      }
    });
    
    return { totalOverdue: overdue, revenueThisMonth: revenue, invoicesThisMonth: sent };
  }, [invoices]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Overdue</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOverdue)}</div>
            <p className="text-xs text-muted-foreground">From all unpaid & partially paid invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue (This Month)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueThisMonth)}</div>
            <p className="text-xs text-muted-foreground">Payments received this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices Sent (This Month)</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{invoicesThisMonth}</div>
            <p className="text-xs text-muted-foreground">New invoices created this month</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


export default function DashboardPage() {
  const { invoices, isLoading: invoicesLoading } = useInvoices();
  const { inventory, isLoading: inventoryLoading } = useInventory();
  const { user, isLoading: authLoading } = useAuth();
  const isLoading = invoicesLoading || authLoading || inventoryLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (user?.role === 'staff') {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Welcome, {user.username}!
          </h1>
          <p className="text-muted-foreground">
            Ready to get started? Here are some quick actions.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/invoice/new" className="group">
            <Card className="h-full transition-shadow group-hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">New Invoice</CardTitle>
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Create a new invoice for a customer.</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/inventory" className="group">
            <Card className="h-full transition-shadow group-hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">View Inventory</CardTitle>
                  <Archive className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Check current stock levels.</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/customers/new" className="group">
            <Card className="h-full transition-shadow group-hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Add Customer</CardTitle>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Add a new customer to the database.</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/returns/new" className="group">
            <Card className="h-full transition-shadow group-hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Log a Return</CardTitle>
                  <Undo2 className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Process a new customer return.</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    );
  }


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground mb-2">
          Welcome back, {user?.username}! Here's a summary of your business.
        </p>
      </div>

      <DashboardAnalytics invoices={invoices} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:items-start">
        <div className="lg:col-span-2">
          <RevenueBreakdown invoices={invoices} inventory={inventory} />
        </div>
        <div className="lg:col-span-1">
          <SalesForecast invoices={invoices} />
        </div>
      </div>
      
    </div>
  );
}

    