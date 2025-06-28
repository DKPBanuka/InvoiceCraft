
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
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
import { Archive, FileText, LineChart, Undo2, Users, LogOut } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export default function AppSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  
  const navItems = [
    { href: '/', label: 'Invoices', icon: FileText, roles: ['admin', 'staff'] },
    { href: '/inventory', label: 'Inventory', icon: Archive, roles: ['admin', 'staff'] },
    { href: '/returns', label: 'Returns', icon: Undo2, roles: ['admin', 'staff'] },
    { href: '/reports', label: 'Reports', icon: LineChart, roles: ['admin'] },
    { href: '/users', label: 'Users', icon: Users, roles: ['admin'] },
  ];

  if (!user) {
      return null;
  }

  const availableNavItems = navItems.filter(item => user && item.roles.includes(user.role));

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
                            isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
                            tooltip={{children: item.label}}
                        >
                             <Link href={item.href}>
                                <item.icon />
                                <span>{item.label}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="md:hidden flex flex-col gap-4 border-t pt-4">
             <div className="flex items-center gap-2 px-2">
                <p className="text-sm font-medium">{user.username}</p>
                <Badge variant="outline" className="uppercase text-xs">{user.role}</Badge>
            </div>
             <Button variant="ghost" onClick={signOut} className="w-full justify-start">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
            </Button>
        </SidebarFooter>
    </Sidebar>
  );
}
