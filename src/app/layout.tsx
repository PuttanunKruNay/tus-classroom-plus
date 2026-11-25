import type { Metadata, Viewport } from 'next';
import { Prompt, Noto_Sans_Thai } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ToastProvider } from '@/components/ToastProvider';
import { PlatformBridge } from '@/components/PlatformBridge';
import './globals.css';

const prompt = Prompt({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-prompt',
  display: 'swap'
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto',
  display: 'swap'
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#B8194F'
};

export const metadata: Metadata = {
  title: 'TUS Classroom Plus | โรงเรียนเตรียมอุดมศึกษาภาคใต้',
  description:
    'ระบบการจัดการชั้นเรียนและห้องเรียนออนไลน์ โรงเรียนเตรียมอุดมศึกษาภาคใต้ รองรับทุกอุปกรณ์ทั้งมือถือ แท็บเล็ต และคอมพิวเตอร์',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TUS Classroom Plus'
  },
  icons: {
    icon: '/assets/logo_phrakiao.png?v=3',
    apple: '/assets/logo_phrakiao.png?v=3'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${prompt.variable} ${notoSansThai.variable}`} suppressHydrationWarning>
      <body className="antialiased selection:bg-[#B8194F] selection:text-white">
        <ThemeProvider>
          <ToastProvider>
            <PlatformBridge />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
