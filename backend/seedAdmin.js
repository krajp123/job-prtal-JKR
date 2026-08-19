require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const { createAdminAccount } = require('./src/controllers/auth/adminAuth.controller');
const { hashPassword } = require('./src/utils/hashPassword');
const Admin = require('./src/models/Admin');

async function run() {
  const [name, email, password, role] = process.argv.slice(2);

  if (!name || !email || !password) {
    console.error('Usage: node seedAdmin.js "Admin Name" "admin@example.com" "StrongPassword123!" [role]');
    process.exit(1);
  }

  if (role && !['admin', 'superadmin'].includes(role)) {
    console.error('Role must be either "admin" or "superadmin".');
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
    admin.passwordHash = await hashPassword(password);
    admin.isActive = true;
    admin.failedLoginAttempts = 0;
    admin.lockUntil = undefined;
    if (role) admin.role = role;
    await admin.save();
    console.log('Existing admin account password and access settings updated.');
  }

  console.log('\n--- Admin login credentials ---');
  console.log(`Name: ${name}`);
  console.log(`Email: ${normalizedEmail}`);
  console.log(`Role: ${admin.role}`);
  console.log('--------------------------------\n');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Failed to create admin account:', err.message || err);
  process.exit(1);
});
