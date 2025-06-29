const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Chat = require('../models/chat.model');

router.get('/:email', async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.params.email });
    res.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:chatId', async (req, res) => {
  try {
    const chat = await Chat.findByIdAndDelete(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { participants, propertyId } = req.body;
    if (!participants || !Array.isArray(participants) || participants.length < 2) {
      return res.status(400).json({ error: 'Invalid participants' });
    }
    if (!propertyId) {
      return res.status(400).json({ error: 'Property ID is required' });
    }
    const chat = new Chat({ participants, propertyId, messages: [] });
    await chat.save();
    res.status(201).json(chat);
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json({ messages: chat.messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:chatId/message', async (req, res) => {
  try {
    const { sender, text } = req.body;
    if (!sender || !text) {
      return res.status(400).json({ error: 'Sender and text required' });
    }
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    chat.messages.push({ sender, text, createdAt: new Date(), read: false }); // Explicitly set read to false
    await chat.save();
    res.json(chat);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// New endpoint to mark messages as read
router.put('/:chatId/messages/read', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userEmail } = req.body; // The email of the user marking messages as read
    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required' });
    }
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    chat.messages.forEach(message => {
      if (message.sender !== userEmail && !message.read) {
        message.read = true; // Mark as read for the current user
      }
    });
    await chat.save();
    res.json({ message: 'Messages marked as read', chat });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;