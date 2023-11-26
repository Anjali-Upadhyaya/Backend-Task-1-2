// const express = require('express');
// const bodyParser = require('body-parser');
// const redis = require('redis');
// const jwt = require('jsonwebtoken');
// const mqtt = require('mqtt');

// const app = express();
// let client; // Change from const to let
// const mqttClient = mqtt.connect('mqtt://localhost');

// app.use(bodyParser.json());

// // Event listeners for Redis client connection
// client = redis.createClient();

// client.on('connect', () => {
//   console.log('Connected to Redis');
// });

// client.on('error', (err) => {
//   console.error('Redis Error:', err);
// });

// // Helper function to handle Redis operations
// const withRedisClient = (callback) => {
//   if (client && client.connected) {
//     callback(client);
//   } else {
//     console.error('Redis client is not connected');
//   }
// };

// // Endpoint to generate a token
// app.post('/generate-token', (req, res) => {
//   const { email } = req.body;

//   if (!email || typeof email !== 'string' || !email.includes('@')) {
//     return res.status(400).json({ error: 'Invalid email format' });
//   }

//   const token = jwt.sign({ email }, 'secret', { expiresIn: '5m' });

//   res.json({ token });
// });

// // Middleware to verify the token
// const verifyToken = (req, res, next) => {
//   const authorizationHeader = req.headers.authorization;

//   if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
//     return res.status(401).json({ error: 'Unauthorized: No token provided' });
//   }

//   const token = authorizationHeader.split(' ')[1]; // Extract the token part

//   console.log('Received Token:', token);

//   jwt.verify(token, 'secret', (err, decoded) => {
//     if (err) {
//       if (err.name === 'TokenExpiredError') {
//         return res.status(401).json({ error: 'Unauthorized: Token has expired' });
//       }

//       console.error('Token Verification Error:', err);
//       return res.status(401).json({ error: 'Unauthorized: Invalid token' });
//     }

//     req.email = decoded.email;
//     next();
//   });
// };

// // Endpoint to get the latest data from Redis
// app.get('/get-data', verifyToken, (req, res) => {
//   console.log('Attempting to get data from Redis for email:', req.email);

//   // Ensure that the Redis client is not closed prematurely
//   withRedisClient((redisClient) => {
//     redisClient.get(req.email, (err, data) => {
//       if (err) {
//         console.error('Redis GET Error:', err);
//         return res.status(500).json({ error: 'Internal Server Error' });
//       }

//       if (!data) {
//         console.log('No data found in Redis for email:', req.email);
//         return res.status(404).json({ error: 'No data found' });
//       }

//       res.json({ speed: JSON.parse(data).speed });
//     });
//   });
// });



// // Start the server
// const PORT = 4000;
// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });


const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const mqtt = require('mqtt');

const app = express();
const client = redis.createClient();
const mqttClient = mqtt.connect('mqtt://localhost');

app.use(bodyParser.json());

// Event listeners for Redis client connection
client.on('connect', () => {
  console.log('Connected to Redis');
});

client.on('error', (err) => {
  console.error('Redis Error:', err);
});

// Endpoint to generate a token
app.post('/generate-token', (req, res) => {
  console.log('Received request body:', req.body);

  const { email } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const token = jwt.sign({ email }, 'secret', { expiresIn: '5m' });

  res.json({ token });
});

// Middleware to verify the token
const verifyToken = (req, res, next) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authorizationHeader.split(' ')[1]; // Extract the token part

  console.log('Received Token:', token);

  jwt.verify(token, 'secret', (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Unauthorized: Token has expired' });
      }

      console.error('Token Verification Error:', err);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    req.email = decoded.email;
    next();
  });
};

// Endpoint to get the latest data from Redis
app.get('/get-data', verifyToken, (req, res) => {
  console.log('Attempting to get data from Redis for email:', req.email);
  
  // Ensure that the Redis client is not closed prematurely
  if (client.connected) {
    client.get(req.email, (err, data) => {
      if (err) {
        console.error('Redis GET Error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      if (!data) {
        console.log('No data found in Redis for email:', req.email);
        return res.status(404).json({ error: 'No data found' });
      }

      res.json({ speed: JSON.parse(data).speed });
    });
  } else {
    console.error('Redis client is not connected');
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// MQTT Subscribe to receive data
mqttClient.on('connect', () => {
  console.log('Connected to MQTT');
  mqttClient.subscribe('mqtt_data');
});

mqttClient.on('message', (topic, message) => {
  // Ensure Redis client is connected before processing the message
  if (client.connected) {
    const data = JSON.parse(message.toString());
    client.set(data.email, JSON.stringify(data));
    console.log('Data stored in Redis:', data);
  } else {
    console.error('Redis client is not connected');
  }
});

// Start the server
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
