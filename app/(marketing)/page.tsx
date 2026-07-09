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
            Envoyez vos colis du Canada vers l&apos;Afrique via des voyageurs
            vérifiés — plus rapide, plus humain, plus abordable.
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
          Comment ça marche
        </h2>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          Une mise en relation simple entre voyageurs disposant d&apos;espace
          bagage et particuliers qui souhaitent expédier un colis.
        </p>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Publiez",
              text: "Le voyageur annonce son itinéraire. L'expéditeur publie son besoin de colis.",
            },
            {
              title: "Match",
              text: "Rfacto propose les meilleurs voyageurs selon destination, date, poids et réputation.",
            },
            {
              title: "Confiance",
              text: "Messagerie, certification douanière, suivi des statuts et notations mutuelles.",
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

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-[1.5rem] bg-[var(--surface)] px-8 py-10 border border-[var(--border)]">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Corridors couverts
          </h2>
          <p className="mt-2 text-[var(--muted)]">
            Canada → Gabon, Cameroun, Côte d&apos;Ivoire, Sénégal, Congo, RDC.
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
