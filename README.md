# Bany Backend — API Blog (MongoDB)

Architecture modulaire :

```
src/
  config/          # env + connexion MongoDB
  common/          # middleware & utils partagés
  modules/
    auth/          # controller, routes, service
    articles/      # model, controller, routes, service
    categories/    # model, controller, routes, service
    newsletter/    # model, controller, routes, service
    upload/        # controller, routes, service
  seed/
  app.ts
  index.ts
```

## Prérequis

- Node.js 20+
- MongoDB local ou Atlas (`MONGODB_URI`)

## Démarrage

```bash
cd bany-backend
npm install
npm run dev
```

Serveur : `http://localhost:4000`

## Seed

```bash
npm run seed          # si base vide
npm run seed:force    # reset + reseed
```

## Admin

- Email : `admin@banytalks.com`
- Mot de passe : `BanyAdmin2026!` (voir `.env`)
