# BLITZ GAMING — Vercel EISDIR Fix

Replace `index.html` in your project root directory with the fixed `index.html` included in this package.
The issue was caused by `<link rel="canonical" href="/" />` which caused Vite 7 build tools to treat the root path as a folder instead of an absolute URL.
