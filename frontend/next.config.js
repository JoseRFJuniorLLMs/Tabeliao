/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/tabeliao",
  output: "export",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
