# Notes de version

## 1.0.4 — 2026-08-07

### Pour les utilisateurs
- **Emplois** dans la recherche et le fil Communauté
- **Barre de recherche** dans la Communauté (Android) pour filtrer toutes les annonces
- **Pièces jointes** dans la messagerie services (comme le chat voyageurs)
- **Boutiques** : catégorie *Vêtements et accessoires*
- **Paiements de services** : devis / demande de paiement (carte, Interac, mobile)
- Correctifs KYC, navigation et stabilité

### Play Store (FR)
Voir le bloc prêt à coller dans le dépôt Android : `RELEASE_NOTES.md` (version 1.0.4).

### Ops
- `prisma/neon-service-payments.sql` — paiements services (si absent en prod)
- `prisma/neon-job-match.sql` — champs emploi si besoin
- `prisma/neon-direct-messages.sql` — DM si besoin
