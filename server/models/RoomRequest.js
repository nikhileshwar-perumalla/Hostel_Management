const mongoose = require('mongoose');

const roomRequestSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  decisionBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  decisionDate: Date,
  notes: String
}, { timestamps: true });

module.exports = mongoose.model('RoomRequest', roomRequestSchema);
