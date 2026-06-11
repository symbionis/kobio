import {
  ChevronRight,
  Clock,
  FileText,
  Hammer,
  Mic,
  Pencil,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { TRADES } from "../src/quote/trades";

// The supported métiers, in display order — derived from the canonical TRADES so
// each pill carries its trade value and can deep-link into /new pre-selected.
const METIER_ORDER = ["plomberie", "electricite", "peinture", "maconnerie", "menuiserie", "carrelage"];
const METIERS = METIER_ORDER.flatMap((v) => TRADES.filter((t) => t.value === v));

const EXAMPLE_LINES = [
  { label: "Dépose et pose lavabo complet", price: "CHF 420" },
  { label: "Remplacement WC suspendu", price: "CHF 560" },
  { label: "Robinetterie mitigeur", price: "CHF 165" },
  { label: "Faïence murale × 6 m²", price: "CHF 366" },
];

const STEPS = [
  {
    n: "01",
    title: "Parlez",
    body: "« Salon 28 m², peinture murs et plafond, 2 couches, rebouchage fissures, dépose papier peint. »",
  },
  {
    n: "02",
    title: "Vérifiez",
    body: "Kobio extrait les postes, les quantités, applique vos prix. Vous ajustez si besoin.",
  },
  {
    n: "03",
    title: "Envoyez",
    body: "PDF propre avec votre logo. Téléchargez, envoyez au client, suivez l'acceptation.",
  },
];

const FEATURES = [
  {
    icon: Mic,
    title: "Dictez depuis le chantier",
    desc: "Main libre, gants sales, pas de souci. Votre téléphone écoute et transcrit.",
  },
  {
    icon: Sparkles,
    title: "Kobio structure le devis",
    desc: "Quantités, unités m²/ml/u, vos prix du catalogue — chiffré, prêt à vérifier.",
  },
  {
    icon: Send,
    title: "PDF pro + envoi client",
    desc: "Mise en page propre, votre logo. Téléchargez le PDF et envoyez au client.",
  },
];

const TERRAIN = [
  "Fonctionne sur iPhone / Android au micro, même avec du bruit",
  "Vos prix, vos articles — repris de votre catalogue",
  "Mentions, acompte et validité sur le PDF",
  "Devis archivés, retrouvés en un clic",
  "Export PDF propre — prêt à envoyer",
];

const AVIS = [
  { quote: "Je fais mes devis dans le camion après la visite. Avant c'était le dimanche soir…", who: "Karim, plombier – Lyon" },
  { quote: "La cliente a reçu le devis avant que je quitte la rue. Signé le soir même.", who: "Anaïs, peinture – Nantes" },
  { quote: "Enfin un truc qui parle chantier, pas un logiciel de comptable.", who: "Joël, élec – Avignon" },
];

export default function HomePage() {
  return (
    <main>
      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 sm:px-7 lg:px-10 pt-12 md:pt-20 pb-12">
        <div className="grid lg:grid-cols-[1.14fr_.86fr] gap-12 lg:gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-line text-[12px] font-semibold text-zinc-700 shadow-soft">
              <span className="w-1.5 h-1.5 rounded-full bg-brand" /> Fait pour les artisans du bâtiment
            </div>
            <h1 className="font-display text-[46px] sm:text-[64px] leading-[0.95] tracking-tight mt-5">
              Parlez.
              <br />
              On chiffre.
              <br />
              <span className="text-rust">Vous envoyez.</span>
            </h1>
            <p className="text-[17.5px] leading-relaxed text-zinc-600 mt-6 max-w-[540px]">
              Kobio transforme votre note vocale de chantier en un devis pro, clair et envoyable en 2
              minutes. Fini les soirées d'admin.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-7">
              <Link
                href="/new"
                className="bg-dark text-white rounded-full px-5 py-3.5 text-[14.5px] font-[700] flex items-center gap-2 shadow-soft hover:bg-black transition"
              >
                Essayer maintenant <ChevronRight size={18} />
              </Link>
              <Link
                href="/quotes"
                className="px-5 py-3.5 rounded-full bg-white border border-zinc-300 text-[14px] font-[600] hover:bg-zinc-50 transition"
              >
                Voir mes devis
              </Link>
            </div>
            <div className="flex flex-wrap gap-6 mt-6 text-[12.7px] text-zinc-600">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-zinc-700" /> Brouillon avant tout envoi
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={16} className="text-zinc-700" /> 2 min en moyenne
              </span>
              <span className="flex items-center gap-1.5">
                <Hammer size={16} className="text-zinc-700" /> Pensé pour le chantier
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-9 text-[12.5px] text-zinc-500">
              <span className="font-[650] text-zinc-600">Métiers pris en charge :</span>
              {METIERS.map((m) => (
                <Link
                  key={m.value}
                  href={`/new?trade=${m.value}`}
                  className="px-2.5 py-1 rounded-full bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition"
                >
                  {m.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Demo card */}
          <div className="relative">
            <div className="rounded-[28px] bg-white shadow-soft border border-line p-5 sm:p-7">
              <div className="text-[11.5px] font-mono-label text-zinc-500 mb-2">EXEMPLE • PLOMBERIE</div>
              <div className="rounded-2xl bg-paper-2 border border-line p-4 text-[14.6px] leading-relaxed text-zinc-700">
                « Oui bonjour Mme Renard, pour la salle de bain. Dépose lavabo existant, pose d'un
                meuble vasque 80, remplacement du mitigeur, et un WC suspendu. Environ 6 m² de faïence
                murale aussi. C'est au 14 rue des Lilas. »
              </div>
              <div className="mt-4 grid sm:grid-cols-2 gap-3 text-[13.6px]">
                {EXAMPLE_LINES.map((l) => (
                  <div
                    key={l.label}
                    className="rounded-xl bg-[#f8f3ea] px-3 py-2.5 border border-[#eadbca] flex items-center justify-between gap-2"
                  >
                    <span>{l.label}</span>
                    <b className="whitespace-nowrap">{l.price}</b>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-3 text-[13.5px]">
                <span className="text-zinc-500">Total HT estimé</span>
                <span className="font-[750] text-[18px]">CHF 1 511.00</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Link
                  href="/new"
                  className="flex-1 rounded-xl bg-brand text-white py-3 font-[700] text-center hover:bg-brand-dark transition"
                >
                  Tester avec ma voix
                </Link>
                <Link
                  href="/new"
                  className="px-3 rounded-xl border border-zinc-300 bg-white flex items-center"
                  aria-label="Dicter un devis"
                >
                  <Pencil size={16} />
                </Link>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-2 text-[11.5px] bg-dark text-[#f8eee0] px-3 py-2 rounded-full shadow-soft">
              Dictée → Devis en 45s
            </div>
          </div>
        </div>

        {/* Feature strip */}
        <div className="mt-16 grid md:grid-cols-3 gap-5">
          {FEATURES.map((c) => (
            <div key={c.title} className="rounded-[22px] bg-white border border-line p-5 shadow-soft">
              <c.icon size={20} className="text-rust" />
              <div className="font-[740] mt-2 text-[16.5px]">{c.title}</div>
              <div className="text-[14px] text-zinc-600 mt-1">{c.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white border-y border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-7 lg:px-10 py-14">
          <div className="max-w-2xl">
            <div className="text-[12.5px] font-mono-label text-zinc-500">COMMENT ÇA MARCHE</div>
            <h2 className="font-display text-[38px] sm:text-[44px] leading-tight tracking-tight mt-2">
              3 étapes, zéro tableur.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mt-9 text-[15px] text-zinc-700">
            {STEPS.map((s) => (
              <div key={s.n}>
                <div className="text-[11px] font-mono-label text-zinc-500">{s.n}</div>
                <div className="font-[700] mt-1">{s.title}</div>
                <p className="text-zinc-600 mt-1">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href="/new"
              className="inline-block rounded-full bg-dark text-white px-5 py-3 font-[700] text-[14px] hover:bg-black transition"
            >
              Créer mon 1er devis vocal
            </Link>
          </div>
        </div>
      </section>

      {/* TERRAIN + AVIS */}
      <section className="max-w-6xl mx-auto px-4 sm:px-7 lg:px-10 py-16">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <h3 className="font-display text-[34px] tracking-tight">Pensé pour les vrai(e)s du terrain</h3>
            <ul className="mt-5 space-y-3 text-[15px] text-zinc-700">
              {TERRAIN.map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-brand">•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] bg-paper-2 border border-line p-6 shadow-soft">
            <div className="text-[12.5px] font-mono-label text-zinc-500">AVIS ARTISANS</div>
            <div className="mt-4 space-y-4 text-[14.9px] text-zinc-700">
              {AVIS.map((a) => (
                <p key={a.who}>
                  « {a.quote} »<br />
                  <span className="text-zinc-500">— {a.who}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line bg-[#f4eee5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-7 lg:px-10 py-10 text-[13.5px] text-zinc-600 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText size={15} /> Kobio • Outil pour artisans
          </div>
          <div className="flex gap-5">
            <Link href="/new" className="hover:text-black transition">
              Dicter un devis
            </Link>
            <Link href="/quotes" className="hover:text-black transition">
              Mes devis
            </Link>
            <Link href="/settings" className="hover:text-black transition">
              Réglages
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
