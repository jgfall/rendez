import type { Metadata } from 'next';
import { Instrument_Serif, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
  display: 'swap',
  style: ['normal', 'italic'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Rendez | Tour Proposals Made Beautiful',
  description: 'Create stunning tour proposals and get confirmed bookings faster.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.rendez.to'),
  openGraph: {
    title: 'Rendez | Tour Proposals Made Beautiful',
    description: 'Create stunning tour proposals and get confirmed bookings faster.',
    url: 'https://www.rendez.to',
    siteName: 'Rendez',
    images: [
      {
        url: '/opengraph.png',
        width: 1200,
        height: 630,
        alt: 'Rendez - Tour Proposals Made Beautiful',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rendez | Tour Proposals Made Beautiful',
    description: 'Create stunning tour proposals and get confirmed bookings faster.',
    images: ['/opengraph.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen font-body">
        {children}
      </body>
    </html>
  );
}
