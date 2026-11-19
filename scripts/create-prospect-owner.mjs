// One-time setup: the system user that holds unclaimed outreach guides (see src/lib/prospect.ts).
// No password/account row → nobody can sign in as it; no workspace → its guides appear in no dashboard.
//   node --env-file=.env scripts/create-prospect-owner.mjs
import { PrismaClient } from "@prisma/client";

const email = process.env.PROSPECT_OWNER_EMAIL ?? "outreach@smartstay.local";
const prisma = new PrismaClient();
const user = await prisma.user.upsert({
  where: { email },
  update: {},
  create: { email, name: "SmartStay outreach (sistem)", emailVerified: true },
  select: { id: true, email: true },
});
console.log("Prospect owner:", user);
await prisma.$disconnect();
