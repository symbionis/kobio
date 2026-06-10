import { Sparkles } from "lucide-react";

export const metadata = { title: "Abonnement — Kobio" };

export default function AbonnementPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-7 lg:px-10 py-8 sm:py-12">
      <h1 className="font-display text-[38px] leading-tight tracking-tight">Abonnement</h1>
      <p className="text-zinc-600 mt-1 text-[15px] mb-6">
        L'offre et la tarification de Kobio.
      </p>

      <section className="rounded-[24px] bg-white shadow-soft border border-line p-5 sm:p-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 text-brand px-3 py-1 text-[12.5px] font-[650]">
          <Sparkles size={14} /> Bêta
        </div>

        <h2 className="font-[730] text-[19px] mt-4">Kobio est en version bêta</h2>
        <p className="text-[15px] text-zinc-600 mt-2 leading-relaxed">
          L'application est encore en développement. Nous invitons un nombre
          restreint d'utilisateurs à la tester et à nous faire part de leurs
          retours, afin de façonner l'outil avant son lancement.
        </p>
        <p className="text-[15px] text-zinc-600 mt-3 leading-relaxed">
          Aucun abonnement n'est requis pendant cette phase. Vos retours sont la
          contribution la plus précieuse — n'hésitez pas à nous écrire ce qui
          fonctionne, ce qui manque et ce qui vous ferait gagner du temps.
        </p>
      </section>
    </main>
  );
}
