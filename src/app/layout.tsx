import './globals.css'
import { Metadata } from 'next'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: 'Heimdall Approval System',
  description: 'HTTP Request Approval System',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen">
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
