// build.js - Node.js build script for Render
const { build } = require('vite');
const path = require('path');

async function buildProject() {
    try {
        console.log('🏗️ Starting Vite build process...');
        
        await build({
            // Build configuration
            root: __dirname,
            build: {
                outDir: 'dist',
                assetsDir: 'assets',
                sourcemap: false,
                rollupOptions: {
                    output: {
                        manualChunks: {
                            vendor: ['react', 'react-dom'],
                            mui: ['@mui/material', '@emotion/react', '@emotion/styled']
                        }
                    }
                }
            }
        });
        
        console.log('✅ Build completed successfully!');
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

buildProject();
