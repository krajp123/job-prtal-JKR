const mongoose = require('mongoose');
const uri = 'mongodb://kishan8105:Qwerty8789@ac-0hbqchx-shard-00-00.bszejcg.mongodb.net:27017,ac-0hbqchx-shard-00-01.bszejcg.mongodb.net:27017,ac-0hbqchx-shard-00-02.bszejcg.mongodb.net:27017/?tls=true&authSource=admin&retryWrites=true&w=majority';
(async () => {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });
    console.log('connected');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
