const redis = require('redis');

// Create Redis client
const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err) => console.error('Redis Client Error', err));
client.connect();

// Promisified methods
const getAsync = (key) => client.get(key);
const setExAsync = (key, ttl, value) => client.setEx(key, ttl, value);
const delAsync = (key) => client.del(key);

module.exports = {
  get: getAsync,
  setEx: setExAsync,
  del: delAsync
};
