import 'next-auth';

declare module 'next-auth' {
  /** Add a stable `id` to the session user (the provider account id). */
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
