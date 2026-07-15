/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium", "playwright", "playwright-core"],
    outputFileTracingIncludes: {
      "/api/system-tests/run": ["./node_modules/@sparticuz/chromium/bin/**"],
    },
  },
};

export default nextConfig;
