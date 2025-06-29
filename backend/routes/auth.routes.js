const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, phone } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hash = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hash, phone });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Error during signup:', err.message, err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Signin
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid password' });

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({ message: 'Sign in successful', user: { email: user.email, role: user.role, phone: user.phone } });
  } catch (err) {
    console.error('Error during signin:', err.message, err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Forgot Password (Mock)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Email not found' });

    console.log(`Mock email sent to ${email} with password: ${user.password}`);
    res.status(200).json({ message: 'Password reset email sent' });
  } catch (err) {
    console.error('Error during forgot-password:', err.message, err.stack);
    res.status(500).json({ message: 'Failed to send reset email', error: err.message });
  }
});

// Get User Details
router.get('/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email }, { email: 1, phone: 1, _id: 0 });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err.message, err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Temporary endpoint to create an admin user (remove after use)
router.post('/create-admin', async (req, res) => {
  try {
    const { email, password, phone } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hash = await bcrypt.hash(password, 10);
    const user = new User({ 
      email, 
      password: hash, 
      phone, 
      role: 'admin', 
      firstName: 'Admin', 
      lastName: 'User', 
      address: { street: '123 Admin St', city: 'Admin City', state: 'Admin State', zip: '12345', country: 'Admin Country' },
      preferences: { notifications: true },
      profileImage: ''
    });
    await user.save();
    res.status(201).json({ message: 'Admin user created successfully' });
  } catch (err) {
    console.error('Error creating admin user:', err.message, err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;