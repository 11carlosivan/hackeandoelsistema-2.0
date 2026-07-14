import { PrismaClient } from '@prisma/client';

let prisma;

export function createPrismaClient(options = {}) {
  return new PrismaClient({
    log: options.log ?? ['error', 'warn'],
  });
}

export function getPrismaClient() {
  if (!prisma) {
    prisma = createPrismaClient();
  }

  return prisma;
}

export async function disconnectPrismaClient() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined;
  }
}
