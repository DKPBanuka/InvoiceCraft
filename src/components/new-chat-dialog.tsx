
"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from './ui/input';
import type { AuthUser } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';

interface NewChatDialogProps {
  children: React.ReactNode;
  users: AuthUser[];
  onSelectUser: (user: AuthUser) => void;
}

export function NewChatDialog({ children, users, onSelectUser }: NewChatDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleSelect = (user: AuthUser) => {
    onSelectUser(user);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start a new chat</DialogTitle>
        </DialogHeader>
        <div className="py-4">
            <Input 
                placeholder="Search for a user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-4"
            />
            <ScrollArea className="h-72">
                <div className="space-y-2">
                {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                        <button
                        key={user.uid}
                        onClick={() => handleSelect(user)}
                        className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-muted"
                        >
                        <Avatar className="h-10 w-10 border">
                            <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="font-semibold">{user.username}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        </button>
                    ))
                ) : (
                    <p className="text-center text-sm text-muted-foreground">No users found.</p>
                )}
                </div>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
