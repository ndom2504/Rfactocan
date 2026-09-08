"""Generate the 1-to-1 audio/video calls architecture PDF."""

from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).with_name("ARCHITECTURE-APPELS-AUDIO-VIDEO.pdf")
FONT = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_B = Path(r"C:\Windows\Fonts\arialbd.ttf")

GREEN = (24, 72, 56)
INK = (28, 28, 28)
MUTED = (90, 90, 90)


class Pdf(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Body", "B", 9)
        self.set_text_color(*GREEN)
        self.cell(0, 6, "Rfacto — Architecture appels audio / vidéo 1-to-1", align="L")
        self.set_font("Body", "", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 6, "16 août 2026", align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(220, 225, 220)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-14)
        self.set_font("Body", "", 8)
        self.set_text_color(*MUTED)
        self.cell(
            0,
            8,
            f"rfacto.com  |  document interne  |  {self.page_no()}/{{nb}}",
            align="C",
        )

    def h2(self, text: str):
        self.ln(3)
        self.set_font("Body", "B", 13)
        self.set_text_color(*GREEN)
        self.multi_cell(0, 7, text)
        self.ln(1)

    def h3(self, text: str):
        self.ln(1.5)
        self.set_font("Body", "B", 11)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6, text)
        self.ln(0.4)

    def body(self, text: str):
        self.set_font("Body", "", 10)
        self.set_text_color(*INK)
        self.multi_cell(0, 5.4, text)
        self.ln(1)

    def small(self, text: str):
        self.set_font("Body", "", 8)
        self.set_text_color(50, 70, 60)
        self.set_fill_color(245, 248, 245)
        self.multi_cell(0, 4.4, text, fill=True)
        self.ln(1.5)

    def bullet(self, text: str):
        self.set_font("Body", "", 10)
        self.set_text_color(*INK)
        self.set_x(self.l_margin)
        self.cell(5, 5.4, "-")
        self.multi_cell(self.w - self.l_margin - self.r_margin - 5, 5.4, text)
        self.ln(0.3)

    def table(self, rows: list[list[str]], col_w: list[float] | None = None):
        usable = self.w - self.l_margin - self.r_margin
        n = len(rows[0])
        widths = col_w or [usable / n] * n
        for i, row in enumerate(rows):
            self.set_font("Body", "B" if i == 0 else "", 8)
            self.set_text_color(*INK)
            y0 = self.get_y()
            heights = []
            for j, cell in enumerate(row):
                lines_n = max(
                    1, int(self.get_string_width(cell) / max(widths[j] - 2, 8)) + 1
                )
                heights.append(4.2 * lines_n + 1.5)
            h = max(heights)
            if y0 + h > self.h - 20:
                self.add_page()
                y0 = self.get_y()
            for j, cell in enumerate(row):
                x = self.l_margin + sum(widths[:j])
                self.set_xy(x, y0)
                if i == 0:
                    self.set_fill_color(232, 242, 236)
                    self.rect(x, y0, widths[j], h, "DF")
                else:
                    self.set_fill_color(255, 255, 255)
                    self.rect(x, y0, widths[j], h, "D")
                self.set_xy(x + 1, y0 + 0.8)
                self.multi_cell(widths[j] - 2, 4.1, cell)
            self.set_y(y0 + h)
        self.ln(3)


def main() -> None:
    pdf = Pdf(orientation="P", unit="mm", format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(16, 16, 16)
    pdf.add_font("Body", "", str(FONT))
    pdf.add_font("Body", "B", str(FONT_B))
    pdf.add_page()

    pdf.set_fill_color(*GREEN)
    pdf.rect(0, 0, 210, 42, "F")
    pdf.set_xy(16, 11)
    pdf.set_font("Body", "B", 24)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 10, "Rfacto", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(16)
    pdf.set_font("Body", "", 12)
    pdf.cell(
        0,
        7,
        "Architecture — appels audio et vidéo 1-to-1",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.set_x(16)
    pdf.set_font("Body", "", 9)
    pdf.cell(
        0,
        6,
        "Document interne  |  16 août 2026  |  analyse uniquement, aucun code",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.ln(10)

    pdf.body(
        "Proposition d'intégration d'appels audio et vidéo 1-to-1 de type réseau social, "
        "calée sur le code existant (Android rfactocan + API Next.js / Neon). "
        "Aucun fichier n'a été modifié pour cette analyse."
    )

    pdf.h2("1. Constat — ce qui existe déjà")
    pdf.body(
        "Rfacto n'a ni WebSocket, ni WebRTC, ni permission micro/caméra. "
        "La messagerie et le push sont HTTP + FCM data-only. "
        "C'est un bon plan de contrôle (qui appelle qui, sonnerie, historique), "
        "pas un plan média pour transporter l'audio/vidéo."
    )

    pdf.h3("Architecture Android")
    pdf.bullet(
        "Une seule Activity : MainActivity.kt — navigation par currentScreen "
        "(app, dm_chat, chat…), pas de NavHost Jetpack."
    )
    pdf.bullet("Shell : MainShell.kt + onglets AppTab (dont Messages).")
    pdf.bullet("Réseau : Retrofit + OkHttp, Bearer JWT (RetrofitClient.kt).")
    pdf.bullet("Session : SessionManager (SharedPreferences rfacto_prefs).")
    pdf.bullet(
        "Pas de classe Application, pas de ForegroundService, pas de ConnectionService."
    )
    pdf.bullet("minSdk 24, targetSdk 36, package com.rfacto.app.")

    pdf.h3("Messagerie (deux silos)")
    pdf.table(
        [
            ["Fil", "Tables / API", "Android", "Temps réel"],
            [
                "DM (services, emploi, rencontre)",
                "DirectThread + DirectMessage",
                "DirectChatScreen.kt",
                "poll 4 s",
            ],
            [
                "Colis / réservation",
                "Message sur booking",
                "ChatScreen.kt",
                "poll 8 s",
            ],
        ],
        [48, 52, 42, 36],
    )
    pdf.body(
        "Règles DM (lib/dm.ts, app/api/dm/route.ts) : couple unique userLowId / userHighId ; "
        "KYC VERIFIED des deux côtés (sauf MEET) ; MEET : MeetContact ACCEPTED "
        "(pas de cold DM) ; compte SUSPENDED refusé. "
        "C'est le bon périmètre pour autoriser un appel : uniquement entre participants "
        "d'un DirectThread existant."
    )

    pdf.h3("Auth, backend, présence, FCM")
    pdf.bullet(
        "JWT (lib/auth.ts) : cookie web ou Authorization Bearer mobile."
    )
    pdf.bullet(
        "Android enregistre le jeton FCM après login (PushRegistrar → POST /api/devices/fcm)."
    )
    pdf.bullet(
        "Next.js App Router sur Vercel (fonctions serverless, pas de socket persistant)."
    )
    pdf.bullet("Prisma / Neon PostgreSQL. FCM Admin : lib/fcm.ts + notifyUser.")
    pdf.bullet(
        "Présence : POST /api/presence (lastSeenAt toutes les 45 s). Seuil online : 2 min."
    )
    pdf.bullet(
        "FCM data-only Android, priority high. Canaux rfacto_messages_v3 / alerts_v3 / jobs_v3."
    )
    pdf.bullet(
        "RfactoFirebaseMessagingService construit la notif et ouvre MainActivity via extras. "
        "Pas de USE_FULL_SCREEN_INTENT, pas d'écran d'appel."
    )

    pdf.h3("WebSocket")
    pdf.body(
        "Aucun. Ni Socket.IO, ni ws, ni Pusher. Supabase est dans le repo "
        "(lib/supabase) mais n'est pas utilisé pour du realtime."
    )

    pdf.h3("Permissions actuelles")
    pdf.body(
        "INTERNET, localisation, POST_NOTIFICATIONS, VIBRATE. "
        "Absentes : RECORD_AUDIO, CAMERA, FOREGROUND_SERVICE*, "
        "USE_FULL_SCREEN_INTENT, BLUETOOTH_CONNECT."
    )

    pdf.h3("Cycle de vie")
    pdf.body(
        "Splash → login → currentScreen = app. Presence seulement si l'écran est app ou chat. "
        "Processus tué : seul FCM réveille l'app (déjà le cas pour les messages)."
    )

    pdf.h2("2. Contrainte décisive")
    pdf.body(
        "Vercel ne peut pas héberger le signaling WebRTC (WebSocket longue durée, ICE trickle, TURN). "
        "Un WS maison sur Next.js cassera en production."
    )
    pdf.body("Il faut séparer :")
    pdf.bullet(
        "Plan de contrôle Rfacto (déjà là) : JWT, thread, KYC, FCM, historique Neon."
    )
    pdf.bullet(
        "Plan média (nouveau service) : WebRTC + STUN/TURN + signaling."
    )

    pdf.h2("3. Architecture recommandée")
    pdf.body(
        "LiveKit Cloud (ou Daily.co) comme plan média, Rfacto comme plan de contrôle."
    )
    pdf.body("Pourquoi LiveKit plutôt qu'un WS + libwebrtc maison :")
    pdf.bullet("TURN/STUN et SFU déjà opérés (Afrique / NAT mobile, Motorola).")
    pdf.bullet("SDK Android + Web.")
    pdf.bullet("Signaling WS vers leurs serveurs, pas Vercel.")
    pdf.bullet("Identité Rfacto (JWT) pour créer l'appel et sonner.")

    pdf.small(
        "Appelant → POST /api/calls → Rfacto crée Call + room LiveKit + FCM INCOMING_CALL "
        "→ Callee IncomingCallActivity → accept → token LiveKit → join room WebRTC."
    )
    pdf.body(
        "FCM sonne. LiveKit transporte. Neon historise. "
        "Ne pas utiliser le poll 4 s du chat pour l'appel : trop lent. "
        "Le ring passe par FCM ; pendant l'appel, le SDK LiveKit gère ICE/SDP."
    )

    pdf.h2("4. Les 11 points, calés sur Rfacto")
    pdf.table(
        [
            ["#", "Besoin", "Comment dans ce projet"],
            [
                "1",
                "Audio 1-to-1",
                "Room LiveKit audio=true, video=false. Bouton dans DirectChatScreen.",
            ],
            [
                "2",
                "Vidéo 1-to-1",
                "Même room, video=true. Même Call avec mediaType.",
            ],
            [
                "3",
                "WebRTC",
                "SDK LiveKit (enveloppe WebRTC). Pas de PeerConnection à la main au début.",
            ],
            [
                "4",
                "Signaling WS",
                "WS LiveKit, pas un serveur Rfacto. Optionnel : GET /api/calls/:id pour l'état.",
            ],
            [
                "5",
                "TURN/STUN",
                "Inclus LiveKit Cloud. coturn seulement si self-host.",
            ],
            [
                "6",
                "FCM incoming",
                "notifyUser type=INCOMING_CALL + callId, threadId, mediaType. Canal rfacto_calls_v1.",
            ],
            [
                "7",
                "Accept / refus",
                "POST .../accept et .../reject. Timeout 30-45 s → MISSED.",
            ],
            [
                "8",
                "Premier plan",
                "onMessageReceived déjà appelé. Overlay IncomingCallScreen via PushEvents.",
            ],
            [
                "9",
                "Arrière-plan",
                "Data-only high : le service FCM tourne. Notif full-screen + actions.",
            ],
            [
                "10",
                "App fermée",
                "IncomingCallActivity dédiée (pas seulement currentScreen). Full-screen intent Play.",
            ],
            [
                "11",
                "Historique",
                "Table Call liée à DirectThread. GET /api/calls. Pastille optionnelle dans le DM.",
            ],
        ],
        [12, 38, 128],
    )

    pdf.h2("5. Fichiers concernés (à étendre plus tard)")
    pdf.h3("Android")
    pdf.bullet("MainActivity.kt — extras callId, écrans incoming_call / in_call")
    pdf.bullet("DirectChatScreen.kt — boutons audio/vidéo")
    pdf.bullet("MessagesScreen.kt — accès historique")
    pdf.bullet("RfactoFirebaseMessagingService.kt — type INCOMING_CALL")
    pdf.bullet("JobAlertChannels.kt — canal appels")
    pdf.bullet("PushEvents.kt — event appel")
    pdf.bullet("AndroidManifest.xml — permissions, activity, FGS")
    pdf.bullet("ApiService.kt / RetrofitClient.kt")
    pdf.bullet(
        "Nouveaux : IncomingCallActivity, CallService (foreground), CallViewModel, InCallScreen"
    )

    pdf.h3("Web")
    pdf.bullet("lib/dm.ts — assertThreadParticipant, KYC, MEET")
    pdf.bullet("lib/fcm.ts / lib/notifications.ts")
    pdf.bullet("app/api/dm/**")
    pdf.bullet(
        "Nouveaux : app/api/calls/route.ts, app/api/calls/[id]/accept|reject|token"
    )
    pdf.bullet("prisma/schema.prisma + SQL Neon")
    pdf.bullet("UI web chat si appels aussi sur le site")

    pdf.h2("6. Technologies à réutiliser")
    pdf.bullet("JWT Bearer + getSessionUser")
    pdf.bullet("DirectThread comme graphe « qui peut appeler qui »")
    pdf.bullet("assertBothVerified + MeetContact ACCEPTED")
    pdf.bullet("DeviceToken + FCM data-only high")
    pdf.bullet("notifyUser")
    pdf.bullet("lastSeenAt (online / au téléphone)")
    pdf.bullet("Canal notif + NotificationAlert (sonnerie d'appel dédiée)")
    pdf.bullet("PushEvents pour overlay foreground")

    pdf.h2("7. Nouvelles dépendances")
    pdf.h3("Android")
    pdf.bullet("io.livekit:livekit-android (+ UI Compose LiveKit)")
    pdf.bullet(
        "Permissions : RECORD_AUDIO, CAMERA, MODIFY_AUDIO_SETTINGS, "
        "BLUETOOTH_CONNECT, FOREGROUND_SERVICE, FOREGROUND_SERVICE_MICROPHONE, "
        "FOREGROUND_SERVICE_CAMERA, USE_FULL_SCREEN_INTENT (API 34+)"
    )
    pdf.h3("Web / infra")
    pdf.bullet("livekit-server-sdk (mint JWT room, serveur only)")
    pdf.bullet("Optionnel web : livekit-client")
    pdf.bullet("Compte LiveKit Cloud (URL + API key/secret dans Vercel)")
    pdf.bullet("Pas de nouveau serveur WS Rfacto au départ")
    pdf.body(
        "Alternative si refus du SaaS média : serveur Node (Fly/Railway) ws + "
        "mediasoup/livekit self-host + coturn — beaucoup plus lourd."
    )

    pdf.h2("8. Nouvelles tables / API")
    pdf.small(
        "Call : id, threadId, callerId, calleeId, mediaType AUDIO|VIDEO, "
        "status RINGING|ACCEPTED|REJECTED|MISSED|CANCELED|ENDED|FAILED, "
        "livekitRoom, startedAt, answeredAt, endedAt, endReason. "
        "Index : (calleeId, status), (threadId, createdAt), (callerId, createdAt)."
    )
    pdf.body("Routes (toutes JWT + participant du thread) :")
    pdf.bullet("POST /api/calls  { threadId, mediaType }")
    pdf.bullet("GET /api/calls  historique")
    pdf.bullet("GET /api/calls/:id  état (appelant qui attend)")
    pdf.bullet("POST /api/calls/:id/accept  → { livekitUrl, token }")
    pdf.bullet("POST /api/calls/:id/reject | cancel | end")
    pdf.bullet("GET /api/calls/:id/token  rejoindre si ACCEPTED")
    pdf.body(
        "FCM data : type=INCOMING_CALL, callId, threadId, mediaType, callerId, "
        "callerName, channelId=rfacto_calls_v1. "
        "Cron (comme expire-payments) : RINGING > 45 s → MISSED."
    )

    pdf.h2("9. Risques techniques")
    pdf.bullet("Vercel ≠ signaling — ne pas coller un WS sur une route Next.")
    pdf.bullet(
        "Android 14/16 full-screen : Play exige une déclaration USE_FULL_SCREEN_INTENT ; "
        "sans ça, appel fermé = simple notif, pas d'écran type WhatsApp."
    )
    pdf.bullet(
        "Foreground service types micro/caméra obligatoires pendant l'appel."
    )
    pdf.bullet(
        "OEM Motorola : même limite que les notifs (silence, batterie). "
        "Data-only high reste le seul réveil."
    )
    pdf.bullet(
        "KYC / MEET : un bouton d'appel sans les mêmes gardes que le DM = trou sécu."
    )
    pdf.bullet(
        "Deux silos chat : n'activer les appels que sur DM d'abord, pas sur le chat booking."
    )
    pdf.bullet(
        "Navigation single-Activity : un appel à froid doit ouvrir une Activity dédiée."
    )
    pdf.bullet("Coût LiveKit (minutes média) ; 1-to-1 reste raisonnable.")
    pdf.bullet(
        "Demander micro (et caméra si vidéo) avant POST /api/calls, pas après la sonnerie."
    )
    pdf.bullet(
        "Double son : aujourd'hui FCM joue déjà NotificationAlert.play() ; "
        "le canal d'appel ne doit pas doubler une loop + play() one-shot."
    )

    pdf.h2("10. Plan d'implémentation")
    pdf.bullet(
        "Étape 0 — Produit : appels uniquement depuis un DM existant. Audio d'abord, vidéo ensuite. Pas de cold call."
    )
    pdf.bullet(
        "Étape 1 — Données + API contrôle : table Call + create/accept/reject/end/list. Pas de média encore."
    )
    pdf.bullet(
        "Étape 2 — FCM ring : type INCOMING_CALL, canal rfacto_calls_v1. Overlay foreground. Tester Motorola."
    )
    pdf.bullet(
        "Étape 3 — IncomingCallActivity : Accepter / Refuser indépendant de MainActivity. Timeout."
    )
    pdf.bullet(
        "Étape 4 — LiveKit audio : mint token, join room, FGS micro."
    )
    pdf.bullet("Étape 5 — Vidéo : caméra + FGS camera. Même Call.")
    pdf.bullet(
        "Étape 6 — Historique UX : liste Messages, pastille DM, notif MISSED_CALL."
    )
    pdf.bullet("Étape 7 — Web optionnel : livekit-client sur la page DM.")
    pdf.bullet(
        "Étape 8 — Durcissement : un seul RINGING/ACCEPTED par user ; cron missed ; métriques."
    )

    pdf.h2("11. Synthèse")
    pdf.body(
        "Rfacto a déjà identité, fil 1-to-1, KYC, FCM data-only et présence. "
        "Il manque le média et un écran d'appel hors MainActivity."
    )
    pdf.body(
        "Ne pas construire un signaling WebSocket sur Vercel. "
        "Rfacto = qui sonne / qui accepte / historique. "
        "LiveKit = WebRTC + TURN + WS média."
    )
    pdf.body(
        "Ordre le plus sûr : API Call → FCM ring → IncomingCallActivity → audio LiveKit → vidéo."
    )

    pdf.output(str(OUT))
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
