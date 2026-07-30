import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt" },
  trustHost: true, // required behind a proxy (Vercel)
  callbacks: {
    // Only the site owner's GitHub account may sign in — every other GitHub
    // account is rejected right here, so "has a session" implies "is the owner"
    // everywhere else in the app (no separate role check needed downstream).
    async signIn({ profile }) {
      return profile?.login === process.env.AUTH_OWNER_GITHUB_LOGIN;
    },
    // Read by middleware.ts: returning false redirects the request to the
    // sign-in page for whatever routes middleware's `matcher` protects.
    authorized: ({ auth }) => !!auth,
  },
});
