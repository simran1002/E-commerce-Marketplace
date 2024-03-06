const mongoose = require('mongoose');

// Define schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  address: { type: String, required: true },
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

const shippingSchema = new mongoose.Schema({
  houseNumber: { type: String, required: true },
  streetAddress2: { type: String },
  city: { type: String, required: true },
  stateProvince: { type: String, required: true },
  zipPostalCode: { type: String, required: true },
  country: { type: String, required: true },
  landmark: { type: String },
  specialInstructions: { type: String },
});


// Create models
const User = mongoose.model('User', userSchema);
const Catalog = mongoose.model('Catalog', catalogSchema);
const Order = mongoose.model('Order', orderSchema);
const Shipping = mongoose.model('Shipping', shippingSchema);


module.exports = { User, Catalog, Order, Shipping };
