const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  format: { 
    type: String, 
    enum: ['swiss', 'roundRobin', 'singleElimination', 'doubleElimination'], 
    required: true 
  },
  timeControl: {
    initial: { type: Number, required: true }, // seconds
    increment: { type: Number, default: 0 } // seconds
  },
  maxParticipants: { type: Number, required: true },
  entryFee: { type: Number, default: 0 }, // in wei or smallest unit
  prizePool: { type: Number, default: 0 },
  prizeDistribution: [{
    position: { type: Number },
    percentage: { type: Number }
  }],
  registrationStart: { type: Date, required: true },
  registrationEnd: { type: Date, required: true },
  tournamentStart: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['upcoming', 'registration', 'ongoing', 'completed', 'cancelled'], 
    default: 'upcoming' 
  },
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    registeredAt: { type: Date, default: Date.now },
    paid: { type: Boolean, default: false },
    score: { type: Number, default: 0 },
    rank: { type: Number }
  }],
  rounds: [{
    roundNumber: { type: Number },
    pairings: [{
      player1: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      player2: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      result: { type: String, enum: ['1-0', '0-1', '1/2-1/2', 'pending'] },
      gameUrl: { type: String },
      completedAt: { type: Date }
    }]
  }],
  lichessId: { type: String }, // Lichess tournament ID
  chessComId: { type: String }, // Chess.com tournament ID
  platform: { type: String, enum: ['lichess', 'chesscom'], default: 'lichess' },
  createdAt: { type: Date, default: Date.now }
});

const Tournament = mongoose.model('Tournament', tournamentSchema);

module.exports = Tournament;