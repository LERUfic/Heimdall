import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const target = process.argv[2];

if (!target || !['sqlite', 'mysql'].includes(target)) {
  console.error('Usage: ts-node scripts/configure-db.ts [sqlite|mysql]');
  process.exit(1);
}

const ROOT_DIR = path.join(__dirname, '..');
const PRISMA_DIR = path.join(ROOT_DIR, 'prisma');
const SCHEMA_FILE = path.join(PRISMA_DIR, 'schema.prisma');

async function configure() {
  console.log(`\x1b[36mConsolidating and Configuring Heimdall for ${target.toUpperCase()}...\x1b[0m`);

  try {
    if (!fs.existsSync(SCHEMA_FILE)) {
      throw new Error('schema.prisma not found. Please ensure the file exists.');
    }

    let content = fs.readFileSync(SCHEMA_FILE, 'utf8');

    // 1. Change Provider
    console.log(`Updating provider to ${target}...`);
    content = content.replace(/provider\s*=\s*"[^"]*"/, `provider = "${target}"`);

    // 2. Clear existing native attributes to start fresh
    content = content.replace(/\s*@db\.[a-zA-Z0-9()]*/g, '');

    // 3. Inject MySQL specific attributes if target is mysql
    if (target === 'mysql') {
      console.log('Injecting MySQL native type attributes (LongText, VarChar)...');
      
      // Inject @db.LongText for headers, body, response
      const longTextFields = ['headers', 'body', 'response'];
      longTextFields.forEach(field => {
        // Regex looks for field name, then type (String?), then optional space/attributes
        const fieldRegex = new RegExp(`(\\b${field}\\s+String\\??)`, 'g');
        content = content.replace(fieldRegex, `$1 @db.LongText`);
      });

      // Inject @db.VarChar(1000) for url
      content = content.replace(/(\burl\s+String\??)/g, `$1 @db.VarChar(1000)`);
    }

    // 4. Write back to schema.prisma
    fs.writeFileSync(SCHEMA_FILE, content);

    // 5. Regenerate Prisma Client
    console.log('Regenerating Prisma Client...');
    execSync('npx prisma generate', { stdio: 'inherit', cwd: ROOT_DIR });

    console.log('\n\x1b[32mSUCCESS: Database consolidated and configured.\x1b[0m');
    console.log('\x1b[34mNOTE: schema.prisma is now your single source of truth.\x1b[0m');
    
    if (target === 'mysql') {
      console.log('\x1b[33m\nNEXT STEPS:\x1b[0m');
      console.log('1. Update DATABASE_URL in .env to your MySQL connection string.');
      console.log('2. Run: npx prisma migrate dev (to sync optimized types)');
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
