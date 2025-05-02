// ws-server/index.js

const WebSocket = require('ws');
const Redis = require('ioredis');

// create Redis client for pub & sub
const redisSub = new Redis(process.env.REDIS_URL);
const redisPub = new Redis(process.env.REDIS_URL);

// start WebSocket server
const wss = new WebSocket.Server({ port: 8080 }, () => {
  console.log("🛰️ WebSocket server listening on ws://0.0.0.0:8080");
});

// when Redis publishes a message on "agent.incoming", forward it to all WS clients
redisSub.subscribe("agent.incoming", (err) => {
  if (err) console.error("🔴 Redis subscribe failed:", err);
});
redisSub.on("message", (channel, message) => {
  // broadcast to every connected client
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
});

// when a client connects…
wss.on("connection", (ws) => {
  console.log("➡️  Client connected");

  ws.on("message", (msg) => {
    try {
      // we assume msg is already a valid JSON string per our schema
      // republish it into Redis so other agents pick it up
      redisPub.publish("agent.incoming", msg);
    } catch (e) {
      console.error("🔴 Failed to publish message:", e);
    }
  });

  ws.on("close", () => {
    console.log("⬅️  Client disconnected");
  });
});
