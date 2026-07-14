# Hackeando el Sistema

Migracion WordPress a una arquitectura separada:

- `frontend/`: Next.js App Router, React, TailwindCSS, SEO, sitemap, robots, CMS UI y experiencia publica.
- `backend/`: Fastify, Prisma, MySQL, auth/RBAC, CMS API, importadores WordPress, QA operativa y scripts de preflight.
- `package.json` raiz: orquestador sin dependencias propias. Delega comandos hacia `backend` y `frontend`.

## Instalacion

```bash
npm run install:all
```

Cada app mantiene su propio lock y sus propias dependencias:

```txt
backend/package.json
backend/package-lock.json
frontend/package.json
frontend/package-lock.json
```

## Desarrollo

En terminales separadas:

```bash
npm run dev:backend
npm run dev:frontend
```

## Variables

Copiar y ajustar:

```bash
backend/.env.example -> backend/.env
frontend/.env.example -> frontend/.env
```

Para media local, el backend escribe por defecto en:

```txt
../frontend/public/uploads/cms
```

La URL publica se mantiene como:

```txt
/uploads/cms
```

## Validacion

Desde la raiz:

```bash
npm run deploy:check
```

Ese comando valida Prisma, lint, tests backend, tests frontend, build Next, smoke de rutas publicas y preflight operativo.

## Comandos utiles

```bash
npm run db:validate
npm run db:generate
npm run wp:import:core:local -- --write
npm run qa:routes:smoke
npm run ops:preflight
```
