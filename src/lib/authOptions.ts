import type { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';

/**
 * Auth.js (NextAuth v4) config. GitHub-only, JWT sessions (no DB adapter — the
 * session is a signed cookie; only the user's *data* needs Turso). Auth is
 * entirely optional: with no GitHub credentials set, no providers are
 * registered, the sign-in UI hides itself, and the app stays local-first.
 */

const githubId = process.env.AUTH_GITHUB_ID;
const githubSecret = process.env.AUTH_GITHUB_SECRET;

/** True only when GitHub OAuth is configured — gates the sign-in flow + UI. */
export const authConfigured = Boolean(githubId && githubSecret);

export const authOptions: NextAuthOptions = {
  providers: authConfigured
    ? [GitHubProvider({ clientId: githubId!, clientSecret: githubSecret! })]
    : [],
  session: { strategy: 'jwt' },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  callbacks: {
    // Expose the provider account id as a stable user id for data ownership.
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
