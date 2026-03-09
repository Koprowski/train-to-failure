import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const email = (process.env.SEED_TEST_USER_EMAIL || "dev@example.com").trim().toLowerCase();
const password = process.env.SEED_TEST_USER_PASSWORD || "Password123!";
const name = (process.env.SEED_TEST_USER_NAME || "Dev User").trim();

async function main() {
  if (!email) {
    throw new Error("SEED_TEST_USER_EMAIL is required.");
  }

  if (password.length < 8) {
    throw new Error("SEED_TEST_USER_PASSWORD must be at least 8 characters.");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      emailVerified: new Date(),
    },
    create: {
      name,
      email,
      passwordHash,
      emailVerified: new Date(),
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  console.log(JSON.stringify({
    message: "Seeded test user",
    user,
    credentials: {
      email,
      password,
    },
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
