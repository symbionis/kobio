import { redirect } from "next/navigation";
import { requireOwner } from "../../src/db/auth";
import { getCompany } from "../../src/db/company";
import CompanyForm from "./CompanyForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const scope = await requireOwner().catch(() => null);
  if (!scope) redirect("/login?next=/settings");
  const company = await getCompany(scope);
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-7 lg:px-10 py-8 sm:py-12">
      <h1 className="font-display text-[38px] leading-tight tracking-tight">Réglages</h1>
      <p className="text-zinc-600 mt-1 text-[15px] mb-6">
        Vos coordonnées d'entreprise et vos connexions.
      </p>

      <CompanyForm initial={company} />

      <section className="mt-5 rounded-[24px] bg-white shadow-soft border border-line p-5 sm:p-6">
        <h2 className="font-[730] text-[17px]">Connexions</h2>
        <p className="text-[14px] text-zinc-600 mt-1 mb-4">
          Connectez Bexio pour importer vos clients, votre profil et votre catalogue, puis
          synchroniser vos devis.
        </p>
        <button
          className="rounded-full bg-white border border-zinc-300 px-4 py-2.5 text-[13.8px] font-[600] text-zinc-400 cursor-not-allowed"
          disabled
        >
          Connecter Bexio (bientôt)
        </button>
      </section>
    </main>
  );
}
