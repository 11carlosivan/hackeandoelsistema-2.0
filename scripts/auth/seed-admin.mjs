#!/usr/bin/env node
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

import { hashPassword, normalizeEmail } from '../../api/services/auth.js';

const prisma = new PrismaClient();

const roles = [
  {
    name: 'ADMIN',
    description: 'Acceso completo al CMS y configuracion.',
    permissions: ['cms:read', 'cms:write', 'users:manage', 'posts:manage', 'seo:manage', 'media:manage'],
  },
  {
    name: 'EDITOR',
    description: 'Gestion editorial y revision de publicaciones.',
    permissions: ['cms:read', 'posts:manage', 'seo:manage', 'media:manage'],
  },
  {
    name: 'AUTHOR',
    description: 'Creacion y edicion de contenido propio.',
    permissions: ['cms:read', 'posts:create'],
  },
  {
    name: 'MEMBER',
    description: 'Acceso basico de miembro.',
    permissions: ['account:read'],
  },
];

async function upsertRoleWithPermissions(roleInput) {
  const role = await prisma.role.upsert({
    where: { name: roleInput.name },
    create: {
      name: roleInput.name,
      description: roleInput.description,
    },
    update: {
      description: roleInput.description,
    },
  });

  for (const permissionKey of roleInput.permissions) {
    const permission = await prisma.permission.upsert({
      where: { permissionKey },
      create: {
        permissionKey,
        description: `${roleInput.name} permission ${permissionKey}`,
      },
      update: {},
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permission.id,
        },
      },
      create: {
        roleId: role.id,
        permissionId: permission.id,
      },
      update: {},
    });
  }

  return role;
}

async function main() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL);
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password || password.length < 12) {
    throw new Error('ADMIN_EMAIL y ADMIN_PASSWORD de al menos 12 caracteres son obligatorios.');
  }

  const roleRecords = new Map();

  for (const role of roles) {
    roleRecords.set(role.name, await upsertRoleWithPermissions(role));
  }

  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash: await hashPassword(password),
      displayName: 'Administrador HES',
      username: 'admin',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      passwordChangedAt: new Date(),
    },
    update: {
      passwordHash: await hashPassword(password),
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      passwordChangedAt: new Date(),
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: roleRecords.get('ADMIN').id,
      },
    },
    create: {
      userId: admin.id,
      roleId: roleRecords.get('ADMIN').id,
    },
    update: {},
  });

  console.log(`Admin listo: ${email}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
