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
| `NEXT_PUBLIC_APP_URL` | `https://rfacto.com` (redirects OAuth) |
| `GOOGLE_CLIENT_ID` | Client ID Google Cloud |
| `GOOGLE_CLIENT_SECRET` | Client Secret Google Cloud |

Sur Vercel : Project → Settings → Environment Variables — ajouter toutes les variables ci-dessus (Production).

Root Directory Vercel : **laisser vide** (app à la racine du repo).

### Auth Google (rfacto.com)

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Créer **OAuth client ID** → type **Web application**
3. Authorized JavaScript origins :
   - `https://rfacto.com`
   - `https://www.rfacto.com` (si utilisé)
   - `http://localhost:3000` (dev)
4. Authorized redirect URIs :
   - `https://rfacto.com/api/auth/google/callback`
   - `https://www.rfacto.com/api/auth/google/callback` (si utilisé)
   - `http://localhost:3000/api/auth/google/callback` (dev)
5. Copier Client ID / Secret dans Vercel + `.env`
6. Sur Neon SQL Editor, exécuter `prisma/neon-google-auth.sql` (colonne `googleId`)
7. Redeploy Vercel

Écran de consentement OAuth : type **External**, ajouter ton email comme test user tant que l'app n'est pas en production Google.

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
