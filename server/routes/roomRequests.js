const express = require('express');
const RoomRequest = require('../models/RoomRequest');
const Room = require('../models/Room');
const User = require('../models/User');
const Allocation = require('../models/Allocation');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Student creates a room request
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Only students can request rooms' });
    const { roomId, notes } = req.body;
    if (!roomId) return res.status(400).json({ message: 'roomId is required' });

    const room = await Room.findById(roomId);
    if (!room || !room.isActive) return res.status(404).json({ message: 'Room not found or inactive' });
    if (room.currentOccupancy >= room.capacity) return res.status(400).json({ message: 'Room is full' });

    // Student already has an active allocation
    const activeAllocation = await Allocation.findOne({ student: req.user._id, status: 'active' });
    if (activeAllocation) return res.status(400).json({ message: 'You already have a room allocated' });

    // Prevent duplicate pending request for same room
    const existingPending = await RoomRequest.findOne({ student: req.user._id, room: roomId, status: 'pending' });
    if (existingPending) return res.status(400).json({ message: 'You already have a pending request for this room' });

    const request = await RoomRequest.create({ student: req.user._id, room: roomId, notes });
    await request.populate('room', 'roomNumber floor roomType capacity currentOccupancy');
    res.status(201).json({ message: 'Request submitted', request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Student views own requests
router.get('/mine', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Access denied' });
    const requests = await RoomRequest.find({ student: req.user._id })
      .populate('room', 'roomNumber floor roomType capacity currentOccupancy')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: list all requests (filter by status optional)
router.get('/', adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = {};
    if (status) query.status = status;
    const requests = await RoomRequest.find(query)
      .populate('student', 'name email studentId')
      .populate('room', 'roomNumber floor roomType capacity currentOccupancy')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await RoomRequest.countDocuments(query);
    res.json({ requests, totalPages: Math.ceil(total / limit), currentPage: page, total });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: approve request (creates allocation)
router.patch('/:id/approve', adminAuth, async (req, res) => {
  try {
    const request = await RoomRequest.findById(req.params.id)
      .populate('student')
      .populate('room');
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ message: 'Request already processed' });

    const room = request.room;
    if (room.currentOccupancy >= room.capacity) {
      request.status = 'rejected';
      request.decisionBy = req.user._id;
      request.decisionDate = new Date();
      await request.save();
      return res.status(400).json({ message: 'Room is now full. Request auto-rejected.' });
    }

    const existingAllocation = await Allocation.findOne({ student: request.student._id, status: 'active' });
    if (existingAllocation) {
      request.status = 'rejected';
      request.decisionBy = req.user._id;
      request.decisionDate = new Date();
      await request.save();
      return res.status(400).json({ message: 'Student already has an active allocation. Request rejected.' });
    }

    // Create allocation
    const allocation = await Allocation.create({
      student: request.student._id,
      room: room._id,
      allocatedBy: req.user._id,
      startDate: new Date(),
      monthlyRent: room.monthlyRent,
      notes: 'Approved via request'
    });

    // Update room occupancy and residents
    room.currentOccupancy += 1;
    room.residents.push(request.student._id);
    await room.save();

    // Link student
    request.student.roomAllocation = room._id;
    await request.student.save();

    request.status = 'approved';
    request.decisionBy = req.user._id;
    request.decisionDate = new Date();
    await request.save();

    await allocation.populate([
      { path: 'student', select: 'name studentId email' },
  { path: 'room', select: 'roomNumber floor roomType capacity currentOccupancy amenities monthlyRent residents' },
      { path: 'allocatedBy', select: 'name' }
    ]);

    res.json({ message: 'Request approved and allocation created', allocation, request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: reject request
router.patch('/:id/reject', adminAuth, async (req, res) => {
  try {
    const { notes } = req.body;
    const request = await RoomRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ message: 'Request already processed' });

    request.status = 'rejected';
    request.decisionBy = req.user._id;
    request.decisionDate = new Date();
    if (notes) request.notes = notes;
    await request.save();

    res.json({ message: 'Request rejected', request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
