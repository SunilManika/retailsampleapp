# IBM Verify Authentication Setup Guide

This guide explains how to configure IBM Verify authentication for the Retail App.

## Overview

The application now uses **IBM Verify (IBM Security Verify)** for authentication instead of traditional username/password login. This provides enterprise-grade security with Single Sign-On (SSO) capabilities.

## Prerequisites

1. IBM Verify tenant with admin access
2. Node.js and npm installed
3. PostgreSQL database

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install passport passport-openidconnect express-session
```

### 2. Configure Environment Variables

Create or update `backend/.env`:

```bash
# IBM Verify Configuration
IBM_VERIFY_ISSUER=https://your-tenant.verify.ibm.com/oidc/endpoint/default
IBM_VERIFY_CLIENT_ID=your_client_id_here
IBM_VERIFY_CLIENT_SECRET=your_client_secret_here
IBM_VERIFY_CALLBACK_URL=http://localhost:4000/api/auth/verify/callback
IBM_VERIFY_SCOPE=openid profile email

# Application Configuration
SESSION_SECRET=generate_a_random_secret_here
JWT_SECRET=your_jwt_secret_here
FRONTEND_URL=http://localhost:3000
PORT=4000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=retail_db
DB_USER=postgres
DB_PASSWORD=your_password
```

### 3. Update Database Schema (Optional)

If you want to store IBM Verify user IDs, add an email column:

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### 4. Start Backend

```bash
cd backend
npm start
```

Backend will run on `http://localhost:4000`

## Frontend Setup

### 1. Configure Environment Variables

Create `frontend/.env`:

```bash
VITE_API_BASE_URL=http://localhost:4000/api
```

### 2. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:3000`

## IBM Verify Console Configuration

### 1. Create Application

1. Log in to IBM Verify Admin Console
2. Navigate to **Applications** → **Add Application**
3. Select **Web Application**
4. Fill in application details:
   - **Name**: Retail Demo App
   - **Description**: Retail application with IBM Verify authentication

### 2. Configure OAuth Settings

**Grant Types:**
- ✅ Authorization Code

**Redirect URIs:**
```
http://localhost:4000/api/auth/verify/callback
```

For production, add:
```
https://your-backend-domain.com/api/auth/verify/callback
```

**Sign-out Redirect URIs (Optional):**
```
http://localhost:3000
```

### 3. Configure Scopes

Enable the following scopes:
- ✅ `openid` (Required)
- ✅ `profile` (Required)
- ✅ `email` (Required)

### 4. Get Credentials

After creating the application:
1. Copy the **Client ID**
2. Copy the **Client Secret**
3. Note the **Issuer URL** (usually `https://your-tenant.verify.ibm.com/oidc/endpoint/default`)

### 5. Update Backend .env

Update your backend `.env` file with the credentials from IBM Verify.

## Authentication Flow

```
1. User visits http://localhost:3000
   ↓
2. Clicks "Sign in with IBM Verify"
   ↓
3. Redirected to http://localhost:4000/api/auth/verify/login
   ↓
4. Backend redirects to IBM Verify login page
   ↓
5. User enters IBM Verify credentials
   ↓
6. IBM Verify redirects to http://localhost:4000/api/auth/verify/callback
   ↓
7. Backend validates authentication and generates JWT token
   ↓
8. Backend redirects to http://localhost:3000/auth/callback?token=JWT_TOKEN
   ↓
9. Frontend extracts token and stores in localStorage
   ↓
10. User is logged in and redirected to home page
```

## Testing the Integration

### 1. Start Both Services

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 2. Test Login Flow

1. Open browser: `http://localhost:3000`
2. Click "Sign in with IBM Verify"
3. Enter IBM Verify credentials
4. Verify successful redirect back to application
5. Check that user is logged in (username displayed in navbar)

### 3. Test Protected Routes

Try accessing:
- Cart: `http://localhost:3000/cart`
- Orders: `http://localhost:3000/orders`
- Profile: `http://localhost:3000/profile`
- Wishlist: `http://localhost:3000/wishlist`

All should work with IBM Verify authentication.

## Troubleshooting

### Issue: "Invalid redirect URI"

**Solution**: Ensure the redirect URI in IBM Verify console exactly matches:
```
http://localhost:4000/api/auth/verify/callback
```

### Issue: "Authentication failed"

**Solution**: 
1. Check IBM Verify credentials in backend `.env`
2. Verify scopes are enabled in IBM Verify console
3. Check backend logs for detailed error messages

### Issue: "Token not received"

**Solution**:
1. Check browser console for errors
2. Verify `FRONTEND_URL` in backend `.env` matches your frontend URL
3. Check that callback route is properly configured in frontend

### Issue: "CORS errors"

**Solution**: Ensure backend CORS is configured to allow frontend origin:
```javascript
app.use(cors({ 
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true 
}));
```

## Production Deployment

### 1. Update Environment Variables

**Backend:**
```bash
IBM_VERIFY_CALLBACK_URL=https://your-backend-domain.com/api/auth/verify/callback
FRONTEND_URL=https://your-frontend-domain.com
NODE_ENV=production
```

**Frontend:**
```bash
VITE_API_BASE_URL=https://your-backend-domain.com/api
```

### 2. Update IBM Verify Console

Add production redirect URIs:
```
https://your-backend-domain.com/api/auth/verify/callback
```

### 3. Enable HTTPS

Ensure both frontend and backend use HTTPS in production.

## Security Best Practices

1. **Never commit secrets**: Keep `.env` files out of version control
2. **Use strong secrets**: Generate random strings for `SESSION_SECRET` and `JWT_SECRET`
3. **Enable HTTPS**: Always use HTTPS in production
4. **Rotate credentials**: Regularly rotate IBM Verify client secrets
5. **Monitor logs**: Check authentication logs for suspicious activity

## API Endpoints

### Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/verify/login` | GET | Initiate IBM Verify login |
| `/api/auth/verify/callback` | GET | Handle IBM Verify callback |
| `/api/auth/verify/user` | GET | Get current user info |
| `/api/auth/logout` | POST | Logout user |

### Protected Endpoints

All other API endpoints require JWT token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Support

For issues related to:
- **IBM Verify**: Contact IBM Support or check [IBM Verify Documentation](https://www.ibm.com/docs/en/security-verify)
- **Application**: Check application logs and GitHub issues

## Additional Resources

- [IBM Verify Documentation](https://www.ibm.com/docs/en/security-verify)
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [OpenID Connect Specification](https://openid.net/connect/)