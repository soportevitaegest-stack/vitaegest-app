# VitaeGest — correr en local (recomendado)

StackBlitz corre Next.js dentro del navegador y NO soporta bien `cookies()` /
auth de Supabase (da "cookies was called outside a request scope"). En una PC
con Node funciona sin problemas.

## Requisitos
- Node.js 18.18+ o 20+ (recomendado 20 LTS). Verificá: `node -v`

## Pasos
1. Descomprimí este proyecto en una carpeta.
2. Abrí una terminal en esa carpeta.
3. Instalá dependencias:
   npm install
4. Creá el archivo `.env.local` (copiá de `.env.local.example`) con tus datos:
   NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   NEXT_PUBLIC_APP_ENV=demo
5. Arrancá:
   npm run dev
6. Abrí http://localhost:3000 → te lleva a /login.
7. Entrá con el usuario demo (el que creaste en Supabase con Auto Confirm).

## Datos de demo
En el SQL Editor de Supabase, en orden:
1. Correr `00_migraciones_consolidadas.sql`
2. Crear el usuario demo en Authentication → Add user (Auto Confirm ON)
3. Correr `seed.sql`
Recién ahí "Mis Pacientes" muestra los 6 pacientes del demo.

## Alternativa sin instalar nada: Vercel
- Subí el proyecto a un repo (GitHub) y conectalo en vercel.com (gratis).
- En Vercel → Project → Settings → Environment Variables, cargá las 3
  NEXT_PUBLIC_* del `.env.local`.
- Deploy. La app corre en un entorno Node real y el login funciona.
