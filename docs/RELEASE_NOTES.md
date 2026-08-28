# Notes de version

## 1.0.17 — 2026-08-26

### Android
- `versionName` **1.0.17** · `versionCode` **20**
- Annoncer : annonce, événement, communiqué
- Fil Communauté : voyages, colis, services et annonces
- Suppression d’un fichier dans Messages
- Build AAB à uploader sur Play (test fermé)

### Play Store — texte à coller

**FR**
```
Nouveautés Rfacto 1.0.17

• Annoncer : publiez une annonce, un événement ou un communiqué
• Fil Communauté : voyages, colis, services et vos annonces
• Publier : Transporter, Expédier ou proposer un service
• Messages : supprimez un fichier envoyé par erreur
• Notes vocales, réactions emoji, partage WhatsApp / Telegram
```

**EN**
```
What's new in Rfacto 1.0.17

• Announce: post an announcement, event or press note
• Community feed: trips, parcels, services and your posts
• Publish: travel, ship a parcel, or offer a service
• Messages: delete a file you sent by mistake
• Voice notes, emoji reactions, share to WhatsApp / Telegram
```

---

## 1.0.16 — 2026-08-23

### Android
- `versionName` **1.0.16** · `versionCode` **19**
- Manifeste audio-only : plus de caméra / projection d’écran dans le bundle Play.
- Partage et transfert des fichiers / messages (WhatsApp, Telegram, autres contacts)
- Arrêt de la lecture vocale dès qu’un enregistrement commence
- Réactions emoji + réécoute avant envoi
- Build AAB à uploader sur Play (test fermé / production)

### Play Store — texte à coller

**FR**
```
Nouveautés Rfacto 1.0.16

• In — le réseau des opportunités : chat, répertoire et appels
• Connexion SMS en Afrique ; invitez vos contacts sur In
• Notes vocales (réécoute avant envoi), réactions emoji
• Partage et transfert de fichiers vers WhatsApp, Telegram ou un contact Rfacto
• La lecture s’arrête dès que vous enregistrez
• Notifications plus claires (icône et sonnerie Rfacto)
• Commentaires et aperçu photo sur le fil Communauté
```

**EN**
```
What's new in Rfacto 1.0.16

• In — the network of opportunities: chat, directory and calls
• SMS sign-in in Africa; invite contacts to In
• Voice notes (listen before sending) and emoji reactions
• Share and forward files to WhatsApp, Telegram or an Rfacto contact
• Playback stops as soon as you start recording
• Clearer notifications (Rfacto icon and ringtone)
• Comments and photo previews on the Community feed
```

### Web (déjà en ligne)
- Partage / transfert DM et In
- Arrêt de la lecture avant enregistrement

---

## 1.0.15 — 2026-08-23

### Android
- `versionName` **1.0.15** · `versionCode` **16**
- Réactions emoji sur les conversations (appui long)
- Notes vocales : réécoute avant envoi
- Partage et transfert des fichiers / messages (WhatsApp, Telegram, autres contacts)
- Build AAB à uploader sur Play (test fermé / production)

### Play Store — texte à coller

**FR**
```
Nouveautés Rfacto 1.0.15

• Réactions emoji sur les messages (appui long, comme WhatsApp)
• Notes vocales : réécoutez avant d’envoyer
• Partagez photos, fichiers et notes vocales vers WhatsApp, Telegram ou un autre contact Rfacto
```

**EN**
```
What's new in Rfacto 1.0.15

• Emoji reactions on messages (long-press, like WhatsApp)
• Voice notes: listen before sending
• Share photos, files and voice notes to WhatsApp, Telegram or another Rfacto contact
```

### Web (déjà en ligne)
- Réactions DM / In
- Lecture des notes vocales Android dans le navigateur
- Aperçu vocal avant envoi
- Partage et transfert des fichiers dans Messages et In

---

## 1.0.14 — 2026-08-22

### Android
- `versionName` **1.0.14** · `versionCode` **15**
- **In** : chat, répertoire, appels (barre d’icônes style WhatsApp)
- Connexion SMS pour toute l’Afrique ; Europe / Amériques / Asie gardent email + SMS + Google
- Invitation In : message réseau pro + visuel `/share/in` (aperçu WhatsApp)
- Build AAB à uploader sur Play (test fermé / production)

### Play Store — texte à coller

**FR**
```
Nouveautés Rfacto 1.0.14

• In — le réseau des opportunités : chat, répertoire et appels
• Connexion par SMS dans toute l’Afrique
• Invitez vos contacts sur In avec un visuel Rfacto + In
```

**EN**
```
What's new in Rfacto 1.0.14

• In — the network of opportunities: chat, directory and calls
• SMS sign-in across Africa
• Invite contacts to In with the Rfacto + In visual
```

### Web (ce déploiement)
- Admin : membres In, filtres, recherche par numéro, retirer In
- Landing `/share/in` + image Open Graph pour les invitations

---

## 1.0.13 — 2026-08-16

### Android
- `versionName` **1.0.13** · `versionCode` **14**
- Notifications : icône Rfacto (barre d’état) + sonnerie dédiée + logo en grande icône
- Jetons FCM enregistrés côté API ; alertes proximité via GPS
- Partage communauté : l’aperçu WhatsApp/Facebook montre la photo de la publication
- Commentaires sur les cartes du fil (annonces incluses)
- Build AAB à uploader sur Play (test fermé / production)

### Play Store — texte à coller

**FR**
```
Nouveautés Rfacto 1.0.13

• Notifications plus claires : icône Rfacto dans la barre d’état et sonnerie dédiée
• Messages et alertes plus fiables, y compris en arrière-plan
• En partageant une publication, vos contacts voient la photo de l’annonce
• Commentaires possibles directement sur les cartes du fil Communauté
```

**EN**
```
What's new in Rfacto 1.0.13

• Clearer notifications: Rfacto status-bar icon and a dedicated ringtone
• More reliable messages and alerts, including in the background
• Shared posts now show the listing photo, not the generic ad image
• Comment directly on Community feed cards
```

### Web (déjà poussé sur `main`)
- `467dcf3` — `/api/devices/fcm` + `/api/presence/location` + canaux FCM v3
- `77f37d2` — image de publication pour les aperçus de partage

---

## 1.0.8 — 2026-08-09

### Android
- `versionName` **1.0.8** · `versionCode` **9**
- Recherche **Rencontre privée** dans le hub dashboard
- Espace Héraut : filleuls / KPI stables ; KYC non requis pour lire les stats
- Build AAB à uploader sur le **test fermé** Play

### Web (déjà en prod / à déployer)
- Filtre recherche rencontre privée + admin KPI profils rencontre
- Correctif crash dashboard Héraut + comptage filleuls (`f8f0976`)

### Play Store (FR)
Voir `RELEASE_NOTES.md` dans le projet Android.

### Ops (si absent en prod Neon)
- `prisma/neon-meet-profiles.sql`
- `prisma/neon-herald-commissions.sql`
- `prisma/neon-wallet-payout.sql`

---

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
