import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'gas-inline-build',
      enforce: 'post',
      generateBundle(options, bundle) {
        const htmlFile = bundle['index.html'];
        if (!htmlFile || htmlFile.type !== 'asset') return;
        
        let html = htmlFile.source as string;
        
        // 1. INLINE STYLES (CSS)
        const cssFiles = Object.keys(bundle).filter(key => key.endsWith('.css'));
        let cssContent = '';
        
        for (const key of cssFiles) {
           const asset = bundle[key];
           if (asset.type === 'asset' && typeof asset.source === 'string') {
             cssContent += asset.source;
             delete bundle[key]; // Prevent emitting file
             
             // Remove <link href="./assets/filename.css">
             const filename = key.split('/').pop();
             // Match link tag with loose attribute order
             const regex = new RegExp(`<link[^>]*href="[^"]*${filename}"[^>]*>`, 'i');
             html = html.replace(regex, '');
           }
        }
        
        if (cssContent) {
           html = html.replace('</head>', `<style>${cssContent}</style></head>`);
        }

        // 2. INLINE JAVASCRIPT (JS)
        const jsFiles = Object.keys(bundle).filter(key => key.endsWith('.js'));
        let jsContent = '';
        
        for (const key of jsFiles) {
           const chunk = bundle[key];
           if (chunk.type === 'chunk') {
             jsContent += chunk.code;
             delete bundle[key]; // Prevent emitting file
             
             // Remove <script src="./assets/filename.js">
             const filename = key.split('/').pop();
             // Match script tag with loose attribute order and optional type
             const regex = new RegExp(`<script[^>]*src="[^"]*${filename}"[^>]*>\\s*<\\/script>`, 'i');
             html = html.replace(regex, '');
           }
        }

        if (jsContent) {
            // Escape closing script tags to prevent breaking HTML
            const safeJs = jsContent.replace(/<\/script>/g, '\\x3C/script>');
            // Inject as module to maintain ESM behavior
            html = html.replace('</body>', `<script type="module">${safeJs}</script></body>`);
        }
        
        // Cleanup: remove extra whitespace left by removals
        html = html.replace(/^\s*[\r\n]/gm, '');

        htmlFile.source = html;
      }
    }
  ],
  base: './', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    cssCodeSplit: false, // Combine CSS to simplify inlining
    assetsInlineLimit: 100000000, // Inline all images/fonts
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        inlineDynamicImports: true, // Force single JS bundle
      }
    }
  }
});