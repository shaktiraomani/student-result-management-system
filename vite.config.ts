import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const cwd = process.cwd();
  const env = loadEnv(mode, cwd, '');
  
  return {
    base: './', 
    resolve: {
      alias: {
        '@': path.resolve(cwd, './'),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      cssCodeSplit: false,
      minify: 'esbuild',
      modulePreload: false, // Turn off completely to avoid link generation
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
          entryFileNames: 'assets/[name].js',   
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
    plugins: [
      react(),
      {
        name: 'single-file-bundler',
        enforce: 'post',
        generateBundle(options, bundle) {
          const htmlFile = bundle['index.html'] as any;
          if (!htmlFile) return;
          
          let jsContent = '';
          let cssContent = '';

          // 1. EXTRACT JS AND CSS CONTENT FROM BUNDLE
          Object.keys(bundle).forEach(key => {
            const asset = bundle[key] as any;
            if (asset.type === 'chunk' && key.endsWith('.js')) {
              jsContent += asset.code;
              delete bundle[key]; // Prevent file generation
            } else if (asset.type === 'asset' && key.endsWith('.css')) {
              cssContent += asset.source;
              delete bundle[key]; // Prevent file generation
            }
          });

          // 2. CONSTRUCT NEW HTML MANUALLY
          // This ensures no stray <script src="..."> tags from Vite remain.
          // We assume the CSS/JS we extracted is all that is needed.
          
          const newHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gyan Ganga Vidhya Mandir - Result Portal</title>
    
    <!-- External CDNs -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <style>
      /* BASE STYLES FROM ORIGINAL HTML */
      body { font-family: 'Inter', sans-serif; }
      @media print {
        .no-print { display: none !important; }
        .print-only { display: block !important; }
        body { background: white; }
        .page-break { page-break-after: always; }
      }
      .print-only { display: none; }
      
      /* LOADER ANIMATION */
      .loader-text { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
      
      /* BACKGROUND BLOBS */
      .blob {
        position: absolute;
        filter: blur(40px);
        z-index: 0;
        opacity: 0.4;
      }
      .blob-1 { top: -10%; left: -10%; width: 500px; height: 500px; background: #818cf8; border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; animation: blob-float 10s infinite alternate; }
      .blob-2 { bottom: -10%; right: -10%; width: 600px; height: 600px; background: #c084fc; border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; animation: blob-float 12s infinite alternate-reverse; }
      @keyframes blob-float { 0% { transform: translate(0, 0) rotate(0deg); } 100% { transform: translate(20px, 40px) rotate(10deg); } }

      /* INJECTED APP STYLES */
      ${cssContent}
    </style>
</head>
<body class="bg-slate-50 text-slate-900">
    <div id="root">
        <!-- STATIC LOADER (Visible until React hydrates) -->
        <div style="display:flex; justify-content:center; align-items:center; height:100vh; flex-direction:column; text-align:center;">
            <h2 class="loader-text" style="color:#4f46e5; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Loading Portal...</h2>
            <p style="color:#94a3b8; font-size: 14px; margin-top: 8px;">Please wait while we connect to the server.</p>
        </div>
    </div>

    <!-- INJECT ENV VARIABLES -->
    <script>
      window.process = { env: { NODE_ENV: 'production', API_KEY: '${env.API_KEY || ''}' } };
    </script>
    
    <!-- INJECT APP SCRIPT (Safe Escape) -->
    <script type="module">
      ${jsContent.replace(/<\/script>/g, '\\x3C/script>')}
    </script>
</body>
</html>`;

          htmlFile.source = newHtml;
        }
      }
    ]
  };
});