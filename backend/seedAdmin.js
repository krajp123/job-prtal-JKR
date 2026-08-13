require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const { createAdminAccount } = require('./src/controllers/auth/adminAuth.controller');
const Admin = require('./src/models/Admin');

async function run() {
  const [name, email, password, role] = process.argv.slice(2);

  if (!name || !email || !password) {
    console.error('Usage: node seedAdmin.js "Admin Name" "admin@example.com" "StrongPassword123!" [role]');
    process.exit(1);
  }

  await connectDB();

  const normalizedEmail = email.toLowerCase().trim();
  let admin = await Admin.findOne({ email: normalizedEmail });

  if (!admin) {
    admin = await createAdminAccount({
      name,
      email: normalizedEmail,
      password,
      role: role || 'admin',
    });
    console.log('Created new admin account.');
  } else {
    console.log('Admin account already exists for this email.');
  }

  console.log('\n--- Admin login credentials ---');
  console.log(`Name: ${name}`);
  console.log(`Email: ${normalizedEmail}`);
  console.log(`Password: ${password}`);
  console.log(`Role: ${admin.role}`);
  console.log('--------------------------------\n');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Failed to create admin account:', err.message || err);
  process.exit(1);
});
