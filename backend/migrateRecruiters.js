// Migration script to add missing fields to existing recruiters
// Usage (from the backend/ folder):
//   node migrateRecruiters.js

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const Recruiter = require('./src/models/Recruiter');

async function run() {
  await connectDB();

  try {
    // Get all recruiters without uniqueId
    const recruiters = await Recruiter.find({ uniqueId: { $exists: false } });

    console.log(`Found ${recruiters.length} recruiters to migrate...`);

    for (let i = 0; i < recruiters.length; i++) {
      const recruiter = recruiters[i];
      const year = new Date().getFullYear();
      const uniqueId = `REC-${year}-${String(i + 1).padStart(5, '0')}`;

      await Recruiter.findByIdAndUpdate(
        recruiter._id,
        {
          uniqueId,
          fullName: recruiter.fullName || 'N/A',
          phone: recruiter.phone || '',
          companyWebsite: recruiter.companyWebsite || '',
        },
        { new: true }
      );

      console.log(`✓ Updated recruiter ${i + 1}/${recruiters.length}: ${recruiter.email} -> ${uniqueId}`);
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
