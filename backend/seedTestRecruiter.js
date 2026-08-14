// Run manually, once, to create a TEST recruiter account for local frontend
// testing — real login, no payment/OTP flow needed (dev only, never use in prod).
//
// Usage (from the backend/ folder):
//   node seedTestRecruiter.js "test@example.com" "password123" "Demo Corp"

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const Recruiter = require('./src/models/Recruiter');
const { hashPassword } = require('./src/utils/hashPassword');

async function run() {
  const [email, password, companyName] = process.argv.slice(2);

  if (!email || !password || !companyName) {
    console.error('Usage: node seedTestRecruiter.js "<email>" "<password>" "<companyName>"');
    process.exit(1);
  }

  await connectDB();

  let recruiter = await Recruiter.findOne({ email });

  if (!recruiter) {
    const passwordHash = await hashPassword(password);
    const renewalDueDate = new Date();
    renewalDueDate.setFullYear(renewalDueDate.getFullYear() + 1);

    recruiter = await Recruiter.create({
      email,
      passwordHash,
      fullName: 'Test Recruiter',
      phone: '+91 9999999999',
      companyName,
      companyWebsite: 'https://example.com',
      languages: [],
      expertiseTags: [],
      accountStatus: 'active',
      renewalDueDate,
    });

    console.log('Created new test recruiter.');
  } else {
    console.log('Test recruiter already existed, reusing it.');
  }

  console.log('\n--- Login with these credentials on your site ---');
  console.log({ email, password });

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Failed to create test recruiter:', err.message);
  process.exit(1);
});