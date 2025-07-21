# Render Deployment Configuration

## CORS Issue Solution ✅

The CORS issue has been **SOLVED** by implementing a backend proxy server!

## 🚨 IMPORTANT: URL Sharing

**❌ WRONG - Don't share this:**
```
http://localhost:3000
```
This only works on YOUR computer!

**✅ CORRECT - Share this instead:**
```
https://your-app-name.onrender.com
```
Get this URL from your Render dashboard after deployment.

## Step-by-Step Render Deployment

### 1. **Create Render Account & Connect Repository**
1. Go to [render.com](https://render.com)
2. Sign up/Login with GitHub
3. Click "New" → "Web Service"
4. Connect your `Parker-Card-Audit` repository

### 2. **Configure Build Settings**
- **Name**: `parker-card-audit` (or your preferred name)
- **Environment**: `Node.js`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Instance Type**: Free

### 3. **Deploy & Get Public URL**
1. Click "Create Web Service"
2. Wait for build to complete (5-10 minutes)
3. Your app will be available at: `https://parker-card-audit.onrender.com`
4. **Share THIS URL** with others, not localhost!

## Troubleshooting "Site Can't Be Reached"

### ❌ Problem: Users getting "localhost refused to connect"
**Cause**: You're sharing localhost URL instead of Render URL

**Solution**: 
1. Check your Render dashboard for the public URL
2. Share the `.onrender.com` URL instead
3. Make sure deployment is complete and shows "Live"

### ❌ Problem: Render build failing
**Cause**: Build errors or wrong configuration

**Solution**:
- Check build logs in Render dashboard
- Ensure these exact settings:
  - Build Command: `npm install && npm run build`
  - Start Command: `npm start`
  - Environment: Node.js

### ❌ Problem: App loads but SOAP requests fail
**Cause**: Proxy server not working properly

**Solution**:
- Check server logs in Render dashboard
- Look for proxy request logs
- Verify Azure endpoint is accessible

## How to Share Your App Correctly

1. **Check Deployment Status**:
   - Go to Render dashboard
   - Ensure your service shows "Live" status
   - Note the public URL (something like `https://parker-card-audit.onrender.com`)

2. **Test the Public URL**:
   - Open the Render URL in your browser
   - Verify the environment panel shows "Production (Express)"
   - Test a SOAP request to ensure proxy works

3. **Share the Correct URL**:
   - ✅ Share: `https://your-app-name.onrender.com`
   - ❌ Don't share: `http://localhost:3000`

## Architecture Overview

```
User's Browser → Render (Express Server) → Azure SOAP Endpoint
```

- **Development**: `http://localhost:3000` (only on your machine)
- **Production**: `https://your-app.onrender.com` (accessible worldwide)

## Build Process

The project uses a custom Node.js build script (`build.js`) that:
- ✅ Avoids permission issues with vite binary
- ✅ Uses Vite's Node.js API directly
- ✅ Works reliably on Linux servers like Render
- ✅ Includes proper error handling

## Files Added

1. **`server.js`**: Express proxy server
2. **Updated `package.json`**: Added Express dependencies and start script

## What Changed

- ✅ **No more CORS errors**: Express server handles all SOAP requests
- ✅ **Unified endpoint**: Always uses `/api/integrations/monthly.asmx`
- ✅ **Production ready**: Works identically in dev and production
- ✅ **Better logging**: Server logs all proxy requests for debugging

## Testing Locally

To test the production setup locally:

```bash
npm run build
npm start
```

Then visit `http://localhost:3000`

## Deployment Steps

1. **Push to Git** (all files including `server.js`)
2. **Create Render Web Service** (not Static Site)
3. **Set Build Command**: `npm install && npm run build`
4. **Set Start Command**: `npm start`
5. **Deploy** 🚀

## Health Check

Your deployed app will have a health check endpoint:
```
https://your-app.onrender.com/health
```

## No More Issues! 🎉

- ❌ ~~CORS Policy Errors~~
- ❌ ~~Environment Detection Problems~~
- ❌ ~~Direct Azure Requests~~
- ❌ ~~Vite Permission Issues~~
- ✅ **Clean Proxy Architecture**
- ✅ **Consistent Behavior**
- ✅ **Production Ready**
- ✅ **Reliable Build Process**

## Troubleshooting

### Build Issues
If you see "Permission denied" errors:
- The project now uses `build.js` (Node.js API) instead of vite binary
- This avoids Linux permission issues entirely

### CORS Issues
- Should not occur with the proxy setup
- Check server logs in Render dashboard if issues persist

### Connection Issues
- Verify the Azure endpoint is accessible: `https://int1aa.azurewebsites.net/integrations/monthly.asmx`
- Check Render service logs for proxy request details
