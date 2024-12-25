const mongoose = require('mongoose');

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

module.exports = mongoose.model("User", userSchema);