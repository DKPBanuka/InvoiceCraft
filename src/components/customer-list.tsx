
"use client";

import Link from 'next/link';
import type { Customer } from '@/lib/types';
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

interface CustomerListProps {
  customers: Customer[];
  deleteCustomer: (id: string) => void;
}

function DeleteDialog({ customer, deleteCustomer, asChild, children }: { customer: Customer; deleteCustomer: (id: string) => void; asChild?: boolean; children: React.ReactNode; }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild={asChild}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete '{customer.name}'.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => deleteCustomer(customer.id)} className="bg-destructive hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function CustomerList({ customers, deleteCustomer }: CustomerListProps) {
  if (customers.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        <p>No customers match your search.</p>
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
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[140px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Link href={`/customers/${customer.id}/edit`} passHref>
                    <Button variant="outline" size="icon">
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit Customer</span>
                    </Button>
                  </Link>
                  <DeleteDialog customer={customer} deleteCustomer={deleteCustomer} asChild>
                    <Button variant="destructive" size="icon">
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete Customer</span>
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
        {customers.map((customer) => (
          <Card key={customer.id} className="bg-white">
            <CardHeader>
              <CardTitle>{customer.name}</CardTitle>
              <CardDescription>{customer.phone}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              {customer.email && <p>{customer.email}</p>}
              {customer.address && <p className="text-muted-foreground mt-2">{customer.address}</p>}
            </CardContent>
            <Separator />
            <CardFooter className="p-2 justify-end space-x-2">
              <Link href={`/customers/${customer.id}/edit`} passHref>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
              </Link>
              <DeleteDialog customer={customer} deleteCustomer={deleteCustomer} asChild>
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
