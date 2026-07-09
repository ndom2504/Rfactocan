# Rfacto (RapidFacto)

Plateforme web de mise en relation entre **voyageurs** et **expéditeurs** pour transporter des colis du **Canada vers l'Afrique**.

MVP sans paiement in-app : authentification, annonces, matching, réservations, messagerie, notations, admin.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Prisma + **Neon Postgres**
- Auth session JWT (cookie httpOnly)
- Déploiement front : **Vercel**
- API REST sous `/api/*` (contrat stable pour une future app Expo Android)

## Démarrage local

```bash
npm install
cp .env.example .env
# Renseigne DATABASE_URL + DIRECT_URL (Neon) et AUTH_SECRET
npm run db:setup
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

### Variables d'environnement (local + Vercel)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL Neon **pooled** (`…-pooler…`) |
| `DIRECT_URL` | URL Neon **directe** (sans `-pooler`, pour Prisma) |
| `AUTH_SECRET` | Secret long aléatoire pour les sessions |

Sur Vercel : Project → Settings → Environment Variables — ajouter les 3 ci-dessus (Production + Preview).

Root Directory Vercel : **laisser vide** (app à la racine du repo).

### Comptes démo

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@rfacto.ca | password123 |
| Voyageur | voyageur@rfacto.ca | password123 |
| Expéditeur | expediteur@rfacto.ca | password123 |

## Fonctionnalités MVP

- Inscription / connexion (email)
- Profils + rôles (expéditeur, voyageur, les deux, admin)
- Publication de voyages et de demandes de colis
- Upload photos (local `/public/uploads` — à remplacer par stockage cloud en prod)
- Matching score (destination, date, poids, prix, note)
- Réservation : proposer → accepter/refuser (checklist douanière) → suivi des statuts
- Messagerie par réservation (polling)
- Notations après livraison
- Admin : vérifier / suspendre utilisateurs, signalements

## Structure

```
app/
  (marketing)/     Landing
  (auth)/          Login / register
  (app)/           Dashboard authentifié
  api/             API JSON
components/
lib/               auth, prisma, matching, supabase
prisma/
```

## Déploiement Vercel + Neon

1. Créer une base Neon et copier les connection strings
2. Pousser le schéma : `npm run db:setup` (une fois depuis ta machine)
3. Connecter le repo GitHub à Vercel
4. Ajouter `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` dans Vercel
5. Deploy (Root Directory vide)

## Hors MVP (V2)

Paiement escrow Stripe, Mobile Money, KYC passeport, QR codes, Expo Android, stockage images cloud.
