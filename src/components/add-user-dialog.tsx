
"use client";

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

export function AddUserDialog({ children }: { children: React.ReactNode }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>How to Add a New User</AlertDialogTitle>
          <AlertDialogDescription>
            For security, new users must be created through the Firebase console.
            This ensures that only authorized administrators can add accounts.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="text-sm space-y-4">
            <p>Please follow these steps:</p>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Firebase Console</a> and navigate to your project.</li>
                <li>From the left menu, select **Authentication**.</li>
                <li>Click **Add user** and provide their email and a temporary password.</li>
                <li>When the new user logs into this app for the first time, their account will be automatically created in the database with a 'staff' role.</li>
                 <li>You can then edit their username or role in the **Firestore Database** -> **users** collection if needed.</li>
            </ol>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
