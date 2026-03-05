# Node.js/Express + React Authentication System

This project implements a complete authentication system with:
- **Backend**: Node.js, Express, MongoDB, JWT
- **Frontend**: React, Vite, TailwindCSS

## Prerequisites

- Node.js (v16+)
- MongoDB (local or cloud instance)
- npm or yarn

## Setup Instructions

### 1. Backend Setup

```bash
cd backend

# Install dependencies (already done)
npm install

# Configure environment variables
# Edit .env file and update:
# - MONGODB_URI: Your MongoDB connection string
# - JWT_SECRET: A secure random string
# - FRONTEND_URL: Frontend URL (default: http://localhost:5173)

# Start MongoDB (if running locally)
# mongod

# Start the backend server
npm run dev
```

Backend will run on `http://localhost:5000`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies (already done)
npm install

# Start the frontend development server
npm run dev
```

Frontend will run on `http://localhost:5173`

## API Endpoints

### Authentication Routes (`/api/auth`)

- `POST /api/auth/register` - Register new user
  ```json
  {
    "fullName": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }
  ```

- `POST /api/auth/login` - Login user
  ```json
  {
    "email": "john@example.com",
    "password": "SecurePass123"
  }
  ```

### User Routes (`/api/users`) - Requires Authentication

- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
  ```json
  {
    "fullName": "Jane Doe",
    "email": "jane@example.com"
  }
  ```
- `DELETE /api/users/:id` - Delete user account
- `GET /api/users` - Get all users (admin)

## Project Structure

### Backend
```
backend/
├── src/
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── models/
│   │   └── User.js            # User model with password hashing
│   ├── controllers/
│   │   ├── authController.js  # Login/Register logic
│   │   └── userController.js  # CRUD operations
│   ├── middleware/
│   │   ├── auth.js            # JWT verification
│   │   └── errorHandler.js    # Error handling
│   ├── routes/
│   │   ├── authRoutes.js      # Auth endpoints
│   │   └── userRoutes.js      # User CRUD endpoints
│   └── server.js              # Express app entry point
├── .env                        # Environment variables
└── package.json
```

### Frontend
```
frontend/
├── src/
│   ├── contexts/
│   │   └── AuthContext.jsx    # Authentication context
│   ├── pages/
│   │   ├── Login.jsx          # Login page
│   │   ├── Register.jsx       # Registration page
│   │   └── Dashboard.jsx      # Protected dashboard
│   ├── services/
│   │   ├── api.js             # Axios instance with interceptors
│   │   └── authService.js     # Authentication service
│   └── App.jsx                # Main app with routing
└── package.json
```

## Features

### Backend
- ✅ User registration with validation
- ✅ Password hashing with bcrypt
- ✅ JWT token generation and verification
- ✅ Protected routes with authentication middleware
- ✅ User CRUD operations
- ✅ Global error handling
- ✅ CORS configuration
- ✅ Security headers with Helmet

### Frontend
- ✅ User registration form with validation
- ✅ User login form
- ✅ JWT token storage in localStorage
- ✅ Axios interceptors for authentication
- ✅ Protected routes
- ✅ Automatic token refresh
- ✅ Error handling and display
- ✅ Responsive UI with TailwindCSS

## Testing

1. **Start MongoDB** (if using local instance)
2. **Start Backend**: `cd backend && npm run dev`
3. **Start Frontend**: `cd frontend && npm run dev`
4. **Test Registration**: Navigate to `/register` and create an account
5. **Test Login**: Navigate to `/login` and sign in
6. **Test Protected Route**: Access dashboard at `/`
7. **Test Logout**: Click logout button

## Environment Variables

### Backend (`.env`)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/kwhane
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5173
```

### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

## Security Notes

- Change `JWT_SECRET` to a strong random string in production
- Use HTTPS in production
- Set appropriate CORS origins
- Implement rate limiting for production
- Add refresh token mechanism for better security
- Consider adding email verification
