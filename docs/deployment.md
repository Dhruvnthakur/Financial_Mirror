# Deployment Guide (Free Tier Hosting)

## 1. Frontend (React + Vite) → Vercel or Netlify
1. Connect your GitHub repository (`https://github.com/Dhruvnthakur/Financial_Mirror`) to **Vercel** or **Netlify**.
2. Set build settings:
   - **Root Directory**: `PixelPirates/frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
3. Add Environment Variable:
   - `VITE_API_BASE` = `https://your-backend-url.onrender.com`

---

## 2. Backend (Node.js + Express + SQLite) → Render or Railway
1. Create a Web Service on **Render** (`render.com`) or **Railway** (`railway.app`).
2. Set build settings:
   - **Root Directory**: `PixelPirates/backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
3. **Database Note**: SQLite (`financial_mirror.db`) stores data in a local file. On free tier hosts (Render/Railway), ephemeral filesystems reset on server restart. For persistent production storage, consider upgrading SQLite to a managed free PostgreSQL instance (Supabase/Neon).
