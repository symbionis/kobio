import { Package } from "lucide-react";
import { listArticles } from "../../src/db/articles";
import { requireOwnerForPage } from "../../src/db/auth";
import { formatCHF as CHF } from "../../src/quote/totals";

// Reads the owner's articles from the DB per request.
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const scope = await requireOwnerForPage("/products");
  const articles = await listArticles(scope);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-7 lg:px-10 py-8 sm:py-12">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[38px] leading-tight tracking-tight">Produits</h1>
          <p className="text-zinc-600 mt-1 text-[15px]">
            Vos articles et prix — la mémoire que Kobio propose lors de la dictée.
          </p>
        </div>
        {articles.length > 0 && (
          <span className="text-[13px] text-zinc-500 font-mono-label">
            {articles.length} article{articles.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {articles.length === 0 ? (
        <div className="mt-7 rounded-[24px] bg-white border border-line shadow-soft p-10 text-center">
          <Package size={30} className="mx-auto text-zinc-400" />
          <div className="mt-3 text-[17px] font-[700]">Catalogue vide</div>
          <div className="text-zinc-600 mt-1">
            Vos articles apparaîtront ici. L'import depuis Bexio arrive bientôt.
          </div>
        </div>
      ) : (
        <section className="mt-6 rounded-[24px] bg-white shadow-soft border border-line overflow-hidden">
          <div className="divide-y divide-zinc-100">
            {articles.map((a) => (
              <div key={a.id} className="px-5 py-3.5">
                <div className="font-[600] text-[15px] leading-snug">{a.name || "Sans nom"}</div>
                <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-zinc-100 px-2.5 py-1.5">
                  <span className="font-mono-label text-[12.5px] text-zinc-500 whitespace-nowrap">
                    {a.code || "—"}
                  </span>
                  <span className="tabular-nums font-[550] text-[14px] whitespace-nowrap">
                    {a.price != null ? `CHF ${CHF(a.price)}` : <span className="text-zinc-400">—</span>}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
