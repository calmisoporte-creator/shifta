import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Shifta — Gestión de tareas y turnos',
  description: 'Plataforma de gestión de tareas por turnos para empresas y pymes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="h-full dark" suppressHydrationWarning>
      <body className={`${inter.className} h-full bg-gray-950 text-gray-100 antialiased`}>
        {children}
      </body>
    </html>
  )
}
