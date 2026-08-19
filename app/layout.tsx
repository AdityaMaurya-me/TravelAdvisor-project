import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { AuthModalProvider } from '@/components/auth/auth-modal-provider'
import { PageTransitionLoader } from '@/components/navigation/page-transition-loader'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { defaultShareImage, getSiteUrl } from '@/lib/seo/site'

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: 'TravelAdvisor | Discover your next destination',
    template: '%s | TravelAdvisor',
  },
  description: 'Discover destinations, verified places, routes, and local travel ideas across India.',
  applicationName: 'TravelAdvisor',
  keywords: ['travel planning', 'India travel', 'destinations', 'places', 'road trips', 'travel routes'],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'TravelAdvisor',
    title: 'TravelAdvisor | Discover your next destination',
    description: 'Discover destinations, verified places, routes, and local travel ideas across India.',
    url: '/',
    images: [{ url: defaultShareImage, width: 1200, height: 630, alt: 'TravelAdvisor' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TravelAdvisor | Discover your next destination',
    description: 'Discover destinations, verified places, routes, and local travel ideas across India.',
    images: [defaultShareImage],
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Keep browser and pinch zoom available. Restricting it would harm
  // accessibility and does not reliably control desktop browser zoom.
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider><AuthModalProvider><Suspense fallback={null}><PageTransitionLoader /></Suspense>{children}</AuthModalProvider></ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
