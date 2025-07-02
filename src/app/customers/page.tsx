
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Users, Download, Contact } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCustomers } from '@/hooks/use-customers';
import CustomerList from '@/components/customer-list';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { exportToCsv } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function CustomersPage() {
  const { customers, isLoading, deleteCustomer } = useCustomers();
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleExport = () => {
    const dataToExport = filteredCustomers.map(customer => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      createdAt: format(new Date(customer.createdAt), 'yyyy-MM-dd'),
    }));

    const headers = {
      id: 'Customer ID',
      name: 'Name',
      phone: 'Phone',
      email: 'Email',
      address: 'Address',
      createdAt: 'Date Added',
    };

    exportToCsv(dataToExport, `customers-${new Date().toISOString().split('T')[0]}`, headers);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Customers
          </h1>
          <p className="text-muted-foreground">
            Manage your customer database.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
            </Button>
            <Link href="/customers/new" passHref>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Customer
              </Button>
            </Link>
        </div>
      </div>

       {isLoading ? (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
      ) : customers.length > 0 ? (
        <>
          <div className="mb-6">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                type="text"
                placeholder="Search by name, phone, or email..."
                className="w-full bg-white py-3 pl-10 pr-4 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
          <CustomerList customers={filteredCustomers} deleteCustomer={deleteCustomer} />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-white/50 p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-xl font-semibold font-headline">No customers found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started by adding your first customer.
          </p>
          <Link href="/customers/new" passHref>
            <Button className="mt-6">
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
