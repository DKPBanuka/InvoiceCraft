
"use client";

import Link from 'next/link';
import type { InventoryItem, ItemStatus } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

interface InventoryListProps {
  inventory: InventoryItem[];
  deleteInventoryItem: (id: string) => void;
}

const statusStyles: { [key in ItemStatus]: string } = {
    Available: 'bg-accent text-accent-foreground border-transparent',
    'Awaiting Inspection': 'bg-yellow-100 text-yellow-800 border-transparent dark:bg-yellow-900/50 dark:text-yellow-300',
    Damaged: 'bg-destructive/80 text-destructive-foreground border-transparent',
    'For Repair': 'bg-blue-200 text-blue-800 border-transparent dark:bg-blue-900/50 dark:text-blue-300',
};


function DeleteDialog({ item, deleteInventoryItem, asChild, children }: { item: InventoryItem; deleteInventoryItem: (id: string) => void; asChild?: boolean; children: React.ReactNode; }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild={asChild}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete '{item.name}'. This may also affect existing invoices that reference this item.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => deleteInventoryItem(item.id)} className="bg-destructive hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


export default function InventoryList({ inventory, deleteInventoryItem }: InventoryListProps) {
  const { user } = useAuth();

  if (inventory.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        <p>No items match your search.</p>
      </div>
    );
  }

  const isLowStock = (item: InventoryItem) => item.quantity <= item.reorderPoint;

  return (
    <>
      {/* Desktop View: Table */}
      <div className="hidden md:block rounded-lg border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Selling Price</TableHead>
              {user?.role === 'admin' && <TableHead className="text-right">Cost Price</TableHead>}
              <TableHead className="text-right">Stock</TableHead>
              {user?.role === 'admin' && <TableHead className="text-right">Stock Value (Cost)</TableHead>}
              {user?.role === 'admin' && <TableHead className="w-[140px] text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.brand}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>
                  <Badge className={cn('text-xs', statusStyles[item.status])}>{item.status}</Badge>
                </TableCell>
                <TableCell className="text-right">Rs.{item.price.toFixed(2)}</TableCell>
                {user?.role === 'admin' && <TableCell className="text-right">Rs.{item.costPrice.toFixed(2)}</TableCell>}
                <TableCell className="text-right">
                    <Badge variant={isLowStock(item) ? "destructive" : "secondary"}>
                        {item.quantity} in stock
                    </Badge>
                </TableCell>
                {user?.role === 'admin' && <TableCell className="text-right">Rs.{(item.costPrice * item.quantity).toFixed(2)}</TableCell>}
                {user?.role === 'admin' && (
                    <TableCell className="text-right space-x-2">
                    <Link href={`/inventory/${item.id}/edit`} passHref>
                        <Button variant="outline" size="icon">
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit Item</span>
                        </Button>
                    </Link>
                    <DeleteDialog item={item} deleteInventoryItem={deleteInventoryItem} asChild>
                        <Button variant="destructive" size="icon">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete Item</span>
                        </Button>
                    </DeleteDialog>
                    </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View: Cards */}
      <div className="md:hidden space-y-4">
        {inventory.map((item) => (
          <Card key={item.id} className="bg-white">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{item.name}</CardTitle>
                        <CardDescription>{item.brand} / {item.category}</CardDescription>
                    </div>
                    <Badge className={cn('text-xs', statusStyles[item.status])}>{item.status}</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Selling Price</span>
                    <span className="font-medium">Rs.{item.price.toFixed(2)}</span>
                </div>
                {user?.role === 'admin' && (
                    <>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Cost Price</span>
                        <span className="font-medium">Rs.{item.costPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Stock Value (Cost)</span>
                        <span className="font-medium">Rs.{(item.costPrice * item.quantity).toFixed(2)}</span>
                    </div>
                    </>
                )}
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Stock</span>
                     <Badge variant={isLowStock(item) ? "destructive" : "secondary"}>
                        {item.quantity} in stock
                    </Badge>
                </div>
            </CardContent>
            {user?.role === 'admin' && (
                <>
                <Separator />
                <CardFooter className="p-2 justify-end space-x-2">
                <Link href={`/inventory/${item.id}/edit`} passHref>
                    <Button variant="outline" size="sm">
                    <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                </Link>
                <DeleteDialog item={item} deleteInventoryItem={deleteInventoryItem} asChild>
                    <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                </DeleteDialog>
                </CardFooter>
                </>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
