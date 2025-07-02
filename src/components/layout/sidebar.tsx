
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useChatContext } from '@/contexts/chat-context';
import { 
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarFooter
} from '@/components/ui/sidebar';
import Logo from '../logo';
import { Archive, FileText, LayoutDashboard, LineChart, LogOut, MessageSquare, Undo2, Users, Contact, Truck } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';

export default function AppSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { totalUnreadCount } = useChatContext();
  
  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'staff'] },
    { href: '/invoices', label: 'Invoices', icon: FileText, roles: ['admin', 'staff'] },
    { href: '/customers', label: 'Customers', icon: Contact, roles: ['admin', 'staff'] },
    { href: '/inventory', label: 'Inventory', icon: Archive, roles: ['admin', 'staff'] },
    { href: '/returns', label: 'Returns', icon: Undo2, roles: ['admin', 'staff'] },
    { href: '/messages', label: 'Messages', icon: MessageSquare, roles: ['admin', 'staff'] },
    { href: '/suppliers', label: 'Suppliers', icon: Truck, roles: ['admin'] },
    { href: '/reports', label: 'Reports', icon: LineChart, roles: ['admin'] },
    { href: '/users', label: 'Users', icon: Users, roles: ['admin'] },
  ];

  if (!user) {
      return null;
  }

  const availableNavItems = navItems.filter(item => user && item.roles.includes(user.role));
  
  const isLinkActive = (href: string) => {
    if (href === '/') {
        return pathname === '/';
    }
    // Check if the current pathname starts with the link's href.
    // This handles nested routes correctly (e.g., /invoices/new is active for /invoices).
    return pathname.startsWith(href);
  }


  return (
    <Sidebar variant="sidebar" collapsible="icon" className="group-data-[collapsible=icon]:border-r">
        <SidebarHeader>
            <Logo />
        </SidebarHeader>
        <SidebarContent>
            <SidebarMenu>
                {availableNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton 
                            asChild
                            isActive={isLinkActive(item.href)}
                            tooltip={{children: item.label}}
                        >
                             <Link href={item.href}>
                                <item.icon />
                                <span>{item.label}</span>
                            </Link>
                        </SidebarMenuButton>
                        {item.href === '/messages' && totalUnreadCount > 0 && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none group-data-[collapsible=icon]:right-1.5 group-data-[collapsible=icon]:top-1.5">
                                <div className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </div>
                            </div>
                        )}
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarContent>

        {/* Desktop Footer */}
        <SidebarFooter className="hidden md:flex border-t">
            <SidebarMenu>
                <SidebarMenuItem>
                     <SidebarMenuButton
                        className="h-auto justify-start p-2"
                        variant="ghost"
                        size="default"
                      >
                        <Avatar className="size-8">
                            <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start text-left">
                           <span className="font-medium">{user.username}</span>
                           <span className="text-xs uppercase text-muted-foreground">{user.role}</span>
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={signOut} tooltip={{children: "Logout"}}>
                        <LogOut />
                        <span>Logout</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
        
        {/* Mobile Footer */}
        <SidebarFooter className="md:hidden flex flex-col gap-4 border-t pt-4">
             <div className="flex items-center gap-2 px-2">
                <Avatar className="size-8">
                    <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-sm font-medium">{user.username}</p>
                    <Badge variant="outline" className="uppercase text-xs">{user.role}</Badge>
                </div>
            </div>
             <Button variant="ghost" onClick={signOut} className="w-full justify-start">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
            </Button>
        </SidebarFooter>
    </Sidebar>
  );
}
