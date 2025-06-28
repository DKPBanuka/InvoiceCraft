// app/layout.tsx

import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';
import AppHeader from '@/components/layout/header';
import AppSidebar from '@/components/layout/sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export const metadata: Metadata = {
  title: 'InvoiceCraft',
  description: 'Create, manage, and store invoices with ease.',
  manifest: '/manifest.json',
  themeColor: '#2081e2', // Correctly placed here
  icons: {
    apple: [
      { 
        url: '/apple-touch-icon.png', // Assuming you will add this to your /public folder
        sizes: '180x180',
        type: 'image/png'
      }
    ]
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Manual metadata tags are removed. Only resource links remain. */}
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
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                    <AppHeader />
                    <main>{children}</main>
                </SidebarInset>
                <Toaster />
            </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}