import { PrismaClient } from '@prisma/client';

const email = process.argv[2] || 'maquithe1@gmail.com';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, email: true, displayName: true, failedLoginCount: true, lockedUntil: true, status: true },
  });

  if (!user) {
    console.log(`User not found: ${email}`);
    return;
  }

  console.log('BEFORE:', user);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
    },
    select: { id: true, email: true, failedLoginCount: true, lockedUntil: true },
  });

  console.log('AFTER (UNLOCKED):', updated);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
