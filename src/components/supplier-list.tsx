
"use client";

import Link from 'next/link';
import type { Supplier } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
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
} from "@/components/ui/alert-dialog";
import { Separator } from './ui/separator';

interface SupplierListProps {
  suppliers: Supplier[];
  deleteSupplier: (id: string) => void;
}

function DeleteDialog({ supplier, deleteSupplier, asChild, children }: { supplier: Supplier; deleteSupplier: (id: string) => void; asChild?: boolean; children: React.ReactNode; }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild={asChild}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete '{supplier.name}'.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => deleteSupplier(supplier.id)} className="bg-destructive hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function SupplierList({ suppliers, deleteSupplier }: SupplierListProps) {
  if (suppliers.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        <p>No suppliers match your search.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop View: Table */}
      <div className="hidden md:block rounded-lg border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[140px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell>{supplier.contactPerson}</TableCell>
                <TableCell>{supplier.phone}</TableCell>
                <TableCell>{supplier.email}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Link href={`/suppliers/${supplier.id}/edit`} passHref>
                    <Button variant="outline" size="icon">
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit Supplier</span>
                    </Button>
                  </Link>
                  <DeleteDialog supplier={supplier} deleteSupplier={deleteSupplier} asChild>
                    <Button variant="destructive" size="icon">
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete Supplier</span>
                    </Button>
                  </DeleteDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View: Cards */}
      <div className="md:hidden space-y-4">
        {suppliers.map((supplier) => (
          <Card key={supplier.id} className="bg-white">
            <CardHeader>
              <CardTitle>{supplier.name}</CardTitle>
              <CardDescription>{supplier.contactPerson}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              {supplier.phone && <p>{supplier.phone}</p>}
              {supplier.email && <p className="text-muted-foreground">{supplier.email}</p>}
            </CardContent>
            <Separator />
            <CardFooter className="p-2 justify-end space-x-2">
              <Link href={`/suppliers/${supplier.id}/edit`} passHref>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
              </Link>
              <DeleteDialog supplier={supplier} deleteSupplier={deleteSupplier} asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </DeleteDialog>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
