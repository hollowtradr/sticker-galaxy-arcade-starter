import { defineConfig } from 'vite'

// ─────────────────────────────────────────────────────────────────────────────
// Vite config for the Sticker Galaxy Arcade Starter Template
//
// Defaults:
//   - Dev server on localhost:5173
//   - VITE_USE_MOCK=1  → routes all SDK calls through mock-host.ts (default for
//     local dev when no real backend session token is present)
//   - Build output: dist/
//
// When deploying your real game, set environment variables in your hosting
// platform (Vercel, Netlify, etc.) instead of this file.
// ─────────────────────────────────────────────────────────────────────────────
export default defineConfig({
  // Base path — change this if you're hosting at a sub-path (e.g. '/my-game/')
  base: '/',

  define: {
    // Expose VITE_USE_MOCK to the app at build time.
    // When running `npm run dev`, this defaults to "1" so the mock host is
    // active. Override with VITE_USE_MOCK=0 npm run dev to test against real
    // backend (requires a valid session_token in the URL).
    //
    // In production builds, set VITE_USE_MOCK=0 in your CI/hosting env.
    'import.meta.env.VITE_USE_MOCK': JSON.stringify(
      process.env.VITE_USE_MOCK ?? '1'
    ),
  },

  server: {
    port: 5173,
    open: true,
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
