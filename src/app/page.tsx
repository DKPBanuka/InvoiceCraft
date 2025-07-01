
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Loader2, Wallet, TrendingUp, FileText, ChevronRight, Package as PackageIcon, Sparkles, Archive, Users, Undo2 } from 'lucide-react';
import { useInvoices } from '@/hooks/use-invoices';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bar, BarChart, Line, LineChart, Tooltip, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { Invoice, LineItem } from '@/lib/types';
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


// --- Chart Components (copied from reports page for consistency) ---

function DashboardSalesChart({ invoices }: { invoices: Invoice[] }) {
    const salesData = useMemo(() => {
        const today = new Date();
        const last30Days = eachDayOfInterval({ start: subDays(today, 29), end: today });

        const salesByDay = invoices
            .filter(i => i.status !== 'Cancelled')
            .reduce((acc, invoice) => {
                const date = format(new Date(invoice.createdAt), 'yyyy-MM-dd');
                const total = calculateTotal(invoice);
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
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => `Rs.${value / 1000}k`} />
                <Tooltip content={<ChartTooltipContent indicator="dot" formatter={(value) => formatCurrency(value as number)} />} />
                <Line type="monotone" dataKey="sales" stroke="var(--color-sales)" strokeWidth={2} dot={false} />
            </LineChart>
        </ChartContainer>
    );
}

function DashboardTopProductsChart({ invoices }: { invoices: Invoice[] }) {
    const topProducts = useMemo(() => {
        const productSales = invoices
            .filter(i => i.status !== 'Cancelled')
            .flatMap(i => i.lineItems.filter(li => li.type === 'product'))
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
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tickMargin={8} width={80} fontSize={10} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={4} />
            </BarChart>
         </ChartContainer>
    );
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
                <CardDescription>A 30-day sales projection.</CardDescription>
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
                            Generate
                        </Button>
                        {salesDataForForecast.length < 7 && <p className="text-xs text-muted-foreground mt-2">Needs 7+ days of sales.</p>}
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

      const invoiceDate = new Date(inv.createdAt);
        if (invoiceDate >= start && invoiceDate <= end && inv.status !== 'Cancelled') {
            sent++;
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/reports/sales-analysis" className="group block">
              <Card className="h-full transition-shadow duration-200 group-hover:shadow-lg">
                  <CardHeader className="relative">
                      <CardTitle>Sales Over Time</CardTitle>
                      <CardDescription>Revenue from the last 30 days. Click to see details.</CardDescription>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </CardHeader>
                  <CardContent>
                      <DashboardSalesChart invoices={invoices} />
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
                      <DashboardTopProductsChart invoices={invoices} />
                  </CardContent>
              </Card>
          </Link>
          <SalesForecast invoices={invoices} />
      </div>
      
    </div>
  );
}
