const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chatMessageSchema = new Schema({
  roomId: { type: String, required: true },               // e.g., user1_user2 (sorted)
  from:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  to:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text:   { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
},
{
  timestamps: true
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
