require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connectDB } = require("./db/connection");
const { User, Catalog, Order,Coordinate } = require("./src/models/schema");
const axios = require('axios');
const axiosConfig = {
  httpsAgent: { rejectUnauthorized: false }, // Configure the HTTPS agent globally for Axios
};
const axiosInstance = axios.create(axiosConfig);

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

const authenticateUser = (req, res, next) => {
  const authorizationHeader = req.header('Authorization');

  if (!authorizationHeader) {
    return res.status(401).json({ message: 'Unauthorized User' });
  }
  const token = authorizationHeader.replace("Bearer ", "");
  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    req.user = decoded.user;
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};


// Error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
};

app.use(errorHandler);

// Auth APIs
app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { username, email, password, phoneNumber, address, type } = req.body;
    const user = new User({ username, email, password, phoneNumber, address, type });
    await user.save();
    res.json({ message: 'User registered successfully' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ user: { username, type: user.type } }, process.env.JWT_KEY);
    res.json({ token });
  } catch (error) {
    next(error);
  }
});

app.get('/api/buyer/list-of-sellers', authenticateUser, async (req, res, next) => {
  try {
    // Ensure that the authenticated user is a buyer
    if (req.user.type !== 'buyer') {
      return res.status(403).json({ message: 'Forbidden: Only buyers can access this endpoint' });
    }

    // Proceed to fetch the list of sellers
    const sellers = await User.find({ type: 'seller' });
    res.json(sellers);
  } catch (error) {
    next(error);
  }
});

app.get('/api/buyer/seller-catalog/:seller_id',  async (req, res, next) => {
  try {
    // Ensure that the authenticated user is a buyer
    if (req.user.type !== 'buyer') {
      return res.status(403).json({ message: 'Forbidden: Only buyers can access this endpoint' });
    }

    const sellerId = req.params.seller_id;
    const catalog = await Catalog.findOne({ sellerId });

    if (!catalog) {
      return res.status(404).json({ message: 'Catalog not found' });
    }

    res.json(catalog.products);
  } catch (error) {
    next(error);
  }
});

app.post('/api/buyer/create-order/:seller_id', authenticateUser, async (req, res, next) => {
  try {
    // Ensure that the authenticated user is a buyer
    if (req.user.type !== 'buyer') {
      return res.status(403).json({ message: 'Forbidden: Only buyers can create orders' });
    }

    const buyer = req.user;
    const sellerId = req.params.seller_id;

    // Find the catalog for the specified seller
    const catalog = await Catalog.findOne({ sellerId });

    if (!catalog) {
      return res.status(404).json({ message: 'Catalog not found' });
    }

    // Create a new order with buyerId, sellerId, and products from the request body
    const order = new Order({
      buyerId: buyer.username,
      sellerId,
      products: req.body.products || [],
    });

    // Save the order to the database
    await order.save();

    // Respond with a success message
    res.json({ message: 'Order created successfully' });
  } catch (error) {
    // Pass any errors to the error-handling middleware
    next(error);
  }
});

// APIs for sellers
app.post('/api/seller/create-catalog', authenticateUser, async (req, res, next) => {
  try {
    // Ensure that the authenticated user is a seller
    if (req.user.type !== 'seller') {
      return res.status(403).json({ message: 'Forbidden: Only sellers can create catalogs' });
    }

    const seller = req.user;
    const { products } = req.body;

    // Create a new catalog with sellerId and products from the request body
    const catalog = new Catalog({ sellerId: seller.username, products });

    // Save the catalog to the database
    await catalog.save();

    // Respond with a success message
    // res.json({ message: 'Catalog created successfully' });
    res.json(catalog);
  } catch (error) {
    // Pass any errors to the error-handling middleware
    next(error);
  }
});


app.get('/api/seller/orders', authenticateUser, async (req, res, next) => {
  try {
    const seller = req.user;
    const sellerOrders = await Order.find({ sellerId: seller.username });
    console.log(sellerOrders)
    res.json(sellerOrders);
  } catch (error) {
    next(error);
  }
});


var meanLatitude;
var meanLongitude;

app.post('/api/array', async (req, res, next) => {
  try {
    const { coordinates } = req.body;

    if (!Array.isArray(coordinates)) {
      return res.status(400).json({ message: 'Invalid coordinates format' });
    }

    // Create an array of Coordinate model instances
    const coordinatesArray = coordinates.map(coord => new Coordinate({ ...coord, item: coord.item || '' }));

    // Use try-catch block to handle potential errors
    try {
      // Use insertMany without a callback (returns a promise)
      await Coordinate.insertMany(coordinatesArray);

      // Calculate the mean value for latitudes and longitudes
      meanLatitude = coordinatesArray.reduce((sum, coord) => sum + coord.lat, 0) / coordinatesArray.length;
      meanLongitude = coordinatesArray.reduce((sum, coord) => sum + coord.lon, 0) / coordinatesArray.length;

      res.json({ message: 'Coordinates added successfully', meanLatitude, meanLongitude });
    } catch (error) {
      console.error('Error saving coordinates:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/mean-coordinates', async (req, res) => {
  try {
    // Use MongoDB aggregation to calculate the mean
    const result = await Coordinate.aggregate([
      {
        $group: {
          _id: null,
          meanLat: { $avg: '$lat' },
          meanLon: { $avg: '$lon' },
        },
      },
    ]);

    // Extract meanLat and meanLon from the result
    const { meanLat, meanLon } = result[0];

    res.json({ meanLat, meanLon });
  } catch (error) {
    console.error('Error calculating mean coordinates:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
