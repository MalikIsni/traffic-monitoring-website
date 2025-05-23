const express = require('express');
const router = express.Router();
const TrafficData = require('../models/TrafficData');

// Get latest traffic data
router.get('/latest', async (req, res) => {
  try {
    const latestData = await TrafficData.findOne().sort({ timestamp: -1 });
    res.json(latestData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get historical data (last 24 hours)
router.get('/history', async (req, res) => {
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    
    const history = await TrafficData.find({
      timestamp: { $gte: oneDayAgo }
    }).sort({ timestamp: 1 });
    
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    
    const stats = await TrafficData.aggregate([
      { $match: { timestamp: { $gte: oneDayAgo } } },
      { $group: {
        _id: '$deteksi',
        count: { $sum: 1 },
        avgJarakCm: { $avg: '$jarakCm' }
      }}
    ]);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Manual control endpoint
router.post('/control', async (req, res) => {
  try {
    const { action, duration } = req.body;
    
    if (!action || !['extend', 'shorten', 'force_red', 'force_green', 'auto'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action parameter' });
    }
    
    // Create control message
    const controlMessage = {
      action,
      duration: duration || 0,
      timestamp: new Date()
    };
    
    // Publish to MQTT topic
    req.app.locals.mqttClient.publish(
      process.env.MQTT_TOPIC_CONTROL,
      JSON.stringify(controlMessage)
    );
    
    // Log the control action
    console.log(`Manual control: ${action}, duration: ${duration || 0}`);
    
    res.json({ success: true, message: 'Control signal sent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;