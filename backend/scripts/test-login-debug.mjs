import { PrismaClient } from '@prisma/client';
import { verifyPassword, hashPassword } from '../api/services/auth.js';

const prisma = new PrismaClient();

async function testPassword() {
  const email = 'admin1@hackeandoelsistema.net';
  const password = '2sl4z0aPxT700NOso6rCPCP1sfmxgCTw';

  let user = await prisma.user.findFirst({ where: { email } });
  console.log('User found in DB:', Boolean(user));
  
  if (user) {
    const isValid = await verifyPassword(user.passwordHash, password);
    console.log('Password is valid:', isValid);
    console.log('User status:', user.status);
    console.log('Failed login count:', user.failedLoginCount);
    console.log('Locked until:', user.lockedUntil);
  }

  // Force reset user password and reset lockout
  const newHash = await hashPassword(password);
  await prisma.user.update({
    where: { email },
    data: {
      passwordHash: newHash,
      failedLoginCount: 0,
      lockedUntil: null,
      status: 'ACTIVE',
    },
  });
  console.log('RE-RESET PASSWORD AND UNLOCKED SUCCESSFULLY FOR admin1@hackeandoelsistema.net');
}

testPassword().finally(() => prisma.$disconnect());
