
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
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
import { useInventory } from '@/hooks/use-inventory';
import type { InventoryItem, ItemStatus } from '@/lib/types';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  name: z.string().min(2, 'Item name is required'),
  category: z.string().min(2, 'Category is required'),
  brand: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be a positive number'),
  costPrice: z.coerce.number().min(0, 'Cost must be a positive number'),
  reorderPoint: z.coerce.number().int('Must be a whole number'),
  status: z.enum(['Available', 'Awaiting Inspection', 'Damaged', 'For Repair']),
  quantity: z.coerce.number().int('Quantity must be a whole number').optional(),
  addStock: z.coerce.number().int('Must be a whole number').optional(),
  warrantyPeriod: z.string().min(1, 'Warranty period is required'),
});

type InventoryFormData = z.infer<typeof formSchema>;

interface InventoryFormProps {
    item?: InventoryItem;
}

export default function InventoryForm({ item }: InventoryFormProps) {
  const { addInventoryItem, updateInventoryItem } = useInventory();
  const router = useRouter();
  const isEditMode = !!item;

  const form = useForm<InventoryFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode
        ? { 
            name: item.name, 
            category: item.category || '',
            brand: item.brand || '',
            price: item.price, 
            costPrice: item.costPrice,
            reorderPoint: item.reorderPoint,
            status: item.status,
            addStock: 0,
            warrantyPeriod: item.warrantyPeriod || 'N/A' 
        }
        : { 
            name: '', 
            category: '',
            brand: '',
            price: 0, 
            costPrice: 0, 
            quantity: 0, 
            reorderPoint: 0,
            status: 'Available', 
            warrantyPeriod: 'N/A' 
        },
  });

  function onSubmit(values: InventoryFormData) {
    if (isEditMode && item) {
        const { quantity, ...updateValues } = values;
        updateInventoryItem(item.id, updateValues);
    } else {
        addInventoryItem({
            name: values.name,
            category: values.category,
            brand: values.brand,
            price: values.price,
            costPrice: values.costPrice,
            quantity: values.quantity || 0,
            reorderPoint: values.reorderPoint,
            status: values.status,
            warrantyPeriod: values.warrantyPeriod,
        });
    }
    router.push('/inventory');
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="bg-white">
          <CardContent className="p-6 grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Item Name / Model</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. K38, G-Max" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Earphones, Mouse" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Generic, Logitech" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selling Price (Rs.)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="1500.00" {...field} onFocus={(e) => e.target.select()} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="costPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Price (Rs.)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="1000.00" {...field} onFocus={(e) => e.target.select()} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {isEditMode ? (
              <>
                <FormItem>
                  <FormLabel>Current Stock</FormLabel>
                  <FormControl>
                    <Input type="number" disabled value={item.quantity} />
                  </FormControl>
                </FormItem>
                <FormField
                  control={form.control}
                  name="addStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Add New Stock</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} onFocus={(e) => e.target.select()}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : (
               <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Stock Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="100" {...field} onFocus={(e) => e.target.select()} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            )}

            <FormField
                control={form.control}
                name="reorderPoint"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Low Stock Alert Point</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="10" {...field} onFocus={(e) => e.target.select()} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="warrantyPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Warranty</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                     <FormMessage />
                  </FormItem>
                )}
              />

             <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Item Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Available">Available</SelectItem>
                            <SelectItem value="Awaiting Inspection">Awaiting Inspection</SelectItem>
                            <SelectItem value="Damaged">Damaged</SelectItem>
                            <SelectItem value="For Repair">For Repair</SelectItem>
                        </SelectContent>
                    </Select>
                     <FormMessage />
                  </FormItem>
                )}
              />

          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isEditMode ? 'Updating...' : 'Adding...'}
              </>
            ) : (
                isEditMode ? 'Update Item' : 'Add Item'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
