/**
 * Shared UI utilities for formatting and style mapping
 */

export const formatDate = (dateString: string | Date) => {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING': return 'text-[#ff9800]'
    case 'APPROVED': return 'text-[#2196f3]'
    case 'EXECUTED': return 'text-[#4caf50]'
    case 'REJECTED': return 'text-[#f44336]'
    default: return 'text-zinc-500'
  }
}

export const getMethodColor = (method: string) => {
  switch (method?.toUpperCase()) {
    case 'GET': return 'text-[#4caf50]'
    case 'POST': return 'text-[#2196f3]'
    case 'PUT': return 'text-[#ff9800]'
    case 'PATCH': return 'text-[#9c27b0]'
    case 'DELETE': return 'text-[#f44336]'
    default: return 'text-zinc-500'
  }
}

export const getHttpStatusColor = (status: number) => {
  if (status >= 200 && status < 300) return 'text-[#4caf50]'
  if (status >= 400) return 'text-[#f44336]'
  return 'text-zinc-500'
}
