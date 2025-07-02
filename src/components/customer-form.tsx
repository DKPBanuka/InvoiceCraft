
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Contact } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import { useCustomers } from '@/hooks/use-customers';
import type { Customer } from '@/lib/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(2, 'Customer name is required'),
  phone: z.string().optional(),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  address: z.string().optional(),
});

type CustomerFormData = z.infer<typeof formSchema>;

interface CustomerFormProps {
  customer?: Customer;
  onFinished?: () => void; // Optional callback for when form is submitted
}

export default function CustomerForm({ customer, onFinished }: CustomerFormProps) {
  const { addCustomer, updateCustomer } = useCustomers();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = !!customer;
  const [isContactPickerSupported, setIsContactPickerSupported] = useState(false);
  const { toast } = useToast();

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode
        ? { 
            name: customer.name, 
            phone: customer.phone || '',
            email: customer.email || '',
            address: customer.address || '',
        }
        : { 
            name: searchParams.get('name') || '', 
            phone: searchParams.get('phone') || '',
            email: searchParams.get('email') || '',
            address: '',
        },
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && 'contacts' in navigator && 'select' in (navigator as any).contacts) {
        setIsContactPickerSupported(true);
    }
  }, []);

  const handleImportContact = async () => {
    if (!isContactPickerSupported) return;

    try {
        const props = ['name', 'email', 'tel'];
        const opts = { multiple: false };
        const contacts = await (navigator as any).contacts.select(props, opts);
        
        if (contacts.length > 0) {
            const contact = contacts[0];
            if (contact.name && contact.name.length > 0) form.setValue('name', contact.name[0], { shouldValidate: true });
            if (contact.tel && contact.tel.length > 0) form.setValue('phone', contact.tel[0], { shouldValidate: true });
            if (contact.email && contact.email.length > 0) form.setValue('email', contact.email[0], { shouldValidate: true });
            toast({ title: "Contact Imported", description: `Details for ${contact.name[0]} have been filled.` });
        }
    } catch (error) {
        console.error('Error picking contact:', error);
        toast({
            variant: "destructive",
            title: "Could not import contact",
            description: "There was an error or permission was denied.",
        });
    }
  };

  async function onSubmit(values: CustomerFormData) {
    if (isEditMode && customer) {
        await updateCustomer(customer.id, values);
    } else {
        await addCustomer(values);
    }
    
    if (onFinished) {
      onFinished();
    } else {
      router.push('/customers');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="bg-white">
          <CardContent className="p-6">
            {isContactPickerSupported && !isEditMode && (
                <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full mb-6" 
                    onClick={handleImportContact}
                >
                    <Contact className="mr-2 h-4 w-4" />
                    Import from Device Contacts
                </Button>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 0771234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. user@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter customer's address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isEditMode ? 'Updating...' : 'Saving...'}
              </>
            ) : (
                isEditMode ? 'Update Customer' : 'Save Customer'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
