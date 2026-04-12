import * as fs from 'fs';
import * as path from 'path';
import { execSync as nodeExecSync } from 'child_process';

/**
 * Dependency injection for testability
 */
export interface ConfigDeps {
  existsSync: (path: string) => boolean;
  readFileSync: (path: string, encoding: 'utf8') => string;
  writeFileSync: (path: string, content: string) => void;
  execSync: (command: string, options: any) => Buffer;
  log: (message: string) => void;
  error: (message: string) => void;
  exit: (code: number) => void;
}

export const defaultDeps: ConfigDeps = {
  existsSync: fs.existsSync,
  readFileSync: (p, e) => fs.readFileSync(p, e),
  writeFileSync: fs.writeFileSync,
  execSync: nodeExecSync,
  log: console.log,
  error: console.error,
  exit: (code) => process.exit(code),
};

// Primary logic for schema transformation
export function transformSchema(content: string, prismaProvider: string): string {
  let newContent = content;

  // 1. Repair Generator (Ensure it's always prisma-client-js)
  newContent = newContent.replace(/generator\s+client\s+{[\s\S]*?}/, (match) => {
    return match.replace(/provider\s*=\s*"[^"]*"/, 'provider = "prisma-client-js"');
  });

  // 2. Change Datasource Provider
  newContent = newContent.replace(/datasource\s+db\s+{[\s\S]*?}/, (match) => {
    return match.replace(/provider\s*=\s*"[^"]*"/, `provider = "${prismaProvider}"`);
  });

  // 3. Clear existing native attributes to start fresh
  newContent = newContent.replace(/\s*@db\.[a-zA-Z0-9()]*/g, '');

  // 4. Inject Provider-specific attributes
  if (prismaProvider === 'mysql') {
    const longTextFields = ['headers', 'body', 'response'];
    longTextFields.forEach(field => {
      const fieldRegex = new RegExp(`(\\b${field}\\s+String\\??)`, 'g');
      newContent = newContent.replace(fieldRegex, `$1 @db.LongText`);
    });

    newContent = newContent.replace(/(\burl\s+String\??)/g, `$1 @db.VarChar(1000)`);
  }

  return newContent;
}

const ROOT_DIR = path.join(__dirname, '..');
const PRISMA_DIR = path.join(ROOT_DIR, 'prisma');
const SCHEMA_FILE = path.join(PRISMA_DIR, 'schema.prisma');

export async function configure(prismaProvider: string, deps: ConfigDeps = defaultDeps) {
  deps.log(`\x1b[36mConsolidating and Configuring Heimdall for ${prismaProvider.toUpperCase()}...\x1b[0m`);

  try {
    if (!deps.existsSync(SCHEMA_FILE)) {
      throw new Error('schema.prisma not found. Please ensure the file exists.');
    }

    let content = deps.readFileSync(SCHEMA_FILE, 'utf8');

    // Perform transformation
    content = transformSchema(content, prismaProvider);

    // 5. Write back to schema.prisma
    deps.writeFileSync(SCHEMA_FILE, content);

    // 6. Regenerate Prisma Client
    deps.log('Regenerating Prisma Client...');
    deps.execSync('npx prisma generate', { stdio: 'inherit', cwd: ROOT_DIR });

    deps.log('\n\x1b[32mSUCCESS: Database consolidated and configured.\x1b[0m');
    deps.log('\x1b[34mNOTE: schema.prisma is now your single source of truth.\x1b[0m');
    
    if (prismaProvider === 'mysql' || prismaProvider === 'postgresql') {
      deps.log('\x1b[33m\nNEXT STEPS:\x1b[0m');
      deps.log(`1. Update DATABASE_URL in .env to your ${prismaProvider.toUpperCase()} connection string.`);
      deps.log('2. Run: npx prisma migrate dev (to sync schema and create tables)');
    } else {
      deps.log('\x1b[33m\nNEXT STEPS:\x1b[0m');
      deps.log('1. Ensure DATABASE_URL in .env is file:./dev.db');
      deps.log('2. Run: npx prisma db push');
    }
    return true;
  } catch (err: any) {
    deps.error(`\x1b[31mError during configuration: ${err.message}\x1b[0m`);
    throw err;
  }
}

export function run(args: string[], deps: ConfigDeps = defaultDeps) {
  const target = args[0];
  if (!target || !['sqlite', 'mysql', 'postgresql', 'postgres'].includes(target)) {
    deps.error('Usage: ts-node scripts/configure-db.ts [sqlite|mysql|postgresql]');
    deps.exit(1);
    return;
  }
  const prismaProvider = (target === 'postgres') ? 'postgresql' : target;
  return configure(prismaProvider, deps);
}

// Only run if executed directly
const isMain = process.argv[1].endsWith('configure-db.ts') || process.argv[1].endsWith('configure-db.js');
if (isMain && process.env.NODE_ENV !== 'test') {
  run(process.argv.slice(2));
}
