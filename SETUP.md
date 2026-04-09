# Shifta — Setup Guide

## 1. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → New Project
2. Copiar la **Project URL** y la **anon/public API key**

## 2. Variables de entorno

Editar `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
NEXT_PUBLIC_APP_URL=https://tu-dominio-en-railway.up.railway.app
```

> En local usar `http://localhost:3000` para `APP_URL`.

## 3. Ejecutar el schema SQL en Supabase

1. Ir a **SQL Editor** en el dashboard de Supabase
2. Copiar y pegar el contenido de `supabase/schema.sql`
3. Ejecutar → debería crear todas las tablas, políticas RLS y funciones

## 4. Configurar Supabase Auth

En **Authentication → Settings**:
- **Site URL**: tu dominio de Railway (o `http://localhost:3000` en desarrollo)
- Desactivar "Confirm email" si querés que los usuarios entren de inmediato sin confirmar email

## 5. Deploy en Railway

El proyecto ya está configurado para Railway.

1. Push a GitHub:
   ```bash
   git add -A
   git commit -m "init: Shifta app"
   git push
   ```
2. En Railway → New Project → Deploy from GitHub → seleccionar el repo
3. Agregar las variables de entorno en Railway Settings → Variables
4. Railway detecta automáticamente Next.js y hace el build

## Flujo completo de uso

### Admin
1. Ir a `/register` → crear cuenta → se crea empresa en `/onboarding`
2. Configurar áreas, turnos y tareas en `/admin/areas`
3. Copiar link de invitación desde `/admin/settings`
4. Compartir el link con empleados

### Empleado
1. Abrir el link de invitación
2. Registrarse
3. Elegir área de trabajo
4. Ver y completar tareas en `/tasks`

## Estructura del proyecto

```
shifta/
├── app/
│   ├── (admin)/          # Panel admin (áreas, empleados, historial, config)
│   ├── (auth)/           # Login, register, invite
│   ├── (employee)/       # Dashboard del empleado
│   ├── choose-area/      # Selección de área al registrarse
│   └── onboarding/       # Crear empresa (primer admin)
├── components/
│   ├── admin/            # Sidebar, mobile nav
│   ├── employee/         # Logout button
│   └── ui/               # Button, Input, Card, Modal, Badge, Select
├── lib/
│   ├── supabase/         # client.ts, server.ts
│   ├── types.ts          # Tipos TypeScript
│   └── utils.ts          # Helpers, formatters
├── supabase/
│   └── schema.sql        # Schema completo con RLS
└── proxy.ts              # Auth routing middleware
```
