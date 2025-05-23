const mongoose = require('mongoose');

const trafficDataSchema = new mongoose.Schema({
  lampuStatus: {
    type: String,
    enum: ['Merah', 'Kuning', 'Hijau'],
    required: true
  },
  sisaDetik: {
    type: Number,
    required: true
  },
  jarakCm: {
    type: Number,
    required: true
  },
  deteksi: {
    type: String,
    enum: ['Kosong', 'Sepi', 'Normal', 'Padat', 'Sangat Padat'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('TrafficData', trafficDataSchema);