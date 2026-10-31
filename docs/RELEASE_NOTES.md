# Notes de version

## 1.0.28 — 2026-10-31

### iOS (TestFlight / Expo)
- `version` **1.0.28** (build EAS auto-incrémenté au submit)
- Messages : bouton « Faire une offre » (produit, photo optionnelle, prix) dans toute conversation
- Offres produit dans le chat : Accepter / Refuser / Proposer un autre prix, puis paiement après acceptation
- Modification d’un message non lu (Modifier / Enregistrer, mention « Modifié »)

### Android (Play)
- `versionName` **1.0.28** · `versionCode` **33**
- Offres produit et modification de messages (parité avec Expo) — code Android à appliquer dans le projet Android (`DirectChatScreen.kt`, `ApiService.kt`, `I18n.kt`, `build.gradle.kts`)

### Web
- Offres produit (bouton, formulaire, cartes avec actions) et modification des messages non lus dans le chat direct

### Play Store — texte à coller

**FR**
```
Nouveautés Rfacto 1.0.28

• Faire une offre sur un produit directement dans la conversation
• Accepter, refuser ou proposer un autre prix, puis payer
• Modifier un message non lu
```

**EN**
```
What's new in Rfacto 1.0.28

• Make a product offer right inside the conversation
• Accept, refuse or counter with another price, then pay
• Edit a message that hasn't been read yet
```

## 1.0.23 — 2026-10-30

### iOS (TestFlight / Expo)
- `version` **1.0.23** (build EAS auto-incrémenté au submit)
- Onglet Appels, dates WhatsApp, appels manqués, ringback sortant

### Android (Play)
- `versionName` **1.0.23** · `versionCode` **28**
- Onglet Appels + historique
- Appels manqués en rouge (Messages / Appels)
- Dates style WhatsApp (liste + séparateurs dans le chat)
- Sonnerie sortante + aperçu d’appel
- Admin : supprimer du fil Communauté

### Play Store — texte à coller

**FR**
```
Nouveautés Rfacto 1.0.23

• Onglet Appels : historique des appels récents
• Appels manqués indiqués en rouge dans Messages et Appels
• Dates style WhatsApp dans la liste et le fil de chat
• Sonnerie émise à l’appel sortant + aperçu plein écran
• Communauté admin : suppression des annonces du fil
```

**EN**
```
What's new in Rfacto 1.0.23

• Calls tab: recent call history
• Missed calls highlighted in Messages and Calls
• WhatsApp-style dates in the inbox and chat thread
• Outgoing ringback tone and full-screen call preview
• Admin community: remove listings from the feed
```

---

## 1.0.22 — 2026-10-28

### iOS (TestFlight / Expo) — à valider
- `version` **1.0.22** (build EAS auto-incrémenté au submit)
- Tester d’abord dans **Expo Go** : Messages (aperçu réponse, switch de compte, invitation Play/App Store), Communauté (en-tête, connexions, date relative)
- Puis `npm run eas:ios` + `eas submit` pour TestFlight

### Android (Play)
- `versionName` **1.0.22** · `versionCode` **27**
- Changement de compte : messages, profil, fichiers et paramètres suivent le compte actif
- Messages : aperçu du dernier message après une réponse glissée
- Communauté : en-tête d’annonce alignée, date relative, compteur de connexions, menu ⋯
- Invitation Messages / répertoire : choix Android (Play Store) ou iPhone (App Store)
- Chat : statut en ligne, en train d’écrire, lu par le destinataire
- Notes vocales : durée affichée, limite 5 minutes

### Play Store — texte à coller

**FR**
```
Nouveautés Rfacto 1.0.22

• Changer de compte recharge messages, profil et paramètres
• Messages : aperçu correct après une réponse glissée
• Communauté : en-tête d’annonce plus claire, date relative, compteur de connexions
• Invitation : choix Android (Play Store) ou iPhone (App Store)
• Chat : en ligne, en train d’écrire, lu ; notes vocales (durée et limite 5 min)
```

**EN**
```
What's new in Rfacto 1.0.22

• Switching accounts reloads messages, profile and settings
• Messages: correct preview after swipe-to-reply
• Community: clearer post header, relative time, connection count
• Invite: choose Android (Play Store) or iPhone (App Store)
• Chat: online, typing, read; voice notes (duration and 5 min cap)
```

---

## 1.0.21 — 2026-10-28

### Android (Play)
- `versionName` **1.0.21** · `versionCode` **26**
- Accueil : photo de profil centrée au-dessus du nom ; indicateurs (KPI) centrés
- Communauté : mise en page plus claire ; défilement vidéo vertical ; son comme Facebook (un clip à la fois, sourdine globale)
- Actions vidéo : favori, téléchargement, partage
- Messages : liste des conversations en une seule page (plus coupée en deux)
- Invitation depuis le répertoire : feuille et liste en hauteur complète
- Appel sortant : aperçu plein écran avec la photo de profil du contact

### Play Store — texte à coller

**FR**
```
Nouveautés Rfacto 1.0.21

• Accueil : photo et nom centrés, indicateurs plus lisibles
• Communauté : vidéos en défilement vertical, son plus clair
• Favori, téléchargement et partage sur les vidéos
• Messages : historique des conversations plus complet
• Invitation contacts : liste plus facile à parcourir
• Appel : écran plein écran avec la photo du contact
```

**EN**
```
What's new in Rfacto 1.0.21

• Home: centered photo and name, clearer stats
• Community: vertical video scroll and cleaner sound
• Favorite, download and share on videos
• Messages: fuller conversation list
• Contact invite: easier full-height list
• Calls: full-screen preview with the contact photo
```

---

## 1.0.19 — 2026-10-18

### iOS / TestFlight
- `version` **1.0.19** · build auto (après **1.0.18 (17)** du 10 sept. 2026)
- Contacter un service : l’identité validée (Stripe ou pièce manuelle) est bien reconnue
- Plus de bouton « Vérifier mon identité » si le compte est déjà vérifié
- Message distinct si c’est le prestataire qui n’est pas encore vérifié

### TestFlight — What to Test

**FR**
```
1.0.19 — contact service / identité

• Contacter un service si votre identité est déjà vérifiée
• Pièce d’identité validée reconnue comme vérification
• Message clair si le prestataire n’est pas encore vérifié
```

**EN**
```
1.0.19 — service contact / identity

• Contact a service when your identity is already verified
• Admin-approved ID counts as verification
• Clear message if the provider is not verified yet
```

---

## 1.0.19 — 2026-09-24

### Android (Play — Child Safety)
- `versionName` **1.0.19** · `versionCode` **24**
- Signalement in-app (Communauté, profil membre) via `POST /api/reports`
- Motif dédié « Sécurité des enfants / CSAE »
- Profil : liens Normes de sécurité des enfants + Aide et signalement (contact@rfacto.com)
- Page publique : https://www.rfacto.com/child-safety

### Play Store — texte à coller

**FR**
```
Nouveautés Rfacto 1.0.19

• Signalement in-app dans Communauté et sur les profils
• Motif Sécurité des enfants (CSAE)
• Accès aux normes enfant et à l’aide depuis le Profil
```

**EN**
```
What's new in Rfacto 1.0.19

• In-app reporting in Community and on member profiles
• Dedicated child safety (CSAE) report reason
• Child safety standards and help from Profile
```

---

## 1.0.18 — 2026-09-10

### iOS / TestFlight
- `version` **1.0.18** (buildNumber auto-incrémenté par EAS)
- Accueil : publier un service, rechercher, mes projets
- Annoncer : événement, voyage ou service
- Police noir / gris / blanc ; vert sur boutons et cloche
- App Review 2.5.4 : retirer `audio` de `UIBackgroundModes` (notes vocales / appels au premier plan seulement)

### Android
- `versionName` **1.0.18** · `versionCode` **23**
- Onglet Mes projets (entre Accueil et Communauté)
- Accueil : publier un service + rechercher un service
- Profil membre au clic sur l’avatar (Communauté / services)
- Annoncer : événement, voyage ou service
- Police noir / gris / blanc ; vert sur boutons et cloche
- Bouton Commencer ici lisible (vert marque sur blanc)
- Build AAB à uploader sur Play (test fermé / production)

### Play Store — texte à coller

**FR**
```
Nouveautés Rfacto 1.0.18

• Onglet Mes projets entre Accueil et Communauté
• Accueil : publier un service et rechercher un service
• Profil membre au clic sur la photo dans Communauté
• Annoncer : événement, voyage ou service
• Texte noir / gris / blanc ; vert sur boutons et cloche
```

**EN**
```
What's new in Rfacto 1.0.18

• My projects tab between Home and Community
• Home: publish a service and search services
• Member profile opens from Community avatars
• Announce: event, trip or service
• Black / gray / white type; green on buttons and the bell
```

---

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
