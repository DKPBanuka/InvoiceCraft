
"use client";

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, UserPlus, Loader2 } from 'lucide-react';
import { useCustomers } from '@/hooks/use-customers';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FormLabel, FormMessage } from '@/components/ui/form';
import type { Customer } from '@/lib/types';
import CustomerForm from './customer-form';

interface CustomerSelectorProps {
  form: any; // react-hook-form's form object
}

export default function CustomerSelector({ form }: CustomerSelectorProps) {
  const { customers, isLoading } = useCustomers();
  const [openPopover, setOpenPopover] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedCustomerId = form.watch('customerId');
  const selectedCustomerName = form.watch('customerName');

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectCustomer = (customer: Customer) => {
    form.setValue('customerId', customer.id, { shouldValidate: true });
    form.setValue('customerName', customer.name, { shouldValidate: true });
    form.setValue('customerPhone', customer.phone, { shouldValidate: true });
    setOpenPopover(false);
  };
  
  useEffect(() => {
    // If a customer is selected, but their name is not in the form (e.g. on edit page load)
    // find the customer and populate the fields
    if (selectedCustomerId && !selectedCustomerName && customers.length > 0) {
        const customer = customers.find(c => c.id === selectedCustomerId);
        if(customer) {
            handleSelectCustomer(customer);
        }
    }
  }, [selectedCustomerId, selectedCustomerName, customers, form]);

  return (
    <>
      <div className="space-y-2">
        <FormLabel>Customer</FormLabel>
        <Popover open={openPopover} onOpenChange={setOpenPopover}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openPopover}
              className="w-full justify-between font-normal"
            >
              {selectedCustomerId && selectedCustomerName
                ? selectedCustomerName
                : "Select or create a customer..."}
              {isLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-[--radix-popover-trigger-width] p-0">
            <div className="p-2">
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <ScrollArea className="h-72">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <Button
                    variant="ghost"
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full justify-start font-normal"
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${
                        selectedCustomerId === customer.id ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    <div>
                        <p>{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.phone}</p>
                    </div>
                  </Button>
                ))
              ) : (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  No customers found.
                </p>
              )}
            </ScrollArea>
             <div className="p-2 border-t">
                <Button variant="outline" className="w-full" onClick={() => setOpenDialog(true)}>
                    <UserPlus className="mr-2 h-4 w-4"/>
                    Add New Customer
                </Button>
            </div>
          </PopoverContent>
        </Popover>
        <FormMessage>{form.formState.errors.customerName?.message}</FormMessage>
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Create New Customer</DialogTitle>
                <DialogDescription>
                    Add a new customer to your database. They will be available for future invoices.
                </DialogDescription>
            </DialogHeader>
            <CustomerForm onFinished={() => setOpenDialog(false)}/>
        </DialogContent>
      </Dialog>
    </>
  );
}
