import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const target = process.argv[2];

if (!target || !['sqlite', 'mysql', 'postgresql', 'postgres'].includes(target)) {
  console.error('Usage: ts-node scripts/configure-db.ts [sqlite|mysql|postgresql]');
  process.exit(1);
}

// Normalize provider name for Prisma
const prismaProvider = (target === 'postgres') ? 'postgresql' : target;

const ROOT_DIR = path.join(__dirname, '..');
const PRISMA_DIR = path.join(ROOT_DIR, 'prisma');
const SCHEMA_FILE = path.join(PRISMA_DIR, 'schema.prisma');

async function configure() {
  console.log(`\x1b[36mConsolidating and Configuring Heimdall for ${prismaProvider.toUpperCase()}...\x1b[0m`);

  try {
    if (!fs.existsSync(SCHEMA_FILE)) {
      throw new Error('schema.prisma not found. Please ensure the file exists.');
    }

    let content = fs.readFileSync(SCHEMA_FILE, 'utf8');

    // 1. Repair Generator (Ensure it's always prisma-client-js)
    console.log('Ensuring generator provider is correct...');
    content = content.replace(/generator\s+client\s+{[\s\S]*?}/, (match) => {
      return match.replace(/provider\s*=\s*"[^"]*"/, 'provider = "prisma-client-js"');
    });

    // 2. Change Datasource Provider
    console.log(`Updating datasource provider to ${prismaProvider}...`);
    content = content.replace(/datasource\s+db\s+{[\s\S]*?}/, (match) => {
      return match.replace(/provider\s*=\s*"[^"]*"/, `provider = "${prismaProvider}"`);
    });

    // 3. Clear existing native attributes to start fresh
    content = content.replace(/\s*@db\.[a-zA-Z0-9()]*/g, '');

    // 4. Inject Provider-specific attributes
    if (prismaProvider === 'mysql') {
      console.log('Injecting MySQL native type attributes (LongText, VarChar)...');
      
      const longTextFields = ['headers', 'body', 'response'];
      longTextFields.forEach(field => {
        const fieldRegex = new RegExp(`(\\b${field}\\s+String\\??)`, 'g');
        content = content.replace(fieldRegex, `$1 @db.LongText`);
      });

      content = content.replace(/(\burl\s+String\??)/g, `$1 @db.VarChar(1000)`);
    } else if (prismaProvider === 'postgresql') {
      console.log('Injecting PostgreSQL optimizations (optional @db.Text)...');
      // In Postgres, String defaults to text, but we can be explicit if needed.
      // We'll leave it clean as Postgres 'text' handles up to 1GB natively.
    }

    // 5. Write back to schema.prisma
    fs.writeFileSync(SCHEMA_FILE, content);

    // 6. Regenerate Prisma Client
    console.log('Regenerating Prisma Client...');
    execSync('npx prisma generate', { stdio: 'inherit', cwd: ROOT_DIR });

    console.log('\n\x1b[32mSUCCESS: Database consolidated and configured.\x1b[0m');
    console.log('\x1b[34mNOTE: schema.prisma is now your single source of truth.\x1b[0m');
    
    if (prismaProvider === 'mysql' || prismaProvider === 'postgresql') {
      console.log('\x1b[33m\nNEXT STEPS:\x1b[0m');
      console.log(`1. Update DATABASE_URL in .env to your ${prismaProvider.toUpperCase()} connection string.`);
      console.log('2. Run: npx prisma migrate dev (to sync schema and create tables)');
    } else {
      console.log('\x1b[33m\nNEXT STEPS:\x1b[0m');
      console.log('1. Ensure DATABASE_URL in .env is file:./dev.db');
      console.log('2. Run: npx prisma db push');
    }
  } catch (err: any) {
    console.error(`\x1b[31mError during configuration: ${err.message}\x1b[0m`);
    process.exit(1);
  }
}

configure();
