import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = "hareselimovic@gmail.com";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    async beforeCreateUser({ user }: { user: { email: string } }) {
      if (user.email === ADMIN_EMAIL) return;
      const allowed = await prisma.whitelistEmail.findUnique({ where: { email: user.email } });
      if (!allowed) throw new Error("Your email is not on the access list. Contact the administrator.");
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
    "http://localhost:3005",
    "http://localhost:3006",
    "http://localhost:3007",
    "http://localhost:3008",
    "http://localhost:3009",
    "https://smartstay.vercel.app",
  ],
});

export type Session = typeof auth.$Infer.Session;
