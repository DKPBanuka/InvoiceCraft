
"use client";

import { useState } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Invoice, Payment } from "@/lib/types";

interface AddPaymentDialogProps {
  children: React.ReactNode;
  invoice: Invoice;
  addPaymentToInvoice: (invoiceId: string, paymentData: Omit<Payment, 'id' | 'date' | 'createdBy' | 'createdByName'>) => Promise<void>;
}

export function AddPaymentDialog({ children, invoice, addPaymentToInvoice }: AddPaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const calculateTotal = (invoice: Invoice): number => {
    const subtotal = invoice.lineItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
    const discountAmount = subtotal * ((invoice.discount || 0) / 100);
    return subtotal - discountAmount;
  };

  const calculatePaid = (invoice: Invoice): number => {
    return invoice.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
  };

  const amountDue = calculateTotal(invoice) - calculatePaid(invoice);

  const formSchema = z.object({
    amount: z.coerce.number().positive("Amount must be positive.").max(amountDue, `Amount cannot exceed the amount due of Rs.${amountDue.toFixed(2)}`),
    method: z.enum(['Cash', 'Card', 'Bank Transfer', 'Other']),
    notes: z.string().optional(),
  });
  
  type PaymentFormData = z.infer<typeof formSchema>;
  
  const form = useForm<PaymentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: amountDue,
      method: 'Cash',
      notes: '',
    },
  });

  const onSubmit = async (values: PaymentFormData) => {
    await addPaymentToInvoice(invoice.id, values);
    form.reset();
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Payment to Invoice {invoice.id}</DialogTitle>
          <DialogDescription>
            Record a new payment. Amount due is Rs.{amountDue.toFixed(2)}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                 <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Payment Amount (Rs.)</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="method"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a method" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Card">Card</SelectItem>
                                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                            <Textarea placeholder="e.g. Reference number, specific details" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                        ) : 'Save Payment'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
