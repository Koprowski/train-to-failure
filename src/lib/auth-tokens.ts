import { createHash, randomBytes } from "node:crypto";
import { prismaBase } from "@/lib/prisma";

const DEFAULT_EXPIRY_MINUTES = 60;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createRawToken() {
  return randomBytes(32).toString("hex");
}

export async function issueAuthToken({
  identifier,
  expiresInMinutes = DEFAULT_EXPIRY_MINUTES,
}: {
  identifier: string;
  expiresInMinutes?: number;
}) {
  const rawToken = createRawToken();
  const token = hashToken(rawToken);
  const expires = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  await prismaBase.verificationToken.deleteMany({ where: { identifier } });
  await prismaBase.verificationToken.create({
    data: {
      identifier,
      token,
      expires,
    },
  });

  return { rawToken, expires };
}

export async function consumeAuthToken(rawToken: string) {
  const token = hashToken(rawToken);
  const record = await prismaBase.verificationToken.findUnique({ where: { token } });

  if (!record) {
    return null;
  }

  await prismaBase.verificationToken.delete({ where: { token } });

  if (record.expires < new Date()) {
    return null;
  }

  return record;
}
