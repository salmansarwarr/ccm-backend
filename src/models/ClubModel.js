const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  logo: { type: String },
  rules: { type: String },
  isPublic: { type: Boolean, default: true },
  joinMethod: { 
    type: String, 
    enum: ['open', 'invite', 'approval'], 
    default: 'open' 
  },
  inviteCode: { type: String, unique: true },
  category: { type: String },
  tags: [{ type: String }],
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  members: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now },
    role: { type: String, enum: ['admin', 'moderator', 'member'], default: 'member' }
  }],
  memberCount: { type: Number, default: 0 },
  tournaments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' }],
  pendingApplications: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: { type: String },
    appliedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const Club = mongoose.model('Club', clubSchema);

module.exports = Club;