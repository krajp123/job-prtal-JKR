const mongoose = require('mongoose');
const dns = require('dns');

const MONGO_URI = process.env.MONGO_URI;

async function startMemoryServer() {
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log(`MongoDB in-memory server started: ${conn.connection.host}`);
  } catch (err) {
    console.error('In-memory MongoDB startup failed:', err.message);
    process.exit(1);
  }
}

async function connectDB() {
  try {
    if (!MONGO_URI) {
      throw new Error('MONGO_URI is not configured');
    }

    const builtInServers = dns.getServers();
    if (builtInServers.length === 1 && builtInServers[0] === '127.0.0.1') {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
      console.warn('Node DNS was using localhost. Forced DNS to 8.8.8.8, 1.1.1.1 for Atlas SRV resolution.');
    }

    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 20000,
      connectTimeoutMS: 20000,
      retryWrites: true,
      w: 'majority',
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);

    if (process.env.NODE_ENV !== 'production') {
      console.log('Falling back to in-memory MongoDB for local development.');
      await startMemoryServer();
      return;
    }

    process.exit(1);
  }
}

module.exports = connectDB;
