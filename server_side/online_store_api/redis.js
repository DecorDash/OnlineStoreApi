const redis = require('redis');
const { promisify } = require('util');

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    tls: process.env.NODE_ENV === 'production',
    rejectUnauthorized: false
  }
});

client.on('error', (err) => console.error('Redis Client Error', err));
client.connect();

// Promisify methods
const getAsync = promisify(client.get).bind(client);
const setExAsync = promisify(client.setEx).bind(client);
const delAsync = promisify(client.del).bind(client);

module.exports = {
  get: getAsync,
  setEx: setExAsync,
  del: delAsync
};
