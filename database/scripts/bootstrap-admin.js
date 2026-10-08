import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;
const dbUrl =
  process.env.NODE_ENV === 'test'
    ? process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres123@127.0.0.1:5432/nirware_next_test'
    : process.env.DATABASE_URL || 'postgresql://postgres:postgres123@127.0.0.1:5432/nirware_next';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    username: process.env.ADMIN_USERNAME || null,
    password: process.env.ADMIN_PASSWORD || null,
    name: process.env.ADMIN_NAME || null,
    phone: process.env.ADMIN_PHONE || null,
    role: process.env.ADMIN_ROLE || 'SUPER_ADMIN',
    force: args.includes('--force'),
    json: args.includes('--json'),
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--username' && args[i + 1]) options.username = args[++i];
    else if (arg === '--password' && args[i + 1]) options.password = args[++i];
    else if ((arg === '--name' || arg === '--fullname') && args[i + 1]) options.name = args[++i];
    else if (arg === '--phone' && args[i + 1]) options.phone = args[++i];
    else if (arg === '--role' && args[i + 1]) options.role = args[++i];
  }

  return options;
}

function generateSecurePassword(length = 16) {
  // Generate high-entropy alphanumeric string
  const bytes = crypto.randomBytes(length);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

export async function bootstrapAdmin(opts = {}) {
  const options = { ...parseArgs(), ...opts };
  const pool = new Pool({ connectionString: dbUrl });
  const isProduction = process.env.NODE_ENV === 'production';

  try {
    const client = await pool.connect();
    try {
      // 1. Check if user already exists
      const username = (options.username || 'admin').trim().toLowerCase();
      const existingUser = await client.query('SELECT id, username, role, is_active FROM users WHERE username = $1', [username]);

      if (existingUser.rows.length > 0 && !options.force) {
        if (!options.json) {
          console.log(`[NIRWARE-BOOTSTRAP] کاربر '${username}' در حال حاضر با نقش ${existingUser.rows[0].role} در دیتابیس وجود دارد.`);
          console.log(`[NIRWARE-BOOTSTRAP] جهت تغییر یا بازیابی رمز عبور، این دستور را با فلگ --force اجرا کنید.`);
        } else {
          console.log(JSON.stringify({ success: false, reason: 'USER_ALREADY_EXISTS', username, role: existingUser.rows[0].role }));
        }
        return { success: false, reason: 'USER_ALREADY_EXISTS', user: existingUser.rows[0] };
      }

      // 2. Resolve parameters (Interactive prompt if TTY and missing)
      let finalName = options.name || 'مدیر ارشد سامانه';
      let finalPhone = options.phone || '09120000000';
      let finalPassword = options.password;
      let generated = false;

      if (!finalPassword && process.stdin.isTTY && !process.env.CI) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        try {
          console.log('\n--- راه‌اندازی اولیه حساب مدیر سیستم (NIRWARE NEXT) ---');
          if (!options.name) {
            const enteredName = await rl.question(`نام و نام خانوادگی مدیر [${finalName}]: `);
            if (enteredName.trim()) finalName = enteredName.trim();
          }
          if (!options.phone) {
            const enteredPhone = await rl.question(`شماره تلفن همراه [${finalPhone}]: `);
            if (enteredPhone.trim()) finalPhone = enteredPhone.trim();
          }
          const enteredPassword = await rl.question(`کلمه عبور (برای تولید خودکار امن خالی بگذارید): `);
          if (enteredPassword.trim()) {
            finalPassword = enteredPassword.trim();
          }
        } finally {
          rl.close();
        }
      }

      // If still no password, generate cryptographically random password
      if (!finalPassword) {
        finalPassword = generateSecurePassword(16);
        generated = true;
      }

      // 3. Password Strength Validation
      if (finalPassword.length < 8) {
        throw new Error('کلمه عبور باید حداقل ۸ کاراکتر باشد.');
      }
      if (isProduction && ['password', 'password123', 'admin', '12345678'].includes(finalPassword.toLowerCase()) && !options.force) {
        throw new Error('استفاده از رمزهای عبور ساده و پیش‌فرض در محیط Production مجاز نمی‌باشد.');
      }

      // 4. Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(finalPassword, salt);
      const role = options.role.toUpperCase();

      // 5. Insert or Update inside transaction
      await client.query('BEGIN');
      const upsertResult = await client.query(
        `INSERT INTO users (id, username, password_hash, full_name, phone, role, is_active)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true)
         ON CONFLICT (username) DO UPDATE
           SET password_hash = EXCLUDED.password_hash,
               full_name = EXCLUDED.full_name,
               phone = EXCLUDED.phone,
               role = EXCLUDED.role,
               is_active = true,
               updated_at = CURRENT_TIMESTAMP
         RETURNING id, username, full_name, phone, role, is_active, created_at`,
        [username, passwordHash, finalName, finalPhone, role]
      );

      const user = upsertResult.rows[0];

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
         VALUES (gen_random_uuid(), $1, 'BOOTSTRAP_ADMIN', 'User', $2, $3)`,
        [user.id, String(user.id), JSON.stringify({ username: user.username, role: user.role, generatedPassword: generated })]
      );

      await client.query('COMMIT');

      if (options.json) {
        console.log(
          JSON.stringify({
            success: true,
            user: {
              id: user.id,
              username: user.username,
              fullName: user.full_name,
              phone: user.phone,
              role: user.role,
            },
            password: finalPassword,
            generated,
          })
        );
      } else {
        console.log('\n========================================================================');
        console.log('       ✅ حساب کاربری مدیر سامانه با موفقیت راه‌اندازی گردید!             ');
        console.log('========================================================================');
        console.log(`👤 نام کاربری:   ${user.username}`);
        console.log(`🔑 کلمه عبور:    ${finalPassword} ${generated ? '(تولید شده به صورت امن)' : ''}`);
        console.log(`👔 نقش سازمانی:  ${user.role}`);
        console.log(`🏷️ نام کامل:     ${user.full_name}`);
        console.log(`📱 شماره تماس:   ${user.phone}`);
        console.log('------------------------------------------------------------------------');
        console.log('📌 اکنون می‌توانید در سامانه وب، اپلیکیشن موبایل، یا API با این اطلاعات وارد شوید.');
        if (generated) {
          console.log('⚠️ لطفاً این کلمه عبور را در یک مکان امن (مانند Password Manager) ذخیره فرمایید.');
        }
        console.log('========================================================================\n');
      }

      return {
        success: true,
        user,
        password: finalPassword,
        generated,
      };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

// Run directly from CLI
if (process.argv[1] && process.argv[1].endsWith('bootstrap-admin.js')) {
  bootstrapAdmin().catch((err) => {
    console.error('[NIRWARE-BOOTSTRAP] FATAL ERROR:', err.message);
    process.exit(1);
  });
}
