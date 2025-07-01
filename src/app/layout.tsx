
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';
import AppHeader from '@/components/layout/header';
import AppSidebar from '@/components/layout/sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ChatProvider } from '@/contexts/chat-context';
import MobileBottomNav from '@/components/mobile-bottom-nav';

export const metadata: Metadata = {
  title: 'InvoiceCraft',
  description: 'Create, manage, and store invoices with ease.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'InvoiceCraft',
  },
};

export const viewport: Viewport = {
  themeColor: '#87CEEB',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased',
        )}
      >
        <AuthProvider>
            <ChatProvider>
              <SidebarProvider>
                  <AppSidebar />
                  <SidebarInset>
                      <AppHeader />
                      <main className="pb-16 md:pb-0">{children}</main>
                  </SidebarInset>
              </SidebarProvider>
              <MobileBottomNav />
              <Toaster />
            </ChatProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
