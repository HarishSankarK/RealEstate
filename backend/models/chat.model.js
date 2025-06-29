const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true }, // typically email
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false } // Added read field with default false
});

const chatSchema = new mongoose.Schema({
  participants: [String], // ["user1@example.com", "agent1@example.com"]
  propertyId: String, // Added propertyId to associate chat with a property
  messages: [messageSchema]
});

module.exports = mongoose.model('Chat', chatSchema);