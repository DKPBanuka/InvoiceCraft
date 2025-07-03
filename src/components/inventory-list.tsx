
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
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

export default function InventoryList({ inventory }: InventoryListProps) {
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
              <TableHead className="w-[100px] text-right"></TableHead>
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
                <TableCell className="text-right">
                   <Link href={`/inventory/${item.id}`} passHref>
                        <Button variant="outline" size="sm">
                            View <ChevronRight className="h-4 w-4 -mr-1" />
                        </Button>
                    </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View: Cards */}
      <div className="md:hidden space-y-4">
        {inventory.map((item) => (
          <Link href={`/inventory/${item.id}`} key={item.id} className="group block">
            <Card className="bg-white transition-shadow duration-200 group-hover:shadow-md">
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
                      <div className="flex justify-between">
                          <span className="text-muted-foreground">Cost Price</span>
                          <span className="font-medium">Rs.{item.costPrice.toFixed(2)}</span>
                      </div>
                  )}
                  <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Stock</span>
                       <Badge variant={isLowStock(item) ? "destructive" : "secondary"}>
                          {item.quantity} in stock
                      </Badge>
                  </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
