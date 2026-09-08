"""Generate the Android notifications analysis PDF."""

from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).with_name("ANALYSE-NOTIFICATIONS-ANDROID.pdf")
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
        self.cell(0, 6, "Rfacto — Analyse notifications Android", align="L")
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
        self.cell(0, 8, f"rfacto.com  |  document interne  |  {self.page_no()}/{{nb}}", align="C")

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
        x = self.l_margin
        self.set_x(x)
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
                lines_n = max(1, int(self.get_string_width(cell) / max(widths[j] - 2, 8)) + 1)
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
    pdf.rect(0, 0, 210, 40, "F")
    pdf.set_xy(16, 11)
    pdf.set_font("Body", "B", 24)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 10, "Rfacto", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(16)
    pdf.set_font("Body", "", 12)
    pdf.cell(0, 7, "Analyse du systeme de notifications Android", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(16)
    pdf.set_font("Body", "", 9)
    pdf.cell(0, 6, "Document interne  |  16 août 2026  |  aucune modification de code", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)

    pdf.body(
        "Etat actuel du push Android dans le projet "
        "C:\\Users\\gismi\\AndroidStudioProjects\\rfactocan, "
        "avec le backend FCM du depot web c:\\src\\rfactocanada\\Rfactocan. "
        "Aucune modification n'a ete faite pour cette analyse."
    )

    pdf.h2("1. Fichiers concernes")
    pdf.h3("Android — code push")
    pdf.table(
        [
            ["Fichier", "Role"],
            ["push/RfactoFirebaseMessagingService.kt", "Reception FCM + construction de la notif"],
            ["push/JobAlertChannels.kt", "Creation des canaux + URI du son"],
            ["push/NotificationAlert.kt", "Sonnerie + vibration en plus de la notif"],
            ["push/PushRegistrar.kt", "Token FCM + permission runtime"],
            ["push/PushEvents.kt", "Rafraichit la cloche in-app"],
            ["push/LocationHeartbeat.kt", "GPS pour alertes proximite"],
            ["MainActivity.kt", "Demande POST_NOTIFICATIONS, canaux, tap"],
            ["ui/components/NotificationBell.kt", "Inbox in-app (API /api/notifications)"],
            ["data/api/ApiService.kt", "POST/DELETE api/devices/fcm"],
        ],
        [95, 83],
    )

    pdf.h3("Android — manifeste, ressources, Firebase")
    pdf.table(
        [
            ["Fichier", "Role"],
            ["app/src/main/AndroidManifest.xml", "Permissions, service FCM, icone/canal par defaut"],
            ["res/values/colors.xml", "Couleur #FF28541D"],
            ["res/values/strings.xml", "Noms des canaux (FR)"],
            ["res/drawable*/ic_stat_rfacto.png", "Icone small (6 densites)"],
            ["app/google-services.json", "Firebase projet rfactocanada / com.rfacto.app"],
            ["app/build.gradle.kts", "applicationId, Firebase Messaging"],
            ["gradle/libs.versions.toml", "BOM Firebase 33.12.0"],
            ["docs/PUSH_NOTIFICATIONS.md", "Doc en partie obsolete"],
        ],
        [95, 83],
    )
    pdf.body(
        "Absent : aucun fichier dans res/raw/ pour un son de notification. "
        "R.raw.intro dans MainActivity sert a la video de splash. "
        "Aucun setLargeIcon. Le logo launcher (mipmap/logorf, drawable/logo_rfacto.xml) "
        "n'est pas l'icone de notification."
    )

    pdf.h3("Backend web")
    pdf.table(
        [
            ["Fichier", "Role"],
            ["lib/fcm.ts", "Envoi multicast data-only Android"],
            ["lib/notifications.ts", "Cree la notif DB + appelle FCM"],
            ["docs/PUSH_NOTIFICATIONS.md", "Documente POST /api/devices/fcm"],
        ],
        [70, 108],
    )
    pdf.body(
        "Dans l'arbre API actuel du repo web, app/api/devices/fcm/route.ts n'est pas present "
        "(85 routes listees, aucune sous devices/). Android appelle pourtant cet endpoint."
    )

    pdf.h2("2. Code actuel")
    pdf.h3("Service FCM")
    pdf.body(
        "RfactoFirebaseMessagingService.onMessageReceived : ensureChannels, "
        "PushEvents.emitIncoming(), NotificationAlert.play(), puis NotificationCompat.Builder. "
        "Titre/corps lus d'abord dans message.notification, sinon message.data. "
        "Canal pris dans data.channelId, sinon derive du type. Pas de setLargeIcon. "
        "setSound est appele, mais sur Android 8+ le son du canal prime."
    )
    pdf.small(
        "setSmallIcon(R.drawable.ic_stat_rfacto)  |  setColor(rfacto_notification)  |  "
        "setSound(soundUri)  |  vibrate [0, 250, 120, 250]"
    )

    pdf.h3("Canaux")
    pdf.body(
        "soundUri() retourne RingtoneManager.getDefaultUri(TYPE_NOTIFICATION), "
        "sinon Settings.System.DEFAULT_NOTIFICATION_URI. "
        "channelForType() n'utilise jamais rfacto_jobs : messages -> rfacto_messages_v2, "
        "tout le reste -> rfacto_alerts_v2. rfacto_jobs est cree mais pas selectionne par ce helper."
    )
    pdf.body(
        "recreateIfBroken efface un canal dont le son est android.resource://... "
        "(ancienne sonnerie custom dans res/raw), puis le recree avec le son systeme."
    )

    pdf.h3("Lecture explicite du son")
    pdf.body(
        "NotificationAlert.play() vibre, puis joue le meme URI systeme via RingtoneManager, "
        "avec USAGE_NOTIFICATION et STREAM_NOTIFICATION."
    )

    pdf.h3("Payload serveur (Android = data-only)")
    pdf.body(
        "sendEachForMulticast envoie data { title, body, channelId, ... } et android.priority = high. "
        "Pas de bloc notification ni android.notification pour Android. "
        "iOS a un aps.alert + sound: default. "
        "channelId serveur : rfacto_messages_v2 si le type contient MESSAGE, sinon rfacto_alerts_v2."
    )

    pdf.h2("3. Nom et ID des Notification Channels")
    pdf.table(
        [
            ["ID", "Nom FR", "Importance", "Utilise quand"],
            [
                "rfacto_messages_v2",
                "Messages",
                "HIGH",
                "type message / DM, ou data.channelId",
            ],
            [
                "rfacto_alerts_v2",
                "Alertes Rfacto",
                "HIGH",
                "tout le reste + defaut FCM du manifeste",
            ],
            [
                "rfacto_jobs",
                "Alertes jobs proches",
                "HIGH",
                "cree, pas choisi par channelForType()",
            ],
        ],
        [48, 42, 22, 66],
    )
    pdf.body(
        "Suffixe _v2 sur messages/alertes : canaux recrees apres un ancien reglage "
        "(souvent une sonnerie res/raw). rfacto_jobs n'a pas de _v2."
    )

    pdf.h2("4. Son actuellement configure")
    pdf.body(
        "Ce n'est pas une sonnerie Rfacto custom. Definition unique dans JobAlertChannels.soundUri() : "
        "RingtoneManager.TYPE_NOTIFICATION, soit le son de notification par defaut du telephone."
    )
    pdf.bullet("NotificationChannel.setSound(...) a la creation du canal")
    pdf.bullet("NotificationCompat.Builder.setSound(sound) dans le service")
    pdf.bullet("NotificationAlert.play() via RingtoneManager.getRingtone(...)")
    pdf.body(
        "Le parametre context de soundUri n'est pas utilise (plus de android.resource://package/raw/...). "
        "Aucun .wav / .ogg / .mp3 de notification sous res/raw/. "
        "recreateIfBroken supprime volontairement un canal dont le son commence par android.resource://."
    )

    pdf.h2("5. Icone actuellement utilisee")
    pdf.body(
        "Small icon unique : R.drawable.ic_stat_rfacto. "
        "Referencee dans setSmallIcon et dans com.google.firebase.messaging.default_notification_icon."
    )
    pdf.body(
        "Fichiers : res/drawable/ic_stat_rfacto.png et les densites mdpi a xxxhdpi. "
        "Contenu inspecte : lettre R blanche sur fond noir opaque, pas de fond transparent. "
        "Ce n'est pas le logo complet (colis + R vert de logo_rfacto.xml)."
    )
    pdf.body(
        "Couleur d'accent : rfacto_notification = #FF28541D. "
        "Launcher @mipmap/logorf : non utilise comme small icon. Pas de setLargeIcon."
    )

    pdf.h2("6. Traitement FCM selon l'etat de l'app")
    pdf.body(
        "Le serveur actuel envoie un message data-only (priority high) sans payload notification Android."
    )
    pdf.h3("App ouverte (foreground)")
    pdf.body(
        "onMessageReceived s'execute : ensureChannels, PushEvents (cloche in-app), "
        "NotificationAlert.play() (ringtone systeme + vibreur), puis NotificationCompat dans la barre."
    )
    pdf.h3("App en arriere-plan")
    pdf.body(
        "Avec un message data-only, FCM n'affiche pas lui-meme une notif. "
        "Il demarre RfactoFirebaseMessagingService : meme chemin que le foreground. "
        "Si un ancien serveur envoyait encore notification + data, FCM afficherait la notif systeme "
        "(icone/canal du manifeste) et onMessageReceived ne serait souvent pas appele."
    )
    pdf.h3("App completement fermee")
    pdf.body(
        "Toujours data-only + priority high : Android peut reveiller le service. Meme chemin custom. "
        "Limites : forcer l'arret (plus de FCM jusqu'a reouverture) ; OEM batterie agressive ; "
        "mode silence (STREAM_NOTIFICATION muet si mode_ringer = 0) ; "
        "canal deja cree par l'utilisateur (Android ignore un nouveau setSound tant que l'ID n'a pas change)."
    )
    pdf.body(
        "Les meta-data FCM du manifeste ne s'appliquent que si FCM construit lui-meme la notif "
        "(payload notification). Avec le serveur actuel, c'est l'app qui construit la notif."
    )

    pdf.h2("7. Permissions Android")
    pdf.body("Declarees dans le manifeste source :")
    pdf.bullet("INTERNET")
    pdf.bullet("ACCESS_COARSE_LOCATION / ACCESS_FINE_LOCATION (alertes proximite, pas le son)")
    pdf.bullet("POST_NOTIFICATIONS (obligatoire API 33+, targetSdk = 36)")
    pdf.bullet("VIBRATE")
    pdf.bullet("WRITE_EXTERNAL_STORAGE maxSdk 28 (sans lien notif)")
    pdf.body(
        "Ajoutees au merge par Firebase / Play Services : WAKE_LOCK. "
        "Runtime : MainActivity demande POST_NOTIFICATIONS si l'utilisateur est connecte. "
        "PushRegistrar.hasNotificationPermission retourne true sous Android 12 et moins. "
        "Pas de USE_FULL_SCREEN_INTENT ni FOREGROUND_SERVICE pour les notifs."
    )

    pdf.h2("8. Pourquoi sonnerie custom et icone Rfacto peuvent ne pas marcher")
    pdf.h3("Sonnerie personnalisee")
    pdf.bullet("Elle n'est plus branchee : soundUri() force le son systeme, pas un fichier Rfacto.")
    pdf.bullet("Aucun fichier son de notif dans res/raw/.")
    pdf.bullet(
        "Les anciens canaux custom sont detruits (son android.resource://) puis recrees avec le son systeme."
    )
    pdf.bullet(
        "Builder.setSound() est inoperant sur Android 8+ : le son est fige a la creation du canal."
    )
    pdf.bullet(
        "NotificationAlert.play() joue le meme URI systeme sur STREAM_NOTIFICATION : "
        "silence / Ne pas deranger / volume notif a 0 = aucun son."
    )

    pdf.h3("Icone Rfacto")
    pdf.bullet(
        "ic_stat_rfacto n'est pas une icone de barre de statut valide. "
        "Android 5+ traite setSmallIcon comme un masque alpha : fond noir opaque -> carre plein "
        "teinte en #28541D, pas un R lisible (souvent une tache / un blob)."
    )
    pdf.bullet(
        "Ce n'est pas le logo Rfacto (logo_rfacto.xml : R vert, colis, couleurs). "
        "La barre de statut n'accepterait d'ailleurs pas ce vecteur couleur."
    )
    pdf.bullet("Pas de setLargeIcon : le tiroir n'affiche pas le logo couleur.")
    pdf.bullet(
        "Les meta-data FCM ne s'appliquent pas au flux data-only actuel ; "
        "l'icone vue vient uniquement de setSmallIcon."
    )

    pdf.h3("Autres facteurs")
    pdf.bullet(
        "Canal rfacto_jobs documente comme canal principal, alors que le code et le serveur utilisent _v2."
    )
    pdf.bullet(
        "Doc Android encore au package com.example.rfactocan ; l'app reelle est com.rfacto.app."
    )
    pdf.bullet(
        "Endpoint POST /api/devices/fcm appele par l'app : route absente de l'arbre API web actuel. "
        "Si production ne l'a pas non plus, le token n'est pas enregistre."
    )

    pdf.h2("9. Synthese")
    pdf.table(
        [
            ["Element", "Valeur actuelle"],
            ["Canaux", "rfacto_messages_v2, rfacto_alerts_v2, rfacto_jobs"],
            ["Canal par defaut FCM", "rfacto_alerts_v2"],
            ["Son", "Ringtone systeme TYPE_NOTIFICATION, pas un WAV Rfacto"],
            ["Icone", "ic_stat_rfacto.png = R blanc sur noir opaque"],
            ["Large icon", "aucune"],
            ["Payload Android", "data-only, priority high, channelId dans data"],
            ["Custom res/raw notif", "inexistant"],
        ],
        [55, 123],
    )
    pdf.body("Aucune modification de code n'accompagne ce document.")

    pdf.output(str(OUT))
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
