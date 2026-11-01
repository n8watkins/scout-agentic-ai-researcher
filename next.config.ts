import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Next 16.4 `next dev` writes an AGENTS.md into the app when a coding agent runs it; keep the tree clean.
  agentRules: false,
  // libSQL ships native bindings; keep them external to the server bundle.
  serverExternalPackages: ['@libsql/client', 'libsql'],
};

export default nextConfig;
