const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongoose').Types;
const Property = require('../models/Property');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/', upload.fields([{ name: 'image' }, { name: 'propertyDocument' }]), async (req, res) => {
  try {
    const {
      propertyID, 
      title,
      category,
      price,
      location,
      propertyType,
      bedrooms,
      bathrooms,
      area,
      furnishing,
      availability,
      postedByEmail,
      ownerName,
      ownerPhone,
      leaseDuration,
      deposit,
      petPolicy,
      maintenanceFee,
      yearBuilt,
      parkingSpaces,
      amenities
    } = req.body;

    // Check for duplicate propertyID
    if (propertyID) {
      const existingProperty = await Property.findOne({ propertyID });
      if (existingProperty) {
        return res.status(400).json({ message: 'Property ID already exists' });
      }
    } else {
      return res.status(400).json({ message: 'Property ID is required' });
    }

    const propertyData = {
      propertyID, 
      title,
      category,
      price: parseFloat(price),
      location,
      propertyType,
      bedrooms: parseInt(bedrooms),
      bathrooms: parseInt(bathrooms),
      area: parseInt(area),
      furnishing,
      availability,
      postedByEmail,
      ownerName: ownerName || undefined,
      ownerPhone: ownerPhone || undefined,
      viewCount: 0
    };

    if (category === 'Rent') {
      propertyData.leaseDuration = leaseDuration;
      propertyData.deposit = parseFloat(deposit) || 0;
      propertyData.petPolicy = petPolicy;
      propertyData.maintenanceFee = parseFloat(maintenanceFee) || 0;
    } else if (category === 'Buy') {
      propertyData.yearBuilt = parseInt(yearBuilt) || 0;
      propertyData.parkingSpaces = parseInt(parkingSpaces) || 0;
      propertyData.amenities = amenities;
    }

    if (req.files && req.files['image']) {
      const imageFile = req.files['image'][0];
      const base64Image = imageFile.buffer.toString('base64');
      const mimeType = imageFile.mimetype;
      propertyData.image = `data:${mimeType};base64,${base64Image}`;
    }

    if (req.files && req.files['propertyDocument']) {
      const docFile = req.files['propertyDocument'][0];
      const base64Doc = docFile.buffer.toString('base64');
      const docMimeType = docFile.mimetype;
      propertyData.propertyDocument = `data:${docMimeType};base64,${base64Doc}`;
    }

    const property = new Property(propertyData);
    await property.save();
    res.status(201).json(property);
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const properties = await Property.find({}, { __v: 0 });
    const formattedProperties = properties.map(property => {
      const formatted = {
        ...property.toObject(),
        image: property.image || '',
        propertyDocument: property.propertyDocument || ''
      };
      return formatted;
    });
    res.json(formattedProperties);
  } catch (err) {
    console.error('Error fetching properties:', err.message, err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/filter', async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { category } : {};
    const properties = await Property.find(query, { __v: 0 });
    const formattedProperties = properties.map(property => ({
      ...property.toObject(),
      image: property.image || '',
      propertyDocument: property.propertyDocument || ''
    }));
    res.json(formattedProperties);
  } catch (err) {
    console.error('Error filtering properties:', err.message, err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid property ID format' });

    const property = await Property.findOne({ _id: new ObjectId(id) }, { __v: 0 });
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const formattedProperty = {
      ...property.toObject(),
      image: property.image || '',
      propertyDocument: property.propertyDocument || ''
    };
    res.json(formattedProperty);
  } catch (err) {
    console.error('Error fetching property by ID:', err.message, err.stack);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

router.get('/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const properties = await Property.find(
      { $or: [{ postedByEmail: email }, { bookedByEmail: email }] },
      { __v: 0 }
    );
    const formattedProperties = properties.map(property => ({
      ...property.toObject(),
      image: property.image || '',
      propertyDocument: property.propertyDocument || ''
    }));
    res.json(formattedProperties);
  } catch (err) {
    console.error('Error fetching properties by user email:', err.message, err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid property ID format' });

    const updateData = { ...req.body, updatedAt: new Date() };
    const property = await Property.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!property) return res.status(404).json({ message: 'Property not found' });

    const formattedProperty = {
      ...property.toObject(),
      image: property.image || '',
      propertyDocument: property.propertyDocument || ''
    };
    res.json(formattedProperty);
  } catch (err) {
    console.error('Error updating property:', err.message, err.stack);
    res.status(500).json({ message: 'Failed to update property', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid property ID format' });

    const property = await Property.findOneAndDelete({ _id: new ObjectId(id) });
    if (!property) return res.status(404).json({ message: 'Property not found' });

    res.json({ message: 'Property deleted successfully' });
  } catch (err) {
    console.error('Error deleting property:', err.message, err.stack);
    res.status(500).json({ message: 'Failed to delete property', error: err.message });
  }
});

module.exports = router;