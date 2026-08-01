"""Generate Rfacto partner presentation dossier PDF.

Audience: insurers, local police / customs authorities, mobile money / telecom
operators, and other strategic partners.
"""

from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).with_name("Rfacto-dossier-partenaires.pdf")
OUT_FALLBACK = Path(__file__).with_name("Rfacto-dossier-partenaires-v2.pdf")
FONT = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_B = Path(r"C:\Windows\Fonts\arialbd.ttf")


class PartnerPDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Body", "B", 9)
        self.set_text_color(40, 90, 70)
        self.cell(0, 8, "Rfacto — Dossier partenaires", align="L")
        self.set_text_color(120, 120, 120)
        self.set_font("Body", "", 8)
        self.cell(
            0,
            8,
            "Confidentiel — usage partenaires",
            align="R",
            new_x="LMARGIN",
            new_y="NEXT",
        )
        self.set_draw_color(200, 200, 200)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-14)
        self.set_font("Body", "", 8)
        self.set_text_color(140, 140, 140)
        self.cell(
            0,
            8,
            f"Export Monde Prestige · rfacto.com · page {self.page_no()}/{{nb}}",
            align="C",
        )

    def h2(self, text: str):
        self.ln(2)
        self.set_font("Body", "B", 13)
        self.set_text_color(24, 72, 56)
        self.multi_cell(0, 7, text)
        self.ln(1)

    def h3(self, text: str):
        self.ln(1.5)
        self.set_font("Body", "B", 11)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6, text)
        self.ln(0.5)

    def body(self, text: str):
        self.set_font("Body", "", 10)
        self.set_text_color(35, 35, 35)
        self.multi_cell(0, 5.4, text)
        self.ln(1)

    def bullet(self, text: str):
        self.set_font("Body", "", 10)
        self.set_text_color(35, 35, 35)
        self.multi_cell(0, 5.3, f"•  {text}")
        self.ln(0.2)

    def quote(self, text: str):
        x = self.l_margin
        y = self.get_y()
        w = self.w - self.l_margin - self.r_margin
        self.set_xy(x + 4, y + 2)
        self.set_font("Body", "", 10)
        self.set_text_color(30, 55, 45)
        self.multi_cell(w - 8, 5.4, text)
        h = self.get_y() - y + 4
        self.set_y(y)
        self.set_fill_color(242, 248, 245)
        self.rect(x, y, w, h, style="F")
        self.set_draw_color(40, 90, 70)
        self.set_line_width(0.8)
        self.line(x, y, x, y + h)
        self.set_line_width(0.2)
        self.set_xy(x + 4, y + 2)
        self.set_font("Body", "", 10)
        self.set_text_color(30, 55, 45)
        self.multi_cell(w - 8, 5.4, text)
        self.ln(3)

    def table(self, headers, rows, col_widths=None):
        usable = self.w - self.l_margin - self.r_margin
        if not col_widths:
            col_widths = [usable / len(headers)] * len(headers)
        self.set_font("Body", "B", 9)
        self.set_fill_color(24, 72, 56)
        self.set_text_color(255, 255, 255)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 7, h, border=1, fill=True)
        self.ln()
        self.set_font("Body", "", 8.5)
        self.set_text_color(35, 35, 35)
        fill = False
        for row in rows:
            if self.get_y() > 270:
                self.add_page()
            if fill:
                self.set_fill_color(245, 248, 246)
            else:
                self.set_fill_color(255, 255, 255)
            for i, cell in enumerate(row):
                self.cell(col_widths[i], 6.5, cell, border=1, fill=True)
            self.ln()
            fill = not fill
        self.ln(2)


def build() -> Path:
    pdf = PartnerPDF(format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(16, 16, 16)
    pdf.add_font("Body", "", str(FONT))
    pdf.add_font("Body", "B", str(FONT_B))
    pdf.add_page()

    pdf.set_fill_color(24, 72, 56)
    pdf.rect(0, 0, pdf.w, 58, style="F")
    pdf.set_y(14)
    pdf.set_font("Body", "B", 26)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 11, "Rfacto", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Body", "", 13)
    pdf.cell(
        0,
        7,
        "Dossier de présentation partenaires",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.set_font("Body", "", 10)
    pdf.cell(
        0,
        6,
        "Assureurs · Autorités · Opérateurs Mobile Money · Partenaires stratégiques",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.set_font("Body", "", 9)
    pdf.cell(
        0,
        6,
        "Export Monde Prestige · Siège Québec, Canada · Juillet 2026 · rfacto.com",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.set_y(66)

    pdf.quote(
        "Rfacto (RapidFacto) est la place de marché qui connecte voyageurs, "
        "prestataires de services et clients pour les envois collaboratifs et les "
        "prestations utiles — près de chez vous et à travers le monde. "
        "On connecte, on sécurise (identité, paiement, messagerie, suivi) — "
        "on ne transporte pas nous-mêmes."
    )

    pdf.h2("1. En une phrase")
    pdf.body(
        "L'Airbnb du bagage international : une marketplace P2P de transport "
        "collaboratif de colis et de services, avec vérification d'identité (KYC), "
        "paiement séquestré, messagerie et preuves de livraison."
    )
    pdf.bullet(
        "Analogie : comme Uber organise la rencontre sans être le chauffeur, "
        "Rfacto organise l'échange sans être le transporteur."
    )
    pdf.bullet(
        "Projet d'Export Monde Prestige, fondé par Morel Stevens Ndong — "
        "siège international au Québec (Canada)."
    )

    pdf.h2("2. Problème que nous résolvons")
    pdf.bullet(
        "Les envois diaspora / corridors Afrique–Canada–Europe passent encore "
        "souvent par des groupes WhatsApp informels : peu d'identité, paiements "
        "hors plateforme, litiges sans traces."
    )
    pdf.bullet(
        "Les transitaires classiques sont chers ou lents pour les petits volumes ; "
        "les voyageurs ont de la capacité bagage sous-utilisée."
    )
    pdf.bullet(
        "Les talents et services locaux manquent de vitrine numérique et de "
        "paiement sécurisé."
    )
    pdf.h3("Notre réponse")
    pdf.bullet("Mettre en relation capacité (bagage, trajet, fret, service) et besoin.")
    pdf.bullet(
        "Imposer confiance : KYC Stripe Identity, séquestre, notations, preuves QR, litiges."
    )
    pdf.bullet(
        "Ambition paiements locaux (Mobile Money / Interac) pour convertir réellement "
        "en Afrique et au Canada."
    )

    pdf.h2("3. Produit — ce qui est live aujourd'hui")
    pdf.table(
        ["Capacité", "Statut", "Détail"],
        [
            ["KYC Stripe Identity", "Live", "Pièce + selfie ; Vérifié = KYC seul"],
            ["Paiement séquestre", "Live", "Fonds bloqués jusqu'à livraison (~10 %)"],
            ["Stripe Connect", "Live", "Payout voyageurs après livraison"],
            ["Voyages / demandes", "Live", "Matching route, date, réputation"],
            ["Services publiés", "Live", "Fret, logistique, métiers locaux…"],
            ["Messagerie + photos", "Live", "Liée à la réservation"],
            ["Preuve de remise", "Live", "Code / QR à la livraison"],
            ["Litiges documentés", "Live", "Support examine le dossier"],
            ["Assurance colis", "À venir", "Assureur partenaire dans le parcours"],
            ["Mobile Money", "À venir", "Pilotes (MoMo, Airtel, Orange…)"],
        ],
        [48, 28, 96],
    )
    pdf.body(
        "Important : le badge « Vérifié » correspond uniquement à la validation "
        "Stripe Identity (KYC), pas à une simple connexion Google ou e-mail."
    )

    pdf.h2("4. Marchés & corridors")
    pdf.body(
        "Phase 1 — diaspora francophone : Canada, France, Belgique ↔ Gabon, "
        "Cameroun, Côte d'Ivoire, Sénégal, RDC, Bénin… puis extension Europe–Afrique "
        "et mondiale."
    )
    pdf.bullet("Communautés nationales (ex. groupes WhatsApp RFacto par pays).")
    pdf.bullet(
        "Ambassadeurs locaux (commercial, communauté, qualité) + siège Canada "
        "(produit, juridique, partenariats stratégiques, support N2)."
    )
    pdf.bullet(
        "Cibles : 12+ pays actifs en 12–18 mois ; croissance mesurée par "
        "transactions payées et taux de litige (< 5 %), pas seulement les inscriptions."
    )

    pdf.h2("5. Positionnement juridique (clair pour tous les partenaires)")
    pdf.quote(
        "Rfacto met en relation et sécurise les comptes et les paiements. "
        "Le colis reste sous la responsabilité des parties. "
        "Rfacto n'est ni transporteur ni commissionnaire de transport, "
        "et n'inclut pas d'assurance automatique du contenu du bagage."
    )
    pdf.bullet(
        "Ce que nous protégeons : personnes (identité), transactions (séquestre), "
        "traces (preuves, litiges)."
    )
    pdf.bullet(
        "Ce que nous ne prétendons pas : assurer ou rembourser automatiquement "
        "le contenu matériel — d'où le partenariat assureur."
    )
    pdf.bullet(
        "Chaque utilisateur doit déclarer honnêtement, respecter lois et douanes ; "
        "Rfacto ne gère pas la douane à la place des parties."
    )

    pdf.add_page()
    pdf.h2("6. Partenariat assureurs")
    pdf.h3("Pourquoi Rfacto a besoin d'un assureur")
    pdf.body(
        "Aujourd'hui, la plateforme n'inclut pas d'assurance automatique sur le "
        "contenu du colis. Les utilisateurs le savent ; le programme de confiance "
        "annonce explicitement une couverture à venir via un assureur partenaire "
        "(local ou international), intégrée au parcours de réservation."
    )
    pdf.h3("Ce que nous apportons à l'assureur")
    pdf.bullet(
        "Parcours digital : valeur déclarée + prime optionnelle au moment du booking."
    )
    pdf.bullet(
        "Piste d'audit : KYC, horodatage séquestre, photos, messagerie, preuve QR, "
        "dossier litige (dommage, manquant, retard, douane, comportement…)."
    )
    pdf.bullet(
        "Population cible : diaspora et corridors à fort volume d'envois "
        "personnels / petits lots."
    )
    pdf.bullet(
        "Frontière claire de responsabilité : l'assurance porte sur le contenu ; "
        "la plateforme porte sur l'identité et le paiement."
    )
    pdf.h3("Ce que nous recherchons")
    pdf.bullet("Produit assurance colis / bagage collaboratif (declared value).")
    pdf.bullet(
        "API ou process d'émission / sinistre compatible avec le parcours Rfacto."
    )
    pdf.bullet(
        "Pilote sur 1–2 corridors (ex. Canada–Gabon ou Canada–Côte d'Ivoire)."
    )
    pdf.bullet("Option premium : suivi GPS renforcé lié à l'assurance.")

    pdf.h2("7. Autorités locales, police et douanes")
    pdf.h3("Notre engagement de conformité")
    pdf.body(
        "Rfacto formalise un usage qui existe déjà de manière informelle. "
        "Nous voulons travailler avec les autorités pour que les envois "
        "collaboratifs soient traçables, identifiables et éducatifs sur les interdits."
    )
    pdf.bullet(
        "KYC obligatoire pour les profils qui reçoivent des paiements "
        "(pièce d'identité + selfie Stripe Identity)."
    )
    pdf.bullet(
        "Checklist à l'acceptation d'une réservation : inspection du contenu, "
        "respect des lois douanières des pays de départ, transit et arrivée."
    )
    pdf.bullet(
        "Interdiction des paiements hors plateforme (charte) — réduit le cash "
        "opaque et les échanges anonymes."
    )
    pdf.bullet(
        "Signalement et suspension de comptes ; motif de litige « problème douanier »."
    )
    pdf.bullet(
        "Éducation utilisateurs : biens autorisés uniquement, déclarations honnêtes."
    )
    pdf.h3("Ce que nous proposons aux autorités")
    pdf.bullet(
        "Échanges sur les listes d'interdits et messages d'éducation à afficher "
        "dans l'app (par pays / corridor)."
    )
    pdf.bullet(
        "Canal de contact pour signalements sérieux (fraude, trafic suspect) "
        "avec traces réservation / KYC dans le cadre légal applicable."
    )
    pdf.bullet(
        "Ambassadeurs locaux formés à rappeler la légalité et les limites "
        "de la plateforme (pas un passe-droit douanier)."
    )
    pdf.body(
        "Note : Rfacto ne remplace pas les contrôles de police ou de douane. "
        "Nous renforçons la traçabilité et la responsabilisation des parties."
    )

    pdf.h2("8. Opérateurs téléphonie & Mobile Money")
    pdf.h3("Pourquoi le paiement local est stratégique")
    pdf.body(
        "La carte bancaire internationale ne convertit pas assez en Afrique. "
        "Les paiements locaux (Mobile Money, Interac au Canada) sont une "
        "condition de liquidité réelle du marché. Priorité business plan : "
        "partenariats MoMo / Airtel / Orange / MTN / Interac."
    )
    pdf.h3("Rails cibles par marché (ambition partenaires)")
    pdf.table(
        ["Pays", "Moyens visés"],
        [
            ["Canada", "Stripe, Interac, virement"],
            ["Côte d'Ivoire", "Orange Money, Moov, MTN MoMo"],
            ["Sénégal", "Orange Money, Mobile Money"],
            ["Gabon", "Airtel Money, Moov Money"],
            ["Cameroun", "MTN MoMo, Orange Money"],
            ["RDC", "M-Pesa Vodacom, MTN, Orange, Airtel"],
            ["Guinée", "Orange Money, MTN MoMo"],
            ["Congo-Brazzaville", "MTN MoMo, Airtel Money"],
            ["Ghana", "MTN MoMo, Mobile Money, Stripe"],
            ["France / Europe", "Stripe, virement"],
        ],
        [50, 122],
    )
    pdf.h3("Ce que nous apportons à l'opérateur")
    pdf.bullet(
        "Marketplace à KYC et séquestre déjà en place — rail formalisé, "
        "pas un cash-out informel."
    )
    pdf.bullet(
        "Volume ambitionné sur corridors diaspora (envois récurrents, "
        "micro-transactions services)."
    )
    pdf.bullet(
        "Charte : aucun paiement direct hors plateforme — pousse le flux "
        "vers le rail officiel."
    )
    pdf.h3("Ce que nous recherchons")
    pdf.bullet(
        "API / agrégateur ou partenariat direct pour collecter et (si possible) payer."
    )
    pdf.bullet(
        "Pilote 1–2 pays : escrow-compatible (encaissement puis libération "
        "après livraison)."
    )
    pdf.bullet("Co-marketing auprès des clients Mobile Money existants.")
    pdf.body(
        "Engagement de transparence : nous ne promettons pas un moyen de "
        "paiement local tant qu'il n'est pas live dans le pays."
    )

    pdf.add_page()
    pdf.h2("9. Autres partenaires stratégiques")
    pdf.h3("Ambassades / diasporas / associations")
    pdf.bullet("Sensibilisation corridors ; recrutement voyageurs et clients vérifiés.")
    pdf.bullet("Groupes communautaires officiels RFacto par pays.")
    pdf.h3("Agences de voyage / transitaires / logistique")
    pdf.bullet(
        "Publication de capacité pro (services) à côté du P2P voyageur — "
        "complément, pas concurrence frontale."
    )
    pdf.h3("Fintech / PSP / banques")
    pdf.bullet("Couches de paiement, KYC renforcé, change, réconciliation multi-devises.")
    pdf.h3("Médias & influenceurs corridors")
    pdf.bullet("Éducation confiance (KYC, séquestre) vs groupes informels.")

    pdf.h2("10. Stack confiance — résumé pour tout partenaire")
    pdf.table(
        ["Couche", "Live / partiel / à venir"],
        [
            ["Identité (Stripe Identity KYC)", "Live"],
            ["Paiement séquestre + Connect", "Live"],
            ["Messagerie réservation + photos", "Live"],
            ["Preuve remise QR / code", "Live"],
            ["Notations mutuelles", "Live"],
            ["Litiges documentés + support", "Live"],
            ["Charte & politique de responsabilité", "Live (publique)"],
            ["Partage GPS en transit", "Partiel"],
            ["Gel auto des fonds en litige", "À venir"],
            ["Assurance colis partenaire", "À venir"],
            ["Mobile Money / Interac", "À venir (pilotes)"],
        ],
        [100, 72],
    )

    pdf.h2("11. Vision & valeurs")
    pdf.body(
        "Promouvoir les services en ligne et le numérique comme vecteur de "
        "transformation ; rapprocher les gens ; mettre en évidence talents et "
        "services connus et méconnus ; favoriser l'autonomie et la dignité du travail."
    )
    pdf.bullet("Confiance et transparence")
    pdf.bullet("Entraide et inclusion")
    pdf.bullet("Autonomie et dignité du travail")
    pdf.bullet("Responsabilité partagée")
    pdf.bullet("Innovation au service du réel")

    pdf.h2("12. Prochaines étapes proposées")
    pdf.table(
        ["Partenaire", "Étape 1", "Étape 2"],
        [
            [
                "Assureur",
                "Atelier produit (valeur / sinistre)",
                "Pilote corridor + intégration",
            ],
            [
                "Autorités",
                "Échange interdits / éducation app",
                "Canal signalement + formation",
            ],
            [
                "Opérateur MoMo",
                "Faisabilité API / escrow",
                "Pilote pays + co-marketing",
            ],
            [
                "Autre",
                "Brief produit + démo live",
                "MOU cible / KPI communs",
            ],
        ],
        [38, 68, 66],
    )

    pdf.h2("13. Contact")
    pdf.body(
        "Export Monde Prestige — Projet Rfacto\n"
        "Siège : Québec, Canada\n"
        "Web : www.rfacto.com\n"
        "Document confidentiel — usage partenaires. Ne pas redistribuer sans accord."
    )
    pdf.quote(
        "Priorité des 12 mois : prouver liquidité et confiance sur des corridors "
        "pilotes (ex. Gabon–Canada), avec des paiements locaux qui convertissent "
        "et une couverture assurance optionnelle pour le contenu."
    )

    try:
        pdf.output(str(OUT))
        return OUT
    except PermissionError:
        pdf.output(str(OUT_FALLBACK))
        return OUT_FALLBACK


if __name__ == "__main__":
    path = build()
    print(f"Wrote {path}")
