const mongoose = require('mongoose');

// Define schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  type: { type: String, enum: ['buyer', 'seller'], required: true },
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
});

const catalogSchema = new mongoose.Schema({
  sellerId: { type: String, required: true, unique: true },
  products: [productSchema],
});

const orderSchema = new mongoose.Schema({
  buyerId: { type: String, required: true },
  sellerId: { type: String, required: true },
  products: [productSchema],
});

// Create models
const User = mongoose.model('User', userSchema);
const Catalog = mongoose.model('Catalog', catalogSchema);
const Order = mongoose.model('Order', orderSchema);

module.exports = { User, Catalog, Order };
