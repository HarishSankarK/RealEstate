const User = require('../models/User');

const isAdmin = async (req, res, next) => {
  try {
    const email = req.headers['x-user-email'];
    if (!email) {
      return res.status(401).json({ error: 'No user email provided' });
    }

    const user = await User.findOne({ email });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    req.user = user; // Attach user to request object for further use
    next();
  } catch (error) {
    console.error('Middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { isAdmin };