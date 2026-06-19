# Production Deployment Configuration

## 1. Render Backend (https://game-bazaar1.onrender.com)

Update the following environment variables in the Render Dashboard:

### CORS & Frontend Configuration
```
FRONTEND_URL=https://game-bazaar.vercel.app
```

### Supabase S3 Configuration
```
SUPABASE_S3_REGION=us-east-1
SUPABASE_BUCKET_NAME=GameBazaar
```

**Steps to update:**
1. Go to https://dashboard.render.com
2. Click on "game-bazaar-backend" service
3. Click on "Environment" tab
4. Update the above variables
5. Click "Save Changes"
6. The service will auto-redeploy

---

## 2. Vercel Frontend (https://game-bazaar.vercel.app)

Update the following environment variable:

### Backend API Configuration
```
VITE_API_URL=https://game-bazaar1.onrender.com/api/v1
```

**Steps to update:**
1. Go to https://vercel.com
2. Click on "game-bazaar" project
3. Go to Settings → Environment Variables
4. Update or add `VITE_API_URL`
5. Redeploy: Go to Deployments → Click "Redeploy" on the latest deployment

---

## 3. Admin Account

The admin account has been reset with:
- Email: admin@gamebazaar.com
- Password: Admin@123

**Note:** This same password is set in the Render database.

---

## 4. Database Notes

- PostgreSQL is running on Supabase
- All migrations are applied automatically on startup
- Admin account is seeded if it doesn't exist

---

## 5. Local Development

To run locally:

### Backend
```bash
cd backend
npm run dev  # Runs on http://localhost:6543
```

### Frontend
```bash
cd frontend
npm run dev  # Runs on http://localhost:5173
```

### Testing
```bash
cd backend
npm test  # Runs Jest tests (16 passed, 1 expected failure in payment test)
```

---

## Verification Checklist

- [ ] Backend health: `curl https://game-bazaar1.onrender.com/health`
- [ ] Frontend: https://game-bazaar.vercel.app
- [ ] Admin login works
- [ ] Games API accessible
- [ ] Image uploads to Supabase S3

