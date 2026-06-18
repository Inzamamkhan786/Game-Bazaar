require('dotenv').config();
const { pool } = require('./pool');

const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address. Example: node src/db/promote_admin.js user@example.com');
  process.exit(1);
}

async function run() {
  try {
    const { rows } = await pool.query(
      "UPDATE users SET role = 'ADMIN' WHERE email = $1 RETURNING id, name, email, role",
      [email]
    );
    if (rows.length === 0) {
      console.error(`No user found with email: ${email}`);
    } else {
      console.log('User promoted to ADMIN successfully:', rows[0]);
    }
  } catch (err) {
    console.error('Error promoting user:', err);
  } finally {
    await pool.end();
  }
}

run();
