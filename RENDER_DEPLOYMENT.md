# Render Deployment Configuration

## CORS Issue Solution ✅

The CORS issue has been **SOLVED** by implementing a backend proxy server!

## How It Works

1. **Development**: Vite dev server with proxy
2. **Production**: Express.js server that serves the built files AND proxies SOAP requests

## New Architecture

```
Your Browser → Render (Express Server) → Azure SOAP Endpoint
```

The Express server acts as a middle layer that:
- Serves your React app
- Proxies SOAP requests to avoid CORS issues
- Adds proper headers and handles preflight requests

## Render Build Configuration

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm start
```

**Environment:**
- **Node.js** (not Static Site)
- Auto-deploy from Git: ✅

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
