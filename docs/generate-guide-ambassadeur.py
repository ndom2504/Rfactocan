"""Generate the Rfacto ambassador mini-guide PDF."""

from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).with_name("Rfacto-mini-guide-ambassadeur.pdf")
OUT_FALLBACK = Path(__file__).with_name("Rfacto-mini-guide-ambassadeur-v2.pdf")
FONT = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_B = Path(r"C:\Windows\Fonts\arialbd.ttf")


class GuidePDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Body", "B", 9)
        self.set_text_color(40, 90, 70)
        self.cell(0, 8, "Rfacto — Mini-guide ambassadeur", align="L")
        self.set_text_color(120, 120, 120)
        self.set_font("Body", "", 8)
        self.cell(0, 8, "Terrain / FAQ", align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(200, 200, 200)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-14)
        self.set_font("Body", "", 8)
        self.set_text_color(140, 140, 140)
        self.cell(0, 8, f"rfacto.com  ·  page {self.page_no()}/{{nb}}", align="C")

    def h1(self, text: str):
        self.set_font("Body", "B", 18)
        self.set_text_color(24, 72, 56)
        self.multi_cell(0, 9, text)
        self.ln(2)

    def h2(self, text: str):
        self.ln(3)
        self.set_font("Body", "B", 13)
        self.set_text_color(24, 72, 56)
        self.multi_cell(0, 7, text)
        self.ln(1)

    def h3(self, text: str):
        self.ln(2)
        self.set_font("Body", "B", 11)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6, text)
        self.ln(0.5)

    def body(self, text: str):
        self.set_font("Body", "", 10)
        self.set_text_color(35, 35, 35)
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def quote(self, text: str):
        self.set_fill_color(242, 248, 245)
        self.set_draw_color(40, 90, 70)
        x = self.l_margin
        y = self.get_y()
        w = self.w - self.l_margin - self.r_margin
        self.set_x(x)
        self.set_font("Body", "", 10)
        self.set_text_color(30, 55, 45)
        # Estimate height
        self.multi_cell(w - 6, 5.5, text, fill=False)
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
        self.multi_cell(w - 8, 5.5, text)
        self.ln(3)

    def bullet(self, text: str):
        self.set_font("Body", "", 10)
        self.set_text_color(35, 35, 35)
        self.multi_cell(0, 5.5, f"•  {text}")
        self.ln(0.3)

    def warn(self, text: str):
        self.set_font("Body", "", 10)
        self.set_text_color(140, 50, 40)
        self.multi_cell(0, 5.5, f"×  {text}")
        self.ln(0.3)


def build() -> Path:
    pdf = GuidePDF(format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(16, 16, 16)
    pdf.add_font("Body", "", str(FONT))
    pdf.add_font("Body", "B", str(FONT_B))
    pdf.add_page()

    # Cover header
    pdf.set_fill_color(24, 72, 56)
    pdf.rect(0, 0, pdf.w, 42, style="F")
    pdf.set_y(12)
    pdf.set_font("Body", "B", 22)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 10, "Rfacto", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Body", "", 12)
    pdf.cell(0, 7, "Mini-guide ambassadeur — pitch 30 s + FAQ terrain", new_x="LMARGIN", new_y="NEXT")
    pdf.set_y(50)

    pdf.h2("Pitch 30 secondes")
    pdf.quote(
        "Rfacto, c’est une plateforme qui met en relation trois acteurs : "
        "les voyageurs qui ont de la place, les services (transporteurs, transitaires, prestataires), "
        "et les clients qui veulent envoyer un colis ou commander un service. "
        "On connecte, on sécurise (identité, paiement, messagerie, suivi) — "
        "on ne transporte pas nous-mêmes. "
        "Comme Uber organise la rencontre, Rfacto organise l’échange. "
        "Vous pouvez livrer, publier un service ou commander — avec un seul compte. "
        "Site : rfacto.com → Commencer ici."
    )

    pdf.h3("Version ultra-courte (15 s)")
    pdf.quote(
        "Rfacto connecte voyageurs, services et clients pour les colis et prestations utiles — "
        "paiement et confiance inclus. On n’est pas un transitaire : on est la place de marché."
    )

    pdf.h2("Les 3 acteurs (mémo terrain)")
    pdf.body(
        "Voyageur — Publie un trajet / place bagage. « J’ai de la place, je livre. »\n"
        "Service — Publie fret, cargo, transport, offre locale. « Je suis pro / prestataire. »\n"
        "Client — Publie une commande. « J’ai besoin d’envoyer ou d’un service. »"
    )

    pdf.h2("Composition d’une ambassade (par pays)")
    pdf.body(
        "Chaque pays dispose de 3 ambassadeurs avec des responsabilités distinctes. "
        "Chacun a un périmètre clair. Ils remontent au siège international (Canada) "
        "et s’appuient sur la communauté WhatsApp et les testeurs locaux."
    )

    pdf.h3("Ambassadeur 1 — Développement commercial")
    pdf.body("Mission : faire grandir le réseau local (offre + demande + partenaires).")
    for line in [
        "Recruter des voyageurs (capacité de livraison)",
        "Recruter des expéditeurs / clients (commandes)",
        "Recruter des offreurs de services (transporteurs, transitaires, prestataires)",
        "Signer des partenariats locaux",
        "Représenter Rfacto lors des événements",
    ]:
        pdf.bullet(line)

    pdf.h3("Ambassadeur 2 — Communauté")
    pdf.body("Mission : animer, former et garder la communauté active et bien informée.")
    for line in [
        "Animer la communauté WhatsApp du pays",
        "Répondre aux questions du terrain",
        "Publier les nouveautés produit",
        "Accompagner les nouveaux utilisateurs (onboarding)",
    ]:
        pdf.bullet(line)

    pdf.h3("Ambassadeur 3 — Qualité et opérations")
    pdf.body("Mission : protéger la confiance et la qualité des échanges sur le terrain.")
    for line in [
        "Suivre les premiers transports / réservations",
        "Vérifier les profils signalés",
        "Remonter les problèmes au siège",
        "Superviser les testeurs locaux",
    ]:
        pdf.bullet(line)

    pdf.h3("Autour de l’ambassade")
    pdf.body(
        "Siège international (Canada) — app, infra, marketing international, partenariats "
        "stratégiques, finances, juridique, support de niveau 2.\n\n"
        "Équipe locale (plus tard, si le volume le justifie) — Service client, Marketing digital, "
        "Partenariats, Qualité, Assistant administratif.\n\n"
        "Communauté WhatsApp — 1 groupe public par pays (annonces, conseils, questions) + "
        "1 groupe réservé aux ambassadeurs (coordination, stats, incidents).\n\n"
        "Testeurs — une dizaine d’utilisateurs actifs par pays pour valider Android, iPhone et Web "
        "(bugs, performances, traduction, ergonomie) avant chaque version."
    )

    pdf.h2("FAQ terrain")

    faqs = [
        (
            "1. Différence avec un transitaire / les groupes WhatsApp ?",
            "Le transitaire fait la logistique pro (entrepôt, douane, flotte). Les groupes, c’est informel. "
            "Rfacto, c’est une place de marché ouverte : publier, chercher par pays/ville/date, réserver, "
            "payer, messager, suivre — dans un cadre digital. On ne remplace pas le transitaire : "
            "un pro peut même publier son service sur Rfacto.",
        ),
        (
            "2. Et si le colis se perd ? Qui est responsable ?",
            "Rfacto est un intermédiaire technologique : on met en relation et on sécurise la relation "
            "(KYC, paiement, litige). Le transport physique reste un accord entre les parties. "
            "En cas de problème : ouvrir un litige dans l’app → l’équipe est notifiée. "
            "On n’est pas transporteur, pas assureur colis automatique.",
        ),
        (
            "3. Comment on paie / on est payé ?",
            "Paiement via la plateforme, avec séquestre quand c’est activé : les fonds sont débloqués "
            "après confirmation de livraison. Pour encaisser : compte vérifié (identité) + canal de "
            "paiement configuré. Ne pas promettre un moyen de paiement local tant qu’il n’est pas live "
            "dans le pays.",
        ),
        (
            "4. C’est légal ? Douane ?",
            "Oui, la plateforme est légale. Chaque utilisateur doit déclarer honnêtement, respecter "
            "les lois et douanes du pays, et ne transporter que des biens autorisés. "
            "Rfacto ne gère pas la douane à votre place.",
        ),
        (
            "5. Quel est mon rôle d’ambassadeur ?",
            "Voir la section « Composition d’une ambassade » : 3 rôles distincts par pays "
            "(Commercial, Communauté, Qualité & opérations).\n\n"
            "Phrase type : « Je fais partie de l’ambassade Rfacto de mon pays. Selon mon rôle, "
            "je développe le réseau, j’anime la communauté, ou je veille à la qualité — "
            "et je remonte les besoins au siège Canada. »",
        ),
        (
            "6. Comment suis-je rémunéré(e) ?",
            "Réponse prudente (tant que le barème n’est pas signé) : la rémunération ambassadeur "
            "est définie par pays et par contrat avec le siège (objectifs, parrainage, partenariats). "
            "Ce n’est pas un salaire de transporteur. Les détails chiffrés se confirment par écrit "
            "avec Export Monde Prestige / Rfacto — on n’invente pas de %.",
        ),
        (
            "7. Combien ça coûte d’utiliser Rfacto ?",
            "Créer un compte et publier : accessible. Une commission plateforme peut s’appliquer "
            "sur les transactions réussies. Pas de frais cachés inventés sur le terrain — "
            "renvoyer vers l’app / le siège pour le taux du moment.",
        ),
        (
            "8. C’est seulement pour les colis ?",
            "Le colis est le cas d’usage fort, mais Rfacto ouvre aussi les services "
            "(transport, fret, prestations utiles). Objectif : connecter demandeurs et offreurs, "
            "pas seulement du « kilo dans un bagage ».",
        ),
        (
            "9. Comment je commence concrètement ?",
            "1) Aller sur rfacto.com (ou l’app)\n"
            "2) Créer un compte\n"
            "3) Bouton Publier → voyage, service ou commande\n"
            "4) Ou rechercher voyageurs / services / clients depuis le tableau de bord",
        ),
        (
            "10. Vous êtes basés où ?",
            "Siège international au Canada (Québec). Les ambassadeurs représentent Rfacto "
            "dans leur pays, avec support du siège.",
        ),
    ]

    for title, answer in faqs:
        pdf.h3(title)
        pdf.body(answer)

    pdf.h2("Ce qu’il ne faut jamais dire")
    for line in [
        "« Rfacto assure / rembourse tous les colis. »",
        "« On est un transporteur international. »",
        "« Tu gagnes X % d’ambassadeur » (sans contrat écrit).",
        "« C’est déjà dispo partout avec MoMo / Airtel » (sauf si live confirmé).",
        "Garantir un délai douane ou aérien.",
    ]:
        pdf.warn(line)

    pdf.h2("Closing terrain (10 secondes)")
    pdf.quote(
        "Si tu voyages souvent, tu peux monétiser ta place. "
        "Si tu envoies souvent, tu peux trouver quelqu’un de confiance. "
        "Si tu es pro, tu peux publier ton service. "
        "On s’inscrit ensemble ? Deux minutes."
    )

    pdf.ln(4)
    pdf.set_font("Body", "", 9)
    pdf.set_text_color(110, 110, 110)
    pdf.multi_cell(
        0,
        5,
        "Document interne ambassadeurs — Export Monde Prestige / Projet Rfacto. "
        "Ne pas inventer de chiffres de commission sans validation écrite du siège.",
    )

    try:
        pdf.output(OUT)
        return OUT
    except PermissionError:
        pdf.output(OUT_FALLBACK)
        return OUT_FALLBACK


if __name__ == "__main__":
    path = build()
    print(path)
