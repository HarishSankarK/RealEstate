const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zip: { type: String, required: true },
  country: { type: String, required: true }
});

const preferencesSchema = new mongoose.Schema({
  notifications: { type: Boolean, default: true }
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, default: 'user', enum: ['user', 'admin'] },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  address: { type: addressSchema, default: () => ({}) },
  preferences: { type: preferencesSchema, default: () => ({}) },
  profileImage: { type: String, default: '' },
  lastLogin: { type: Date }, // Added lastLogin
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }, // Added status
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);  