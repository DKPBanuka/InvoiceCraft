
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { useReturns } from '@/hooks/use-returns';
import { useInventory } from '@/hooks/use-inventory';

const formSchema = z.object({
  type: z.enum(['Customer Return', 'Supplier Return']),
  inventoryItemId: z.string().min(1, 'Please select an item'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  reason: z.string().min(5, 'Please provide a reason for the return.'),
  originalInvoiceId: z.string().optional(),
  customerName: z.string(),
  customerPhone: z.string().optional(),
}).refine(data => data.type === 'Supplier Return' || (data.type === 'Customer Return' && data.customerName.length > 0), {
    message: 'Customer name is required for customer returns.',
    path: ['customerName'],
});

type ReturnFormData = z.infer<typeof formSchema>;


export default function ReturnForm() {
  const { addReturn } = useReturns();
  const { inventory } = useInventory();

  const form = useForm<ReturnFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        type: 'Customer Return',
        inventoryItemId: '',
        quantity: 1,
        reason: '',
        originalInvoiceId: '',
        customerName: '',
        customerPhone: ''
    },
  });

  const watchType = form.watch('type');

  function onSubmit(values: ReturnFormData) {
    addReturn(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="bg-white">
          <CardContent className="p-6 grid gap-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Type of Return</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Customer Return" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Customer Return
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Supplier Return" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Return to Supplier
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchType === 'Customer Return' && (
                <div className="grid gap-6 md:grid-cols-2">
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
                            <FormLabel>Customer Phone (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. 0771234567" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}

            <FormField
                control={form.control}
                name="inventoryItemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item being returned</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an item" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {inventory.map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                    {item.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <FormMessage />
                  </FormItem>
                )}
              />

             <FormField
                control={form.control}
                name="originalInvoiceId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Original Invoice # (Optional)</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. INV-2024-0001" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="1" {...field} onFocus={(e) => e.target.select()} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

             <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Return</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Item was faulty, wrong item received..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging...
              </>
            ) : (
                'Log Return'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
