"""Generate Rfacto roles glossaire PDF (Client, Voyageur, Service, Admin)."""

from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).with_name("Rfacto-roles-utilisateurs.pdf")
FONT = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_B = Path(r"C:\Windows\Fonts\arialbd.ttf")


class RolesPDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_x(self.l_margin)
        self.set_font("Body", "B", 9)
        self.set_text_color(40, 90, 70)
        self.cell(90, 8, "Rfacto — Rôles utilisateurs", align="L")
        self.set_text_color(120, 120, 120)
        self.set_font("Body", "", 8)
        self.cell(
            0,
            8,
            "Glossaire communauté & admin",
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
        self.set_x(self.l_margin)
        self.set_font("Body", "B", 13)
        self.set_text_color(24, 72, 56)
        self.multi_cell(0, 7, text)
        self.ln(1)

    def body(self, text: str):
        self.set_x(self.l_margin)
        self.set_font("Body", "", 10)
        self.set_text_color(35, 35, 35)
        self.multi_cell(0, 5.4, text)
        self.ln(1)

    def bullet(self, text: str):
        self.set_x(self.l_margin)
        self.set_font("Body", "", 10)
        self.set_text_color(35, 35, 35)
        self.multi_cell(0, 5.3, f"•  {text}")
        self.ln(0.2)

    def role_block(self, title: str, subtitle: str, bullets: list[str], note: str):
        self.ln(1)
        self.set_x(self.l_margin)
        self.set_font("Body", "B", 12)
        self.set_text_color(24, 72, 56)
        self.multi_cell(0, 6.5, title)
        self.set_x(self.l_margin)
        self.set_font("Body", "", 9)
        self.set_text_color(80, 100, 90)
        self.multi_cell(0, 5, subtitle)
        self.ln(0.8)
        for b in bullets:
            self.bullet(b)
        self.set_x(self.l_margin)
        self.set_font("Body", "", 9)
        self.set_text_color(70, 70, 70)
        self.multi_cell(0, 5, note)
        self.ln(2)


def build() -> Path:
    pdf = RolesPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_font("Body", "", str(FONT))
    pdf.add_font("Body", "B", str(FONT_B))
    pdf.alias_nb_pages()
    pdf.set_margins(16, 16, 16)
    pdf.add_page()

    pdf.set_x(pdf.l_margin)
    pdf.set_font("Body", "B", 22)
    pdf.set_text_color(24, 72, 56)
    pdf.multi_cell(0, 10, "Rfacto")

    pdf.set_x(pdf.l_margin)
    pdf.set_font("Body", "B", 16)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(0, 8, "Rôles des utilisateurs et des admins")

    pdf.ln(2)
    pdf.body(
        "Glossaire officiel de la communauté : Client, Voyageur, Service — "
        "et le rôle Admin (équipe plateforme)."
    )
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Body", "", 9)
    pdf.set_text_color(120, 120, 120)
    pdf.multi_cell(
        0, 5, "Export Monde Prestige · rfacto.com · usage interne / partenaires"
    )
    pdf.ln(3)

    pdf.h2("1. Vue d’ensemble")
    pdf.body(
        "Rfacto est une place de marché de confiance qui connecte ceux qui ont "
        "de la capacité (bagage, trajet, fret, service) et ceux qui ont un besoin "
        "(envoi, réception, prestation). Un même compte peut combiner plusieurs "
        "intentions (livrer et commander)."
    )
    pdf.bullet("Client — demandeur (commande, paie, reçoit)")
    pdf.bullet("Voyageur — livreur occasionnel (capacité bagage / trajet)")
    pdf.bullet("Service — prestataire pro (fret, cargo, offres métier)")
    pdf.bullet("Admin — opérateur plateforme (confiance, litiges, modération)")

    pdf.h2("2. Les trois utilisateurs (communauté)")

    pdf.role_block(
        "2.1 Client",
        "Personne qui a un besoin : envoyer, recevoir, ou commander un service.",
        [
            "Publie une commande (colis) ou cherche une offre de service.",
            "Paie via le séquestre Rfacto (pas de paiement hors plateforme).",
            "Suit la livraison, utilise la messagerie, note et peut ouvrir un litige.",
            "Reçoit le colis ou la prestation selon l’accord.",
        ],
        "Technique : intention « Commander » → rôle SENDER (ou BOTH).",
    )

    pdf.role_block(
        "2.2 Voyageur",
        "Particulier qui livre via son trajet ou son bagage (capacité occasionnelle).",
        [
            "Publie un trajet (dates, route, capacité).",
            "Accepte des colis après vérification d’identité (KYC) et canal de paiement.",
            "Confirme la prise en charge (QR / code) et documente avec photos si besoin.",
            "Assure le transit et la remise ; reçoit le versement après statut « Livré ».",
        ],
        "Technique : intention « Livrer » + type particulier → TRAVELER (ou BOTH).",
    )

    if pdf.get_y() > 210:
        pdf.add_page()

    pdf.role_block(
        "2.3 Service (commercial / pro)",
        "Prestataire structuré : transitaire, fret, cargo, transport ou offre locale.",
        [
            "Publie des offres de service et/ou livre comme un professionnel.",
            "Mêmes obligations de confiance pour livrer : KYC, séquestre, preuves.",
            "Avance souvent ses frais d’exécution (fret, transport) jusqu’au déblocage.",
            "Contribue à la réputation du réseau via notations et historique.",
        ],
        "Technique : pas un 4e rôle base de données — « Livrer » + type commercial, "
        "plus le catalogue Services.",
    )

    pdf.h2("3. Admin (équipe Rfacto)")
    pdf.body(
        "Le rôle ADMIN est hors marketplace : il ne livre pas et ne commande pas "
        "comme un membre. Il sécurise la plateforme et tranche en cas d’incident."
    )
    pdf.bullet("Tableau de bord : utilisateurs, trajets, commandes, paiements, KYC.")
    pdf.bullet("Traite les signalements et les litiges ouverts.")
    pdf.bullet("Peut suspendre un compte ou intervenir sur une réservation.")
    pdf.bullet("Médiation équitable à partir des preuves (messagerie, QR, photos).")
    pdf.bullet("Ne remplace pas une assurance colis (volet à venir).")

    pdf.h2("4. Tableau récapitulatif")
    col_w = [32, 42, 96]
    headers = ["Qui", "Rôle", "Fait quoi"]
    rows = [
        ["Client", "Demandeur", "Commande, paie en séquestre, reçoit"],
        ["Voyageur", "Livreur occasionnel", "Capacité bagage / trajet, livre, est payé"],
        ["Service", "Prestataire pro", "Fret, cargo, offres métier, livre / exécute"],
        ["Admin", "Opérateur plateforme", "Confiance, litiges, modération"],
    ]
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Body", "B", 9)
    pdf.set_fill_color(24, 72, 56)
    pdf.set_text_color(255, 255, 255)
    for i, h in enumerate(headers):
        pdf.cell(col_w[i], 7, h, border=1, fill=True, align="C")
    pdf.ln()
    pdf.set_font("Body", "", 9)
    pdf.set_text_color(35, 35, 35)
    fill = False
    for row in rows:
        pdf.set_x(pdf.l_margin)
        for i, cell in enumerate(row):
            if fill:
                pdf.set_fill_color(245, 250, 247)
            pdf.cell(col_w[i], 7, cell, border=1, fill=fill)
        pdf.ln()
        fill = not fill
    pdf.ln(3)

    pdf.h2("5. Note technique (pour l’équipe)")
    pdf.body(
        "Dans l’application, les rôles enregistrés sont : SENDER, TRAVELER, BOTH, ADMIN. "
        "« Service » est une intention / catégorie produit (carrierType commercial + "
        "catalogue), pas une valeur séparée UserRole. Un compte BOTH peut à la fois "
        "livrer et commander."
    )
    pdf.body(
        "Règles liées : paiement en séquestre avant transit ; versement au livreur "
        "après confirmation de livraison ; litiges notifiés à l’admin ; charte de "
        "confiance et politique de responsabilité publiées sur rfacto.com."
    )

    pdf.output(str(OUT))
    return OUT


if __name__ == "__main__":
    path = build()
    print(f"Wrote {path}")
