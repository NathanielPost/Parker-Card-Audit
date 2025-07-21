const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'SOAPAction'],
    credentials: false
}));

// Proxy configuration for SOAP requests
const soapProxyOptions = {
    target: 'https://int1aa.azurewebsites.net',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '', // Remove /api prefix when forwarding to target
    },
    onProxyReq: (proxyReq, req, res) => {
        // Log the request for debugging
        console.log(`🔄 Proxying ${req.method} ${req.url} to https://int1aa.azurewebsites.net${req.url.replace('/api', '')}`);
        
        // Ensure proper headers are set
        if (req.headers['soapaction']) {
            proxyReq.setHeader('SOAPAction', req.headers['soapaction']);
        }
        
        // Set proper origin
        proxyReq.setHeader('Origin', 'https://int1aa.azurewebsites.net');
        proxyReq.setHeader('Referer', 'https://int1aa.azurewebsites.net');
    },
    onProxyRes: (proxyRes, req, res) => {
        // Log the response for debugging
        console.log(`✅ Response from Azure: ${proxyRes.statusCode} for ${req.url}`);
        
        // Ensure CORS headers are set on the response
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, SOAPAction';
    },
    onError: (err, req, res) => {
        console.error('❌ Proxy error:', err.message);
        res.status(500).json({
            error: 'Proxy Error',
            message: err.message,
            url: req.url
        });
    }
};

// Apply SOAP proxy middleware
app.use('/api', createProxyMiddleware(soapProxyOptions));

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle client-side routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
    if (!req.url.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Serving static files from: ${path.join(__dirname, 'dist')}`);
    console.log(`🔄 Proxying /api/* requests to: https://int1aa.azurewebsites.net`);
    console.log(`🌐 Health check available at: /health`);
});
