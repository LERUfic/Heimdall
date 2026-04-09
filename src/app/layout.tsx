import './globals.css'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Heimdall Approval System',
  description: 'Postman-like approval system',
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
      </body>
    </html>
  )
}
