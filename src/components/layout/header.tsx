
"use client";

import Logo from '../logo';
import { cn } from '@/lib/utils';
import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '../ui/sidebar';
import Link from 'next/link';
import { NotificationBell } from '../notification-bell';

function SyncStatus() {
  const isOnline = useOnlineStatus();

  return (
    <div className="flex items-center gap-1.5 text-base font-medium">
    {isOnline ? (
        <>
        <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent/80"></span>
        </span>
        <span className="hidden sm:inline text-accent-foreground">Online</span>
        </>
    ) : (
        <>
        <WifiOff className="h-4 w-4 text-muted-foreground" />
        <span className="hidden sm:inline text-muted-foreground">Offline</span>
        </>
    )}
    </div>
  )
}


export default function AppHeader() {
  const { user, isLoading, signOut } = useAuth();
  
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 no-print">
      <div className="flex h-16 items-center px-4 sm:px-6">
        <div className="flex items-center">
            <SidebarTrigger />
        </div>
        <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            {!isLoading && user && (
                <>
                <NotificationBell />
                <SyncStatus />
                <div className="text-sm text-muted-foreground hidden sm:block">
                    |
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    <p className="text-sm sm:text-base text-muted-foreground">{user.username}</p>
                    <Badge variant="outline" className="uppercase text-xs sm:text-sm">{user.role}</Badge>
                </div>
                </>
            )}
        </div>
      </div>
    </header>
  );
}
