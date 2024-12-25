const express = require('express');
const pdf = require('html-pdf');
const fs = require('fs');
const path = require('path');
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// MongoDB Connection URI
const mongoURI = "mongodb+srv://margeshpolara:KP8J0e6jJ9eReMZ9@bp1.kjpne.mongodb.net/?retryWrites=true&w=majority&appName=bp1";

// MongoDB Connection Configuration
const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    console.log("MongoDB connection successful");
  } catch (error) {
    console.error("Detailed MongoDB Connection Error:", {
      message: error.message,
      name: error.name,
      stack: error.stack  
    });
    
    if (error.message.includes("whitelist")) {
      console.error("IP Whitelist Issue: Ensure your current IP is added to MongoDB Atlas Network Access");
    }
    
    process.exit(1);
  }
};

// Connect to Database
connectDB();

// Mongoose Connection Event Listeners
mongoose.connection.on('connected', () => {
  console.log('Mongoose successfully connected to database');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection persistent error:', {
    message: err.message,
    name: err.name
  });
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from database');
});

// Schemas
const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  site: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  }
}, { 
  timestamps: true 
});

const returnItemSchema = new mongoose.Schema({
  receiptNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  userId: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  site: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  sizes: [{
    size: {
      type: String,
      required: true
    },
    pisces: {
      type: Number,
      default: 0
    },
    mark: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  }],
  total: {
    type: Number,
    required: true
  },
  grandTotal: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  },
  selectedMarkOption: {
    type: String,
    default: '',
    trim: true
  },
  metadata: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    fullReceiptDetails: {
      type: String,
      default: ''
    }
  }
}, { 
  timestamps: true 
});

// New Inventory Schema
const inventorySchema = new mongoose.Schema({
  total: {
    type: Number,
    required: true
  },
  sizes: {
    type: Map,
    of: Number,
    required: true
  }
}, {
  timestamps: true
});

// Models
const User = mongoose.model("User", userSchema);
const ReturnItem = mongoose.model("ReturnItem", returnItemSchema);
const Inventory = mongoose.model("Inventory", inventorySchema);

// Helper Functions
async function fetchReturnItems() {
  const client = await MongoClient.connect('mongodb://localhost:27017');
  const db = client.db('your-database-name');
  const collection = db.collection('return-items');

  const returnItemsDoc = await collection.findOne();
  const returnItems = returnItemsDoc.sizes.map((size) => ({
    receiptNumber: returnItemsDoc.receiptNumber,
    date: new Date(returnItemsDoc.date).toLocaleDateString(),
    total: returnItemsDoc.total,
    '2x3': size.size === '2 X 3' ? { 
      pisces: size.pisces || 'N/A', 
      mark: size.mark || 'N/A', 
      total: size.total || 'N/A' 
    } : 'N/A',
    // ... (other size mappings remain the same)
  }));

  client.close();
  return returnItems;
}

// Routes

// Inventory Routes
app.get('/inventory', async (req, res) => {
  try {
    const inventory = await Inventory.findOne();
    res.json(inventory || { total: 0, sizes: {} });
  } catch (err) {
    res.status(500).json({ message: "Error fetching inventory", error: err.message });
  }
});

app.post('/inventory', async (req, res) => {
  try {
    const newInventory = new Inventory(req.body);
    const savedInventory = await newInventory.save();
    res.status(201).json(savedInventory);
  } catch (err) {
    res.status(400).json({ message: "Error creating inventory", error: err.message });
  }
});

app.put('/inventory', async (req, res) => {
  try {
    const updatedInventory = await Inventory.findOneAndUpdate(
      {},
      req.body,
      { new: true, upsert: true }
    );
    res.json(updatedInventory);
  } catch (err) {
    res.status(400).json({ message: "Error updating inventory", error: err.message });
  }
});

// PDF Generation Route
app.post('/submit-form', (req, res) => {
  const formData = req.body;
  const html = fs.readFileSync(path.join(__dirname, 'pdf-template.html'), 'utf8');
  const htmlWithData = html.replace('{{name}}', formData.name)
                          .replace('{{id}}', formData.id)
                          .replace('{{site}}', formData.site)
                          .replace('{{phone}}', formData.phone);

  pdf.create(htmlWithData, {}).toBuffer((err, buffer) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=receipt.pdf');
    res.send(buffer);
  });
});

// User Routes
app.get("/users/search", async (req, res) => {
  try {
    const { query } = req.query;
    const users = await User.find({
      $or: [
        { userId: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }
      ]
    }).limit(10);
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Search error", error: err.message });
  }
});

app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users", error: err.message });
  }
});

app.post("/users", async (req, res) => {
  try {
    const existingUser = await User.findOne({ userId: req.body.userId });
    if (existingUser) {
      return res.status(400).json({ message: "User ID already exists" });
    }

    const newUser = new User({
      userId: req.body.userId,
      name: req.body.name,
      site: req.body.site || '',
      phone: req.body.phone || ''
    });

    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(400).json({ message: "Error creating user", error: err.message });
  }
});

// Return Items Routes
app.get("/return-items", async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      userId, 
      sortBy = 'createdAt', 
      sortOrder = -1 
    } = req.query;

    let query = {};

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (userId) {
      query.userId = userId;
    }

    const returnItems = await ReturnItem.find(query)
      .sort({ [sortBy]: sortOrder })
      .limit(100);

    const transformedItems = returnItems.map(item => {
      const transformedItem = item.toObject();
      const detailedSizes = {};
      item.sizes.forEach(size => {
        detailedSizes[size.size] = {
          pisces: size.pisces,
          mark: size.mark,
          total: size.total
        };
      });
      transformedItem.detailedSizes = detailedSizes;
      return transformedItem;
    });

    res.json(transformedItems);
  } catch (err) {
    res.status(500).json({ message: "Error fetching return items", error: err.message });
  }
});

app.post("/return-items", async (req, res) => {
  try {
    const existingReturnItem = await ReturnItem.findOne({ 
      receiptNumber: req.body.receiptNumber 
    });
    
    if (existingReturnItem) {
      return res.status(400).json({ message: "Receipt number already exists" });
    }

    const newReturnItem = new ReturnItem({
      ...req.body,
      sizes: req.body.sizes.map(size => ({
        size: size.size,
        pisces: parseInt(size.pisces) || 0,
        mark: parseInt(size.mark) || 0,
        total: parseInt(size.total) || 0
      })),
      total: parseInt(req.body.total) || 0,
      grandTotal: parseInt(req.body.grandTotal) || 0,
      selectedMarkOption: req.body.selectedMarkOption || '',
      metadata: {
        createdAt: new Date(),
        fullReceiptDetails: req.body.metadata?.fullReceiptDetails || ''
      }
    });

    const savedReturnItem = await newReturnItem.save();
    res.status(201).json(savedReturnItem);
  } catch (err) {
    res.status(400).json({ message: "Error creating return item", error: err.message });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: "Something went wrong", 
    error: err.message 
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful Shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

// Add these new routes to your existing Express backend

// Delete user and associated receipts
app.delete("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Delete user
    const deletedUser = await User.findOneAndDelete({ userId });
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Delete all associated return items
    await ReturnItem.deleteMany({ userId });
    
    res.json({ message: "User and associated receipts deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting user", error: err.message });
  }
});

// Add to your Express backend
app.put("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const updatedUser = await User.findOneAndUpdate(
      { userId },
      {
        name: req.body.name,
        site: req.body.site,
        phone: req.body.phone
      },
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ message: "Error updating user", error: err.message });
  }
});

// Delete single return item
app.delete("/return-items/:receiptNumber", async (req, res) => {
  try {
    const { receiptNumber } = req.params;
    
    const deletedItem = await ReturnItem.findOneAndDelete({ receiptNumber });
    if (!deletedItem) {
      return res.status(404).json({ message: "Receipt not found" });
    }
    
    res.json({ message: "Receipt deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting receipt", error: err.message });
  }
});

// Update return item
app.put("/return-items/:receiptNumber", async (req, res) => {
  try {
    const { receiptNumber } = req.params;
    
    // Validate the incoming data
    const updates = {
      ...req.body,
      sizes: req.body.sizes.map(size => ({
        size: size.size,
        pisces: parseInt(size.pisces) || 0,
        mark: parseInt(size.mark) || 0,
        total: parseInt(size.total) || 0
      })),
      total: parseInt(req.body.total) || 0,
      grandTotal: parseInt(req.body.grandTotal) || 0
    };
    
    const updatedItem = await ReturnItem.findOneAndUpdate(
      { receiptNumber },
      updates,
      { new: true }
    );
    
    if (!updatedItem) {
      return res.status(404).json({ message: "Receipt not found" });
    }
    
    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({ message: "Error updating receipt", error: err.message });
  }
});

// Update these routes in your Express backend

// Get inventory
app.get('/inventory', async (req, res) => {
  try {
    const inventory = await Inventory.findOne();
    if (!inventory) {
      // Return default values if no inventory exists
      return res.json({
        total: 20000,
        sizes: allSizes.reduce((acc, size) => ({ ...acc, [size]: 1000 }), {})
      });
    }
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ message: "Error fetching inventory", error: err.message });
  }
});

// Update inventory
app.put('/inventory', async (req, res) => {
  try {
    const { total, sizes } = req.body;
    
    const updatedInventory = await Inventory.findOneAndUpdate(
      {},
      { total, sizes },
      { new: true, upsert: true }
    );
    
    res.json(updatedInventory);
  } catch (err) {
    res.status(400).json({ message: "Error updating inventory", error: err.message });
  }
});

// Add this new schema to your backend
const billingSchema = new mongoose.Schema({
  billNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  userId: {
    type: String,
    required: true,
    trim: true
  },
  userName: {
    type: String,
    required: true,
    trim: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  completedPayment: {
    type: Number,
    default: 0
  },
  duePayment: {
    type: Number,
    required: true
  },
  payments: [{
    amount: {
      type: Number,
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'online'],
      required: true
    },
    paymentDate: {
      type: Date,
      default: Date.now
    },
    billNumber: String
  }],
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'partially_paid', 'paid'],
    default: 'pending'
  },
  metadata: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }
});

const Bill = mongoose.model("Bill", billingSchema);

// Add these new routes to your Express backend
app.post("/bills", async (req, res) => {
  try {
    // Generate bill number (B-YYYYMMDD-XXXX format)
    const date = new Date();
    const dateStr = date.toISOString().slice(0,10).replace(/-/g, '');
    const count = await Bill.countDocuments();
    const billNumber = `B-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    const newBill = new Bill({
      ...req.body,
      billNumber,
      status: req.body.duePayment > 0 ? 'partially_paid' : 'paid'
    });

    const savedBill = await newBill.save();
    res.status(201).json(savedBill);
  } catch (err) {
    res.status(400).json({ message: "Error creating bill", error: err.message });
  }
});

app.get("/bills", async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    let query = {};

    if (userId) {
      query.userId = userId;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const bills = await Bill.find(query).sort({ 'metadata.createdAt': -1 });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: "Error fetching bills", error: err.message });
  }
});

app.post("/bills/:billNumber/payments", async (req, res) => {
  try {
    const { billNumber } = req.params;
    const { amount, paymentMethod } = req.body;

    const bill = await Bill.findOne({ billNumber });
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    // Add new payment
    bill.payments.push({
      amount,
      paymentMethod,
      billNumber,
      paymentDate: new Date()
    });

    // Update completed and due payments
    bill.completedPayment += amount;
    bill.duePayment = bill.totalAmount - bill.completedPayment;

    // Update status
    if (bill.duePayment <= 0) {
      bill.status = 'paid';
    } else if (bill.completedPayment > 0) {
      bill.status = 'partially_paid';
    }

    bill.metadata.lastUpdated = new Date();
    
    const updatedBill = await bill.save();
    res.json(updatedBill);
  } catch (err) {
    res.status(400).json({ message: "Error adding payment", error: err.message });
  }
});