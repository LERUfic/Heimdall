import { describe, it, expect } from 'vitest'
import { formatDate, getStatusColor, getMethodColor, getHttpStatusColor } from '@/lib/utils'

describe('UI Utilities', () => {
  describe('formatDate', () => {
    it('formats a date string correctly', () => {
      const date = new Date('2024-01-01T12:00:00Z')
      const result = formatDate(date)
      expect(result).toContain('Jan 1')
    })

    it('returns Never for empty input', () => {
      expect(formatDate('')).toBe('Never')
    })
  })

  describe('getStatusColor', () => {
    it('returns correct colors for each status', () => {
      expect(getStatusColor('PENDING')).toContain('#ff9800')
      expect(getStatusColor('APPROVED')).toContain('#2196f3')
      expect(getStatusColor('EXECUTED')).toContain('#4caf50')
      expect(getStatusColor('REJECTED')).toContain('#f44336')
      expect(getStatusColor('UNKNOWN')).toContain('zinc-500')
    })
  })

  describe('getMethodColor', () => {
    it('returns correct colors for HTTP methods', () => {
      expect(getMethodColor('GET')).toContain('#4caf50')
      expect(getMethodColor('POST')).toContain('#2196f3')
      expect(getMethodColor('PUT')).toContain('#ff9800')
      expect(getMethodColor('PATCH')).toContain('#9c27b0')
      expect(getMethodColor('DELETE')).toContain('#f44336')
      expect(getMethodColor('HEAD')).toContain('zinc-500')
    })

    it('handles lowercase/missing methods', () => {
      expect(getMethodColor('get')).toContain('#4caf50')
      expect(getMethodColor(undefined as unknown as string)).toContain('zinc-500')
    })
  })

  describe('getHttpStatusColor', () => {
    it('returns green for 2xx', () => {
      expect(getHttpStatusColor(200)).toContain('#4caf50')
      expect(getHttpStatusColor(201)).toContain('#4caf50')
    })
    it('returns red for 4xx/5xx', () => {
      expect(getHttpStatusColor(400)).toContain('#f44336')
      expect(getHttpStatusColor(500)).toContain('#f44336')
    })
    it('returns gray for others', () => {
      expect(getHttpStatusColor(302)).toContain('zinc-500')
    })
  })
})
