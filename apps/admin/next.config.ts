import type { NextConfig } from 'next';
import { resolve } from 'node:path';

const authApiOrigin = process.env.AUTH_API_ORIGIN ?? 'http://127.0.0.1:3000';

const workspaceRoot = process.cwd().includes('.worktrees')
  ? resolve(__dirname, '../../../..')
  : resolve(__dirname, '../..');

const nextConfig: NextConfig = {
  turbopack: {
    root: workspaceRoot,
  },
  async rewrites() {
    return [
      {
        source: '/admin/auth/:path*',
        destination: `${authApiOrigin}/admin/auth/:path*`,
      },
      {
        source: '/admin/students/:studentId/card-reissue-preview',
        destination: `${authApiOrigin}/admin/students/:studentId/card-reissue-preview`,
      },
      {
        source: '/admin/cards/reissue',
        destination: `${authApiOrigin}/admin/cards/reissue`,
      },
    ];
  },
};

export default nextConfig;
