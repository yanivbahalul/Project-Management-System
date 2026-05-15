import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'HIT Final Project Management System',
  description:
    'Final Project Management System for Holon Institute of Technology — manage applications, milestones, grading, and defenses across student, mentor, coordinator, and reviewer roles.',
  applicationName: 'HIT Portal',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a1224' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} bg-background`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased min-h-svh">
        {children}
      </body>
    </html>
  )
}
