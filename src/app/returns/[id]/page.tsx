
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';

import { useReturns } from '@/hooks/use-returns';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, FileText, User, Tag, Calendar, MessageSquare, ListTodo, CheckCircle2 } from 'lucide-react';
import type { ReturnItem, ReturnStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

const statusStyles: { [key in ReturnStatus]: string } = {
    'Awaiting Inspection': 'bg-yellow-100 text-yellow-800 border-transparent dark:bg-yellow-900/50 dark:text-yellow-300',
    'Under Repair': 'bg-blue-200 text-blue-800 border-transparent dark:bg-blue-900/50 dark:text-blue-300',
    'Ready for Pickup': 'bg-purple-200 text-purple-800 border-transparent dark:bg-purple-900/50 dark:text-purple-300',
    'To be Replaced': 'bg-orange-200 text-orange-800 border-transparent dark:bg-orange-900/50 dark:text-orange-300',
    'To be Refunded': 'bg-red-200 text-red-800 border-transparent dark:bg-red-900/50 dark:text-red-300',
    'Return to Supplier': 'bg-indigo-200 text-indigo-800 border-transparent dark:bg-indigo-900/50 dark:text-indigo-300',
    'Completed / Closed': 'bg-accent text-accent-foreground border-transparent',
};

const formSchema = z.object({
  status: z.enum(['Awaiting Inspection', 'Under Repair', 'Ready for Pickup', 'To be Replaced', 'To be Refunded', 'Return to Supplier', 'Completed / Closed']),
  notes: z.string().optional(),
});
type ReturnUpdateFormData = z.infer<typeof formSchema>;

const returnStatuses: ReturnStatus[] = ['Awaiting Inspection', 'Under Repair', 'Ready for Pickup', 'To be Replaced', 'To be Refunded', 'Return to Supplier', 'Completed / Closed'];

function InfoItem({ icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) {
    const Icon = icon;
    return (
        <div className="flex items-start">
            <Icon className="h-5 w-5 text-muted-foreground mr-3 mt-1" />
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="font-medium">{value}</p>
            </div>
        </div>
    )
}


export default function ReturnDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { getReturn, isLoading: returnsLoading, updateReturn } = useReturns();
  const { user, isLoading: authLoading } = useAuth();
  const [item, setItem] = useState<ReturnItem | undefined>(undefined);

  const isLoading = returnsLoading || authLoading;

  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    if (!isLoading && id) {
      const foundItem = getReturn(id);
      if (foundItem) {
        setItem(foundItem);
      } else {
        router.push('/returns');
      }
    }
  }, [id, getReturn, isLoading, router]);

  const form = useForm<ReturnUpdateFormData>({
    resolver: zodResolver(formSchema),
    values: {
      status: item?.status || 'Awaiting Inspection',
      notes: item?.notes || '',
    },
  });

  const onSubmit = (values: ReturnUpdateFormData) => {
    if (id) {
        updateReturn(id, values);
    }
  };

  if (isLoading || !item) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isClosed = item.status === 'Completed / Closed';
  const canUpdate = user?.role === 'admin' || user?.role === 'staff';
  const canUpdateStatus = user?.role === 'admin';

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">
              Return {item.returnId}
            </h1>
            <div className="text-muted-foreground flex items-center gap-2">
              <Badge className={cn('text-xs', statusStyles[item.status])}>{item.status}</Badge>
              <span>&bull;</span>
              <span>For item: {item.inventoryItemName}</span>
            </div>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Return Information</CardTitle>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-x-4 gap-y-6 text-sm">
                    <InfoItem icon={User} label="Customer" value={item.customerName} />
                    <InfoItem icon={Tag} label="Product" value={`${item.inventoryItemName} (Qty: ${item.quantity})`} />
                    <InfoItem icon={FileText} label="Original Invoice" value={item.originalInvoiceId || 'N/A'} />
                    <InfoItem icon={Calendar} label="Date Logged" value={format(new Date(item.createdAt), 'PPP p')} />
                    {item.resolutionDate && <InfoItem icon={CheckCircle2} label="Date Resolved" value={format(new Date(item.resolutionDate), 'PPP p')} />}
                    <div className="sm:col-span-2">
                        <InfoItem icon={MessageSquare} label="Reason for Return" value={item.reason} />
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Internal Notes</CardTitle>
                    <CardDescription>Visible only to staff.</CardDescription>
                </CardHeader>
                <CardContent>
                    {item.notes ? (
                        <p className="text-sm whitespace-pre-wrap">{item.notes}</p>
                    ) : (
                        <p className="text-sm text-muted-foreground">No internal notes have been added yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
        <div className="md:col-span-1">
            <Card className="bg-white sticky top-24">
                 <CardHeader>
                    <CardTitle>Update Status</CardTitle>
                    <CardDescription>Change the status or add notes for this return.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                             <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>New Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isClosed || !canUpdateStatus}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a status" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {returnStatuses.map(status => (
                                                <SelectItem key={status} value={status}>{status}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {!canUpdateStatus && <p className="text-xs text-muted-foreground mt-2">Only Admins can change the status.</p>}
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Update Internal Notes</FormLabel>
                                    <FormControl>
                                        <Textarea
                                        placeholder="Add inspection details, repair notes, etc."
                                        className="resize-y min-h-[100px]"
                                        {...field}
                                        disabled={isClosed || !canUpdate}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />

                             <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || isClosed || !canUpdate}>
                                {form.formState.isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                </>
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                            {isClosed && <p className="text-xs text-center text-muted-foreground pt-2">This return is closed and cannot be modified.</p>}
                            {!canUpdate && <p className="text-xs text-center text-muted-foreground pt-2">You do not have permission to update returns.</p>}
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
