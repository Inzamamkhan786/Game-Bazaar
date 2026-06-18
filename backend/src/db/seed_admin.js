require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./pool');

const ADMIN_EMAIL = 'admin@gamebazaar.com';
const ADMIN_PASSWORD = 'Admin@123';
const ADMIN_NAME = 'Admin';
const ADMIN_WHATSAPP = '919999999999';

async function seedAdmin() {
  const client = await pool.connect();
  try {
    // Check if admin already exists
    const { rows: existing } = await client.query(
      'SELECT id, role FROM users WHERE email = $1',
      [ADMIN_EMAIL]
    );

    if (existing.length > 0) {
      if (existing[0].role === 'ADMIN') {
        console.log('✅ Admin already exists:', ADMIN_EMAIL);
      } else {
        // Promote existing user to ADMIN
        await client.query("UPDATE users SET role = 'ADMIN' WHERE email = $1", [ADMIN_EMAIL]);
        console.log('✅ Promoted existing user to ADMIN:', ADMIN_EMAIL);
      }
      return;
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const { rows } = await client.query(
      `INSERT INTO users (name, email, whatsapp_number, password_hash, role)
       VALUES ($1, $2, $3, $4, 'ADMIN')
       RETURNING id, name, email, role`,
      [ADMIN_NAME, ADMIN_EMAIL, ADMIN_WHATSAPP, passwordHash]
    );

    console.log('✅ Admin user created successfully!');
    console.log('   Email:    ', ADMIN_EMAIL);
    console.log('   Password: ', ADMIN_PASSWORD);
    console.log('   Role:     ', rows[0].role);
    console.log('');
    console.log('🔐 Login at: http://localhost:5173/login');
  } catch (err) {
    console.error('❌ Error seeding admin:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedAdmin();
