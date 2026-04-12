import { describe, it, expect, vi, beforeEach } from 'vitest'
import { transformSchema, configure, run, ConfigDeps } from '../../scripts/configure-db'

describe('Database Configurator (Injection Pattern)', () => {
  const baseSchema = `
generator client {
  provider = "sqlite"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model HttpRequest {
  id       String @id @default(uuid())
  headers  String?
  body     String?
  response String?
  url      String
}
  `.trim()

  let mockDeps: ConfigDeps

  beforeEach(() => {
    mockDeps = {
      existsSync: vi.fn().mockReturnValue(true),
      readFileSync: vi.fn().mockReturnValue(baseSchema),
      writeFileSync: vi.fn(),
      execSync: vi.fn().mockReturnValue(Buffer.from('')),
      log: vi.fn(),
      error: vi.fn(),
      exit: vi.fn().mockImplementation(() => { throw new Error('exit') }),
    }
  })

  describe('transformSchema', () => {
    it('should transform SQLite to MySQL and inject native attributes', () => {
      const result = transformSchema(baseSchema, 'mysql')
      expect(result).toContain('provider = "mysql"')
      expect(result).toContain('body     String? @db.LongText')
      expect(result).toContain('url      String @db.VarChar(1000)')
    })

    it('should transform SQLite to PostgreSQL', () => {
      const result = transformSchema(baseSchema, 'postgresql')
      expect(result).toContain('provider = "postgresql"')
      expect(result).not.toContain('@db.LongText')
    })
  })

  describe('configure()', () => {
    it('should read, transform, and write schema files', async () => {
      await configure('postgresql', mockDeps)
      expect(mockDeps.writeFileSync).toHaveBeenCalled()
      expect(mockDeps.execSync).toHaveBeenCalledWith(expect.stringContaining('prisma generate'), expect.any(Object))
    })

    it('should handle missing schema file', async () => {
      ;(mockDeps.existsSync as any).mockReturnValue(false)
      await expect(configure('sqlite', mockDeps)).rejects.toThrow('schema.prisma not found')
      expect(mockDeps.error).toHaveBeenCalledWith(expect.stringContaining('Error during configuration'))
    })
  })

  describe('run()', () => {
    it('should normalized postgres into postgresql', async () => {
      await run(['postgres'], mockDeps)
      expect(mockDeps.log).toHaveBeenCalledWith(expect.stringContaining('POSTGRESQL'))
    })

    it('should handle invalid arguments', () => {
      expect(() => run(['invalid'], mockDeps)).toThrow('exit')
      expect(mockDeps.exit).toHaveBeenCalledWith(1)
      expect(mockDeps.error).toHaveBeenCalledWith(expect.stringContaining('Usage:'))
    })

    it('should handle missing arguments', () => {
        expect(() => run([], mockDeps)).toThrow('exit')
        expect(mockDeps.exit).toHaveBeenCalledWith(1)
    })
  })
})
