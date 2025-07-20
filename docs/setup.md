# Configuració BAU Assist

## 1. Crear usuari de prova a Supabase

1. Ves a: https://supabase.com/dashboard/project/mydosupsbcehbqipimdy/auth/users
2. Clica "Add user" > "Create new user"
3. Crea un usuari amb:
   - Email: admin@bau.edu
   - Password: (la que vulguis)
   - Auto Confirm User: ✓

## 2. Executar migracions

1. Ves a: https://supabase.com/dashboard/project/mydosupsbcehbqipimdy/sql/new
2. Copia i executa el contingut de `supabase/migrations/001_initial_schema.sql`
3. Després, copia i executa el contingut de `supabase/seeds/001_demo_data.sql`

## 3. Iniciar l'aplicació

```bash
npm run dev
```

Obre: http://localhost:3000

## 4. Funcionalitats implementades

- ✅ Sistema d'autenticació
- ✅ Dashboard amb estadístiques
- ✅ Gestió d'assignatures
- ✅ Layout amb navegació lateral
- 🚧 Gestió de professors
- 🚧 Gestió d'aules
- 🚧 Sistema d'assignacions amb drag & drop
- 🚧 Detecció de conflictes
- 🚧 Generació d'informes

## 5. Propers passos

1. Completar els mòduls pendents
2. Implementar el sistema de drag & drop
3. Afegir la detecció de conflictes
4. Crear el generador d'informes
5. Configurar el desplegament a Vercel