import * as matchers from '@testing-library/jest-dom/matchers'
import { expect, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaClient } from '@prisma/client'

expect.extend(matchers)

// Global Prisma Mock
vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '',
}))

// Global mock for logger to keep test output clean
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock static assets like images/SVGs
vi.mock('/logo.svg', () => 'logo-mock')
