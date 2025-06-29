const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Property = require('../models/Property');
const { isAdmin } = require('../middleware/auth');

// Fetch all users
router.get('/auth/users', isAdmin, async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a user
router.delete('/auth/user/:email', isAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOneAndDelete({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user role
router.put('/auth/user/:email/role', isAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    const { role } = req.body;
    const user = await User.findOneAndUpdate({ email }, { role }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user status
router.put('/auth/user/:email/status', isAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    const { status } = req.body;
    const user = await User.findOneAndUpdate({ email }, { status }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update property status
router.put('/properties/:id/status', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const property = await Property.findByIdAndUpdate(id, { status }, { new: true });
    if (!property) return res.status(404).json({ error: 'Property not found' });
    res.json(property);
  } catch (error) {
    console.error('Error updating property status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;