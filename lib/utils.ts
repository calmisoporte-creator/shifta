import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  return `${hours}:${minutes}`
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const priorityLabel = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
} as const

export const priorityColor = {
  high: 'text-red-500 bg-red-500/10 border-red-500/20',
  medium: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  low: 'text-green-500 bg-green-500/10 border-green-500/20',
} as const

export const statusLabel = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completada',
} as const

export const statusColor = {
  pending: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  in_progress: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  completed: 'text-green-500 bg-green-500/10 border-green-500/20',
} as const
