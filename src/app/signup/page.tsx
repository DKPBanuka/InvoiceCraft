
"use client";

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Logo from '@/components/logo';
import { Button } from '@/components/ui/button';

export default function SignupDisabledPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
         <div className="mb-8 flex justify-center">
            <Logo />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Sign-up Disabled</CardTitle>
            <CardDescription>New user accounts can only be created by an administrator.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-6">
                If you are an administrator, please visit your Firebase project console to add new users to Firebase Authentication and set their roles in the Firestore 'users' collection.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">
                Return to Login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
