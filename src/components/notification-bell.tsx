
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Loader2, FileText, Archive, Undo2, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import type { AppNotification } from '@/lib/types';

const notificationTypeConfig: { [key in AppNotification['type']]: { icon: React.ElementType, color: string }} = {
    invoice: { icon: FileText, color: 'text-blue-500' },
    inventory: { icon: Archive, color: 'text-orange-500' },
    'low-stock': { icon: AlertTriangle, color: 'text-destructive' },
    return: { icon: Undo2, color: 'text-purple-500' },
    general: { icon: Bell, color: 'text-gray-500' },
};

export function NotificationBell() {
  const { notifications, isLoading, unreadCount, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      markAllAsRead();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
            </span>
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 font-medium border-b text-sm">
            Notifications
        </div>
        <ScrollArea className="h-96">
          {isLoading ? (
             <div className="flex justify-center items-center h-full p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground p-8">
              You have no new notifications.
            </p>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => {
                const config = notificationTypeConfig[notification.type] || notificationTypeConfig.general;
                const Icon = config.icon;

                return (
                    <Link 
                    href={notification.link} 
                    key={notification.id}
                    className={cn(
                        'block border-b transition-colors hover:bg-muted/50',
                        !notification.read && 'bg-primary/5'
                    )}
                    onClick={() => setIsOpen(false)}
                    >
                        <div className="flex items-start gap-3 p-4">
                            <div className={cn('mt-1 h-5 w-5 flex-shrink-0 flex items-center justify-center rounded-full bg-muted', !notification.read && 'bg-primary/10')}>
                                <Icon className={cn('h-3.5 w-3.5', config.color)} />
                            </div>
                            <div>
                                <p className="mb-1 leading-snug text-sm">{notification.message}</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </p>
                            </div>
                        </div>
                    </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
