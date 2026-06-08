/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@floras/shared", "@floras/orchestrator", "@floras/ui"],
};

module.exports = nextConfig;
