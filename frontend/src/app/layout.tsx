import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { ApolloWrapper } from '@/components/ApolloWrapper';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'LetsChat',
  description: 'Real-time rooms chat — Discord-inspired',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LetsChat',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1e1f22',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${jakarta.variable} font-sans`}>
        <ApolloWrapper>{children}</ApolloWrapper>
      </body>
    </html>
  );
}
