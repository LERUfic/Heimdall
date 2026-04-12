import { PrismaClient } from '@prisma/client'
import { beforeEach, vi } from 'vitest'
import { mockReset, DeepMockProxy } from 'vitest-mock-extended'

import { prisma } from '@/lib/prisma'

// We don't need vi.mock here anymore as it is in setup.ts

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>

beforeEach(() => {
  mockReset(prismaMock)
})
