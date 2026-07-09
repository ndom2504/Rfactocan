import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main>
      <section className="relative mx-auto min-h-[78vh] max-w-6xl overflow-hidden px-6 pb-16 pt-8">
        <div
          className="absolute inset-0 -z-10 rounded-[2rem]"
          style={{
            background:
              "linear-gradient(135deg, var(--hero-from), var(--hero-to)), radial-gradient(circle at 70% 30%, rgba(255,255,255,0.12), transparent 40%)",
          }}
        />
        <div
          className="absolute inset-0 -z-10 rounded-[2rem] opacity-30"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />

        <div className="flex min-h-[70vh] flex-col justify-end gap-8 px-2 pb-10 pt-24 text-white md:max-w-2xl md:justify-center md:pb-0 md:pt-10">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/70">
            RapidFacto
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-5xl leading-[1.05] font-semibold md:text-6xl">
            Rfacto
          </h1>
          <p className="max-w-xl text-lg text-white/85 md:text-xl">
            Le réseau mondial qui connecte les voyageurs et les expéditeurs
            partout dans le monde.
          </p>
          <p className="max-w-xl text-sm text-white/70">
            Chaque voyageur peut devenir un transporteur occasionnel. Chaque
            espace disponible dans un bagage devient une opportunité logistique.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/register?role=SENDER">
              <Button size="lg" className="bg-white text-[var(--hero-from)] hover:bg-white/90">
                Envoyer un colis
              </Button>
            </Link>
            <Link href="/register?role=TRAVELER">
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white/10"
              >
                Je voyage
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          L&apos;Airbnb du bagage international
        </h2>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          Une marketplace P2P : comme Uber connecte conducteurs et passagers,
          Rfacto connecte l&apos;espace bagage des voyageurs aux besoins
          d&apos;expédition des particuliers et PME.
        </p>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Publiez",
              text: "Annoncez votre trajet ou votre besoin de colis — d'un pays à un autre.",
            },
            {
              title: "Match mondial",
              text: "Score Rfacto : route, date, prix, réputation et historique de livraisons.",
            },
            {
              title: "Confiance",
              text: "KYC, paiement séquestre, messagerie et notations mutuelles.",
            },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          Un compte, deux rôles
        </h2>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          Envoyez un colis aujourd&apos;hui, transportez demain. Pas de rôle
          figé : chaque utilisateur peut être expéditeur et voyageur.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] px-8 py-10">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Phase 1 — corridors prioritaires
          </h2>
          <p className="mt-2 text-[var(--muted)]">
            Diaspora francophone : Canada, France, Belgique ↔ Gabon, Cameroun,
            Côte d&apos;Ivoire, Sénégal, RDC — puis Europe ↔ Afrique, puis le
            monde entier.
          </p>
          <p className="mt-4 text-sm text-[var(--muted)]">
            Exemples déjà supportés : Montréal → Paris, New York → Dakar, Dubaï →
            Nairobi, Johannesburg → Douala…
          </p>
          <div className="mt-6">
            <Link href="/register">
              <Button>Rejoindre Rfacto</Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
