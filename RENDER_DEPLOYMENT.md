# Render Deployment Configuration

## Issues and Solutions for Production Deployment

### 1. **CORS Issues**
The main problem when deploying to Render is that the SOAP endpoint (`https://int1aa.azurewebsites.net`) may not allow CORS requests from your Render domain.

**Solutions:**
- The app now automatically detects environment and uses direct URLs in production
- Enhanced error logging shows CORS-specific errors
- Consider setting up a backend proxy if CORS issues persist

### 2. **Environment Detection**
The app now automatically detects:
- **Development**: Uses Vite proxy (`/api/integrations/monthly.asmx`)
- **Production**: Uses direct URL (`https://int1aa.azurewebsites.net/integrations/monthly.asmx`)

### 3. **Render Build Configuration**

**Build Command:**
```bash
npm install && npm run build
```

**Publish Directory:**
```
dist
```

**Start Command:**
```bash
npx vite preview --port $PORT --host 0.0.0.0
```

### 4. **Environment Variables (Optional)**
If you need to customize the SOAP endpoint in production, set these in Render:

```
VITE_SOAP_ENDPOINT=https://int1aa.azurewebsites.net/integrations/monthly.asmx
```

### 5. **Debugging Production Issues**

1. **Check Browser Console**: The app now logs detailed request/response information
2. **Environment Panel**: Look for the blue info panel showing environment and endpoint
3. **Network Tab**: Check for CORS errors or failed requests

### 6. **Common Production Errors**

**"Failed to fetch" Error:**
- Usually indicates CORS policy blocking the request
- Check if `https://int1aa.azurewebsites.net` allows your Render domain

**Empty Responses:**
- Check SOAP endpoint availability
- Verify security tokens are valid in production

**Connection Timeouts:**
- Network connectivity issues between Render and Azure
- Consider implementing retry logic
