# Chess Tournament Platform Backend

A comprehensive backend API for a chess tournament platform with Lichess and Chess.com integration, built with Express.js and MongoDB.

## Features

- **User Management**: Registration, authentication, profiles, ratings
- **Club System**: Create and manage chess clubs with different access levels
- **Tournament Management**: Swiss, Round Robin, Elimination tournaments
- **Lichess/Chess.com Integration**: Automated tournament creation and result syncing
- **Financial System**: Entry fees, prize distribution (blockchain-ready)
- **Notification System**: Real-time notifications for users
- **Admin Dashboard**: Platform management and analytics

## Quick Start

### Prerequisites
- Node.js 16+
- MongoDB 4.4+
- Redis (optional, for caching)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd chess-tournament-backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Start MongoDB (if running locally)
mongod

# Run in development mode
npm run dev

# Or run in production mode
npm start
```

## API Documentation

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <jwt-token>
```

### Clubs

#### Create Club
```http
POST /api/clubs
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Chess Masters Club",
  "description": "A club for serious chess players",
  "isPublic": true,
  "joinMethod": "open",
  "category": "competitive"
}
```

#### Get Clubs (with search)
```http
GET /api/clubs?search=chess&category=competitive&page=1&limit=20
```

#### Join Club
```http
POST /api/clubs/:id/join
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "inviteCode": "ABC123XY", // if required
  "message": "I'd like to join your club" // for approval-based clubs
}
```

### Tournaments

#### Create Tournament
```http
POST /api/tournaments
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Weekly Swiss Tournament",
  "description": "Our regular weekly tournament",
  "clubId": "club-id-here",
  "format": "swiss",
  "timeControl": {
    "initial": 600,
    "increment": 5
  },
  "maxParticipants": 32,
  "entryFee": 0,
  "registrationStart": "2023-12-01T10:00:00Z",
  "registrationEnd": "2023-12-07T18:00:00Z",
  "tournamentStart": "2023-12-08T19:00:00Z",
  "platform": "lichess"
}
```

#### Register for Tournament
```http
POST /api/tournaments/:id/register
Authorization: Bearer <jwt-token>
```

#### Start Tournament
```http
POST /api/tournaments/:id/start
Authorization: Bearer <jwt-token>
```

#### Sync Results
```http
POST /api/tournaments/:id/sync-results
Authorization: Bearer <jwt-token>
```

### Notifications

#### Get Notifications
```http
GET /api/notifications?page=1&limit=20&unreadOnly=true
Authorization: Bearer <jwt-token>
```

#### Mark as Read
```http
PUT /api/notifications/:id/read
Authorization: Bearer <jwt-token>
```

### Transactions

#### Get User Transactions
```http
GET /api/transactions?type=entry_fee&page=1&limit=20
Authorization: Bearer <jwt-token>
```

#### Create Deposit
```http
POST /api/transactions/deposit
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "amount": 1000000000000000000, // 1 ETH in wei
  "txHash": "0x..."
}
```

## Database Schema

### User
```javascript
{
  _id: ObjectId,
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  firstName: String,
  lastName: String,
  avatar: String,
  role: enum['admin', 'moderator', 'member'],
  rating: Number (default: 1200),
  gamesPlayed: Number,
  wins: Number,
  losses: Number,
  draws: Number,
  lichessUsername: String,
  chessComUsername: String,
  achievements: [String],
  walletAddress: String,
  joinedClubs: [ObjectId],
  createdAt: Date,
  lastActive: Date
}
```

### Club
```javascript
{
  _id: ObjectId,
  name: String (unique),
  description: String,
  logo: String,
  rules: String,
  isPublic: Boolean,
  joinMethod: enum['open', 'invite', 'approval'],
  inviteCode: String (unique),
  adminId: ObjectId (User),
  moderators: [ObjectId (User)],
  members: [{
    userId: ObjectId (User),
    joinedAt: Date,
    role: enum['admin', 'moderator', 'member']
  }],
  memberCount: Number,
  tournaments: [ObjectId (Tournament)],
  createdAt: Date
}
```

### Tournament
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  clubId: ObjectId (Club),
  organizerId: ObjectId (User),
  format: enum['swiss', 'roundRobin', 'singleElimination', 'doubleElimination'],
  timeControl: {
    initial: Number, // seconds
    increment: Number // seconds
  },
  maxParticipants: Number,
  entryFee: Number,
  prizePool: Number,
  participants: [{
    userId: ObjectId (User),
    registeredAt: Date,
    paid: Boolean,
    score: Number,
    rank: Number
  }],
  status: enum['upcoming', 'registration', 'ongoing', 'completed', 'cancelled'],
  lichessId: String,
  chessComId: String,
  platform: enum['lichess', 'chesscom'],
  createdAt: Date
}
```

## Lichess Integration

The platform integrates with Lichess for actual game play:

1. **Tournament Creation**: Automatically creates tournaments on Lichess
2. **Result Synchronization**: Fetches results and updates local database
3. **User Linking**: Users can link their Lichess accounts

### Required Lichess Setup
1. Create a Lichess OAuth app
2. Get an API token with tournament permissions
3. Set `LICHESS_TOKEN` in your environment variables

## Chess.com Integration

Similar to Lichess, but Chess.com has different API structure:

1. Register for Chess.com API access
2. Implement Chess.com specific endpoints
3. Handle different response formats

## Blockchain Integration (Future)

The backend is prepared for Web3 integration:

- **Account Abstraction**: Users don't need to manage wallets
- **Smart Contracts**: For escrow and prize distribution
- **Multiple Chains**: Support for Ethereum, Polygon, etc.

## Development

### Running Tests
```bash
npm test
```

### Database Seeding
```bash
npm run seed
```

### Project Structure
```
├── server.js              # Main application file
├── models/                 # Mongoose models
├── routes/                 # Route handlers
├── middleware/             # Custom middleware
├── services/               # Business logic
├── utils/                  # Utility functions
├── scripts/                # Database seeding, etc.
└── tests/                  # Test files
```

## Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation
- Role-based access control

## Production Deployment

### Environment Variables
Make sure to set all required environment variables in production.

### Database
- Use MongoDB Atlas or a managed MongoDB service
- Set up proper indexes
- Enable authentication

### Scaling
- Use PM2 for process management
- Set up load balancing
- Implement Redis for caching
- Use CDN for static assets

### Monitoring
- Implement logging (Winston)
- Set up error tracking (Sentry)
- Monitor performance metrics

## API Rate Limits

- General API: 100 requests per 15 minutes per IP
- Authentication: 5 requests per 15 minutes per IP
- File uploads: 10 requests per hour per user

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details