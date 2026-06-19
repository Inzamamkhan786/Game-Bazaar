# 🎮 GameBazaar - Full-Stack Digital Game Selling Platform

A production-ready full-stack web application for selling discounted PC game access. Built with React, Node.js, PostgreSQL, Razorpay payments, and WhatsApp Cloud API notifications.

## 🏗️ Tech Stack

### Frontend
- **React 19** + **Vite** - Modern UI framework
- **Tailwind CSS v4** - Utility-first styling
- **Redux Toolkit** - State management
- **React Router v7** - Client-side routing
- **Axios** - HTTP client with JWT interceptors
- **React Hook Form + Zod** - Form validation
- **React Hot Toast** - Notifications
- **Vitest + RTL** - Testing

### Backend
- **Node.js + Express.js** - REST API
- **PostgreSQL 17+** - Relational database
- **pg (node-postgres)** - PostgreSQL client with connection pooling
- **JWT** - Access + Refresh token authentication
- **Bcrypt** - Password hashing
- **Multer** - Image uploads
- **Supabase Storage** - Game image uploads via S3-compatible bucket
- **Razorpay** - Payment gateway
- **WhatsApp Cloud API** - Order notifications
- **Jest + Supertest** - API testing


## 📁 Project Structure

```
GameBazaar/
├── backend/
│   ├── src/
│   │   ├── config/         # Multer config
│   │   ├── controllers/    # Auth, Game, Payment, Order
│   │   ├── db/             # Pool setup, migrations
│   │   ├── middleware/     # Auth, validation, error handler
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # JWT, helpers, logger
│   │   ├── app.js          # Express app
│   │   └── server.js       # Entry point
│   ├── tests/
│   │   ├── integration/    # API integration tests
│   │   └── unit/           # Unit tests
│   ├── uploads/games/      # Legacy local upload fallback
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── api/            # Axios instance + API functions
    │   ├── components/
    │   │   ├── admin/      # Admin-specific components
    │   │   ├── game/       # GameCard, SearchFilters
    │   │   ├── layout/     # Navbar, Footer, Layout, ProtectedRoute
    │   │   └── ui/         # Badge, Skeleton, WhatsAppFloat
    │   ├── pages/
    │   │   ├── admin/      # Dashboard, Games, Orders, Users
    │   │   ├── HomePage.jsx
    │   │   ├── GamesPage.jsx
    │   │   ├── GameDetailPage.jsx
    │   │   ├── LoginPage.jsx
    │   │   ├── SignupPage.jsx
    │   │   ├── ProfilePage.jsx
    │   │   ├── OrdersPage.jsx
    │   │   └── SupportPage.jsx
    │   ├── store/          # Redux slices + store
    │   └── __tests__/      # Component tests
    └── .env.example
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 17
- npm / yarn

### 1. Clone & Setup

```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Environment

```bash
# Backend
cp .env.example .env
# Edit .env with your PostgreSQL credentials, JWT secrets, Razorpay keys, WhatsApp token, and Supabase storage credentials

# Frontend
cp .env.example .env.local
```

### 3. Database Setup

```bash
# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE gamebazaar;"

# Run migrations (creates all tables)
cd backend && npm run migrate
```

### 4. Create Admin Account

After running the server, use this SQL to create your admin account:

```sql
-- First register via API, then promote to ADMIN:
UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

### 5. Run Development Servers

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

---

## 🗄️ Database Schema

### Tables
- **users** - Customer accounts with JWT refresh tokens
- **games** - Game catalog with images array
- **orders** - Purchase records linking users to games
- **payments** - Razorpay payment records

### Key Design Decisions
- UUID primary keys (uuid-ossp)
- PostgreSQL arrays for game images
- Indexed columns: email, whatsapp_number, game_name, payment_id, created_at
- Trigger-based `updated_at` auto-update
- Transaction safety for payment processing

---

## 💳 Payment Flow

1. User clicks **Buy Now** → `POST /api/v1/payments/create-order`
2. Razorpay order created → frontend opens Razorpay modal
3. User completes payment → Razorpay calls `handler(response)`
4. Frontend sends `POST /api/v1/payments/verify` with signature
5. Backend verifies HMAC signature → creates Order + Payment records
6. WhatsApp notification sent to admin
7. User redirected to `/orders`

---

## 📱 WhatsApp Integration

The system uses **WhatsApp Cloud API (Meta)** to notify admin on every successful purchase.

Message includes:
- Order ID
- Customer Name, Email, WhatsApp Number
- Game Purchased
- Amount Paid
- Payment Time

Configure in backend `.env`:
```env
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
ADMIN_WHATSAPP_NUMBER=919931902300
```

---

## 🔐 Security Features

- ✅ JWT Access Tokens (15 min) + Refresh Tokens (7 days)
- ✅ Token rotation on refresh
- ✅ HttpOnly + Secure cookies
- ✅ bcrypt password hashing (12 rounds)
- ✅ Rate limiting (auth routes: 10 req/15min)
- ✅ Helmet.js security headers
- ✅ CORS restriction to frontend URL
- ✅ Input validation (express-validator)
- ✅ Razorpay HMAC signature verification
- ✅ SQL injection prevention via parameterized queries

---

## 🧪 Testing

### Backend Tests
```bash
cd backend && npm test
# or
npm run test:coverage
```

### Frontend Tests
```bash
cd frontend && npm test
# or
npm run test:coverage
```

---

## 🚢 Deployment

### Backend (Render)
1. Create a new **Web Service** on Render
2. Connect your GitHub repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add all environment variables from `.env.example`
6. Set `NODE_ENV=production`

### Frontend (Vercel)
1. Import frontend directory to Vercel
2. Set framework: **Vite**
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add `VITE_API_URL=https://your-render-backend.onrender.com/api/v1`

### Database (Neon / Supabase / Railway)
1. Create a PostgreSQL database
2. Get the connection string
3. Set `DATABASE_URL` in backend environment variables
4. Run `npm run migrate` once to create tables

### Image Storage (Supabase)
1. Create a public Supabase Storage bucket for game images.
2. Set the S3-compatible storage env vars in `backend/.env`.
3. Uploaded game images will be saved in that bucket and the database will store the public image URLs.

---

## 📡 API Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | Public | Register user |
| POST | `/api/v1/auth/login` | Public | Login |
| POST | `/api/v1/auth/logout` | User | Logout |
| POST | `/api/v1/auth/refresh` | Cookie | Refresh token |
| POST | `/api/v1/auth/forgot-password` | Public | Request reset |
| POST | `/api/v1/auth/reset-password` | Public | Reset password |
| GET | `/api/v1/auth/profile` | User | Get profile |
| PATCH | `/api/v1/auth/profile` | User | Update profile |

### Games
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/games` | Public | List games (paginated) |
| GET | `/api/v1/games/featured` | Public | Featured games |
| GET | `/api/v1/games/trending` | Public | Trending games |
| GET | `/api/v1/games/categories` | Public | Game categories |
| GET | `/api/v1/games/:id` | Public | Game details |
| POST | `/api/v1/games` | Admin | Create game |
| PATCH | `/api/v1/games/:id` | Admin | Update game |
| DELETE | `/api/v1/games/:id` | Admin | Delete game |

### Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/payments/create-order` | User | Create Razorpay order |
| POST | `/api/v1/payments/verify` | User | Verify & create order |
| POST | `/api/v1/payments/webhook` | Public | Razorpay webhook |

### Orders
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/orders/my-orders` | User | User's orders |
| GET | `/api/v1/orders/:id` | User | Order details |
| GET | `/api/v1/orders` | Admin | All orders |
| PATCH | `/api/v1/orders/:id/status` | Admin | Update status |
| GET | `/api/v1/orders/admin/export-csv` | Admin | Export CSV |

### Admin
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/admin/stats` | Admin | Dashboard analytics |
| GET | `/api/v1/admin/users` | Admin | All users |

---

## 📝 License

MIT — Feel free to use and modify for your own projects.
