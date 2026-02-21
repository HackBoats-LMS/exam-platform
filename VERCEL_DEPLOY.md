# 🚀 Vercel Deployment Guide — HackBoats Exam Platform
## Handling 3,000–5,000 Concurrent Users on Vercel Free Tier

---

## ⚡ Quick Deploy Checklist

- [ ] Fix MongoDB URI (add query params for production)
- [ ] Set all environment variables in Vercel dashboard
- [ ] Update Google OAuth redirect URIs
- [ ] Upgrade MongoDB Atlas cluster if needed
- [ ] Generate a strong NEXTAUTH_SECRET
- [ ] Change admin password from default

---

## 1. MongoDB Atlas Setup (CRITICAL for Scale)

### Connection String Format
Your MONGODB_URI must include these query parameters for production:
```
mongodb+srv://username:password@cluster.xxxxx.mongodb.net/dbname?retryWrites=true&w=majority&appName=HBExam
```

### Atlas Cluster Recommendation
| Users | Atlas Tier | Monthly Cost | Max Connections |
|-------|-----------|--------------|----------------|
| 0–100 | M0 (Free) | $0 | 500 |
| 100–1000 | M0 (Free) | $0 | 500 ⚠️ borderline |
| 1000–5000 | M2 Shared | ~$9/mo | 500 (still OK with our pool config) |
| 5000+ | M10 Dedicated | ~$57/mo | 1,500+ |

**For 3,000–5,000 users:** M0 (Free) can work ONLY because:
- Vercel free tier limits ~100 concurrent lambdas
- We set `maxPoolSize: 5` per lambda connection
- That means max 500 total MongoDB connections (= Atlas M0 limit)
- This is RIGHT at the limit — to be safe, upgrade to M2 ($9/mo)

### How to Set Up MongoDB Network Access for Vercel
1. Go to Atlas → Network Access → IP Access List
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
   - This is safe because MongoDB uses TLS + credentials
   - Vercel's IPs change with each deployment

---

## 2. Environment Variables in Vercel

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add ALL of these:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Your Atlas connection string with `?retryWrites=true&w=majority` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` (exact URL, no trailing slash) |
| `NEXTAUTH_SECRET` | Strong random string (see below) |
| `ADMIN_EMAIL` | Your admin email |
| `ADMIN_PASSWORD` | Strong password (not `admin123`!) |

**Generate NEXTAUTH_SECRET:**
Run in PowerShell:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 3. Google OAuth Setup for Vercel

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services → Credentials → Your OAuth 2.0 Client
3. Under **Authorized redirect URIs**, add:
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```
4. Under **Authorized JavaScript origins**, add:
   ```
   https://your-app.vercel.app
   ```
5. Save changes

---

## 4. Deploying to Vercel

### Option A: Via GitHub (Recommended)
```bash
# In your project root (where .git is)
git add .
git commit -m "Production optimizations"
git push origin main
```
Then connect GitHub to Vercel:
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Set Root Directory to `hb-exam`
4. Framework: Next.js (auto-detected)
5. Add all env variables (from section 2 above)
6. Click Deploy

### Option B: Via Vercel CLI
```powershell
npm install -g vercel
cd "d:\HB\New folder\exam-platform\hb-exam"
vercel --prod
```

---

## 5. What Vercel Free Tier Gives You

| Feature | Free Tier Limit |
|---------|----------------|
| Serverless Function Executions | 100,000 / month |
| Bandwidth | 100 GB / month |
| Build Minutes | 6,000 / month |
| Function Duration | 10 seconds max |
| Concurrent Executions | ~100 |
| Cold Start | ~500ms–2s |

**For an exam platform with 5,000 users all taking a 30-min exam simultaneously:**
- Each user makes ~3 API calls to start: `checkExamStatus` + `startExam` + `fetchQuestions`
- During exam: `submitExam` (1 call per student)
- Total: ~5,000 × 4 = 20,000 function calls
- ✅ Well within the 100,000/month free limit

---

## 6. Performance Architecture

```
Student Browser
     │
     ▼
Vercel Edge (CDN) — serves static HTML/CSS/JS instantly
     │
     ▼  (only dynamic routes hit lambdas)
Next.js Server Action (Lambda)
     │  max 10s execution, max 100 concurrent
     ▼
MongoDB Atlas (M0 Free)
     │  maxPoolSize: 5 per lambda
     │  indexes: userId+startedAt, setName+sectionName
     ▼
Response back to student
```

**Key bottlenecks we fixed:**
1. ✅ MongoDB connection pool (was unlimited → now 5 per lambda)
2. ✅ N+1 queries in admin page (was O(n) DB calls → now O(1))
3. ✅ `.lean()` on all read queries (10x faster than full Mongoose docs)
4. ✅ Compound indexes on ExamAttempt and Question models
5. ✅ Security headers added

---

## 7. Monitoring After Deployment

### Vercel Analytics
- Enable in Vercel Dashboard → Analytics tab
- Watch for: slow server actions > 5s (Atlas cold start)

### MongoDB Atlas Monitoring  
- Atlas Dashboard → Metrics
- Watch: "Connections" count — if hitting 450+, upgrade to M2
- Watch: "Operations" — should be fast with indexes

---

## 8. Known Vercel Free Tier Limitations

### ⚠️ 10-Second Timeout
Server Actions must complete within **10 seconds**. 
- `fetchAdminData` fetches all users + questions — with 1000+ students this could timeout
- **Fix**: Add pagination to the admin Students tab (show 50 at a time)

### ⚠️ Cold Starts
First request after idle period takes 1-3 seconds.
- `startExam` and `fetchQuestions` will feel slow on first load
- Subsequent requests are fast (warm lambda)
- **Fix**: Use Vercel Pro ($20/mo) for always-on functions, OR accept cold starts

### ⚠️ No Persistent State Between Lambdas
- In-memory caching won't work (each request may hit a different lambda)
- The MongoDB connection IS cached per lambda (warm instances reuse it)

---

## 9. Production Security Checklist

- [ ] Change `ADMIN_PASSWORD` from `admin123`
- [ ] Generate new `NEXTAUTH_SECRET` (never use `changeme_to_random_secret`)
- [ ] Enable MongoDB Atlas IP whitelisting (0.0.0.0/0 is OK for Vercel)
- [ ] Check that `.env.local` is in `.gitignore` ✅ (already done)
- [ ] Enable HTTPS (Vercel does this automatically ✅)
- [ ] Consider rate limiting admin login attempts (optional enhancement)

---

## 10. If You Hit Limits — Upgrade Path

| Issue | Free Solution | Paid Solution |
|-------|--------------|---------------|
| DB connections > 450 | Reduce maxPoolSize to 3 | Upgrade Atlas to M2 ($9/mo) |
| Function timeout > 10s | Paginate admin data | Vercel Pro ($20/mo) → 60s timeout |
| Bandwidth > 100GB | Compress images | Vercel Pro |
| Build minutes > 6000 | Optimize build | Vercel Pro |

---

*Generated for HackBoats Exam Platform — exams.hackboats.com*
