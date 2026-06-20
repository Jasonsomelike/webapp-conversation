/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false, // enable browser source map generation during the production build
  serverExternalPackages: ['@napi-rs/canvas', 'pdf-parse', 'pdfjs-dist'],
  outputFileTracingIncludes: {
    '/api/file-upload': [
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
    ],
  },
  // Configure pageExtensions to include md and mdx
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  experimental: {
    // appDir: true,
  },
  poweredByHeader: false,
}

module.exports = nextConfig
