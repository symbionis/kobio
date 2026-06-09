import { listClients } from "../../src/db/clients";
import ClientManager from "./ClientManager";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await listClients();
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-7 lg:px-10 py-8 sm:py-12">
      <h1 className="font-display text-[38px] leading-tight tracking-tight">Clients</h1>
      <p className="text-zinc-600 mt-1 text-[15px] mb-6">
        Vos clients, saisis à la main pour l'instant.
      </p>
      <ClientManager initialClients={clients} />
    </main>
  );
}
