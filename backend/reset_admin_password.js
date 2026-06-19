require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./src/db/pool');

(async () => {
  try {
    const hash = await bcrypt.hash('Admin@123', 12);
    const result = await pool.query(
      "UPDATE users SET password_hash = $1, role = 'ADMIN' WHERE email = $2 RETURNING id, email, role",
      [hash, 'admin@gamebazaar.com']
    );
    if (result.rows.length) {
      console.log('✅ Admin password reset:', result.rows[0]);
    } else {
      console.log('⚠️ Admin user not found');
    }
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
