const mongoose = require('mongoose');
const uri = 'mongodb+srv://kishan8105:Qwerty8789@job-portal2.bszejcg.mongodb.net/?appName=job-portal2';
(async () => {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
    console.log('connected');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
