import bcrypt from "bcryptjs";
import { prisma } from "../src/client.js";

async function main() {
  const email = "admin@accessscan.local";
  const passwordHash = await bcrypt.hash("admin1234", 12);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Admin", passwordHash, role: "ADMIN" },
  });
  console.log(`Seeded admin user: ${email} / admin1234`);
}

main().finally(() => prisma.$disconnect());
