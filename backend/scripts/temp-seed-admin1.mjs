import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../api/services/auth.js';

const prisma = new PrismaClient();

async function updateAdmin() {
  const email = 'admin1@hackeandoelsistema.net';
  const password = '2sl4z0aPxT700NOso6rCPCP1sfmxgCTw';
  const hashedPassword = await hashPassword(password);

  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });

  const user = await prisma.user.upsert({
    where: { username: 'admin1' },
    create: {
      email,
      username: 'admin1',
      displayName: 'Administrador 1',
      passwordHash: hashedPassword,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
    update: {
      email,
      passwordHash: hashedPassword,
      status: 'ACTIVE',
    },
  });

  if (adminRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: adminRole.id,
        },
      },
      create: {
        userId: user.id,
        roleId: adminRole.id,
      },
      update: {},
    });
  }

  console.log('ADMIN1_UPDATED_SUCCESSFULLY:', user.email);
}

updateAdmin().finally(() => prisma.$disconnect());
