import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Browser Use Studio - AI Web Automation Platform',
  description: 'Powerful AI web automation platform that can perform any browser task through intelligent automation. Enter any prompt and watch AI handle it in real-time.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-dark-100 text-white antialiased`}>
        {children}
      </body>
    </html>
  )
} 