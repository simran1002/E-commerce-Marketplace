const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
const PORT = 3000;

const User = mongoose.model('User', userSchema);
const Catalog = mongoose.model('Catalog', catalogSchema);
const Order = mongoose.model('Order', orderSchema);

app.use(bodyParser.json());

const authenticateUser = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, 'secret');
    req.user = decoded.user;
    next();
  } catch (error) {
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
    const { username, password, type } = req.body;
    const user = new User({ username, password, type });
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

    const token = jwt.sign({ user: { username, type: user.type } }, 'secret');
    res.json({ token });
  } catch (error) {
    next(error);
  }
});

// APIs for buyers
app.get('/api/buyer/list-of-sellers', authenticateUser, async (req, res, next) => {
  try {
    const sellers = await User.find({ type: 'seller' });
    res.json(sellers);
  } catch (error) {
    next(error);
  }
});

app.get('/api/buyer/seller-catalog/:seller_id', authenticateUser, async (req, res, next) => {
  try {
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
    const buyer = req.user;
    const sellerId = req.params.seller_id;
    const catalog = await Catalog.findOne({ sellerId });

    if (!catalog) {
      return res.status(404).json({ message: 'Catalog not found' });
    }

    const order = new Order({
      buyerId: buyer.username,
      sellerId,
      products: req.body.products || [],
    });

    await order.save();
    res.json({ message: 'Order created successfully' });
  } catch (error) {
    next(error);
  }
});

// APIs for sellers
app.post('/api/seller/create-catalog', authenticateUser, async (req, res, next) => {
  try {
    const seller = req.user;
    const { products } = req.body;
    const catalog = new Catalog({ sellerId: seller.username, products });
    await catalog.save();
    res.json({ message: 'Catalog created successfully' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/seller/orders', authenticateUser, async (req, res, next) => {
  try {
    const seller = req.user;
    const sellerOrders = await Order.find({ sellerId: seller.username });
    res.json(sellerOrders);
  } catch (error) {
    next(error);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
