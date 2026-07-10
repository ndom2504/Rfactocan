export type Locale = "fr" | "en";

export const LOCALES: Locale[] = ["fr", "en"];
export const LOCALE_COOKIE = "rfacto_locale";

const dict = {
  fr: {
    // Nav
    nav_dashboard: "Tableau de bord",
    nav_trips: "Voyages",
    nav_requests: "Demandes",
    nav_bookings: "Réservations",
    nav_messages: "Messages",
    nav_profile: "Profil",
    nav_admin: "Admin",
    nav_login: "Connexion",
    nav_signup: "Créer un compte",
    verified: "Vérifié",
    logout: "Déconnexion",
    open: "Ouvrir",
    save: "Enregistrer",
    cancel: "Annuler",
    loading: "Chargement…",
    search: "Rechercher",
    reset: "Réinitialiser",
    details: "Détails",
    match: "Matcher",
    publish: "Publier",
    edit: "Modifier",
    delete: "Supprimer",
    save_changes: "Enregistrer les modifications",
    edit_trip: "Modifier le voyage",
    edit_request: "Modifier la demande",
    delete_confirm_trip:
      "Supprimer ce voyage ? Il ne sera plus visible. Les réservations actives empêchent la suppression.",
    delete_confirm_request:
      "Supprimer cette demande ? Elle ne sera plus visible. Les réservations actives empêchent la suppression.",
    deleted_ok: "Publication supprimée.",
    my_listing: "Ma publication",
    my_trips: "Mes voyages",
    my_requests: "Mes demandes",
    show_all_trips: "Tous les voyages",
    show_all_requests: "Toutes les demandes",
    cannot_delete_active:
      "Impossible de supprimer : une réservation active est en cours.",
    all: "Tous",
    all_f: "Toutes",

    // Notifications
    notifications: "Notifications",
    no_notifications: "Aucune notification",
    mark_all_read: "Tout marquer lu",

    // Common fields
    language: "Langue",
    currency: "Devise",
    preferred_currency: "Devise préférée",
    airline: "Compagnie",
    flight_number: "N° de vol",
    airport_from: "Aéroport de départ",
    airport_to: "Aéroport d'arrivée",
    price_per_kg: "Prix / kg",
    weight_kg: "Poids (kg)",
    weight_available: "Poids disponible (kg)",
    departure_date: "Date de départ",
    accepted_goods: "Objets acceptés",
    notes: "Notes",
    display_name: "Nom affiché",
    bio: "Bio",
    role: "Rôle",
    role_sender: "Expéditeur",
    role_traveler: "Voyageur",
    role_both: "Les deux",
    country: "Pays",
    city: "Ville",
    region: "Région",
    photo: "Photo de profil",
    no_photo: "Aucune",
    remove_photo: "Retirer la photo",
    uploading: "Téléversement…",

    // Dashboard
    hello: "Bonjour",
    dashboard_subtitle:
      "Gérez vos voyages, demandes et réservations internationales.",
    search_travelers: "Recherche rapide de voyageurs",
    search_travelers_hint:
      "Filtrez par nom, pays, ville ou région (départ ou arrivée).",
    search_placeholder: "Nom, ville, compagnie…",
    search_requests: "Recherche rapide de demandes",
    search_requests_hint:
      "Filtrez les colis à transporter par nom, pays, ville ou région.",
    search_requests_placeholder: "Nom, ville, description…",
    requests_found: "demande(s) trouvée(s)",
    no_requests_found:
      "Aucune demande pour ces critères. Élargissez la région ou la ville.",
    view_request: "Voir la demande",
    publish_trip: "Publier un voyage",
    publish_request: "Publier une demande",
    recent_activity: "Activité récente",
    open_trips: "Voyages ouverts",
    open_requests: "Demandes ouvertes",
    avg_rating: "Note moyenne",
    no_bookings_yet:
      "Aucune réservation pour le moment. Publiez un voyage ou une demande pour commencer.",
    travelers_found: "voyageur(s) trouvé(s)",
    no_travelers: "Aucun voyageur pour ces critères. Élargissez la région ou la ville.",
    view_trip: "Voir le voyage",
    payment_checklist: "Parcours paiement",
    payment_ready: "Prêt à recevoir des paiements",
    payment_steps_needed: "Étapes restantes pour encaisser",
    complete_in_profile: "Compléter dans Profil",
    stripe_demo:
      "Stripe n'est pas configuré sur ce serveur (mode démo).",
    kyc_step: "Identité vérifiée (KYC)",
    bank_step: "Compte bancaire lié (Stripe Express)",
    payouts_step: "Virements activés",

    liability_title: "Notre rôle, clairement",
    liability_intro:
      "Rfacto met en relation et sécurise les comptes. Le colis reste sous la responsabilité des parties.",
    liability_we_do: "Ce que Rfacto fait",
    liability_we_do_1: "Mettre en relation voyageurs et expéditeurs",
    liability_we_do_2: "Vérifier les identités (KYC) et sécuriser les paiements",
    liability_we_do_3: "Messagerie, suivi et signalement entre utilisateurs",
    liability_you_do: "Ce que vous faites",
    liability_you_do_1: "Décrire honnêtement le colis et le voyage",
    liability_you_do_2: "Respecter les règles douanières et les lois locales",
    liability_you_do_3: "Inspecter, remettre et réceptionner le colis",
    liability_we_dont: "Ce que Rfacto n'est pas",
    liability_we_dont_1: "Pas un transporteur ni un commissionnaire de transport",
    liability_we_dont_2: "Pas responsable du contenu, de la perte ou des dommages du colis",
    liability_we_dont_3: "Pas garant des délais aériens ou douaniers",
    liability_learn_more: "Comprendre notre responsabilité",
    liability_compact:
      "Rfacto connecte et sécurise les utilisateurs, mais n'est pas responsable des colis.",
    liability_page_title: "Politique de responsabilité",
    liability_page_lead:
      "Comme une place de marché : nous facilitons la rencontre et la confiance. Nous ne transportons pas vos colis.",
    liability_analogy_title: "Une image simple",
    liability_analogy_text:
      "Pensez à une plateforme qui met en relation un conducteur et un passager : elle organise la rencontre et le paiement sécurisé, mais ce n'est pas elle qui conduit. Sur Rfacto, c'est pareil : nous connectons un voyageur qui a de la place et un expéditeur qui a un colis. Le transport physique reste un accord entre vous deux.",
    liability_page_we_do_4: "Bloquer les fonds en séquestre jusqu'à confirmation de livraison",
    liability_page_you_do_4: "Ne transporter que des biens autorisés et déclarés",
    liability_page_we_dont_4: "Pas d'assurance colis automatique incluse dans le service",
    liability_safety_title: "Sécurité des utilisateurs",
    liability_safety_text:
      "Nous investissons dans la vérification d'identité, les paiements sécurisés, la messagerie liée à chaque réservation et les outils de signalement. Cela protège les personnes et les transactions — pas le contenu matériel du bagage.",
    liability_remember_title: "À retenir",
    liability_remember_text:
      "En utilisant Rfacto, vous acceptez que la plateforme soit un intermédiaire technologique. Toute responsabilité liée au colis (contenu, emballage, perte, vol, dommages, retards, douanes) incombe aux utilisateurs concernés, dans le respect des lois applicables.",
    back_home: "Retour à l'accueil",
    nav_responsibility: "Responsabilité",

    // Marketing
    hero_tagline:
      "Le réseau mondial qui connecte les voyageurs et les expéditeurs partout dans le monde.",
    hero_sub:
      "Chaque voyageur peut devenir un transporteur occasionnel. Chaque espace disponible dans un bagage devient une opportunité logistique.",
    cta_send: "Envoyer un colis",
    cta_travel: "Je voyage",
    section_airbnb_title: "L'Airbnb du bagage international",
    section_airbnb_text:
      "Une marketplace P2P : comme Uber connecte conducteurs et passagers, Rfacto connecte l'espace bagage des voyageurs aux besoins d'expédition des particuliers et PME.",
    step_publish: "Publiez",
    step_publish_text:
      "Annoncez votre trajet ou votre besoin de colis — d'un pays à un autre.",
    step_match: "Match mondial",
    step_match_text:
      "Score Rfacto : route, date, prix, réputation et historique de livraisons.",
    step_trust: "Confiance",
    step_trust_text:
      "KYC, paiement séquestre, messagerie et notations mutuelles.",
    dual_role_title: "Un compte, deux rôles",
    dual_role_text:
      "Envoyez un colis aujourd'hui, transportez demain. Pas de rôle figé : chaque utilisateur peut être expéditeur et voyageur.",
    phase1_title: "Phase 1 — corridors prioritaires",
    phase1_text:
      "Diaspora francophone : Canada, France, Belgique ↔ Gabon, Cameroun, Côte d'Ivoire, Sénégal, RDC — puis Europe ↔ Afrique, puis le monde entier.",
    phase1_examples:
      "Exemples déjà supportés : Montréal → Paris, New York → Dakar, Dubaï → Nairobi, Johannesburg → Douala…",
    join_rfacto: "Rejoindre Rfacto",

    // Auth
    login_title: "Connexion",
    login_subtitle: "Accédez à votre compte Rfacto",
    register_title: "Créer un compte",
    register_subtitle: "Rejoignez le réseau mondial Rfacto",
    email: "Email",
    password: "Mot de passe",
    no_account: "Pas encore de compte ?",
    have_account: "Déjà un compte ?",
    sign_in: "Se connecter",
    create_account: "Créer mon compte",

    // Trips
    trips_title: "Voyages",
    trips_subtitle:
      "Voyageurs disponibles sur tous les corridors internationaux.",
    no_trips: "Aucun voyage publié.",
    new_trip_title: "Publier un voyage",
    new_trip_subtitle:
      "Indiquez votre itinéraire et le poids disponible dans vos bagages.",
    goods_placeholder: "Vêtements, documents, produits non périssables…",
    traveler: "Voyageur",
    flight: "Vol",
    see_requests: "Voir les demandes / matcher",
    weight_available_badge: "dispo",

    // Requests
    requests_title: "Demandes de colis",
    requests_subtitle: "Besoins d'expédition publiés par les particuliers.",
    no_requests: "Aucune demande ouverte.",
    new_request_title: "Publier une demande",
    new_request_subtitle: "Décrivez le colis à envoyer.",
    description: "Description",
    urgency: "Urgence",
    desired_date: "Date souhaitée",
    parcel_photos: "Photos du colis (max 5, 2 Mo)",
    suggested_travelers: "Voyageurs suggérés",
    no_matches: "Aucun voyageur compatible pour le moment.",
    propose: "Proposer",
    no_parcel_photo: "Pas de photo",
    parcel_photo: "Colis",
    profile_photo: "Profil",

    // Bookings
    bookings_title: "Réservations",
    bookings_subtitle: "Suivez vos propositions, paiements et livraisons.",
    no_bookings: "Aucune réservation. Proposez un voyageur depuis une demande.",
    to_pay: "À payer",
    funds_held: "Fonds bloqués",
    paid: "Payé",
    pay: "Payer",
    sender: "Expéditeur",
    messaging: "Messagerie",
    messaging_hint: "Discussion liée à cette réservation",
    your_message: "Votre message…",
    send: "Envoyer",
    no_messages: "Aucun message. Présentez-vous et négociez les détails.",
    attach_file: "Joindre une image",
    attach_hint: "Images jpeg, png, webp ou gif · max 2 Mo",
    attach_failed: "Échec de l'envoi du fichier.",
    attachment_label: "Pièce jointe",
    attachment_ready: "Prêt à envoyer",
    open_attachment: "Ouvrir la pièce jointe",
    chat_closed: "Cette conversation est fermée.",
    tracking_title: "Suivi de commande",
    tracking_hint:
      "Timeline dès la mise en relation. Le voyageur peut partager sa position GPS pendant le transit.",
    tracking_current: "Étape actuelle",
    tracking_history: "Historique",
    tracking_empty: "Aucun événement pour l'instant.",
    geo_title: "Géolocalisation",
    share_location: "Partager ma position",
    last_position: "Dernière position",
    no_position: "Aucune position partagée pour le moment.",
    open_map: "Voir sur la carte",
    geo_consent:
      "Votre position est partagée uniquement avec l'autre partie de cette réservation.",
    geo_denied: "Permission de localisation refusée par le navigateur.",
    geo_failed: "Impossible d'obtenir la position.",
    geo_unsupported: "La géolocalisation n'est pas supportée sur cet appareil.",
    back_bookings: "Retour aux réservations",
    pay_secure: "Payer et sécuriser le colis",
    pay_stripe: "Payer avec Stripe",
    retry_payment: "Réessayer le paiement",
    total: "Total",
    commission: "Commission Rfacto",
    traveler_receives: "Voyageur recevra",
    awaiting_sender_payment: "En attente du paiement sécurisé de l'expéditeur.",
    accept_ask_payment: "Accepter (demander paiement)",
    refuse: "Refuser",
    handed_over: "Colis remis",
    handover_title: "Remise du colis (QR)",
    handover_hint:
      "L'expéditeur affiche le QR. Le voyageur le scanne ou saisit le code pour confirmer la prise en charge.",
    handover_generate: "Générer le QR de remise",
    handover_refresh: "Régénérer le QR",
    handover_code: "Code",
    handover_expires: "Expire le",
    handover_show_traveler: "Montrez ce QR (ou le code) au voyageur.",
    handover_traveler_hint:
      "Scannez le QR de l'expéditeur avec l'appareil photo, ou saisissez le code ci-dessous.",
    handover_enter_code: "Code de remise",
    handover_confirm: "Confirmer la remise",
    handover_confirm_prompt:
      "Confirmez uniquement si vous avez physiquement reçu le colis.",
    handover_done: "Remise confirmée.",
    handover_expired: "Ce QR a expiré. Demandez un nouveau code à l'expéditeur.",
    handover_wrong_role:
      "Connectez-vous avec le compte voyageur de cette réservation pour confirmer.",
    handover_login_required:
      "Connectez-vous pour confirmer la remise du colis.",
    handover_manual: "Confirmer sans QR",
    handover_qr_alt: "QR code de remise",
    in_transit: "En transit",
    mark_delivered: "Marquer livré (libère le paiement)",
    leave_review: "Noter l'autre partie",
    rating: "Note",
    comment: "Commentaire",
    send_review: "Envoyer l'avis",
    review_thanks: "Merci, votre avis a été enregistré.",
    traveler_verified: "Voyageur vérifié",
    accept_hint:
      "Après acceptation, l'expéditeur paiera en séquestre. Les fonds ne vous seront versés qu'après confirmation de livraison.",
    goods_cert:
      "Je confirme avoir inspecté le contenu du colis et n'accepter que des biens conformes.",
    customs_ack:
      "Je respecte les lois douanières des pays de départ, transit et arrivée.",
    kyc_connect_hint:
      "Identité vérifiée + compte bancaire (recevoir mes gains) requis. Configurez-les dans Profil.",
    payment_confirming:
      "Confirmation Stripe en cours… cette page se met à jour automatiquement.",
    payment_failed_hint:
      "Le paiement précédent a échoué. Vous pouvez réessayer.",
    funds_held_until:
      "Les fonds seront bloqués jusqu'à la confirmation de livraison.",

    // Profile
    profile_title: "Mon profil",
    trust_payments: "Confiance & paiements",
    trust_hint: "Obligatoire pour accepter des colis en tant que voyageur.",
    verify_identity: "Vérifier mon identité",
    receive_earnings: "Recevoir mes gains (compte bancaire)",
    receive_earnings_hint:
      "Ouverture d'un compte Stripe Express pour recevoir vos gains après chaque livraison (particulier, pas un commerce).",
    bank_ready:
      "Compte bancaire prêt : vous pouvez accepter des colis et recevoir vos gains après livraison.",
    payments_label: "Paiements",
    gains_ready: "Gains prêts",
    bank_to_setup: "Compte bancaire à configurer",
    account_verified: "Compte vérifié",
    profile_saved: "Profil mis à jour.",

    // Messages
    messages_title: "Messages",
    messages_subtitle: "Conversations liées à vos réservations.",

    // Status labels
    status_proposed: "Proposée",
    status_awaiting_payment: "En attente de paiement",
    status_accepted: "Acceptée (payée)",
    status_handed_over: "Remis au voyageur",
    status_in_transit: "En transit",
    status_delivered: "Livré",
    status_cancelled: "Annulée",
    status_refused: "Refusée",
    pay_requires: "Paiement requis",
    pay_authorized: "Fonds bloqués",
    pay_captured: "Payé / transféré",
    pay_cancelled: "Annulé",
    pay_refunded: "Remboursé",
    pay_failed: "Échoué",
    urgency_low: "Faible",
    urgency_normal: "Normale",
    urgency_high: "Élevée",
    urgency_urgent: "Urgente",
  },
  en: {
    nav_dashboard: "Dashboard",
    nav_trips: "Trips",
    nav_requests: "Requests",
    nav_bookings: "Bookings",
    nav_messages: "Messages",
    nav_profile: "Profile",
    nav_admin: "Admin",
    nav_login: "Log in",
    nav_signup: "Sign up",
    verified: "Verified",
    logout: "Log out",
    open: "Open",
    save: "Save",
    cancel: "Cancel",
    loading: "Loading…",
    search: "Search",
    reset: "Reset",
    details: "Details",
    match: "Match",
    publish: "Publish",
    edit: "Edit",
    delete: "Delete",
    save_changes: "Save changes",
    edit_trip: "Edit trip",
    edit_request: "Edit request",
    delete_confirm_trip:
      "Delete this trip? It will no longer be visible. Active bookings block deletion.",
    delete_confirm_request:
      "Delete this request? It will no longer be visible. Active bookings block deletion.",
    deleted_ok: "Listing deleted.",
    my_listing: "My listing",
    my_trips: "My trips",
    my_requests: "My requests",
    show_all_trips: "All trips",
    show_all_requests: "All requests",
    cannot_delete_active:
      "Cannot delete: an active booking is in progress.",
    all: "All",
    all_f: "All",

    notifications: "Notifications",
    no_notifications: "No notifications",
    mark_all_read: "Mark all read",

    language: "Language",
    currency: "Currency",
    preferred_currency: "Preferred currency",
    airline: "Airline",
    flight_number: "Flight number",
    airport_from: "Departure airport",
    airport_to: "Arrival airport",
    price_per_kg: "Price / kg",
    weight_kg: "Weight (kg)",
    weight_available: "Available weight (kg)",
    departure_date: "Departure date",
    accepted_goods: "Accepted items",
    notes: "Notes",
    display_name: "Display name",
    bio: "Bio",
    role: "Role",
    role_sender: "Sender",
    role_traveler: "Traveler",
    role_both: "Both",
    country: "Country",
    city: "City",
    region: "Region",
    photo: "Profile photo",
    no_photo: "None",
    remove_photo: "Remove photo",
    uploading: "Uploading…",

    hello: "Hello",
    dashboard_subtitle:
      "Manage your trips, requests and international bookings.",
    search_travelers: "Quick traveler search",
    search_travelers_hint:
      "Filter by name, country, city or region (origin or destination).",
    search_placeholder: "Name, city, airline…",
    search_requests: "Quick request search",
    search_requests_hint:
      "Filter parcels to carry by name, country, city or region.",
    search_requests_placeholder: "Name, city, description…",
    requests_found: "request(s) found",
    no_requests_found:
      "No requests for these filters. Broaden the region or city.",
    view_request: "View request",
    publish_trip: "Post a trip",
    publish_request: "Post a request",
    recent_activity: "Recent activity",
    open_trips: "Open trips",
    open_requests: "Open requests",
    avg_rating: "Average rating",
    no_bookings_yet:
      "No bookings yet. Post a trip or a request to get started.",
    travelers_found: "traveler(s) found",
    no_travelers:
      "No travelers for these filters. Broaden the region or city.",
    view_trip: "View trip",
    payment_checklist: "Payment readiness",
    payment_ready: "Ready to receive payments",
    payment_steps_needed: "Steps left to get paid",
    complete_in_profile: "Complete in Profile",
    stripe_demo: "Stripe is not configured on this server (demo mode).",
    kyc_step: "Identity verified (KYC)",
    bank_step: "Bank account linked (Stripe Express)",
    payouts_step: "Payouts enabled",

    liability_title: "Our role, clearly",
    liability_intro:
      "Rfacto matches people and secures accounts. The parcel remains the parties' responsibility.",
    liability_we_do: "What Rfacto does",
    liability_we_do_1: "Connect travelers and senders",
    liability_we_do_2: "Verify identities (KYC) and secure payments",
    liability_we_do_3: "Messaging, tracking and user reporting",
    liability_you_do: "What you do",
    liability_you_do_1: "Describe the parcel and trip honestly",
    liability_you_do_2: "Follow customs rules and local laws",
    liability_you_do_3: "Inspect, hand over and receive the parcel",
    liability_we_dont: "What Rfacto is not",
    liability_we_dont_1: "Not a carrier or freight forwarder",
    liability_we_dont_2: "Not liable for parcel content, loss or damage",
    liability_we_dont_3: "Not a guarantor of airline or customs delays",
    liability_learn_more: "Understand our responsibility",
    liability_compact:
      "Rfacto connects and secures users, but is not responsible for parcels.",
    liability_page_title: "Responsibility policy",
    liability_page_lead:
      "Like a marketplace: we enable matching and trust. We do not carry your parcels.",
    liability_analogy_title: "A simple picture",
    liability_analogy_text:
      "Think of a platform that matches a driver and a rider: it organizes the meeting and secure payment, but it does not drive. On Rfacto it is the same: we connect a traveler with spare space and a sender with a parcel. Physical transport remains an agreement between you two.",
    liability_page_we_do_4: "Hold funds in escrow until delivery confirmation",
    liability_page_you_do_4: "Only carry allowed and declared goods",
    liability_page_we_dont_4: "No automatic parcel insurance included in the service",
    liability_safety_title: "User safety",
    liability_safety_text:
      "We invest in identity verification, secure payments, booking-linked messaging and reporting tools. That protects people and transactions — not the physical contents of the bag.",
    liability_remember_title: "Remember",
    liability_remember_text:
      "By using Rfacto, you accept that the platform is a technology intermediary. Any liability related to the parcel (content, packaging, loss, theft, damage, delays, customs) rests with the users involved, subject to applicable law.",
    back_home: "Back to home",
    nav_responsibility: "Responsibility",

    hero_tagline:
      "The global network connecting travelers and senders worldwide.",
    hero_sub:
      "Every traveler can become an occasional carrier. Every spare bag space becomes a logistics opportunity.",
    cta_send: "Send a parcel",
    cta_travel: "I'm traveling",
    section_airbnb_title: "The Airbnb of international baggage",
    section_airbnb_text:
      "A P2P marketplace: like Uber connects drivers and riders, Rfacto connects travelers' spare baggage space with shipping needs of individuals and SMEs.",
    step_publish: "Post",
    step_publish_text:
      "List your trip or parcel need — from any country to another.",
    step_match: "Global match",
    step_match_text:
      "Rfacto score: route, date, price, reputation and delivery history.",
    step_trust: "Trust",
    step_trust_text:
      "KYC, escrow payment, messaging and mutual ratings.",
    dual_role_title: "One account, two roles",
    dual_role_text:
      "Send a parcel today, carry tomorrow. No fixed role: every user can be both sender and traveler.",
    phase1_title: "Phase 1 — priority corridors",
    phase1_text:
      "Francophone diaspora: Canada, France, Belgium ↔ Gabon, Cameroon, Côte d'Ivoire, Senegal, DRC — then Europe ↔ Africa, then worldwide.",
    phase1_examples:
      "Already supported: Montreal → Paris, New York → Dakar, Dubai → Nairobi, Johannesburg → Douala…",
    join_rfacto: "Join Rfacto",

    login_title: "Log in",
    login_subtitle: "Access your Rfacto account",
    register_title: "Create an account",
    register_subtitle: "Join the global Rfacto network",
    email: "Email",
    password: "Password",
    no_account: "No account yet?",
    have_account: "Already have an account?",
    sign_in: "Sign in",
    create_account: "Create my account",

    trips_title: "Trips",
    trips_subtitle: "Travelers available on international corridors.",
    no_trips: "No trips published.",
    new_trip_title: "Post a trip",
    new_trip_subtitle:
      "Enter your itinerary and available baggage weight.",
    goods_placeholder: "Clothes, documents, non-perishable goods…",
    traveler: "Traveler",
    flight: "Flight",
    see_requests: "See requests / match",
    weight_available_badge: "available",

    requests_title: "Parcel requests",
    requests_subtitle: "Shipping needs posted by individuals.",
    no_requests: "No open requests.",
    new_request_title: "Post a request",
    new_request_subtitle: "Describe the parcel to send.",
    description: "Description",
    urgency: "Urgency",
    desired_date: "Desired date",
    parcel_photos: "Parcel photos (max 5, 2 MB)",
    suggested_travelers: "Suggested travelers",
    no_matches: "No matching travelers right now.",
    propose: "Propose",
    no_parcel_photo: "No photo",
    parcel_photo: "Parcel",
    profile_photo: "Profile",

    bookings_title: "Bookings",
    bookings_subtitle: "Track proposals, payments and deliveries.",
    no_bookings: "No bookings. Propose a traveler from a request.",
    to_pay: "To pay",
    funds_held: "Funds held",
    paid: "Paid",
    pay: "Pay",
    sender: "Sender",
    messaging: "Messaging",
    messaging_hint: "Chat for this booking",
    your_message: "Your message…",
    send: "Send",
    no_messages: "No messages yet. Introduce yourself and agree on details.",
    attach_file: "Attach an image",
    attach_hint: "jpeg, png, webp or gif · max 2 MB",
    attach_failed: "Failed to upload the file.",
    attachment_label: "Attachment",
    attachment_ready: "Ready to send",
    open_attachment: "Open attachment",
    chat_closed: "This conversation is closed.",
    tracking_title: "Order tracking",
    tracking_hint:
      "Timeline from match onward. The traveler can share GPS during transit.",
    tracking_current: "Current step",
    tracking_history: "History",
    tracking_empty: "No events yet.",
    geo_title: "Geolocation",
    share_location: "Share my location",
    last_position: "Last location",
    no_position: "No location shared yet.",
    open_map: "Open map",
    geo_consent:
      "Your location is shared only with the other party on this booking.",
    geo_denied: "Location permission denied by the browser.",
    geo_failed: "Could not get your location.",
    geo_unsupported: "Geolocation is not supported on this device.",
    back_bookings: "Back to bookings",
    pay_secure: "Pay and secure the parcel",
    pay_stripe: "Pay with Stripe",
    retry_payment: "Retry payment",
    total: "Total",
    commission: "Rfacto fee",
    traveler_receives: "Traveler receives",
    awaiting_sender_payment: "Waiting for the sender's secure payment.",
    accept_ask_payment: "Accept (request payment)",
    refuse: "Decline",
    handed_over: "Parcel handed over",
    handover_title: "Parcel handover (QR)",
    handover_hint:
      "The sender shows the QR. The traveler scans it or enters the code to confirm pickup.",
    handover_generate: "Generate handover QR",
    handover_refresh: "Regenerate QR",
    handover_code: "Code",
    handover_expires: "Expires",
    handover_show_traveler: "Show this QR (or code) to the traveler.",
    handover_traveler_hint:
      "Scan the sender's QR with your camera, or enter the code below.",
    handover_enter_code: "Handover code",
    handover_confirm: "Confirm handover",
    handover_confirm_prompt:
      "Confirm only if you have physically received the parcel.",
    handover_done: "Handover confirmed.",
    handover_expired: "This QR expired. Ask the sender for a new code.",
    handover_wrong_role:
      "Sign in with the traveler account for this booking to confirm.",
    handover_login_required: "Sign in to confirm the parcel handover.",
    handover_manual: "Confirm without QR",
    handover_qr_alt: "Handover QR code",
    in_transit: "In transit",
    mark_delivered: "Mark delivered (release payment)",
    leave_review: "Rate the other party",
    rating: "Rating",
    comment: "Comment",
    send_review: "Submit review",
    review_thanks: "Thanks, your review was saved.",
    traveler_verified: "Verified traveler",
    accept_hint:
      "After acceptance, the sender pays into escrow. Funds are released to you only after delivery confirmation.",
    goods_cert:
      "I confirm I inspected the parcel contents and only accept compliant goods.",
    customs_ack:
      "I comply with customs laws of departure, transit and arrival countries.",
    kyc_connect_hint:
      "Verified identity + bank account (receive earnings) required. Set them up in Profile.",
    payment_confirming:
      "Stripe confirmation in progress… this page updates automatically.",
    payment_failed_hint: "The previous payment failed. You can try again.",
    funds_held_until: "Funds are held until delivery is confirmed.",

    profile_title: "My profile",
    trust_payments: "Trust & payouts",
    trust_hint: "Required to accept parcels as a traveler.",
    verify_identity: "Verify my identity",
    receive_earnings: "Receive my earnings (bank account)",
    receive_earnings_hint:
      "Open a Stripe Express account to receive earnings after each delivery (individual, not a business).",
    bank_ready:
      "Bank account ready: you can accept parcels and receive earnings after delivery.",
    payments_label: "Payouts",
    gains_ready: "Ready",
    bank_to_setup: "Bank account to set up",
    account_verified: "Verified account",
    profile_saved: "Profile updated.",

    messages_title: "Messages",
    messages_subtitle: "Conversations linked to your bookings.",

    status_proposed: "Proposed",
    status_awaiting_payment: "Awaiting payment",
    status_accepted: "Accepted (paid)",
    status_handed_over: "Handed to traveler",
    status_in_transit: "In transit",
    status_delivered: "Delivered",
    status_cancelled: "Cancelled",
    status_refused: "Declined",
    pay_requires: "Payment required",
    pay_authorized: "Funds held",
    pay_captured: "Paid / transferred",
    pay_cancelled: "Cancelled",
    pay_refunded: "Refunded",
    pay_failed: "Failed",
    urgency_low: "Low",
    urgency_normal: "Normal",
    urgency_high: "High",
    urgency_urgent: "Urgent",
  },
} as const;

export type DictKey = keyof typeof dict.fr;

export function t(locale: Locale, key: DictKey): string {
  return dict[locale][key] ?? dict.fr[key] ?? key;
}

export function normalizeLocale(value?: string | null): Locale {
  return value === "en" ? "en" : "fr";
}

export function bookingStatusLabel(locale: Locale, status: string) {
  const map: Record<string, DictKey> = {
    PROPOSED: "status_proposed",
    AWAITING_PAYMENT: "status_awaiting_payment",
    ACCEPTED: "status_accepted",
    HANDED_OVER: "status_handed_over",
    IN_TRANSIT: "status_in_transit",
    DELIVERED: "status_delivered",
    CANCELLED: "status_cancelled",
    REFUSED: "status_refused",
  };
  const key = map[status];
  return key ? t(locale, key) : status;
}

export function paymentStatusLabel(locale: Locale, status: string) {
  const map: Record<string, DictKey> = {
    REQUIRES_PAYMENT: "pay_requires",
    AUTHORIZED: "pay_authorized",
    CAPTURED: "pay_captured",
    CANCELLED: "pay_cancelled",
    REFUNDED: "pay_refunded",
    FAILED: "pay_failed",
  };
  const key = map[status];
  return key ? t(locale, key) : status;
}

export function urgencyLabel(locale: Locale, urgency: string) {
  const map: Record<string, DictKey> = {
    LOW: "urgency_low",
    NORMAL: "urgency_normal",
    HIGH: "urgency_high",
    URGENT: "urgency_urgent",
  };
  const key = map[urgency];
  return key ? t(locale, key) : urgency;
}
