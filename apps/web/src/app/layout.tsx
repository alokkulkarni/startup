import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Forge AI — Build apps with AI',
  description: 'Build production-ready web apps from natural language. Ship faster with AI.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-950 text-gray-50 antialiased">
        {children}
      </body>
    </html>
  )
}
