// Dev-only seed for testing recruiter-to-candidate messaging.
// Run from backend/: npm run seed:message-test

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const Candidate = require('./src/models/Candidate');
const Recruiter = require('./src/models/Recruiter');
const Message = require('./src/models/Message');
const { hashPassword } = require('./src/utils/hashPassword');

const recruiterEmail = process.env.MESSAGE_TEST_RECRUITER_EMAIL || 'message.recruiter@test.com';
const recruiterPassword = process.env.MESSAGE_TEST_RECRUITER_PASSWORD || 'Test@12345';
const candidateEmail = process.env.MESSAGE_TEST_CANDIDATE_EMAIL || 'message.candidate@test.com';
const candidatePassword = process.env.MESSAGE_TEST_CANDIDATE_PASSWORD || 'Test@12345';

async function getOrCreateAccounts() {
  const passwordHash = await hashPassword(recruiterPassword);
  let recruiter = await Recruiter.findOne({ email: recruiterEmail });
  if (!recruiter) {
    const renewalDueDate = new Date();
    renewalDueDate.setFullYear(renewalDueDate.getFullYear() + 1);
    recruiter = await Recruiter.create({
      email: recruiterEmail,
      passwordHash,
      fullName: 'Message Test Recruiter',
      phone: '+91 9000000001',
      companyName: 'Message Test Company',
      accountStatus: 'active',
      renewalDueDate,
    });
  } else {
    recruiter.passwordHash = passwordHash;
    recruiter.accountStatus = 'active';
    await recruiter.save();
  }

  const candidateHash = await hashPassword(candidatePassword);
  let candidate = await Candidate.findOne({ email: candidateEmail });
  if (!candidate) {
    candidate = await Candidate.create({
      uniqueId: `MSG-TEST-${Date.now()}`,
      name: 'Message Test Candidate',
      email: candidateEmail,
      phone: '+91 9000000002',
      passwordHash: candidateHash,
      accountStatus: 'active',
      emailVerified: true,
      isVerified: true,
      renewalDueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
  } else {
    candidate.passwordHash = candidateHash;
    candidate.accountStatus = 'active';
    await candidate.save();
  }

  return { recruiter, candidate };
}

async function run() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed message test accounts in production.');
  }

  await connectDB();
  const { recruiter, candidate } = await getOrCreateAccounts();
  let message = await Message.findOne({ recruiter: recruiter._id, candidate: candidate._id });

  if (!message) {
    message = await Message.create({
      recruiter: recruiter._id,
      candidate: candidate._id,
      startedByRecruiter: true,
      sender: 'recruiter',
      text: 'Hi! We reviewed your application and would like to connect with you.',
    });
  }

  console.log('\nMessaging test accounts ready:');
  console.log({
    recruiter: { email: recruiterEmail, password: recruiterPassword },
    candidate: { uniqueId: candidate.uniqueId, email: candidateEmail, password: candidatePassword },
    conversationId: message._id.toString(),
  });
  console.log('\nLogin as recruiter, open Message, then login as candidate and open Messages.');
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Message test seed failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
