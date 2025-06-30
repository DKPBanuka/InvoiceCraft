
"use client";

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Loader2, ChevronsUpDown, Wand2, Percent, Contact } from 'lucide-react';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';

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
import { Card, CardContent } from '@/components/ui/card';
import { useInvoices } from '@/hooks/use-invoices';
import { cn } from '@/lib/utils';
import type { Invoice, InventoryItem } from '@/lib/types';
import { useInventory } from '@/hooks/use-inventory';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { suggestLineItemAction } from '@/app/actions';
import { useAuth } from '@/contexts/auth-context';

interface InvoiceFormProps {
    invoice?: Invoice;
}

function InventoryItemSelector({ form, index, onSuggestionApplied }: { form: any; index: number, onSuggestionApplied: () => void }) {
  const { inventory } = useInventory();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const descriptionValue = form.watch(`lineItems.${index}.description`);

  const fetchSuggestion = useCallback(async (value: string) => {
    if (value && value.length > 2) {
      setIsSuggesting(true);
      try {
        const result = await suggestLineItemAction({ partialDescription: value });
        if (result.suggestion && result.suggestion.toLowerCase() !== value.toLowerCase()) {
          setSuggestion(result.suggestion);
        } else {
          setSuggestion('');
        }
      } catch (error) {
        console.error("Failed to fetch suggestion:", error);
        setSuggestion('');
      } finally {
        setIsSuggesting(false);
      }
    } else {
      setSuggestion('');
    }
  }, []);

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    form.setValue(`lineItems.${index}.description`, value, { shouldValidate: true });
    form.setValue(`lineItems.${index}.inventoryItemId`, undefined, { shouldValidate: true });

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      fetchSuggestion(value);
    }, 500); // 500ms debounce
  };

  const applySuggestion = () => {
    if (suggestion) {
      form.setValue(`lineItems.${index}.description`, suggestion, { shouldValidate: true });
      onSuggestionApplied();
      setSuggestion('');
    }
  };

  const handleSelect = (item: InventoryItem) => {
    form.setValue(`lineItems.${index}.inventoryItemId`, item.id, { shouldValidate: true });
    form.setValue(`lineItems.${index}.description`, item.name, { shouldValidate: true });
    form.setValue(`lineItems.${index}.price`, item.price, { shouldValidate: true });
    form.setValue(`lineItems.${index}.warrantyPeriod`, item.warrantyPeriod || 'N/A', { shouldValidate: true });
    form.setValue(`lineItems.${index}.quantity`, 1, { shouldValidate: true });
    setOpen(false);
    setSearchTerm('');
    setSuggestion('');
  };
  
  const filteredInventory = useMemo(() => {
    if (!searchTerm) return inventory.filter(i => i.status === 'Available');
    return inventory.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) && item.status === 'Available'
    );
  }, [inventory, searchTerm]);


  return (
    <div className="space-y-2">
      <div className="relative">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <FormControl>
              <Input
                placeholder="Type or select an item..."
                value={descriptionValue || ''}
                onChange={handleDescriptionChange}
                className="pr-8"
              />
            </FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
             <div className="p-2">
                <Input
                    placeholder="Search inventory..."
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
                            className="w-full justify-start font-normal"
                            onClick={() => handleSelect(item)}
                        >
                            {item.name} <span className="text-xs text-muted-foreground ml-auto">{item.quantity} in stock</span>
                        </Button>
                    ))
                ) : (
                    <div className="p-4 text-sm text-center text-muted-foreground">No items found.</div>
                )}
             </div>
          </PopoverContent>
        </Popover>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            {isSuggesting ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            )}
        </div>
      </div>
       {suggestion && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-start text-left font-normal"
          onClick={applySuggestion}
        >
          <Wand2 className="mr-2 h-4 w-4 text-primary" />
          Suggest: {suggestion}
        </Button>
      )}
      <FormMessage>{form.formState.errors.lineItems?.[index]?.description?.message}</FormMessage>
    </div>
  );
}


export default function InvoiceForm({ invoice }: InvoiceFormProps) {
  const { addInvoice, updateInvoice } = useInvoices();
  const { inventory } = useInventory();
  const { user } = useAuth();
  const isEditMode = !!invoice;
  const [isContactPickerSupported, setIsContactPickerSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
      setIsContactPickerSupported(true);
    }
  }, []);

  const formSchema = useMemo(() => {
    return z.object({
      customerName: z.string().min(2, 'Customer name is required'),
      customerPhone: z.string().optional(),
      status: z.enum(['Paid', 'Unpaid']),
      discount: z.coerce.number().min(0, "Discount can't be negative").max(100, "Discount can't be over 100%"),
      lineItems: z
        .array(
          z.object({
            id: z.string().optional(),
            inventoryItemId: z.string().optional(),
            description: z.string().min(1, 'Description is required'),
            quantity: z.coerce.number().min(1, 'Must be at least 1'),
            price: z.coerce.number().min(0.01, 'Price is required'),
            warrantyPeriod: z.string().min(1, 'Warranty period is required'),
          })
        )
        .min(1, 'At least one line item is required')
        .superRefine((lineItems, ctx) => {
          lineItems.forEach((lineItem, index) => {
            if (lineItem.inventoryItemId) {
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
    });
  }, [inventory, isEditMode, invoice]);
  
  type InvoiceFormData = z.infer<typeof formSchema>;


  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode
        ? {
            customerName: invoice.customerName,
            customerPhone: invoice.customerPhone || '',
            status: invoice.status === 'Paid' ? 'Paid' : 'Unpaid',
            lineItems: invoice.lineItems.map(item => ({
              id: item.id,
              inventoryItemId: item.inventoryItemId,
              description: item.description,
              quantity: item.quantity,
              price: item.price,
              warrantyPeriod: item.warrantyPeriod,
            })),
            discount: invoice.discount || 0,
          }
        : {
            customerName: '',
            customerPhone: '',
            status: 'Paid',
            lineItems: [{ description: '', quantity: 1, price: 0, warrantyPeriod: 'N/A' }],
            discount: 0,
        },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  });

  const handleSuggestionApplied = useCallback((index: number) => {
    const currentLineItem = form.getValues(`lineItems.${index}`);
    update(index, { ...currentLineItem });
  }, [form, update]);


  const watchLineItems = form.watch('lineItems');
  const watchDiscount = form.watch('discount');
  
  const subtotal = watchLineItems.reduce(
    (acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.price) || 0),
    0
  );
  const discountAmount = subtotal * ((Number(watchDiscount) || 0) / 100);
  const totalAmount = subtotal - discountAmount;

  const handleSelectContact = async () => {
    if (!isContactPickerSupported) return;
    try {
        const contacts = await (navigator as any).contacts.select(['tel'], { multiple: false });
        if (contacts.length > 0 && contacts[0].tel && contacts[0].tel.length > 0) {
            form.setValue('customerPhone', contacts[0].tel[0], { shouldValidate: true });
        }
    } catch (ex) {
        console.log("Contact Picker was closed or failed."); // User might cancel, which is fine.
    }
  };


  function onSubmit(values: InvoiceFormData) {
    const invoiceData = {
      ...values,
      status: values.status as 'Paid' | 'Unpaid',
      lineItems: values.lineItems.map(item => ({
        ...item,
        id: item.id ?? '', // Ensure id is always a string
      })),
    };

    if (isEditMode && invoice) {
        updateInvoice(invoice.id, invoiceData);
    } else {
        addInvoice(invoiceData as any);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Phone</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          placeholder="e.g. 0771234567"
                          {...field}
                          className={isContactPickerSupported ? 'pr-12' : ''}
                        />
                      </FormControl>
                      {isContactPickerSupported && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute inset-y-0 right-0 h-full"
                          onClick={handleSelectContact}
                          aria-label="Select from contacts"
                        >
                          <Contact className="h-5 w-5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Unpaid">Unpaid</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold font-headline mb-4">Line Items</h3>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-12 gap-x-4 gap-y-2 items-start"
                >
                  <div className="col-span-12 md:col-span-4">
                    {index === 0 && <FormLabel>Description</FormLabel>}
                    <InventoryItemSelector form={form} index={index} onSuggestionApplied={() => handleSuggestionApplied(index)} />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    {index === 0 && <FormLabel>Qty</FormLabel>}
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.quantity`}
                      render={({ field }) => (
                          <FormControl>
                            <Input type="number" placeholder="1" {...field} className="w-full" onFocus={(e) => e.target.select()}/>
                          </FormControl>
                      )}
                    />
                    <FormMessage className="mt-1">{form.formState.errors.lineItems?.[index]?.quantity?.message}</FormMessage>
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    {index === 0 && <FormLabel>Price</FormLabel>}
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.price`}
                      render={({ field }) => (
                        <FormControl>
                          <Input type="number" placeholder="0.00" {...field} onFocus={(e) => e.target.select()} />
                        </FormControl>
                      )}
                    />
                    <FormMessage className="mt-1">{form.formState.errors.lineItems?.[index]?.price?.message}</FormMessage>
                  </div>
                   <div className="col-span-4 md:col-span-3">
                    {index === 0 && <FormLabel>Warranty</FormLabel>}
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
                  <div className="col-span-12 md:col-span-1 flex items-end h-full">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className={cn(index === 0 && "md:mt-6", "w-full md:w-auto")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ description: '', quantity: 1, price: 0, warrantyPeriod: 'N/A' })}
              className="mt-4"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
                <Card className="bg-white h-full">
                    <CardContent className="p-6">
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
