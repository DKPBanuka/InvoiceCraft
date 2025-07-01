
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Truck, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSuppliers } from '@/hooks/use-suppliers';
import SupplierList from '@/components/supplier-list';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { exportToCsv } from '@/lib/utils';


export default function SuppliersPage() {
  const { suppliers, isLoading, deleteSupplier } = useSuppliers();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  if (!authLoading && user?.role !== 'admin') {
    router.push('/');
    return null;
  }

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleExport = () => {
    const dataToExport = filteredSuppliers.map(supplier => ({
        id: supplier.id,
        name: supplier.name,
        contactPerson: supplier.contactPerson || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        createdAt: format(new Date(supplier.createdAt), 'yyyy-MM-dd'),
    }));

    const headers = {
        id: 'Supplier ID',
        name: 'Name',
        contactPerson: 'Contact Person',
        phone: 'Phone',
        email: 'Email',
        address: 'Address',
        createdAt: 'Date Added',
    };

    exportToCsv(dataToExport, `suppliers-${new Date().toISOString().split('T')[0]}`, headers);
  };


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Suppliers
          </h1>
          <p className="text-muted-foreground">
            Manage your list of suppliers.
          </p>
        </div>
         <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
            </Button>
            <Link href="/suppliers/new" passHref>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Supplier
              </Button>
            </Link>
        </div>
      </div>

       {isLoading || authLoading ? (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
      ) : suppliers.length > 0 ? (
        <>
          <div className="mb-6">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                type="text"
                placeholder="Search by name, contact, phone, or email..."
                className="w-full bg-white py-3 pl-10 pr-4 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
          <SupplierList suppliers={filteredSuppliers} deleteSupplier={deleteSupplier} />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-white/50 p-12 text-center">
          <Truck className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-xl font-semibold font-headline">No suppliers found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started by adding your first supplier.
          </p>
          <Link href="/suppliers/new" passHref>
            <Button className="mt-6">
              <Plus className="mr-2 h-4 w-4" />
              Add Supplier
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
