# 🎯 DC Portal Setup - Purchase Form Only

This guide shows how to deploy **only the purchase form page** (home page) to a separate URL for DCs to enter items and upload images.

---

## ✅ What You'll Get

- ✅ Only the purchase form (no admin, no inventory, no other pages)
- ✅ Same Firebase database (shared Firestore & Storage)
- ✅ Separate URL for DC users
- ✅ Clean, simple interface

---

## 🔧 Option 1: Quick Setup (Simplest)

Keep everything as-is but just give DCs the main URL and tell them to only use the home page.

**Main App**: `https://your-main-app.vercel.app/`
**DC Portal**: `https://your-dc-portal.vercel.app/` (same app, different deployment)

Both use the **same Firebase database** via environment variables.

---

## 🎨 Option 2: Remove Extra Pages (Cleaner)

If you want to physically remove admin/inventory pages from the DC portal:

### Step 1: Update Layout to Use Simple Header

Edit `src/app/layout.tsx`:

```typescript
// Import the simple header instead
import { SimpleHeader } from '@/components/simple-header'; // Change this line

// Replace <Header /> with <SimpleHeader />
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <div className="relative flex min-h-screen flex-col bg-background">
              <SimpleHeader /> {/* Changed from Header */}
              <main className="flex-1">{children}</main>
            </div>
            <Toaster />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Step 2: Delete/Hide Other Pages (Optional)

You can either:
- Delete the folders: `src/app/admin/`, `src/app/inventory/`, `src/app/inventory-admin/`, `src/app/dc-mapping/`
- Or keep them but don't link to them (users can't access without knowing the URL)

### Step 3: Deploy to Vercel

Follow the same deployment process from [QUICK_DEPLOY.md](QUICK_DEPLOY.md), but with this modified version.

---

## 🗄️ Firebase Database Question

### ❓ Can I use a different Firebase project but the same database?

**Short Answer**: No directly, but here's what you CAN do:

### ✅ Option A: Same Firebase Project, Multiple Deployments (RECOMMENDED)

Deploy multiple URLs (apps) that all use the **same Firebase project credentials**:

```
Main Admin App:     https://admin.yourcompany.com
DC Portal:          https://dc.yourcompany.com
Inventory App:      https://inventory.yourcompany.com

All use SAME Firebase Project:
- Project ID: your-project-123
- Same Firestore database
- Same Storage bucket
- Same data
```

**How?** Use the **same environment variables** in all deployments:

```env
# All deployments use THESE SAME VALUES
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-123
NEXT_PUBLIC_FIREBASE_API_KEY=same-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-123.firebaseapp.com
# ... etc
```

**Result**:
- ✅ Different URLs
- ✅ Same database
- ✅ Shared data
- ✅ Easy to manage

---

### ❌ Option B: Different Firebase Projects Sharing Database (NOT POSSIBLE)

Firebase projects are **isolated**. You cannot have:
- Project A accessing Project B's database

Each Firebase project has its own:
- Firestore database
- Storage bucket
- Authentication users

---

### ✅ Option C: Sync Data Between Projects (Complex)

If you really need separate Firebase projects, you'd need to:
1. Use Cloud Functions to sync data
2. Set up Firestore replication
3. Use Firebase Admin SDK to write to multiple projects

**This is complicated and NOT recommended.**

---

## 🚀 Recommended Setup

### For Your Use Case:

1. **Main App** (Full features):
   - URL: `https://purchase-tracker-main.vercel.app`
   - Has: Purchase form, Admin, Inventory, DC Mapping
   - Users: Admins, Managers

2. **DC Portal** (Purchase form only):
   - URL: `https://dc-portal.vercel.app`
   - Has: Only purchase form page (simple header, no admin links)
   - Users: DC staff

3. **Both use SAME Firebase Project**:
   - Project ID: `your-project-123`
   - Same Firestore database
   - Same Storage bucket
   - Data synced automatically (because it's the same database!)

---

## 📋 Deployment Steps

### 1. Create DC Portal Version

```bash
# Clone your repository
git clone https://github.com/yourusername/purchase-tracker.git dc-portal
cd dc-portal

# Update src/app/layout.tsx to use SimpleHeader (see Step 1 above)

# Commit changes
git add .
git commit -m "DC Portal - purchase form only"
git push origin main
```

### 2. Deploy to Vercel (Separate Project)

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your repository (or the dc-portal clone)
4. Name it: `dc-portal` or `purchase-tracker-dc`
5. Add **THE SAME** Firebase environment variables:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=same-as-main-app
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=same-as-main-app
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=same-as-main-app
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=same-as-main-app
   # ... etc (EXACT SAME VALUES)
   ```
6. Deploy

### 3. Result

- **Main App**: `https://purchase-tracker-main.vercel.app`
  - Full access to all features

- **DC Portal**: `https://dc-portal.vercel.app`
  - Only purchase form
  - Same database as main app
  - All data shows up in both places automatically!

---

## 📊 Data Flow

```
┌─────────────────────┐
│   Main Admin App    │
│  (Full Features)    │
└──────────┬──────────┘
           │
           ├─────► Firebase Firestore
           │        (Shared Database)
           │
┌──────────┴──────────┐
│     DC Portal       │
│  (Purchase Only)    │
└─────────────────────┘

Both apps read/write to the SAME database!
```

---

## ✅ Quick Checklist

- [ ] Decide: Same code or separate version?
- [ ] If separate: Update layout.tsx to use SimpleHeader
- [ ] Deploy to Vercel with SAME Firebase credentials
- [ ] Test: Submit purchase from DC portal
- [ ] Verify: Data appears in main admin app
- [ ] Done! ✨

---

## 🔑 Key Points

1. **Same Firebase Project** = Same Database ✅
2. **Different URLs** = Different deployments ✅
3. **Same Environment Variables** = Shared data ✅
4. **Different Firebase Projects** = Cannot share database ❌

---

## 💡 Pro Tip

You don't even need to modify the code! Just:
1. Deploy the same codebase twice
2. Use the same Firebase credentials
3. Give DCs the URL to the home page only: `https://dc-portal.vercel.app/`
4. Tell them "Don't click on Admin or other links"

The simplest solution is often the best! 🎯

---

## 📞 Questions?

**Q: Will data from DC portal show in admin panel?**
A: YES! Same database = all data syncs automatically.

**Q: Can I use a different Firebase project for DC portal?**
A: Not if you want to share the database. Use same project, different URLs.

**Q: How much does this cost?**
A: Free! Vercel free tier + Firebase free tier = $0

**Q: Can I have custom domains?**
A: Yes! Both Vercel and Firebase support custom domains.

---

**Ready to deploy?** Follow the steps above or check [QUICK_DEPLOY.md](QUICK_DEPLOY.md) for Vercel deployment details! 🚀
