"""Generate a realistic Rfacto business plan PDF."""

from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).with_name("Rfacto-business-plan.pdf")
OUT_FALLBACK = Path(__file__).with_name("Rfacto-business-plan-v2.pdf")
FONT = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_B = Path(r"C:\Windows\Fonts\arialbd.ttf")


class PlanPDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Body", "B", 9)
        self.set_text_color(40, 90, 70)
        self.cell(0, 8, "Rfacto — Business plan", align="L")
        self.set_text_color(120, 120, 120)
        self.set_font("Body", "", 8)
        self.cell(
            0,
            8,
            "Confidentiel — usage interne / partenaires",
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
    pdf = PlanPDF(format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(16, 16, 16)
    pdf.add_font("Body", "", str(FONT))
    pdf.add_font("Body", "B", str(FONT_B))
    pdf.add_page()

    pdf.set_fill_color(24, 72, 56)
    pdf.rect(0, 0, pdf.w, 52, style="F")
    pdf.set_y(14)
    pdf.set_font("Body", "B", 24)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 10, "Rfacto", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Body", "", 12)
    pdf.cell(
        0,
        7,
        "Business plan réaliste — Phase 1 (24 mois)",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.set_font("Body", "", 10)
    pdf.cell(
        0,
        6,
        "Export Monde Prestige · Siège Québec, Canada · Juillet 2026",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.set_y(60)

    pdf.quote(
        "Rfacto est une place de marché qui met en relation voyageurs, services "
        "et clients pour les colis et prestations utiles — avec KYC, paiement sécurisé, "
        "messagerie et suivi. Objectif : rendre les communautés autonomes grâce au "
        "numérique et aux paiements locaux."
    )

    pdf.h2("1. Résumé exécutif")
    pdf.body(
        "Rfacto (projet d'Export Monde Prestige, fondé par Morel Stevens Ndong) connecte "
        "ceux qui ont de la capacité (bagage, trajet, fret, service) et ceux qui ont un besoin "
        "(envoi, réception, prestation). La plateforme n'est pas un transporteur : elle "
        "organise la rencontre, la confiance et le paiement."
    )
    pdf.bullet("Modèle : commission ~10 % sur les transactions réussies (séquestre).")
    pdf.bullet(
        "Phase 1 : diaspora francophone — Canada, France, Belgique ↔ Gabon, Cameroun, "
        "Côte d'Ivoire, Sénégal, RDC."
    )
    pdf.bullet("Go-to-market : 3 ambassadeurs par pays + communautés WhatsApp + testeurs.")
    pdf.bullet(
        "Cible an 1 (conservatrice) : 4–5 pays actifs, ~4–12 k$ CAD/mois de revenu "
        "plateforme en fin d'année."
    )
    pdf.bullet(
        "Cible an 2 : 10–30 k$ CAD/mois si paiements locaux et rétention au rendez-vous."
    )

    pdf.h2("2. Problème")
    pdf.bullet(
        "Envois diaspora / interurbains chers, lents ou informels (groupes WhatsApp, contacts kilos)."
    )
    pdf.bullet(
        "Manque de confiance : pas d'identité vérifiée, pas de paiement sécurisé, peu de recours."
    )
    pdf.bullet(
        "Les transitaires pro existent, mais ne couvrent pas le besoin P2P occasionnel "
        "ni la longue traîne de services locaux."
    )
    pdf.bullet(
        "Les particuliers et petits commerçants manquent d'outils numériques simples et locaux."
    )

    pdf.h2("3. Solution")
    pdf.body(
        "Une application web + mobile qui permet de publier un voyage, un service ou une commande ; "
        "de matcher ; de payer en séquestre ; d'échanger et de suivre la livraison."
    )
    pdf.bullet("Trois acteurs : Voyageurs · Services (fret, cargo, prestations) · Clients.")
    pdf.bullet("Confiance : KYC, notation, messagerie liée à la réservation, litiges.")
    pdf.bullet("Paiements : carte/Stripe + ambition mobile money (Moov, Airtel, Interac…).")
    pdf.bullet("Visite guidée et onboarding pour réduire la friction.")

    pdf.h2("4. Marché adressable (réaliste)")
    pdf.body(
        "Nous ne ciblons pas « tout le e-commerce Afrique ». Nous ciblons des corridors "
        "où la diaspora et les flux locaux créent déjà une demande d'envois et de services."
    )
    pdf.h3("Segments prioritaires")
    pdf.bullet("Particuliers diaspora (famille, documents, colis légers).")
    pdf.bullet("Voyageurs fréquents (place bagage monétisée).")
    pdf.bullet("Petits transitaires / transporteurs locaux (visibilité + clients).")
    pdf.bullet("Commerçants / services collaboratifs (extension après le colis).")
    pdf.h3("Positionnement")
    pdf.quote(
        "Le transitaire fait la logistique pro. Rfacto fait la place de marché ouverte "
        "et sécurisée. Les deux peuvent coexister — un pro peut publier sur Rfacto."
    )

    pdf.h2("5. Modèle économique")
    pdf.bullet(
        "Commission plateforme : ~10 % (1 000 bps) sur le montant payé, configurable par corridor."
    )
    pdf.bullet("Paiement en séquestre : fonds libérés après confirmation de livraison.")
    pdf.bullet(
        "Revenus futurs possibles : boosts de visibilité, abonnements pro, frais de change corridor."
    )
    pdf.bullet("Coûts variables : Stripe/Resend, support, commissions ambassadeurs, litiges.")
    pdf.body(
        "Exemple : une transaction de 100 $ → ~10 $ de revenu brut plateforme "
        "(avant frais de paiement ~2–3 %)."
    )

    pdf.h2("6. Go-to-market")
    pdf.h3("Principe")
    pdf.body(
        "Ouvrir peu de pays, mais les rendre liquides (offre + demande + paiement). "
        "Mieux vaut 2 corridors qui transactent que 10 pays vides."
    )
    pdf.h3("Ordre de déploiement")
    pdf.bullet("Vague 1 : Gabon + Canada (preuves, réseau fondateur, confiance).")
    pdf.bullet("Vague 2 : Côte d'Ivoire, Cameroun, Sénégal (volume diaspora).")
    pdf.bullet("Vague 3 : France (demande + voyageurs), puis Belgique et RDC.")
    pdf.h3("Organisation terrain")
    pdf.bullet("3 ambassadeurs / pays : Commercial · Communauté · Qualité & ops.")
    pdf.bullet("Groupe WhatsApp public + groupe ambassadeurs.")
    pdf.bullet("~10 testeurs actifs / pays (Android, iOS, Web).")
    pdf.h3("Acquisition")
    pdf.bullet("Parrainage communauté, aéroports/gares, associations diaspora, contenus courts.")
    pdf.bullet("Partenariats paiement local (crédibilité + conversion).")
    pdf.bullet("Ambassadeurs mesurés sur inscrits utiles + transactions, pas seulement likes.")

    pdf.add_page()
    pdf.h2("7. Objectifs utilisateurs & CA par pays (an 1)")
    pdf.body(
        "Chiffres de fin d'année 1, hypothèse conservatrice. GMV = volume d'affaires ; "
        "revenu ≈ 10 % du GMV."
    )
    pdf.table(
        ["Pays / type", "Inscrits", "Actifs/mois", "GMV/mois", "Revenu/mois"],
        [
            ["Canada / France", "800-2000", "150-400", "15-40 k$", "1,5-4 k$"],
            ["CI / Cameroun / Senegal", "500-1200", "100-250", "8-25 k$", "0,8-2,5 k$"],
            ["Gabon", "400-1000", "80-200", "6-20 k$", "0,6-2 k$"],
            ["RDC", "300-800", "60-150", "5-15 k$", "0,5-1,5 k$"],
            ["Belgique", "200-600", "40-120", "4-12 k$", "0,4-1,2 k$"],
        ],
        [48, 28, 30, 34, 32],
    )
    pdf.body(
        "Si 4–5 pays atteignent le bas de fourchette fin an 1 : GMV global ~40–120 k$/mois "
        "et revenu plateforme ~4–12 k$/mois."
    )

    pdf.h2("8. Projections consolidées (scénario réaliste)")
    pdf.h3("Hypothèses")
    pdf.bullet("Commission nette après frais paiement : ~7–8 % du GMV.")
    pdf.bullet("Focus sur transactions payées, pas sur vanity metrics.")
    pdf.bullet("Pas de levée massive intégrée : croissance tirée par terrain + produit.")
    pdf.table(
        ["Indicateur", "M6", "M12", "M24"],
        [
            ["Pays réellement actifs", "2-3", "4-5", "6-8"],
            ["Utilisateurs inscrits (cumul)", "1-2,5 k", "4-8 k", "12-25 k"],
            ["Actifs mensuels", "200-500", "600-1500", "2-4 k"],
            ["GMV / mois", "10-30 k$", "40-120 k$", "120-350 k$"],
            ["Revenu plateforme / mois", "1-3 k$", "4-12 k$", "10-30 k$"],
            ["Reservations payees / mois", "40-120", "150-400", "400-1000"],
        ],
        [58, 38, 38, 38],
    )
    pdf.body(
        "Ces fourchettes sont des cibles de pilotage. Le succès se mesure d'abord à la "
        "récurrence des paiements et au taux de litige (< 5 %), pas au nombre de comptes."
    )

    pdf.h2("9. Coûts & besoin de trésorerie")
    pdf.bullet(
        "Produit / infra : hébergement, Stripe, Resend, outillage — quelques centaines $/mois au début."
    )
    pdf.bullet(
        "Ambassadeurs : variable (parrainage / primes objectifs), à contractualiser par pays."
    )
    pdf.bullet(
        "Support & ops : fondateur + ambassadeur qualité ; renfort quand le volume le justifie."
    )
    pdf.bullet(
        "Marketing : surtout organique / communauté en phase 1 ; budget ads léger et testé."
    )
    pdf.body(
        "Besoin de trésorerie recommandé pour 12 mois : couvrir ops + support paiement local "
        "+ 2–3 pays pilotes, plutôt qu'un déploiement mondial prématuré."
    )

    pdf.h2("10. Organisation")
    pdf.h3("Niveau 1 — Siège (Canada)")
    pdf.body(
        "Produit, infra, marketing international, partenariats stratégiques, finances, "
        "juridique, support niveau 2."
    )
    pdf.h3("Niveau 2 — Ambassade pays (x3)")
    pdf.bullet("Commercial : recrutement, partenariats, événements.")
    pdf.bullet("Communauté : WhatsApp, questions, onboarding, nouveautés.")
    pdf.bullet("Qualité : premiers transports, signalements, testeurs, remontées.")
    pdf.h3("Niveaux suivants")
    pdf.bullet("Équipe locale (5 rôles) seulement si le volume le justifie.")
    pdf.bullet("Communauté WhatsApp publique + groupe ambassadeurs.")
    pdf.bullet("Testeurs avant chaque version Android / iOS / Web.")

    pdf.add_page()
    pdf.h2("11. Produit & feuille de route")
    pdf.h3("Déjà en place (socle)")
    pdf.bullet("Comptes, publication voyage/service/commande, matching, réservations.")
    pdf.bullet("Paiement séquestre, KYC, messagerie, litiges, OTP email, visite guidée.")
    pdf.bullet("Web + apps ; corridors et devises multi-pays.")
    pdf.h3("12 prochains mois (priorités business)")
    pdf.bullet("Paiements locaux live (Mobile Money / Interac) sur 1–2 pays pilotes.")
    pdf.bullet("Programme ambassadeurs chiffré et contractualisé.")
    pdf.bullet("Fiabilité ops : preuves de remise, baisse des frictions litige.")
    pdf.bullet("Activation Gabon–Canada puis 2e vague Afrique de l'Ouest.")
    pdf.bullet("Tableaux de bord pays (inscrits, GMV, litiges) pour le siège.")
    pdf.h3("Ensuite")
    pdf.bullet("Services collaboratifs au-delà du colis (là où la demande est prouvée).")
    pdf.bullet("Corridors Asie / Golfe uniquement après liquidité Phase 1.")

    pdf.h2("12. Avantages concurrentiels")
    pdf.bullet("Double ancrage : fondateur gabonais + siège Canada (crédibilité diaspora).")
    pdf.bullet("Produit confiance (KYC, séquestre, messagerie) vs groupes informels.")
    pdf.bullet("Ouverture pro + particulier (pas seulement « kilos » fermés).")
    pdf.bullet("Organisation pays avec rôles clairs (pas un réseau flou).")
    pdf.bullet("Ambition paiements locaux — condition de conversion en Afrique.")

    pdf.h2("13. Risques & mitigations")
    pdf.table(
        ["Risque", "Mitigation"],
        [
            ["Cold start offre/demande", "2-3 pays max ; ambassadeurs ; 1 corridor"],
            ["Confiance / litiges colis", "KYC, sequestre, preuves, politique claire"],
            ["Paiements locaux absents", "Partenariats MoMo/Airtel/Interac prioritaires"],
            ["Conformite douane", "Education users ; interdits ; signalement"],
            ["Ambassadeurs faibles", "Objectifs trimestriels ; revue siege"],
            ["Dispersion geographique", "Pas d'ouverture sans liquidite minimale"],
        ],
        [55, 120],
    )

    pdf.h2("14. Indicateurs de pilotage (KPI)")
    pdf.bullet("Hebdo : nouvelles annonces, matchs, paiements réussis, litiges ouverts.")
    pdf.bullet(
        "Mensuel : actifs, GMV, revenu, taux de conversion inscription vers 1re transaction."
    )
    pdf.bullet("Qualité : délai réponse communauté, note moyenne, % litiges.")
    pdf.bullet("Pays « vert » si : >=30 paiements/mois et litiges < 5 % pendant 2 mois.")

    pdf.h2("15. Usage de ce document")
    pdf.body(
        "Ce business plan sert à aligner fondateur, ambassadeurs et partenaires "
        "(paiement, distribution) sur des objectifs atteignables. Ce n'est pas une "
        "promesse de rendement. Les fourchettes seront révisées chaque trimestre "
        "selon les transactions réelles."
    )
    pdf.quote(
        "Priorité absolue des 12 mois : prouver la liquidité et la confiance sur "
        "Gabon–Canada (et 1–2 corridors Ouest africains), avec des paiements locaux "
        "qui convertissent — avant toute expansion prestige."
    )

    pdf.ln(4)
    pdf.set_font("Body", "", 9)
    pdf.set_text_color(110, 110, 110)
    pdf.multi_cell(
        0,
        5,
        "Document interne — Export Monde Prestige / Projet Rfacto — Juillet 2026. "
        "Chiffres en CAD sauf mention. Hypothèses à valider avec données terrain.",
    )

    try:
        pdf.output(OUT)
        return OUT
    except PermissionError:
        pdf.output(OUT_FALLBACK)
        return OUT_FALLBACK


if __name__ == "__main__":
    print(build())
