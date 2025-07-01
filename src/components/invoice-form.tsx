
"use client";

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Loader2, ChevronsUpDown, Percent, Package, Wrench } from 'lucide-react';
import { useEffect, useState, useMemo, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInvoices } from '@/hooks/use-invoices';
import { cn } from '@/lib/utils';
import type { Invoice, InventoryItem } from '@/lib/types';
import { useInventory } from '@/hooks/use-inventory';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from './ui/badge';
import CustomerSelector from './customer-selector';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from '@/components/ui/label';
import { suggestLineItemAction } from '@/app/actions';


function ProductSelector({ form, index, availableInventory }: { form: any; index: number; availableInventory: InventoryItem[] }) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedDescription = form.watch(`lineItems.${index}.description`);

  const handleSelect = (item: InventoryItem) => {
    form.setValue(`lineItems.${index}.inventoryItemId`, item.id, { shouldValidate: true });
    form.setValue(`lineItems.${index}.description`, item.name, { shouldValidate: true });
    form.setValue(`lineItems.${index}.price`, item.price, { shouldValidate: true });
    form.setValue(`lineItems.${index}.warrantyPeriod`, item.warrantyPeriod || 'N/A', { shouldValidate: true });
    form.setValue(`lineItems.${index}.quantity`, 1, { shouldValidate: true });
    setOpen(false);
    setSearchTerm('');
  };

  const filteredInventory = useMemo(() => {
    if (!searchTerm) return availableInventory;
    return availableInventory.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableInventory, searchTerm]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "w-full justify-between",
              !selectedDescription && "text-muted-foreground"
            )}
          >
            {selectedDescription || "Select a product"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <div className="p-2">
            <Input 
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
            />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {filteredInventory.length > 0 ? (
            filteredInventory.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className="w-full justify-start font-normal h-auto py-2"
                onClick={() => handleSelect(item)}
              >
                <div className="flex flex-col items-start text-left">
                  <span>{item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.quantity} in stock</span>
                </div>
              </Button>
            ))
          ) : (
            <div className="p-4 text-sm text-center text-muted-foreground">
              No items match your search.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface InvoiceFormProps {
    invoice?: Invoice;
}

export default function InvoiceForm({ invoice }: InvoiceFormProps) {
  const { addInvoice, updateInvoice } = useInvoices();
  const { inventory } = useInventory();
  const { user } = useAuth();
  const isEditMode = !!invoice;
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  const formSchema = useMemo(() => {
    return z.object({
      customerId: z.string().optional(),
      customerName: z.string().min(1, 'Customer name is required'),
      customerPhone: z.string().optional(),
      status: z.enum(['Paid', 'Unpaid', 'Partially Paid']),
      discount: z.coerce.number().min(0, "Discount can't be negative").max(100, "Discount can't be over 100%"),
      initialPayment: z.coerce.number().optional(),
      lineItems: z
        .array(
          z.object({
            id: z.string().optional(),
            type: z.enum(['product', 'service']).default('product'),
            inventoryItemId: z.string().optional(),
            description: z.string(),
            quantity: z.coerce.number().min(1, 'Must be at least 1'),
            price: z.coerce.number().min(0, 'Price cannot be negative'),
            warrantyPeriod: z.string().min(1, 'Warranty period is required'),
          })
        )
        .min(1, 'At least one line item is required')
        .superRefine((lineItems, ctx) => {
          lineItems.forEach((lineItem, index) => {
             if (lineItem.description.trim() === '') {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Description is required`,
                path: [index, 'description'],
              });
            }
            if (lineItem.type === 'product') {
              const stockItem = inventory.find(i => i.id === lineItem.inventoryItemId);
              if (stockItem) {
                let originalQuantity = 0;
                if (isEditMode && invoice && lineItem.id) {
                  const originalLineItem = invoice.lineItems.find(
                    orig => orig.id === lineItem.id
                  );
                  if (originalLineItem) {
                    originalQuantity = originalLineItem.quantity;
                  }
                }
                
                const availableStock = stockItem.quantity + originalQuantity;

                if (lineItem.quantity > availableStock) {
                  ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Only ${availableStock} in stock`,
                    path: [index, 'quantity'],
                  });
                }
              }
            }
          });
        }),
    }).superRefine((data, ctx) => {
        if (isEditMode) {
          // This validation is only for new invoices with an initial payment.
          return;
        }

        const watchLineItems = data.lineItems;
        const watchDiscount = data.discount;
        const subtotal = watchLineItems.reduce(
            (acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.price) || 0),
            0
        );
        const discountAmount = subtotal * ((Number(watchDiscount) || 0) / 100);
        const totalAmount = subtotal - discountAmount;

        if (data.status === 'Partially Paid') {
            if (!data.initialPayment || data.initialPayment <= 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Payment amount is required for partially paid status.",
                    path: ['initialPayment'],
                });
            } else if (data.initialPayment >= totalAmount) {
                 ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Payment must be less than the total of Rs.${totalAmount.toFixed(2)}.`,
                    path: ['initialPayment'],
                });
            }
        }
    });
  }, [inventory, isEditMode, invoice]);
  
  type InvoiceFormData = z.infer<typeof formSchema>;


  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode
        ? {
            ...invoice,
            customerPhone: invoice.customerPhone || '',
            discount: invoice.discount || 0,
            initialPayment: 0
          }
        : {
            customerName: '',
            customerPhone: '',
            status: 'Paid',
            lineItems: [{ type: 'product', description: '', quantity: 1, price: 0, warrantyPeriod: 'N/A' }],
            discount: 0,
            initialPayment: 0,
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  });

  const uniqueCategories = useMemo(() => {
    const categories = new Set(inventory.map(item => item.category).filter(Boolean));
    return ['All', ...Array.from(categories).sort()];
  }, [inventory]);

  const availableInventory = useMemo(() => {
    const availableItems = inventory.filter(i => i.status === 'Available');
    if (categoryFilter === 'All') {
        return availableItems;
    }
    return availableItems.filter(i => i.category === categoryFilter);
  }, [inventory, categoryFilter]);

  const watchLineItems = form.watch('lineItems');
  const watchDiscount = form.watch('discount');
  const watchStatus = form.watch('status');
  
  const subtotal = watchLineItems.reduce(
    (acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.price) || 0),
    0
  );
  const discountAmount = subtotal * ((Number(watchDiscount) || 0) / 100);
  const totalAmount = subtotal - discountAmount;

  function onSubmit(values: InvoiceFormData) {
    if (isEditMode && invoice) {
        const { status, initialPayment, ...updateData} = values; // Status is recalculated in the hook, so we don't pass it.
        updateInvoice(invoice.id, updateData);
    } else {
        addInvoice(values);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
             <CustomerSelector form={form}/>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>Line Items</CardTitle>
                 <div className="w-full sm:w-auto sm:max-w-xs">
                     <Select onValueChange={setCategoryFilter} defaultValue={categoryFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by category..." />
                        </SelectTrigger>
                        <SelectContent>
                            {uniqueCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="space-y-6">
              {fields.map((field, index) => {
                const lineItemType = form.watch(`lineItems.${index}.type`);
                return (
                <div
                  key={field.id}
                  className="grid grid-cols-1 gap-y-4 rounded-md border p-4 md:grid-cols-12 md:gap-x-4 md:items-end"
                >
                  <div className="md:col-span-12">
                     <FormField
                      control={form.control}
                      name={`lineItems.${index}.type`}
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Line Item Type</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(value) => {
                                form.setValue(`lineItems.${index}.inventoryItemId`, undefined);
                                form.setValue(`lineItems.${index}.description`, '');
                                form.setValue(`lineItems.${index}.price`, 0);
                                form.setValue(`lineItems.${index}.warrantyPeriod`, 'N/A');
                                field.onChange(value);
                              }}
                              value={field.value}
                              className="flex items-center space-x-4"
                            >
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="product" />
                                </FormControl>
                                <FormLabel className="font-normal flex items-center gap-2"><Package className="h-4 w-4" /> Product</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="service" />
                                </FormControl>
                                <FormLabel className="font-normal flex items-center gap-2"><Wrench className="h-4 w-4" /> Service</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="col-span-12 md:col-span-4">
                      <FormLabel>Description</FormLabel>
                       {lineItemType === 'product' ? (
                        <ProductSelector form={form} index={index} availableInventory={availableInventory} />
                      ) : (
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.description`}
                          render={({ field }) => (
                            <FormControl>
                              <Input placeholder="e.g. Headlight fitting charge" {...field} />
                            </FormControl>
                          )}
                        />
                      )}
                      <FormMessage className="mt-1">{form.formState.errors.lineItems?.[index]?.description?.message}</FormMessage>
                  </div>

                  <div className="col-span-6 md:col-span-2">
                        <FormLabel>Quantity</FormLabel>
                        <FormField
                        control={form.control}
                        name={`lineItems.${index}.quantity`}
                        render={({ field }) => (
                            <FormControl>
                                <Input type="number" placeholder="1" {...field} onFocus={(e) => e.target.select()}/>
                            </FormControl>
                        )}
                        />
                        <FormMessage className="mt-1">{form.formState.errors.lineItems?.[index]?.quantity?.message}</FormMessage>
                    </div>
                    <div className="col-span-6 md:col-span-2">
                        <FormLabel>Price (Rs.)</FormLabel>
                        <FormField
                        control={form.control}
                        name={`lineItems.${index}.price`}
                        render={({ field }) => (
                            <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} onFocus={(e) => e.target.select()} />
                            </FormControl>
                        )}
                        />
                        <FormMessage className="mt-1">{form.formState.errors.lineItems?.[index]?.price?.message}</FormMessage>
                    </div>
                    <div className="col-span-12 md:col-span-3">
                        <FormLabel>Warranty</FormLabel>
                        <FormField
                            control={form.control}
                            name={`lineItems.${index}.warrantyPeriod`}
                            render={({ field }) => (
                            <FormItem>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select warranty" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="N/A">N/A</SelectItem>
                                        <SelectItem value="1 Week">1 Week</SelectItem>
                                        <SelectItem value="1 Month">1 Month</SelectItem>
                                        <SelectItem value="2 Months">2 Months</SelectItem>
                                        <SelectItem value="3 Months">3 Months</SelectItem>
                                        <SelectItem value="6 Months">6 Months</SelectItem>
                                        <SelectItem value="1 Year">1 Year</SelectItem>
                                        <SelectItem value="2 Years">2 Years</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage className="mt-1">{form.formState.errors.lineItems?.[index]?.warrantyPeriod?.message}</FormMessage>
                            </FormItem>
                            )}
                        />
                    </div>
                    <div className="col-span-12 md:col-span-1 flex items-end">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        className="w-full"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                </div>
              )})}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ type: 'product', description: '', quantity: 1, price: 0, warrantyPeriod: 'N/A' })}
              className="mt-6"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Line Item
            </Button>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
                <Card className="bg-white h-full">
                    <CardHeader>
                      <CardTitle>Discount</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <FormField
                            control={form.control}
                            name="discount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Discount (%)</FormLabel>
                                    <div className="relative">
                                        <FormControl>
                                            <Input 
                                                type="number" 
                                                step="0.01"
                                                placeholder="0" 
                                                {...field} 
                                                disabled={user?.role === 'staff'}
                                                className="pl-8"
                                            />
                                        </FormControl>
                                        <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    </div>
                                    {user?.role === 'staff' && <p className="text-xs text-muted-foreground mt-2">Discount can only be applied by an Admin.</p>}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white p-6 shadow-sm md:flex-col md:items-end md:justify-center">
            <p className="text-lg font-semibold font-headline">Total Amount</p>
            <p className="text-2xl font-bold font-headline text-primary">
                Rs.{totalAmount.toFixed(2)}
            </p>
            </div>
        </div>

        {isEditMode && invoice ? (
            <Card className="bg-white">
                <CardHeader>
                    <CardTitle>Invoice Status</CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="flex items-center h-10">
                        <Badge>{invoice.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Status is updated automatically based on payments.</p>
                </CardContent>
            </Card>
        ) : (
             <Card className="bg-white">
                <CardHeader>
                    <CardTitle>Initial Payment Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                     <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>Select Initial Status</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                                    >
                                        <FormItem>
                                            <FormControl>
                                                <RadioGroupItem value="Unpaid" id="unpaid" className="sr-only peer" />
                                            </FormControl>
                                            <Label htmlFor="unpaid" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                                Unpaid
                                            </Label>
                                        </FormItem>
                                        <FormItem>
                                            <FormControl>
                                                <RadioGroupItem value="Paid" id="paid" className="sr-only peer" />
                                            </FormControl>
                                            <Label htmlFor="paid" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                                Paid in Full
                                            </Label>
                                        </FormItem>
                                        <FormItem>
                                            <FormControl>
                                                <RadioGroupItem value="Partially Paid" id="partial" className="sr-only peer" />
                                            </FormControl>
                                            <Label htmlFor="partial" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                                Partially Paid
                                            </Label>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    {watchStatus === 'Partially Paid' && (
                        <FormField
                            control={form.control}
                            name="initialPayment"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Initial Payment Amount (Rs.)</FormLabel>
                                <FormControl>
                                <Input type="number" step="0.01" placeholder="Enter amount paid" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    )}
                </CardContent>
            </Card>
        )}


        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
                isEditMode ? 'Update Invoice' : 'Create Invoice'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
