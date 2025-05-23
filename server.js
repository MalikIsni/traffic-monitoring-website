const express = require('express');
const mongoose = require('mongoose');
const mqtt = require('mqtt');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import routes
const trafficRoutes = require('./server/routes/traffic');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// MQTT Client setup
const mqttClient = mqtt.connect(process.env.MQTT_BROKER);

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe(process.env.MQTT_TOPIC_STATUS);
});

// Import Traffic Data model
const TrafficData = require('./server/models/TrafficData');

// Handle MQTT messages
mqttClient.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log('Received MQTT data:', data);
    
    // Save data to database
    const trafficData = new TrafficData({
      lampuStatus: data.lampu,
      sisaDetik: data.sisa_detik,
      jarakCm: data.jarak_cm,
      deteksi: data.deteksi,
      timestamp: new Date()
    });
    
    await trafficData.save();
    
    // Emit data to connected clients via Socket.IO
    io.emit('trafficUpdate', data);
    
    // Adjust green light duration based on vehicle density
    if (data.deteksi === 'Padat' && data.lampu === 'Hijau') {
      // Extend green light duration
      const controlMessage = JSON.stringify({
        extend_green: true,
        duration: 10 // extend by 10 seconds
      });
      mqttClient.publish(process.env.MQTT_TOPIC_CONTROL, controlMessage);
    }
  } catch (error) {
    console.error('Error processing MQTT message:', error);
  }
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Make MQTT client available to routes
app.locals.mqttClient = mqttClient;

// Routes
app.use('/api/traffic', trafficRoutes);

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});