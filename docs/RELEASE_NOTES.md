# Notes de version

## 1.0.5 — 2026-08-07

### Android
- `versionName` **1.0.5** · `versionCode` **6**
- `google-services.json` mis à jour (empreintes / OAuth Google)
- Build AAB à uploader sur le **test fermé** Play

### Play Store (FR)
Voir `RELEASE_NOTES.md` dans le projet Android.

---

## 1.0.4 — 2026-08-07

### Pour les utilisateurs
- **Emplois** dans la recherche et le fil Communauté
- **Barre de recherche** dans la Communauté (Android) pour filtrer toutes les annonces
- **Pièces jointes** dans la messagerie services (comme le chat voyageurs)
- **Boutiques** : catégorie *Vêtements et accessoires*
- **Paiements de services** : devis / demande de paiement (carte, Interac, mobile)
- Correctifs KYC, navigation et stabilité

### Ops
- `prisma/neon-service-payments.sql` — paiements services (si absent en prod)
- `prisma/neon-job-match.sql` — champs emploi si besoin
- `prisma/neon-direct-messages.sql` — DM si besoin
