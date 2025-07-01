
"use client";

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Loader2, Wallet, TrendingUp, FileText, Sparkles } from 'lucide-react';
import { useInvoices } from '@/hooks/use-invoices';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Line, LineChart as RechartsLineChart, Tooltip, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Brush } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { Invoice } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { forecastSalesAction } from '@/app/actions';

const formatCurrency = (amount: number) => `Rs.${amount.toFixed(2)}`;

// Define helper functions at the module level
const calculateTotal = (invoice: Invoice): number => {
  const subtotal = invoice.lineItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
  const discountAmount = subtotal * ((invoice.discount || 0) / 100);
  return subtotal - discountAmount;
};

const calculatePaid = (invoice: Invoice): number => {
    return invoice.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
};

// NEW: Zoomable Chart for Dialog
function ZoomableSalesChart({ invoices }: { invoices: Invoice[] }) {
    const salesData = useMemo(() => {
        const today = new Date();
        const last30Days = eachDayOfInterval({ start: subDays(today, 29), end: today });

        const revenueByDay = invoices
            .filter(i => i.status !== 'Cancelled')
            .flatMap(i => i.payments || [])
            .reduce((acc, payment) => {
                try {
                    const paymentDate = new Date(payment.date);
                    const dateKey = format(paymentDate, 'yyyy-MM-dd');
                    acc[dateKey] = (acc[dateKey] || 0) + payment.amount;
                } catch (e) {
                    console.error("Invalid payment date found", payment);
                }
                return acc;
            }, {} as Record<string, number>);

        return last30Days.map(day => {
            const formattedDate = format(day, 'yyyy-MM-dd');
            return {
                date: format(day, 'MMM d'),
                revenue: revenueByDay[formattedDate] || 0,
            };
        });
    }, [invoices]);
    
    const chartConfig = {
        revenue: { label: "Revenue", color: "hsl(var(--primary))" },
    };

    return (
      <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <RechartsLineChart 
              data={salesData} 
              margin={{ top: 5, right: 30, left: 10, bottom: 70 }}
          >
              <CartesianGrid vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8} 
                tickFormatter={(value) => `Rs.${Number(value) / 1000}k`} 
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                content={
                    <ChartTooltipContent 
                        indicator="dot" 
                        formatter={(value) => formatCurrency(value as number)} 
                    />
                } 
              />
              <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
              <Brush dataKey="date" height={30} stroke="hsl(var(--primary))" travellerWidth={20} y={320} />
          </RechartsLineChart>
      </ChartContainer>
    );
}

// MODIFIED: Simplified chart for dashboard view
function SalesChart({ invoices }: { invoices: Invoice[] }) {
    const isMobile = useIsMobile();
    const salesData = useMemo(() => {
        const today = new Date();
        const last30Days = eachDayOfInterval({ start: subDays(today, 29), end: today });

        const revenueByDay = invoices
            .filter(i => i.status !== 'Cancelled')
            .flatMap(i => i.payments || [])
            .reduce((acc, payment) => {
                try {
                    const paymentDate = new Date(payment.date);
                    const dateKey = format(paymentDate, 'yyyy-MM-dd');
                    acc[dateKey] = (acc[dateKey] || 0) + payment.amount;
                } catch (e) {
                    console.error("Invalid payment date found", payment);
                }
                return acc;
            }, {} as Record<string, number>);

        return last30Days.map(day => {
            const formattedDate = format(day, 'yyyy-MM-dd');
            return {
                date: format(day, 'MMM d'),
                revenue: revenueByDay[formattedDate] || 0,
            };
        });
    }, [invoices]);
    
    const chartConfig = {
        revenue: { label: "Revenue", color: "hsl(var(--primary))" },
    };

    return (
        <div className="h-[200px] w-full" role="button" aria-label="Open detailed chart view">
          <ChartContainer config={chartConfig} className="h-full w-full">
              <RechartsLineChart 
                  data={salesData} 
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                  <CartesianGrid vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8} 
                    interval={isMobile ? 6 : 3}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={5} 
                    tickFormatter={(value) => `${Number(value) / 1000}k`} 
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip 
                    cursor={false}
                    content={
                        <ChartTooltipContent 
                            indicator="dot" 
                            formatter={(value) => formatCurrency(value as number)} 
                        />
                    } 
                  />
                  <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
              </RechartsLineChart>
          </ChartContainer>
      </div>
    );
}

function SalesForecast({ invoices }: { invoices: Invoice[] }) {
  const [forecast, setForecast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getForecast = useCallback(async () => {
    setIsLoading(true);
    try {
      const salesData = invoices
        .filter(i => i.status !== 'Cancelled' && i.payments && i.payments.length > 0)
        .flatMap(i => i.payments!.map(p => ({ date: p.date, amount: p.amount })))
        .reduce((acc, curr) => {
          try {
            const dateKey = format(new Date(curr.date), 'yyyy-MM-dd');
            acc[dateKey] = (acc[dateKey] || 0) + curr.amount;
          } catch (e) {
             console.error("Invalid payment date found in forecast", curr);
          }
          return acc;
        }, {} as Record<string, number>);
      
      const formattedSalesData = Object.entries(salesData).map(([date, total]) => ({ date, total }));

      if(formattedSalesData.length > 0) {
        const result = await forecastSalesAction({ salesData: formattedSalesData });
        setForecast(result.forecast);
      } else {
        setForecast("Not enough sales data to generate a forecast.");
      }

    } catch (error) {
      console.error("Error fetching sales forecast:", error);
      setForecast("An error occurred while generating the forecast.");
    } finally {
      setIsLoading(false);
    }
  }, [invoices]);

  useEffect(() => {
    // Basic debounce
    const handler = setTimeout(() => {
        getForecast();
    }, 500);
    return () => clearTimeout(handler);
  }, [getForecast]);

  return (
    <Card className="h-full flex flex-col">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Sales Forecast
            </CardTitle>
            <CardDescription>30-day forecast based on recent sales.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
             {isLoading ? (
                 <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/6" />
                </div>
             ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {forecast}
                </p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
              <CardHeader>
                  <CardTitle>Revenue (Last 30 Days)</CardTitle>
                  <CardDescription>Tracks payments received daily. Tap chart to zoom.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="w-full" role="button" tabIndex={0}>
                        <SalesChart invoices={invoices} />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl w-[95vw] p-4 sm:p-8">
                       <DialogHeader>
                        <DialogTitle>Detailed Revenue (Last 30 Days)</DialogTitle>
                      </DialogHeader>
                      <ZoomableSalesChart invoices={invoices} />
                    </DialogContent>
                  </Dialog>
              </CardContent>
          </Card>
          <Card>
            <SalesForecast invoices={invoices} />
          </Card>
      </div>
    </div>
  );
}


export default function DashboardPage() {
  const { invoices, isLoading: invoicesLoading } = useInvoices();
  const { user, isLoading: authLoading } = useAuth();
  const isLoading = invoicesLoading || authLoading;

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

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight mb-2">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.username}! Here's a summary of your business.
        </p>
      </div>

      <DashboardAnalytics invoices={invoices} />
      
    </div>
  );
}
