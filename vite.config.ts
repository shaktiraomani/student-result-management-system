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
        
        // 1. REMOVE DEV TAGS (ImportMap & Vite Scripts)
        // Remove importmap
        html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/gi, '');
        // Remove any script tags pointing to assets (Vite generated)
        // Matches <script ... src="./assets/..."> or similar
        html = html.replace(/<script[^>]+src=["']\.\/assets\/[^"']+["'][^>]*><\/script>/gi, '');
        html = html.replace(/<script[^>]+src=["']\/assets\/[^"']+["'][^>]*><\/script>/gi, '');
        
        // 2. INLINE STYLES
        const cssFiles = Object.keys(bundle).filter(key => key.endsWith('.css'));
        let cssContent = '';
        
        for (const key of cssFiles) {
           const asset = bundle[key];
           if (asset.type === 'asset' && typeof asset.source === 'string') {
             cssContent += asset.source;
             delete bundle[key]; // Don't emit file
             
             // Remove link tag
             html = html.replace(new RegExp(`<link[^>]+href=["']\\./assets/${key.split('/').pop()}["'][^>]*>`, 'gi'), '');
             html = html.replace(new RegExp(`<link[^>]+href=["']/assets/${key.split('/').pop()}["'][^>]*>`, 'gi'), '');
           }
        }
        if (cssContent) {
           html = html.replace('</head>', `<style>${cssContent}</style></head>`);
        }

        // 3. INLINE JAVASCRIPT
        const jsFiles = Object.keys(bundle).filter(key => key.endsWith('.js'));
        let jsContent = '';
        
        for (const key of jsFiles) {
           const chunk = bundle[key];
           if (chunk.type === 'chunk') {
             jsContent += chunk.code;
             delete bundle[key]; // Don't emit file
           }
        }

        if (jsContent) {
            // Escape closing script tags within the code
            const safeJs = jsContent.replace(/<\/script>/g, '\\x3C/script>');
            
            // Robust Injection
            const scriptTag = `<script>
              window.process = { env: { NODE_ENV: 'production' } };
              try {
                ${safeJs}
              } catch(e) {
                console.error("App Crash:", e);
                document.body.innerHTML = '<div style="color:red;padding:20px;text-align:center;"><h2>Application Error</h2><p>'+e.message+'</p></div>';
              }
            </script>`;
            
            // Inject before body close
            html = html.replace('</body>', `${scriptTag}</body>`);
        }
        
        // Clean empty lines
        html = html.replace(/^\s*[\r\n]/gm, '');

        htmlFile.source = html;
      }
    }
  ],
  // Define global constants to replace variables like process.env.NODE_ENV
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': JSON.stringify({}), // Polyfill empty process.env
  },
  base: './', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        inlineDynamicImports: true, 
      }
    }
  }
});