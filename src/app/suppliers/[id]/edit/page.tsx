
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSuppliers } from '@/hooks/use-suppliers';
import SupplierForm from '@/components/supplier-form';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import type { Supplier } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useAuth } from '@/contexts/auth-context';

export default function EditSupplierPage() {
  const router = useRouter();
  const params = useParams();
  const { getSupplier, isLoading: suppliersLoading, deleteSupplier } = useSuppliers();
  const { user, isLoading: authLoading } = useAuth();
  const [supplier, setSupplier] = useState<Supplier | undefined>(undefined);

  const isLoading = suppliersLoading || authLoading;

  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  
  useEffect(() => {
    if (user?.role !== 'admin') {
        router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    if (!isLoading && id) {
      const foundSupplier = getSupplier(id);
      if (foundSupplier) {
        setSupplier(foundSupplier);
      } else {
        router.push('/suppliers');
      }
    }
  }, [id, getSupplier, isLoading, router]);

  const handleDelete = () => {
    if (id) {
        deleteSupplier(id);
        router.push('/suppliers');
    }
  };

  if (isLoading || !supplier) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
       <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">
              Edit Supplier
            </h1>
            <p className="text-muted-foreground">
              Update the details for '{supplier.name}'.
            </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the supplier '{supplier.name}' from your database.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>
      <SupplierForm supplier={supplier} />
    </div>
  );
}
