import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      status: true,
    },
  });
  console.log('USERS_IN_DB:', JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
