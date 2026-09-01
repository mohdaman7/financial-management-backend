# 🚀 Step-by-Step Guide: Hosting on Render (`render.com`)

> **Skyfall Financial & Travels ERP System — Production Deployment Manual**  
> **Repository:** `mohdaman7/financial-management-backend` | **Branch:** `main`

---

## 📌 Quick Summary of Service Configuration

| Setting | Value |
| :--- | :--- |
| **Service Type** | `Web Service` |
| **Runtime** | `Node` |
| **Build Command** | `npm ci && npm run build` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/api/v1/health` |
| **Auto-Deploy** | `Yes` (deploys automatically on git push to `main`) |

---

## 🛠️ Step-by-Step Deployment Instructions

### Step 1: Push the Code to GitHub
Ensure all your latest backend updates are committed and pushed to GitHub:
```bash
git add .
git commit -m "chore: ready for Render production deployment"
git push origin main
```

---

### Step 2: Prepare Your MongoDB Atlas Database (Free Tier / Production)
If you don't already have a MongoDB Atlas connection string:
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in.
2. Create a Free Cluster (e.g., M0) or use an existing cluster.
3. In **Database Access**: Create a Database User (e.g. `skyfall_admin`) with a secure password.
4. In **Network Access**: Click **Add IP Address** -> Select **Allow Access from Anywhere (`0.0.0.0/0`)** so Render can connect.
5. In **Database**: Click **Connect** -> **Drivers (Node.js)** -> Copy the connection string:
   ```
   mongodb+srv://skyfall_admin:<PASSWORD>@cluster0.xyz.mongodb.net/financial_management?retryWrites=true&w=majority
   ```
   *(Remember to replace `<PASSWORD>` with your real database user password).*

---

### Step 3: Create Web Service on Render

#### Option A: One-Click Deploy using Blueprint (`render.yaml`)
1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** (top right) -> Select **Blueprint**.
3. Connect your GitHub repository: `mohdaman7/financial-management-backend`.
4. Render will read `render.yaml` and configure everything automatically.
5. Enter your `MONGODB_URI` when prompted and click **Apply**.

---

#### Option B: Manual Web Service Setup
1. Log into [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> Select **Web Service**.
3. Select **Build and deploy from a Git repository** -> Connect `mohdaman7/financial-management-backend`.
4. Configure the service settings:
   - **Name:** `skyfall-financial-backend` (or your preferred name)
   - **Region:** `Frankfurt (EU Central)` or `Oregon (US West)`
   - **Branch:** `main`
   - **Root Directory:** *(leave blank / default)*
   - **Runtime:** `Node`
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free` or `Starter ($7/mo)` *(Starter is recommended for 24/7 uptime without sleep)*

---

### Step 4: Configure Environment Variables on Render
Under the **Environment** tab in your Render Web Service, add the following Environment Variables:

| Key | Value / Example | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations |
| `MONGODB_URI` | `mongodb+srv://skyfall_admin:PASS@cluster0...` | **Required**: MongoDB Atlas URI |
| `JWT_ACCESS_SECRET` | `skyfall_production_access_secret_key_32_chars_min` | **Required**: Minimum 32 characters |
| `JWT_REFRESH_SECRET` | `skyfall_production_refresh_secret_key_32_chars_min` | **Required**: Minimum 32 characters |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Access token lifespan |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token lifespan |
| `CORS_ORIGIN` | `*` *(or `https://your-frontend.onrender.com,http://localhost:5173`)* | Comma-separated or `*` |
| `LOG_LEVEL` | `info` | Logging verbosity |
| `GRIDFS_BUCKET` | `uploads` | File storage bucket name |
| `MAX_FILE_SIZE_MB` | `10` | Max file upload limit |

---

### Step 5: Configure Health Check Path
1. In your Web Service settings, scroll to **Advanced**.
2. Set **Health Check Path** to:
   ```
   /api/v1/health
   ```
3. Click **Save Changes**.
4. Click **Manual Deploy** -> **Deploy latest commit**.

---

### Step 6: Verify Your Deployment
Once the deployment status turns to **"Live"**, test the live endpoints in your browser or Postman:

1. **Health Check & Diagnostics:**
   ```bash
   curl https://<YOUR-RENDER-APP-NAME>.onrender.com/api/v1/health
   ```
   *Expected Response:*
   ```json
   {
     "success": true,
     "data": {
       "status": "healthy",
       "service": "skyfall-financial-management-api",
       "version": "2.4.0",
       "environment": "production",
       "database": "connected"
     }
   }
   ```

2. **Swagger API Interactive Documentation:**
   ```
   https://<YOUR-RENDER-APP-NAME>.onrender.com/api/docs
   ```

---

### Step 7: Seed Initial Super Admin Account (One-Time Setup)
To create the initial Super Admin account on your live production database:

Visit the following URL in your browser:
```
https://<YOUR-RENDER-APP-NAME>.onrender.com/api/v1/health/seed?email=superadmin@skyfall.ae&password=YourSecurePassword123
```

*Response:*
```json
{
  "message": "Success! Super admin created with email: superadmin@skyfall.ae"
}
```

Now you can log into the frontend using `superadmin@skyfall.ae` with your chosen password!

---

### Step 8: (Optional) Connect Automated GitHub Actions Deploy Hook
If you want GitHub Actions to automatically signal Render on every merge to `main`:
1. In Render Web Service settings, copy the **Deploy Hook** URL (`https://api.render.com/deploy/srv-xxxx?key=yyyy`).
2. In GitHub repository: Go to **Settings > Secrets and variables > Actions**.
3. Create a secret named: `RENDER_DEPLOY_HOOK` with the copied URL.
4. From now on, whenever code is pushed to `main`, GitHub Actions will run tests and trigger an instant zero-downtime deployment on Render!
