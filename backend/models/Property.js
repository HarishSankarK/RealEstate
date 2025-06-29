const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  propertyID: { type: String, required: true, unique: true }, // Added propertyID field, unique
  title: { type: String, required: true },
  category: { type: String, required: true, enum: ['Buy', 'Rent'] },
  price: { type: Number, required: true },
  location: { type: String, required: true },
  image: { type: String },
  propertyDocument: { type: String },
  propertyType: { type: String, required: true },
  bedrooms: { type: Number, required: true },
  bathrooms: { type: Number, required: true },
  area: { type: Number, required: true },
  furnishing: { type: String, required: true },
  availability: { type: String, required: true },
  ownerName: { type: String },
  ownerPhone: { type: String },
  leaseDuration: { type: String },
  deposit: { type: Number },
  petPolicy: { type: String },
  maintenanceFee: { type: Number },
  yearBuilt: { type: Number },
  parkingSpaces: { type: Number },
  amenities: { type: String },
  postedByEmail: { type: String, required: true },
  bookedByEmail: { type: String },
  isResidential: { type: Boolean, default: false },
  status: { type: String, enum: ['available', 'sold', 'rented'], default: 'available' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Property', propertySchema);