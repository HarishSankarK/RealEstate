const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const authRoutes = require('./routes/auth.routes');
const propertyRoutes = require('./routes/property.routes');
const chatRoutes = require('./routes/chat.routes');
const adminRoutes = require('./routes/admin.routes');
const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:4200', credentials: true }));
app.use(express.json({ limit: '50mb' })); // Increase limit to 50MB for Base64 strings
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'harishsankar133@gmail.com',
    pass: 'tvfs ecer otax vltv' // App Password for Gmail
  }
});

// Verify Nodemailer configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Nodemailer configuration error:', error);
  } else {
    console.log('Nodemailer configured successfully, ready to send emails');
  }
});

// Models Loading
let User, Property;

const loadModels = () => {
  try {
    User = require('./models/User');
    console.log('User model loaded successfully');
  } catch (error) {
    console.error('Failed to load User model:', error);
  }

  try {
    Property = require('./models/Property');
    console.log('Property model loaded successfully');
  } catch (error) {
    console.error('Failed to load Property model:', error);
  }
};

loadModels(); // Load models initially

// MongoDB Connection
mongoose.connect('mongodb://localhost/real-estate', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected successfully');
  // Reload models after successful connection to ensure they are valid
  loadModels();
}).catch(err => console.error('MongoDB connection error:', err));

// In-Memory OTP Store
const otpStore = new Map();
const propertySchema = new mongoose.Schema({
  title: String,
  price: Number,
  location: String,
  category: String,
  image: String,
  bedrooms: Number,
  bathrooms: Number,
  area: Number,
  availability: String,
  postedByEmail: String,
  viewCount: { type: Number, default: 0 }
});

// PUT /api/properties/:id - Update a property
app.put('/api/properties/:id', async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.json(property);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update property', error });
  }
});

// Signup Endpoint
app.post('/api/auth/signup', async (req, res) => {
  const userData = req.body;
  console.log('[Signup] Received signup request:', JSON.stringify(userData, null, 2));

  if (!User) {
    console.error('[Signup] User model not available');
    return res.status(500).json({ message: 'Server configuration error: User model not loaded' });
  }

  try {
    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'password', 'phone', 'address'];
    const missingFields = requiredFields.filter(field => !userData[field]);
    if (missingFields.length > 0) {
      console.log('[Signup] Missing required fields:', missingFields);
      return res.status(400).json({ message: `Missing required fields: ${missingFields.join(', ')}` });
    }

    // Validate address subfields
    if (!userData.address || !userData.address.street || !userData.address.city || !userData.address.state || !userData.address.zip || !userData.address.country) {
      console.log('[Signup] Incomplete address data:', userData.address);
      return res.status(400).json({ message: 'All address fields are required' });
    }

    // Check if email exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      console.log(`[Signup] Email already exists: ${userData.email}`);
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    console.log(`[Signup] Password hashed for ${userData.email}`);

    // Create new user
    const newUser = new User({
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      password: hashedPassword,
      phone: userData.phone,
      role: userData.role || 'user',
      address: {
        street: userData.address.street,
        city: userData.address.city,
        state: userData.address.state,
        zip: userData.address.zip,
        country: userData.address.country
      },
      preferences: {
        notifications: userData.preferences?.notifications ?? true
      },
      profileImage: '' // Initialize profileImage as empty
    });

    await newUser.save();
    console.log(`[Signup] User created successfully: ${userData.email}`, JSON.stringify(newUser, null, 2));
    res.json({ message: 'Sign up successful' });
  } catch (error) {
    console.error(`[Signup] Error processing signup for ${userData.email}:`, error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to sign up' });
  }
});

// Get User by Email
app.get('/api/auth/user/:email', async (req, res) => {
  const { email } = req.params;
  console.log(`[Get User] Fetching details for email: ${email}`);
  try {
    if (!User) {
      console.error('[Get User] User model not available');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    const user = await User.findOne({ email }).select('-password');
    if (!user) {
      console.log(`[Get User] User not found: ${email}`);
      return res.status(404).json({ message: 'User not found' });
    }
    console.log(`[Get User] User found: ${email}`, JSON.stringify(user, null, 2));
    res.json(user);
  } catch (error) {
    console.error(`[Get User] Error fetching user ${email}:`, error);
    res.status(500).json({ message: 'Failed to fetch user details' });
  }
});

// Update User Profile (with Base64 image)
app.put('/api/auth/user/:email', async (req, res) => {
  const { email } = req.params;
  const { firstName, lastName, phone, address, preferences, profileImage } = req.body;
  console.log(`[Update User] Updating profile for email: ${email}`);

  if (!User) {
    console.error('[Update User] User model not available');
    return res.status(500).json({ message: 'Server configuration error: User model not loaded' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[Update User] User not found: ${email}`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user fields
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.phone = phone || user.phone;
    user.address = address ? {
      street: address.street || user.address.street,
      city: address.city || user.address.city,
      state: address.state || user.address.state,
      zip: address.zip || user.address.zip,
      country: address.country || user.address.country
    } : user.address;
    user.preferences = preferences ? {
      notifications: preferences.notifications === 'true' || preferences.notifications === true
    } : user.preferences;

    // Store Base64 image if provided
    if (profileImage) {
      if (profileImage.startsWith('data:image/')) {
        // Estimate Base64 size in bytes (excluding the "data:image/..." prefix)
        const base64Data = profileImage.split(',')[1] || profileImage;
        const approximateSize = (base64Data.length * 3) / 4; // Base64 to bytes approximation
        if (approximateSize > 10 * 1024 * 1024) { // 10MB limit
          console.log(`[Update User] Image size exceeds 10MB for ${email}`);
          return res.status(400).json({ message: 'Image size must be less than 10MB' });
        }
        user.profileImage = profileImage;
        console.log(`[Update User] Profile image updated for ${email}`);
      } else {
        console.log(`[Update User] Invalid image format for ${email}`);
        return res.status(400).json({ message: 'Invalid image format. Must be a Base64 string.' });
      }
    }

    const updatedUser = await user.save();
    console.log(`[Update User] Profile updated successfully for ${email}`, JSON.stringify(updatedUser, null, 2));
    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error(`[Update User] Error updating profile for ${email}:`, error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Forgot Password Endpoint
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  console.log(`[Forgot Password] Received request for email: ${email}`);
  if (!User) {
    console.error('[Forgot Password] User model not available');
    return res.status(500).json({ message: 'Server configuration error: User model not loaded' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[Forgot Password] User not found for email: ${email}`);
      return res.status(404).json({ message: 'User not found' });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    otpStore.set(email, { otp, otpExpires });
    const mailOptions = {
      from: '"Real Estate App" <harishsankar133@gmail.com>',
      to: email,
      subject: 'Your OTP for Password Reset',
      text: `Your OTP is ${otp}. It expires in 10 minutes.`
    };
    await transporter.sendMail(mailOptions);
    console.log(`[Forgot Password] OTP email sent successfully to: ${email}`);
    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error(`[Forgot Password] Error processing request for ${email}:`, error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// Verify OTP Endpoint
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  try {
    const storedOtp = otpStore.get(email);
    if (!storedOtp || String(storedOtp.otp) !== String(otp) || storedOtp.otpExpires < new Date()) {
      return res.json({ valid: false, message: 'Invalid or expired OTP' });
    }
    otpStore.delete(email);
    res.json({ valid: true, message: 'OTP verified' });
  } catch (error) {
    console.error(`[Verify OTP] Error processing request for ${email}:`, error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
});

// Send Email Endpoint
app.post('/api/send-email', (req, res) => {
  const { to, subject, text } = req.body;

  const mailOptions = {
    from: 'harishsankar133@gmail.com',
    to,
    subject,
    text,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }
    console.log('Email sent:', info.response);
    res.status(200).json({ message: 'Email sent successfully' });
  });
});

// Contact Form Endpoint - Send Message as Email
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  console.log(`[Contact] Received contact form submission from ${email}`);

  // Validate required fields
  if (!name || !email || !message) {
    console.log('[Contact] Missing required fields');
    return res.status(400).json({ message: 'Name, email, and message are required' });
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log(`[Contact] Invalid email format: ${email}`);
    return res.status(400).json({ message: 'Invalid email format' });
  }

  try {
    const mailOptions = {
      from: '"Real Estate App" <harishsankar133@gmail.com>',
      to: 'harishsankar133@gmail.com', // Send to the admin email
      replyTo: email, // Allow replying directly to the sender
      subject: `New Contact Message from ${name}`,
      text: `You have received a new message from ${name} (${email}):\n\n${message}`,
      html: `
        <h2>New Contact Message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Contact] Message email sent successfully from ${email}`);
    res.status(200).json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error(`[Contact] Error sending message from ${email}:`, error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// Reset Password Endpoint
app.post('/api/auth/reset-password', async (req, res) => {
  const { email } = req.body;
  if (!User) {
    console.error('[Reset Password] User model not available');
    return res.status(500).json({ message: 'Server configuration error: User model not loaded' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const tempPassword = Math.random().toString(36).slice(-8);
    user.password = await bcrypt.hash(tempPassword, 10);
    await user.save();
    const mailOptions = {
      from: '"Real Estate App" <harishsankar133@gmail.com>',
      to: email,
      subject: 'Your Temporary Password',
      text: `Your temporary password is ${tempPassword}. Please log in and change it immediately.`
    };
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Temporary password sent to your email' });
  } catch (error) {
    console.error(`[Reset Password] Error processing request for ${email}:`, error);
    res.status(500).json({ message: 'Failed to send password' });
  }
});

// Clear Expired OTPs
setInterval(() => {
  const now = new Date();
  for (const [email, { otpExpires }] of otpStore) {
    if (otpExpires < now) {
      console.log(`[Cleanup] Removing expired OTP for ${email}`);
      otpStore.delete(email);
    }
  }
}, 60 * 1000);

// Routes
app.use('/api/properties', propertyRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api', adminRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Start Server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));