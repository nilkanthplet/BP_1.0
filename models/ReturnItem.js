const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema({
  receiptNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  date: { 
    type: Date, 
    required: true 
  },
  userId: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  site: { 
    type: String 
  },
  phone: { 
    type: String 
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
    }
  }],
  total: { 
    type: Number, 
    required: true 
  },
  notes: { 
    type: String 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('ReturnItem', returnItemSchema);