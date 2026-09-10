const mongoose = require('mongoose');

const houseSchema = new mongoose.Schema({
  houseId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  ownerId: { type: String, default: null }, // ID de Discord del comprador
  imageUrl: { type: String, required: true }
});

module.exports = mongoose.model('House', houseSchema);