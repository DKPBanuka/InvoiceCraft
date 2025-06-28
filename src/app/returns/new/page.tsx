
"use client";

import { useRouter } from 'next/navigation';
import ReturnForm from '@/components/return-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NewReturnPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Create New Return
          </h1>
          <p className="text-muted-foreground">
            Log a new product return and start the resolution process.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
      <ReturnForm />
    </div>
  );
}
