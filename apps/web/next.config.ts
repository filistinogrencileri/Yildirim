import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // standalone output needs symlinks; Windows dev machines block those,
  // so it is enabled only inside the Docker build (see docker/Dockerfile.web).
  output: process.env.NEXT_STANDALONE === '1' ? 'standalone' : undefined,
};

export default withNextIntl(nextConfig);
