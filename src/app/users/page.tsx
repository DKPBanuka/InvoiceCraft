
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useUsers } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import UserList from "@/components/user-list";
import { AddUserDialog } from "@/components/add-user-dialog";

export default function UsersPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const { users, isLoading: usersLoading } = useUsers();

    const isLoading = authLoading || usersLoading;

    if (!authLoading && user?.role !== 'admin') {
        router.push('/');
        return null;
    }

    return (
        <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
            <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">
                    User Management
                </h1>
                <p className="text-muted-foreground">
                    Add and manage user accounts for your team.
                </p>
                </div>
                <AddUserDialog>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add User
                    </Button>
                </AddUserDialog>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <UserList users={users} />
            )}
        </div>
    );
}
