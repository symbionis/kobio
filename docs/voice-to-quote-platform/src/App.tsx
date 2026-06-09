import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  Mic, Square, Pause, Play, Sparkles, Hammer, FileText,
  Truck, Clock, ShieldCheck, Download, Send, Copy,
  Trash2, Plus,
  Pencil, Check, ChevronRight, Wrench, Zap, PaintRoller,
  Layers, History, X,
  FileCheck
} from "lucide-react";
import { Toaster, toast } from "sonner";
import jsPDF from "jspdf";

// ---- Types ----
type Metier = "Plomberie" | "Électricité" | "Peinture" | "Maçonnerie" | "Menuiserie" | "Carrelage" | "Multiservices";

type DevisItem = {
  id: string;
  designation: string;
  detail?: string;
  qty: number;
  unite: string;
  pu_ht: number;
};

type ClientInfo = {
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
};

type EntrepriseInfo = {
  nom: string;
  metier: Metier;
  siret: string;
  adresse: string;
  telephone: string;
  email: string;
};

type DevisDoc = {
  id: string;
  numero: string;
  date: string;
  validite_jours: number;
  client: ClientInfo;
  objet: string;
  items: DevisItem[];
  tva_taux: number;
  remise: number;
  notes: string;
  transcript: string;
  statut: "brouillon" | "envoyé" | "accepté";
  created_at: number;
};

// ---- Catalogue de prix BTP (réaliste FR 2025/2026) ----
const CATALOGUE: Record<Metier, { label: string; pu: number; unite: string; keywords: string[] }[]> = {
  "Plomberie": [
    { label: "Dépose et pose lavabo complet", pu: 420, unite: "u", keywords: ["lavabo", "vasque"] },
    { label: "Remplacement WC suspendu / au sol", pu: 560, unite: "u", keywords: ["wc", "toilette"] },
    { label: "Remplacement robinetterie mitigeur", pu: 165, unite: "u", keywords: ["robinet", "mitigeur", "mélangeur"] },
    { label: "Création point d'eau EF/EC", pu: 295, unite: "u", keywords: ["point d'eau", "alimentation"] },
    { label: "Remplacement cumulus 200L", pu: 1120, unite: "u", keywords: ["chauffe-eau", "cumulus", "ballon"] },
    { label: "Débouchage canalisation", pu: 145, unite: "u", keywords: ["débouch", "canalisation"] },
    { label: "Recherche de fuite", pu: 190, unite: "u", keywords: ["fuite"] },
    { label: "Pose évier avec raccordement", pu: 380, unite: "u", keywords: ["évier"] },
  ],
  "Électricité": [
    { label: "Remplacement tableau électrique 2 rangées", pu: 890, unite: "u", keywords: ["tableau", "disjoncteur"] },
    { label: "Ajout prise de courant", pu: 98, unite: "u", keywords: ["prise"] },
    { label: "Ajout point lumineux / interrupteur", pu: 115, unite: "u", keywords: ["interrupteur", "point lum", "lumineux"] },
    { label: "Pose spot LED encastré", pu: 64, unite: "u", keywords: ["spot"] },
    { label: "Tirage ligne spécialisée", pu: 155, unite: "ml", keywords: ["tirer", "ligne", "câble"] },
    { label: "Remplacement radiateur électrique", pu: 225, unite: "u", keywords: ["radiateur"] },
    { label: "Mise à la terre", pu: 380, unite: "forfait", keywords: ["terre"] },
    { label: "Diagnostique / recherche panne", pu: 120, unite: "u", keywords: ["panne", "diagnostic"] },
  ],
  "Peinture": [
    { label: "Peinture mur 2 couches", pu: 28.5, unite: "m²", keywords: ["peinture mur", "murs"] },
    { label: "Peinture plafond 2 couches", pu: 31.5, unite: "m²", keywords: ["plafond"] },
    { label: "Lessivage + rebouchage", pu: 11, unite: "m²", keywords: ["lessiv", "rebouch"] },
    { label: "Enduit de lissage", pu: 24, unite: "m²", keywords: ["enduit", "lissage"] },
    { label: "Sous-couche impression", pu: 8.8, unite: "m²", keywords: ["sous-couche", "impression"] },
    { label: "Peinture boiseries", pu: 41, unite: "ml", keywords: ["boiserie", "porte", "plinthes"] },
    { label: "Protection sol / mobilier", pu: 3.9, unite: "m²", keywords: ["protection"] },
  ],
  "Maçonnerie": [
    { label: "Démolition cloison", pu: 52, unite: "m²", keywords: ["démol", "cloison"] },
    { label: "Ouverture mur porteur + IPN", pu: 2450, unite: "u", keywords: ["mur porteur", "ipn", "ouverture"] },
    { label: "Ragréage sol", pu: 29, unite: "m²", keywords: ["ragréage"] },
    { label: "Chape ciment", pu: 44, unite: "m²", keywords: ["chape"] },
    { label: "Montage cloison placo", pu: 68, unite: "m²", keywords: ["cloison", "placo", "ba13"] },
    { label: "Rebouchage saignées", pu: 18, unite: "ml", keywords: ["saignée"] },
  ],
  "Menuiserie": [
    { label: "Pose bloc-porte intérieur", pu: 340, unite: "u", keywords: ["porte", "bloc-porte"] },
    { label: "Pose fenêtre PVC standard", pu: 620, unite: "u", keywords: ["fenêtre", "fenetre"] },
    { label: "Pose parquet flottant", pu: 38, unite: "m²", keywords: ["parquet"] },
    { label: "Pose plinthes", pu: 16.5, unite: "ml", keywords: ["plinthe"] },
    { label: "Habillage tableau fenêtre", pu: 145, unite: "u", keywords: ["tableau", "habillage"] },
  ],
  "Carrelage": [
    { label: "Pose carrelage sol 60x60", pu: 52, unite: "m²", keywords: ["carrelage sol", "carrelage"] },
    { label: "Pose faïence murale", pu: 61, unite: "m²", keywords: ["faïence"] },
    { label: "Dépose ancien carrelage", pu: 23, unite: "m²", keywords: ["dépose carrelage"] },
    { label: "Joint epoxy / carrelage", pu: 14.5, unite: "m²", keywords: ["joint"] },
    { label: "Plinthe carrelée", pu: 22, unite: "ml", keywords: ["plinthe carrel"] },
  ],
  "Multiservices": [
    { label: "Main d'œuvre artisan", pu: 52, unite: "h", keywords: ["main d'œuvre", "mo", "heure"] },
    { label: "Déplacement / forfait chantier", pu: 45, unite: "u", keywords: ["déplacement"] },
    { label: "Évacuation gravats", pu: 195, unite: "m³", keywords: ["gravats", "évacuation", "benne"] },
  ],
};

const ALL_CATALOG_ITEMS = Object.entries(CATALOGUE).flatMap(([metier, items]) =>
  items.map(i => ({ ...i, metier: metier as Metier }))
);

const METIER_ICONS: Record<Metier, any> = {
  "Plomberie": Wrench,
  "Électricité": Zap,
  "Peinture": PaintRoller,
  "Maçonnerie": Layers,
  "Menuiserie": Hammer,
  "Carrelage": Layers,
  "Multiservices": Hammer,
};

const DEFAULT_ENTREPRISE: EntrepriseInfo = {
  nom: "",
  metier: "Peinture",
  siret: "",
  adresse: "",
  telephone: "",
  email: "",
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function formatEuro(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function nextDevisNumber(existing: DevisDoc[]) {
  const year = new Date().getFullYear();
  const count = existing.filter(d => d.numero.includes(String(year))).length + 1;
  return `DV-${year}-${String(count).padStart(3, "0")}`;
}

// --- Voice parsing heuristic ---
function parseTranscriptToItems(transcript: string, metier: Metier): { objet: string; items: DevisItem[]; client_nom_guess?: string } {
  const text = transcript.toLowerCase();
  const used = new Set<string>();
  const found: DevisItem[] = [];

  // Client name guess: "pour Mme / M. / chez ... "
  let client_nom_guess = "";
  const clientMatch = transcript.match(/(?:pour|chez)\s+(?:m\.|mme|monsieur|madame)?\s*([A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ][a-zàâäéèêëîïôöùûüç'-]+(?:\s+[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ][a-zàâäéèêëîïôöùûüç'-]+)?)/i);
  if (clientMatch) client_nom_guess = clientMatch[1];

  const catalog = [...CATALOGUE[metier], ...CATALOGUE["Multiservices"]];

  for (const entry of catalog) {
    if (used.has(entry.label)) continue;
    const hit = entry.keywords.some(k => text.includes(k));
    if (!hit) continue;

    // Look for quantity near keyword
    let qty = 1;
    for (const kw of entry.keywords) {
      const idx = text.indexOf(kw);
      if (idx === -1) continue;
      const windowStart = Math.max(0, idx - 25);
      const windowEnd = Math.min(text.length, idx + kw.length + 20);
      const win = text.slice(windowStart, windowEnd);

      // number + unit
      const m = win.match(/(\d+(?:[.,]\d+)?)\s*(m2|m²|mètre|ml|m |pièce|pieces|u\b)/i);
      if (m) {
        qty = parseFloat(m[1].replace(",", "."));
        break;
      }
      // juste un chiffre
      const m2 = win.match(/(\d+(?:[.,]\d+)?)/);
      if (m2) { qty = parseFloat(m2[1].replace(",", ".")); }
    }

    // Cap large quantities sensibly
    if (entry.unite === "m²" && qty === 1) {
      // if no explicit quantity, try to catch "salon 25m2 / 20 m²"
      const areaAll = [...text.matchAll(/(\d{1,3}(?:[.,]\d+)?)\s*m[²2]/gi)].map(x => parseFloat(x[1].replace(",", ".")));
      if (areaAll.length) qty = areaAll.reduce((a,b)=>a+b,0);
    }
    if (qty > 400) qty = 1;
    if (qty < 0.1) qty = 1;

    found.push({
      id: uid(),
      designation: entry.label,
      detail: "",
      qty: Number(qty.toFixed(2)),
      unite: entry.unite,
      pu_ht: entry.pu,
    });
    used.add(entry.label);
    if (found.length >= 9) break;
  }

  // If nothing found, fall back to breaking sentences
  if (found.length === 0) {
    const sentences = transcript.split(/[.!?\n]/).map(s => s.trim()).filter(s => s.length > 12).slice(0, 6);
    for (const s of sentences) {
      found.push({
        id: uid(),
        designation: s.charAt(0).toUpperCase() + s.slice(1),
        detail: "",
        qty: 1,
        unite: "forfait",
        pu_ht: 180,
      });
    }
  }

  // Objet
  let objet = "Travaux de " + metier.toLowerCase();
  const pieceMatch = text.match(/(cuisine|salon|salle de bain|sdb|chambre|wc|entrée|bureau|appartement|maison)/i);
  if (pieceMatch) objet += " – " + pieceMatch[0];
  const addrMatch = transcript.match(/\d{1,4}\s*rue[^\.,]{3,60}|avenue[^\.,]{3,60}/i);
  if (addrMatch) objet += " – " + addrMatch[0];

  return { objet, items: found, client_nom_guess };
}

// --- Speech hook ---
function useVoiceRecorder(onResult: (finalText: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [supported, setSupported] = useState(true);
  const [interim, setInterim] = useState("");
  const [finalText, setFinalText] = useState("");
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder|null>(null);
  const audioCtxRef = useRef<AudioContext|null>(null);
  const analyserRef = useRef<AnalyserNode|null>(null);
  const dataArrayRef = useRef<Uint8Array|null>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "fr-FR";
    rec.onresult = (e: any) => {
      let interimT = "";
      let finalT = finalText;
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        const res = e.results[i];
        if (res.isFinal) {
          finalT += (finalT ? " " : "") + res[0].transcript.trim();
        } else {
          interimT += res[0].transcript;
        }
      }
      setInterim(interimT);
      setFinalText(finalT);
    };
    rec.onend = () => { setIsRecording(false); };
    recognitionRef.current = rec;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(async () => {
    setFinalText("");
    setInterim("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const src = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.start();
      recognitionRef.current?.start();
      setIsRecording(true);
    } catch {
      toast.error("Autorisez le micro pour dicter le devis.");
    }
  }, []);

  const stop = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    try { mediaRecorderRef.current?.stop(); mediaRecorderRef.current?.stream.getTracks().forEach(t=>t.stop()) } catch {}
    try { audioCtxRef.current?.close(); } catch {}
    setIsRecording(false);
    setTimeout(() => { onResult((finalText + " " + interim).trim()); }, 220);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalText, interim, onResult]);

  const pause = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    setIsRecording(false);
  }, []);

  const resume = useCallback(() => {
    try { recognitionRef.current?.start(); setIsRecording(true); } catch {}
  }, []);

  const getLevels = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return null;
    analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
    return dataArrayRef.current;
  }, []);

  return { supported, isRecording, interim, finalText: finalText + (interim ? " " + interim : ""), start, stop, pause, resume, getLevels };
}

// ---- Main App ----
export default function App() {
  const [entreprise, setEntreprise] = useState<EntrepriseInfo>(DEFAULT_ENTREPRISE);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [view, setView] = useState<"home" | "record" | "edit" | "history">("home");
  const [devisList, setDevisList] = useState<DevisDoc[]>([]);
  const [currentDevis, setCurrentDevis] = useState<DevisDoc | null>(null);

  // Load
  useEffect(() => {
    const e = localStorage.getItem("voxdevis_entreprise_v2");
    const d = localStorage.getItem("voxdevis_list_v2");
    if (e) try { setEntreprise(JSON.parse(e)); } catch {}
    else setShowOnboarding(true);
    if (d) try { setDevisList(JSON.parse(d)); } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("voxdevis_entreprise_v2", JSON.stringify(entreprise));
  }, [entreprise]);

  useEffect(() => {
    localStorage.setItem("voxdevis_list_v2", JSON.stringify(devisList));
  }, [devisList]);

  const totalHT = useMemo(() => currentDevis ? currentDevis.items.reduce((s, i) => s + i.qty * i.pu_ht, 0) : 0, [currentDevis]);
  const remiseVal = useMemo(() => currentDevis ? totalHT * (currentDevis.remise / 100) : 0, [totalHT, currentDevis]);
  const baseHT = totalHT - remiseVal;
  const tvaVal = useMemo(() => currentDevis ? baseHT * (currentDevis.tva_taux / 100) : 0, [baseHT, currentDevis]);
  const totalTTC = baseHT + tvaVal;

  const startNewDevis = () => {
    setCurrentDevis(null);
    setView("record");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleParsed = (transcript: string, metier: Metier) => {
    const parsed = parseTranscriptToItems(transcript, metier);
    const numero = nextDevisNumber(devisList);
    const doc: DevisDoc = {
      id: uid(),
      numero,
      date: todayISO(),
      validite_jours: 30,
      client: { nom: parsed.client_nom_guess || "", adresse: "", telephone: "", email: "" },
      objet: parsed.objet,
      items: parsed.items,
      tva_taux: (metier === "Peinture" || metier === "Maçonnerie" || metier === "Menuiserie" || metier === "Carrelage") ? 10 : 20,
      remise: 0,
      notes: "Devis gratuit. Acompte 30% à la commande. TVA au taux en vigueur.",
      transcript,
      statut: "brouillon",
      created_at: Date.now(),
    };
    setCurrentDevis(doc);
    setView("edit");
    toast.success("Devis structuré. Vérifiez et envoyez.");
  };

  const saveCurrent = () => {
    if (!currentDevis) return;
    setDevisList(list => {
      const exists = list.find(d => d.id === currentDevis.id);
      if (exists) return list.map(d => d.id === currentDevis.id ? currentDevis : d);
      return [currentDevis, ...list];
    });
    toast.success("Devis enregistré");
  };

  const sendDevis = () => {
    if (!currentDevis) return;
    const updated = {...currentDevis, statut: "envoyé" as const };
    setCurrentDevis(updated);
    setDevisList(list => {
      const exists = list.find(d => d.id === updated.id);
      if (exists) return list.map(d => d.id === updated.id ? updated : d);
      return [updated, ...list];
    });
    toast.success("Marqué comme envoyé !");
  };

  const exportPDF = async () => {
    if (!currentDevis) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 44;
    let y = 56;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("DEVIS", margin, y);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`N° ${currentDevis.numero}`, 525, y, { align: "right" });
    y += 22;
    doc.setFontSize(10);
    doc.text(`Émis le ${new Date(currentDevis.date).toLocaleDateString("fr-FR")}  •  Valable ${currentDevis.validite_jours} jours`, margin, y);

    y += 34;
    doc.setFont("helvetica", "bold");
    doc.text(entreprise.nom || "Votre entreprise", margin, y);
    doc.setFont("helvetica", "normal");
    let le = y + 14;
    const entLines = [entreprise.adresse, entreprise.email && `Email: ${entreprise.email}`, entreprise.telephone && `Tél: ${entreprise.telephone}`, entreprise.siret && `SIRET ${entreprise.siret}`].filter(Boolean) as string[];
    entLines.forEach(l => { doc.text(l, margin, le); le += 13; });

    doc.setFont("helvetica", "bold");
    doc.text("Client", 340, y);
    doc.setFont("helvetica", "normal");
    let cr = y + 14;
    const clientLines = [currentDevis.client.nom || "Client", currentDevis.client.adresse, currentDevis.client.telephone, currentDevis.client.email].filter(Boolean) as string[];
    clientLines.forEach(l => { doc.text(l, 340, cr); cr += 13; });

    y = Math.max(le, cr) + 28;
    doc.setFont("helvetica", "bold");
    doc.text("Objet : ", margin, y);
    doc.setFont("helvetica", "normal");
    const objetWrapped = doc.splitTextToSize(currentDevis.objet, 470);
    doc.text(objetWrapped, margin + 44, y);
    y += objetWrapped.length * 13 + 18;

    // table header
    doc.setFont("helvetica", "bold");
    doc.text("Désignation", margin, y);
    doc.text("Qté", 368, y);
    doc.text("PU HT", 424, y);
    doc.text("Total HT", 525, y, { align: "right" });
    y += 8;
    doc.setLineWidth(0.5);
    doc.line(margin, y, 551, y);
    y += 14;
    doc.setFont("helvetica", "normal");

    currentDevis.items.forEach(it => {
      if (y > 730) { doc.addPage(); y = 55; }
      const firstLine = doc.splitTextToSize(it.designation, 300)[0];
      doc.text(firstLine, margin, y);
      doc.text(`${it.qty} ${it.unite}`, 368, y);
      doc.text(formatEuro(it.pu_ht), 424, y);
      doc.text(formatEuro(it.qty * it.pu_ht), 525, y, { align: "right" });
      y += 18;
      if (it.detail) {
        doc.setFontSize(9);
        doc.setTextColor(90);
        doc.text(doc.splitTextToSize(it.detail, 300), margin, y);
        y += 13;
        doc.setTextColor(0);
        doc.setFontSize(10);
      }
    });

    y += 6;
    doc.line(360, y, 551, y);
    y += 18;
    const rightX = 525;
    const addLine = (label: string, val: string, bold=false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(label, 368, y);
      doc.text(val, rightX, y, { align: "right" });
      y += 16;
    };
    addLine("Total HT", formatEuro(totalHT));
    if (currentDevis.remise > 0) addLine(`Remise ${currentDevis.remise}%`, "- " + formatEuro(remiseVal));
    addLine(`TVA ${currentDevis.tva_taux}%`, formatEuro(tvaVal));
    addLine("Total TTC", formatEuro(totalTTC), true);

    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(doc.splitTextToSize(currentDevis.notes, 510), margin, y);

    doc.save(`Devis-${currentDevis.numero}.pdf`);
    toast.success("PDF téléchargé");
  };

  return (
    <div className="min-h-screen bg-[#f8f4ef] text-[#1b1d21]" style={{ fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <Toaster richColors position="top-center" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,550;9..144,600;9..144,700&family=Fragment+Mono:ital@0;1&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500&display=swap');
        .fraunces { font-family: 'Fraunces', Georgia, serif; }
        .mono { font-family: 'Fragment Mono', ui-monospace, monospace; }
        .shadow-soft { box-shadow: 0 8px 40px rgba(32,26,14,.07), 0 1px 2px rgba(0,0,0,.05);}
        .dashed-border { background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='20' ry='20' stroke='%23C9BDA9' stroke-width='2' stroke-dasharray='8%2c 8' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e"); }
      `}</style>

      {/* Top bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#f8f4ef]/86 border-b border-[#e6ddd0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-7 lg:px-10 h-[66px] flex items-center justify-between">
          <button onClick={()=>setView("home")} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#17191d] text-[#ffefe0] flex items-center justify-center shadow-sm">
              <FileCheck size={20} />
            </div>
            <div className="leading-tight text-left">
              <div className="fraunces text-[22px] -mb-[2px] tracking-tight">VoxDevis</div>
              <div className="text-[11px] text-zinc-500 mono">BTP • voix → devis</div>
            </div>
          </button>
          <nav className="hidden md:flex items-center gap-7 text-[13.8px] text-zinc-600">
            <button onClick={()=>setView("record")} className="hover:text-black transition">Nouveau devis</button>
            <button onClick={()=>setView("history")} className="hover:text-black transition">Mes devis</button>
            <button onClick={()=>setShowOnboarding(true)} className="hover:text-black transition">Mon entreprise</button>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={()=>setView("history")} className="md:hidden p-2 rounded-xl bg-white border border-zinc-200"><History size={18}/></button>
            <button onClick={startNewDevis} className="inline-flex items-center gap-2 rounded-full bg-[#ff5a14] text-white px-4 py-2.5 text-[13.5px] font-[650] shadow-[0_6px_22px_rgba(255,90,20,.30)] hover:bg-[#ef4d09] transition">
              <Mic size={17}/> Dicter un devis
            </button>
          </div>
        </div>
      </header>

      {/* HOME */}
      {view === "home" && (
        <main>
          <section className="max-w-6xl mx-auto px-4 sm:px-7 lg:px-10 pt-14 md:pt-24 pb-12">
            <div className="grid lg:grid-cols-[1.14fr_.86fr] gap-12 lg:gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#eadfd0] text-[12px] font-semibold text-zinc-700 shadow-soft">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a14]" /> Fait pour les artisans du bâtiment
                </div>
                <h1 className="fraunces text-[46px] sm:text-[64px] leading-[0.95] tracking-tight mt-5">
                  Parlez.<br/>On chiffre.<br/><span className="text-[#b97a49]">Vous envoyez.</span>
                </h1>
                <p className="text-[17.5px] leading-relaxed text-zinc-600 mt-6 max-w-[540px]">
                  VoxDevis transforme votre note vocale de chantier en un devis pro, clair et envoyable en 2 minutes. Fini les soirées d’admin.
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-7">
                  <button onClick={startNewDevis} className="bg-[#17191d] text-white rounded-full px-5 py-3.5 text-[14.5px] font-[700] flex items-center gap-2 shadow-soft hover:bg-black transition">
                    Essayer maintenant <ChevronRight size={18}/>
                  </button>
                  <button onClick={()=>setView("history")} className="px-5 py-3.5 rounded-full bg-white border border-zinc-300 text-[14px] font-[600]">Voir un exemple</button>
                </div>
                <div className="flex flex-wrap gap-6 mt-6 text-[12.7px] text-zinc-600">
                  <span className="flex items-center gap-1.5"><ShieldCheck size={16} className="text-zinc-700"/> RGPD – données en local</span>
                  <span className="flex items-center gap-1.5"><Clock size={16} className="text-zinc-700"/> 2 min en moyenne</span>
                  <span className="flex items-center gap-1.5"><Truck size={16} className="text-zinc-700"/> Pensé pour le chantier</span>
                </div>
                <div className="flex flex-wrap items-center gap-5 mt-9 text-[12.5px] text-zinc-500">
                  <span className="font-[650] text-zinc-600">Métiers pris en charge :</span>
                  { (Object.keys(CATALOGUE) as Metier[]).slice(0,6).map(m => (
                    <span key={m} className="px-2.5 py-1 rounded-full bg-white border border-zinc-200">{m}</span>
                  ))}
                </div>
              </div>

              {/* Demo card */}
              <div className="relative">
                <div className="rounded-[28px] bg-white shadow-soft border border-[#eadfd0] p-5 sm:p-7">
                  <div className="text-[11.5px] mono text-zinc-500 mb-2">EXEMPLE • PLOMBERIE</div>
                  <div className="rounded-2xl bg-[#fcf9f4] border border-[#eadfd0] p-4 text-[14.6px] leading-relaxed text-zinc-700">
                    “Oui bonjour Mme Renard, pour la salle de bain. Dépose lavabo existant, pose d’un meuble vasque 80, remplacement du mitigeur, et un WC suspendu. Environ 6 m² de faïence murale aussi. C’est au 14 rue des Lilas à Tours.”
                  </div>
                  <div className="mt-4 grid sm:grid-cols-2 gap-3 text-[13.6px]">
                    <div className="rounded-xl bg-[#f8f3ea] px-3 py-2.5 border border-[#eadbca]">Dépose et pose lavabo complet <b className="float-right">420 €</b></div>
                    <div className="rounded-xl bg-[#f8f3ea] px-3 py-2.5 border border-[#eadbca]">Remplacement WC suspendu <b className="float-right">560 €</b></div>
                    <div className="rounded-xl bg-[#f8f3ea] px-3 py-2.5 border border-[#eadbca]">Robinetterie mitigeur <b className="float-right">165 €</b></div>
                    <div className="rounded-xl bg-[#f8f3ea] px-3 py-2.5 border border-[#eadbca]">Faïence murale × 6 m² <b className="float-right">366 €</b></div>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-[13.5px]">
                    <span className="text-zinc-500">Total HT estimé</span>
                    <span className="font-[750] text-[18px]">1 511,00 €</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={startNewDevis} className="flex-1 rounded-xl bg-[#ff5a14] text-white py-3 font-[700]">Tester avec ma voix</button>
                    <button className="px-3 rounded-xl border border-zinc-300 bg-white"><Pencil size={16}/></button>
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-2 text-[11.5px] bg-[#17191d] text-[#f8eee0] px-3 py-2 rounded-full shadow-soft">Dictée → Devis en 45s</div>
              </div>
            </div>

            {/* Trust strip */}
            <div className="mt-16 grid md:grid-cols-3 gap-5">
              {[
                {icon: Mic, title:"Dictez depuis le chantier", desc:"Main libre, gants sales, pas de souci. Votre tel écoute et transcrit."},
                {icon: Sparkles, title:"On structure en devis BTP", desc:"Quantités, unités m²/ml/u, prix du marché, TVA 10/20% — prêt à envoyer."},
                {icon: Send, title:"PDF pro + lien client", desc:"Signez, envoyez par WhatsApp / Email, suivez acceptation."},
              ].map((c,i)=>(
                <div key={i} className="rounded-[22px] bg-white border border-[#eadfd0] p-5 shadow-soft">
                  <c.icon size={20} className="text-[#ba6536]"/>
                  <div className="font-[740] mt-2 text-[16.5px]">{c.title}</div>
                  <div className="text-[14px] text-zinc-600 mt-1">{c.desc}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border-y border-[#eadfd0]">
            <div className="max-w-6xl mx-auto px-4 sm:px-7 lg:px-10 py-14">
              <div className="max-w-2xl">
                <div className="text-[12.5px] mono text-zinc-500">COMMENT ÇA MARCHE</div>
                <h2 className="fraunces text-[38px] sm:text-[44px] leading-tight tracking-tight mt-2">3 étapes, zéro tableur.</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-8 mt-9 text-[15px] text-zinc-700">
                <div>
                  <div className="text-[11px] mono text-zinc-500">01</div>
                  <div className="font-[700] mt-1">Parlez</div>
                  <p className="text-zinc-600 mt-1">“Salon 28 m², peinture murs et plafond, 2 couches, rebouchage fissures, dépose papier peint.”</p>
                </div>
                <div>
                  <div className="text-[11px] mono text-zinc-500">02</div>
                  <div className="font-[700] mt-1">Vérifiez</div>
                  <p className="text-zinc-600 mt-1">VoxDevis extrait les postes, les quantités, applique votre bordereau de prix. Ajustez si besoin.</p>
                </div>
                <div>
                  <div className="text-[11px] mono text-zinc-500">03</div>
                  <div className="font-[700] mt-1">Envoyez</div>
                  <p className="text-zinc-600 mt-1">PDF propre, logo, mentions légales. Email, WhatsApp, lien de suivi. Archive auto.</p>
                </div>
              </div>
              <div className="mt-8">
                <button onClick={startNewDevis} className="rounded-full bg-[#17191d] text-white px-5 py-3 font-[700] text-[14px]">Créer mon 1er devis vocal</button>
              </div>
            </div>
          </section>

          <section className="max-w-6xl mx-auto px-4 sm:px-7 lg:px-10 py-16">
            <div className="grid lg:grid-cols-2 gap-10 items-start">
              <div>
                <h3 className="fraunces text-[34px]">Pensé pour les gars du terrain</h3>
                <ul className="mt-5 space-y-3 text-[15px] text-zinc-700">
                  <li>• Fonctionne sur iPhone / Android au micro, même avec du bruit</li>
                  <li>• Bordereaux de prix par métier, modifiables</li>
                  <li>• TVA 10% rénovation / 20% auto</li>
                  <li>• Mentions légales, acompte, validité, CGV</li>
                  <li>• Devis archivés, duplicables en 1 clic</li>
                  <li>• Export PDF propre – prêt à tamponner</li>
                </ul>
              </div>
              <div className="rounded-[24px] bg-[#fffaf2] border border-[#ead8c5] p-6 shadow-soft">
                <div className="text-[12.5px] mono text-zinc-500">AVIS ARTISANS</div>
                <div className="mt-4 space-y-4 text-[14.9px] text-zinc-700">
                  <p>“Je fais mes devis dans le camion après la visite. Avant c’était le dimanche soir…” <br/><span className="text-zinc-500">— Karim, plombier – Lyon</span></p>
                  <p>“La cliente a reçu le devis avant que je quitte la rue. Signé le soir même.” <br/><span className="text-zinc-500">— Anaïs, peinture – Nantes</span></p>
                  <p>“Enfin un truc qui parle BTP, pas un logiciel de comptable.” <br/><span className="text-zinc-500">— Joël, élec – Avignon</span></p>
                </div>
              </div>
            </div>
          </section>

          <footer className="border-t border-[#eadfd0] bg-[#f4eee5]">
            <div className="max-w-6xl mx-auto px-4 sm:px-7 lg:px-10 py-10 text-[13.5px] text-zinc-600 flex flex-wrap items-center justify-between gap-4">
              <div>© {new Date().getFullYear()} VoxDevis • Outil pour artisans BTP</div>
              <div className="flex gap-5">
                <a href="#" className="hover:text-black">Confidentialité</a>
                <a href="#" className="hover:text-black">CGU</a>
                <a href="#" onClick={()=>setShowOnboarding(true)} className="hover:text-black">Mon entreprise</a>
              </div>
            </div>
          </footer>
        </main>
      )}

      {/* RECORD */}
      {view === "record" && (
        <RecordView
          entreprise={entreprise}
          onParsed={handleParsed}
          onUseTextSample={(t) => handleParsed(t, entreprise.metier)}
          onBack={()=>setView("home")}
        />
      )}

      {/* EDIT */}
      {view === "edit" && currentDevis && (
        <EditView
          devis={currentDevis}
          setDevis={(d)=>setCurrentDevis(d)}
          entreprise={entreprise}
          totals={{ totalHT, remiseVal, baseHT, tvaVal, totalTTC }}
          onSave={saveCurrent}
          onExportPDF={exportPDF}
          onSend={sendDevis}
          onBack={()=>setView("record")}
          onOpenHistory={()=>setView("history")}
        />
      )}

      {/* HISTORY */}
      {view === "history" && (
        <HistoryView
          list={devisList}
          onOpen={(d) => { setCurrentDevis(d); setView("edit"); }}
          onNew={startNewDevis}
          onDuplicate={(d)=> { const copy = {...d, id: uid(), numero: nextDevisNumber(devisList), date: todayISO(), statut:"brouillon" as const}; setCurrentDevis(copy); setView("edit"); toast.success("Devis dupliqué"); }}
          onDelete={(id)=> setDevisList(l => l.filter(x=>x.id!==id))}
          onBack={()=>setView("home")}
        />
      )}

      {/* ONBOARDING */}
      {showOnboarding && (
        <Onboarding
          value={entreprise}
          onChange={setEntreprise}
          onClose={()=>setShowOnboarding(false)}
        />
      )}
    </div>
  );
}

// --- Record View ---
function RecordView({ entreprise, onParsed, onUseTextSample, onBack }:{
  entreprise: EntrepriseInfo,
  onParsed: (t:string, metier:Metier)=>void,
  onUseTextSample: (t:string)=>void,
  onBack: ()=>void
}) {
  const [metier, setMetier] = useState<Metier>(entreprise.metier || "Peinture");
  const [transcript, setTranscript] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onResult = useCallback((txt:string)=>{
    setTranscript(prev => (prev ? prev + " " : "") + txt);
  }, []);

  const rec = useVoiceRecorder(onResult);

  // Waveform
  useEffect(() => {
    if (!rec.isRecording) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const draw = () => {
      const levels = rec.getLevels();
      ctx.clearRect(0,0,canvas.width,canvas.height);
      if (levels) {
        const barW = canvas.width / levels.length * 1.8;
        for (let i=0;i<levels.length;i++) {
          const v = levels[i] / 255;
          const h = v * canvas.height * 0.92;
          ctx.fillStyle = "#ff5a14";
          ctx.fillRect(i*barW, canvas.height - h, barW-1.7, h);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return ()=> cancelAnimationFrame(raf);
  }, [rec.isRecording, rec]);

  const canAnalyze = transcript.trim().length > 14;

  const samples: Record<Metier, string> = {
    "Peinture": "Bonjour Monsieur Lefèvre, pour l'appartement rue Victor Hugo. Salon 32 mètres carrés, peinture murs deux couches blanc mat, plafond aussi. Chambre 14 m², un seul mur en couleur. Lessivage et rebouchage inclus. Protection sol.",
    "Plomberie": "Cliente Mme Renard, salle de bain. Dépose lavabo existant, pose meuble vasque 80, remplacement mitigeur, WC suspendu complet. 6 m² de faïence murale. 14 rue des Lilas à Tours.",
    "Électricité": "Pour Martin. Remise aux normes tableau électrique 2 rangées. Ajout de 4 prises dans le salon, 2 points lumineux avec interrupteurs, 6 spots LED cuisine. Tirage ligne four.",
    "Maçonnerie": "Ouverture mur porteur cuisine-salon, pose IPN. Démolition cloison 8 m². Ragréage sol 45 m². Évacuation gravats.",
    "Menuiserie": "Pose de 3 blocs-portes intérieurs chêne. Pose parquet flottant 52 m² salon + chambres. Plinthes assorties.",
    "Carrelage": "Carrelage sol 60x60, 38 m². Dépose ancien carrelage. Faïence murale salle de bain 12 m². Joints epoxy.",
    "Multiservices": "Petits travaux logement : 2h main d'œuvre. Déplacement inclus. Évacuation gravats 1 m3."
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-7 lg:px-10 py-8 sm:py-12">
      <button onClick={onBack} className="text-[13.4px] text-zinc-600 hover:text-black">← Retour</button>
      <div className="grid lg:grid-cols-[1.11fr_.89fr] gap-8 mt-4">
        <div>
          <h2 className="fraunces text-[40px] sm:text-[50px] leading-[1.02] tracking-tight">Dictez votre chantier</h2>
          <p className="text-zinc-600 mt-3 text-[15.8px] max-w-[560px]">Parlez naturellement : qui, où, quoi, surfaces, quantités. On structure le devis juste après.</p>

          <div className="mt-5 flex flex-wrap gap-2 text-[12.7px]">
            {(Object.keys(CATALOGUE) as Metier[]).map(m => {
              const Icon = METIER_ICONS[m];
              return (
                <button key={m}
                  onClick={()=>setMetier(m)}
                  className={`flex items-center gap-1.6 px-3 py-2 rounded-full border transition ${m===metier ? "bg-[#17191d] text-white border-[#17191d]":"bg-white border-[#e1d5c4] text-zinc-700 hover:bg-[#faf6ef]"}`}>
                  <Icon size={15}/> {m}
                </button>
              )
            })}
          </div>

          <div className="mt-6 rounded-[26px] bg-white border border-[#eadfd0] shadow-soft p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <div className="text-[11.5px] mono text-zinc-500">MICRO • FR</div>
              <div className="text-[11.5px] text-zinc-500 flex items-center gap-2">
                {!rec.supported && <span className="text-amber-700">Reco vocale non dispo : collez votre texte.</span>}
                {rec.isRecording && <span className="flex items-center gap-1 text-[#d84200] font-[600]"><span className="w-1.5 h-1.5 bg-[#ff5a14] rounded-full animate-pulse"/> En écoute</span>}
              </div>
            </div>

            <div className="mt-4 rounded-[18px] dashed-border p-7 sm:p-10 text-center bg-[#fffbf5]">
              <div className="flex justify-center">
                {!rec.isRecording ? (
                  <button onClick={rec.start} disabled={!rec.supported}
                    className="w-20 h-20 rounded-full bg-[#ff5a14] text-white flex items-center justify-center shadow-[0_12px_30px_rgba(255,90,20,.33)] hover:bg-[#ef4d09] transition disabled:opacity-50">
                    <Mic size={30}/>
                  </button>
                ) : (
                  <button onClick={rec.stop}
                    className="w-20 h-20 rounded-full bg-[#17191d] text-white flex items-center justify-center shadow-soft">
                    <Square size={26}/>
                  </button>
                )}
              </div>
              <div className="mt-4 text-[14.4px] text-zinc-700 font-[600]">
                {rec.isRecording ? "Je vous écoute… touchez pour arrêter" : "Touchez pour dicter"}
              </div>
              <div className="text-[13.3px] text-zinc-500">Ex : “Peinture salon 28 m², 2 couches, rebouchage…”</div>
              <canvas ref={canvasRef} width={640} height={52} className="w-full h-[52px] mt-4 rounded-xl bg-[#fff7ef] border border-[#f1dfcb]"/>
              {rec.isRecording && (
                <div className="mt-3 flex justify-center gap-3 text-[12.8px]">
                  <button onClick={rec.pause} className="px-3 py-1.5 rounded-full bg-white border border-zinc-300 flex items-center gap-1"><Pause size={14}/> Pause</button>
                  <button onClick={rec.resume} className="px-3 py-1.5 rounded-full bg-white border border-zinc-300 flex items-center gap-1"><Play size={14}/> Reprendre</button>
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="text-[12.5px] text-zinc-600">Transcription (modifiable)</label>
              <textarea
                value={transcript || rec.finalText}
                onChange={e => setTranscript(e.target.value)}
                placeholder="...ou collez / tapez votre note de visite ici"
                className="mt-1 w-full min-h-[156px] rounded-[16px] border border-[#e2d4c1] bg-[#fffdf9] px-4 py-3 text-[15.2px] outline-none focus:ring-2 focus:ring-[#ffbb94]"
              />
              <div className="flex flex-wrap gap-2 mt-2 text-[12.3px] text-zinc-600">
                <span>Besoin d’un exemple ?</span>
                <button onClick={()=>setTranscript(samples[metier])} className="underline decoration-dotted">Coller un exemple {metier.toLowerCase()}</button>
                <span>•</span>
                <button onClick={()=>setTranscript("")} className="hover:text-black">Effacer</button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-5">
              <button
                disabled={!canAnalyze}
                onClick={()=>onParsed((transcript || rec.finalText).trim(), metier)}
                className="px-5 py-3.5 rounded-full bg-[#17191d] text-white font-[700] text-[14.4px] shadow-soft disabled:opacity-45 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Sparkles size={18}/> Analyser en devis
              </button>
              <button
                onClick={()=>onUseTextSample(samples[metier])}
                className="px-4 py-3.5 rounded-full bg-white border border-zinc-300 text-[13.8px] font-[600]"
              >
                Utiliser l’exemple
              </button>
            </div>

            <div className="mt-3 text-[12.4px] text-zinc-500">
              Astuce : dites les quantités (“28 m²”, “3 prises”, “1 WC”) — on les reprend telles quelles.
            </div>
          </div>
        </div>

        {/* Right helper */}
        <div className="space-y-5">
          <div className="rounded-[22px] bg-white border border-[#eadfd0] shadow-soft p-5">
            <div className="text-[12.5px] mono text-zinc-500">CE QUE VOXDEVIS DÉTECTE</div>
            <ul className="mt-3 text-[14.2px] text-zinc-700 space-y-2">
              <li>• Postes de travaux + unités (m² / ml / u)</li>
              <li>• Quantités dictées, surfaces</li>
              <li>• Prix marché {metier.toLowerCase()}</li>
              <li>• TVA 10% / 20%, remise, validité</li>
              <li>• Nom client, adresse si citée</li>
            </ul>
          </div>

          <div className="rounded-[22px] bg-[#fffaf1] border border-[#f0dcc6] p-5">
            <div className="font-[700]">Exemple de dictée efficace</div>
            <div className="text-[13.8px] text-zinc-700 mt-2 bg-white border border-[#ead8c4] rounded-xl px-3 py-3">
              “{samples[metier]}”
            </div>
            <button onClick={()=>setTranscript(samples[metier])} className="mt-2 text-[13px] underline">Coller dans la transcription</button>
          </div>

          <div className="rounded-[22px] bg-white border border-[#eadfd0] shadow-soft p-5 text-[13.8px] text-zinc-600">
            <div className="font-[700] text-zinc-800 mb-1">Confidentialité</div>
            La reconnaissance vocale passe par votre navigateur. Vos devis sont stockés localement dans votre navigateur. Pas de compte requis.
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Edit View ---
function EditView({
  devis, setDevis, entreprise, totals, onSave, onExportPDF, onSend, onBack, onOpenHistory
}:{
  devis: DevisDoc,
  setDevis: (d:DevisDoc)=>void,
  entreprise: EntrepriseInfo,
  totals: { totalHT:number, remiseVal:number, baseHT:number, tvaVal:number, totalTTC:number },
  onSave: ()=>void,
  onExportPDF: ()=>void,
  onSend: ()=>void,
  onBack: ()=>void,
  onOpenHistory: ()=>void,
}) {
  const updateItem = (id:string, patch:Partial<DevisItem>) => {
    setDevis({ ...devis, items: devis.items.map(i => i.id === id ? { ...i, ...patch } : i)});
  };
  const addItem = () => {
    setDevis({ ...devis, items: [...devis.items, { id: uid(), designation:"Nouvelle prestation", qty:1, unite:"u", pu_ht: 120 }]});
  };
  const removeItem = (id:string) => setDevis({ ...devis, items: devis.items.filter(i=>i.id!==id)});

  const catalogSuggestions = useMemo(()=>{
    const items = ALL_CATALOG_ITEMS.slice(0, 9);
    return items;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devis.id]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-7 lg:px-10 py-8 sm:py-10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 text-[13.4px] text-zinc-600">
          <button onClick={onBack} className="hover:text-black">← Retour dictée</button>
          <span className="text-zinc-400">/</span>
          <button onClick={onOpenHistory} className="hover:text-black">Mes devis</button>
        </div>
        <div className="flex items-center gap-2 text-[13.1px]">
          <span className={`px-2.5 py-1.5 rounded-full border ${devis.statut === "envoyé" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-800"}`}>{devis.statut === "envoyé" ? "Envoyé" : "Brouillon"}</span>
          <span className="text-zinc-500">Devis {devis.numero}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.29fr_.71fr] gap-8 mt-5">
        <div className="space-y-5">
          {/* Client & objet */}
          <div className="rounded-[24px] bg-white shadow-soft border border-[#eadfd0] p-5 sm:p-6">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <div className="text-[11.5px] mono text-zinc-500 mb-1">CLIENT</div>
                <input value={devis.client.nom} onChange={e=>setDevis({...devis, client:{...devis.client, nom:e.target.value}})} placeholder="Nom du client"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-orange-200"/>
                <input value={devis.client.adresse} onChange={e=>setDevis({...devis, client:{...devis.client, adresse:e.target.value}})} placeholder="Adresse chantier"
                  className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-orange-200"/>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input value={devis.client.telephone} onChange={e=>setDevis({...devis, client:{...devis.client, telephone:e.target.value}})} placeholder="Tél"
                    className="rounded-xl border border-zinc-300 px-3 py-2.5 text-[14.5px] outline-none focus:ring-2 focus:ring-orange-200"/>
                  <input value={devis.client.email} onChange={e=>setDevis({...devis, client:{...devis.client, email:e.target.value}})} placeholder="Email"
                    className="rounded-xl border border-zinc-300 px-3 py-2.5 text-[14.5px] outline-none focus:ring-2 focus:ring-orange-200"/>
                </div>
              </div>
              <div>
                <div className="text-[11.5px] mono text-zinc-500 mb-1">DEVIS</div>
                <div className="flex gap-2">
                  <input type="date" value={devis.date} onChange={e=>setDevis({...devis, date:e.target.value})}
                    className="flex-1 rounded-xl border border-zinc-300 px-3 py-2.5 text-[14.5px]"/>
                  <input type="number" min={7} value={devis.validite_jours} onChange={e=>setDevis({...devis, validite_jours: Number(e.target.value)||30})}
                    className="w-[104px] rounded-xl border border-zinc-300 px-3 py-2.5 text-[14.5px]"/>
                </div>
                <input value={devis.objet} onChange={e=>setDevis({...devis, objet: e.target.value})}
                  placeholder="Objet / chantier"
                  className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-orange-200"/>
                <div className="text-[12.2px] text-zinc-500 mt-1">Dit à l’oral : <em>“{devis.transcript.slice(0,120)}…”</em></div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="rounded-[24px] bg-white shadow-soft border border-[#eadfd0] p-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="font-[730] text-[17px]">Prestations</div>
              <button onClick={addItem} className="text-[13.4px] px-3 py-2 rounded-full border border-zinc-300 bg-white flex items-center gap-1.5 hover:bg-zinc-50"><Plus size={15}/> Ajouter une ligne</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[14.3px]">
                <thead className="text-[11.7px] text-zinc-500">
                  <tr className="border-b border-zinc-200">
                    <th className="text-left py-2 font-[650]">Désignation</th>
                    <th className="text-right py-2 font-[650]">Qté</th>
                    <th className="text-left py-2 font-[650] pl-3">Unité</th>
                    <th className="text-right py-2 font-[650]">PU HT</th>
                    <th className="text-right py-2 font-[650]">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {devis.items.map(it => (
                    <tr key={it.id} className="border-b border-zinc-100">
                      <td className="py-2 pr-3 min-w-[260px]">
                        <input value={it.designation} onChange={e=>updateItem(it.id, {designation: e.target.value})}
                          className="w-full bg-transparent outline-none border-b border-transparent focus:border-zinc-300 py-1"/>
                        <input value={it.detail||""} onChange={e=>updateItem(it.id, {detail: e.target.value})}
                          placeholder="Détail (facultatif)"
                          className="w-full bg-transparent outline-none text-[12.8px] text-zinc-500"/>
                      </td>
                      <td className="text-right">
                        <input type="number" step="0.01" value={it.qty}
                          onChange={e=>updateItem(it.id, {qty: Number(e.target.value)||0})}
                          className="w-20 text-right bg-[#fcf7ef] border border-[#ead3ba] rounded-lg px-2 py-1.5"/>
                      </td>
                      <td className="pl-3">
                        <select value={it.unite} onChange={e=>updateItem(it.id, {unite: e.target.value})}
                          className="bg-transparent border border-zinc-200 rounded-lg px-2 py-1.5">
                          {["m²","ml","u","forfait","h","m³"].map(u=> <option key={u}>{u}</option>)}
                        </select>
                      </td>
                      <td className="text-right">
                        <input type="number" step="0.01" value={it.pu_ht}
                          onChange={e=>updateItem(it.id, {pu_ht: Number(e.target.value)||0})}
                          className="w-[110px] text-right bg-[#fcf7ef] border border-[#ead3ba] rounded-lg px-2 py-1.5"/>
                      </td>
                      <td className="text-right font-[650] whitespace-nowrap">{formatEuro(it.qty * it.pu_ht)}</td>
                      <td className="text-right pl-2">
                        <button onClick={()=>removeItem(it.id)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500"><Trash2 size={15}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 text-[12.7px] text-zinc-600 flex flex-wrap gap-2">
              <span className="text-zinc-500">Ajouter vite :</span>
              {catalogSuggestions.slice(0,5).map(s => (
                <button key={s.label}
                  onClick={()=>setDevis({...devis, items:[...devis.items, {id:uid(), designation:s.label, qty:1, unite:s.unite, pu_ht:s.pu}]})}
                  className="px-2.5 py-1 rounded-full bg-[#fbf4e9] border border-[#ead0b6] hover:bg-[#f8ead8]">+ {s.label}</button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-5 border-t border-zinc-200 pt-4 text-[14.2px]">
              <label className="flex items-center gap-2">TVA
                <select value={devis.tva_taux} onChange={e=>setDevis({...devis, tva_taux: Number(e.target.value)})}
                  className="border border-zinc-300 rounded-lg px-2 py-1.5 bg-white">
                  <option value={20}>20 %</option>
                  <option value={10}>10 % rénovation</option>
                  <option value={5.5}>5,5 %</option>
                  <option value={0}>0 %</option>
                </select>
              </label>
              <label className="flex items-center gap-2">Remise %
                <input type="number" value={devis.remise}
                  onChange={e=>setDevis({...devis, remise: Number(e.target.value)||0})}
                  className="w-20 border border-zinc-300 rounded-lg px-2 py-1.5"/>
              </label>
            </div>

            <div>
              <textarea value={devis.notes} onChange={e=>setDevis({...devis, notes: e.target.value})}
                className="mt-4 w-full min-h-[78px] rounded-xl border border-zinc-300 px-3 py-2 text-[13.6px] bg-[#fffdf9]"
                placeholder="Conditions / notes visibles sur le devis"/>
            </div>
          </div>
        </div>

        {/* Right summary / PDF */}
        <div className="space-y-5">
          <div className="rounded-[24px] bg-white border border-[#eadfd0] shadow-soft p-5">
            <div className="text-[12.5px] mono text-zinc-500 mb-1">RÉCAP</div>
            <div className="space-y-1.5 text-[14.8px]">
              <div className="flex justify-between"><span>Total HT</span><span>{formatEuro(totals.totalHT)}</span></div>
              {devis.remise>0 && <div className="flex justify-between text-amber-800"><span>Remise {devis.remise}%</span><span>- {formatEuro(totals.remiseVal)}</span></div>}
              <div className="flex justify-between"><span>TVA {devis.tva_taux}%</span><span>{formatEuro(totals.tvaVal)}</span></div>
              <div className="flex justify-between text-[20px] font-[800] pt-2 border-t border-zinc-200 mt-2"><span>Total TTC</span><span>{formatEuro(totals.totalTTC)}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 text-[13.6px]">
              <button onClick={onSave} className="rounded-xl border border-zinc-300 bg-white py-2.5 font-[630] flex items-center justify-center gap-1.5"><Check size={16}/> Enregistrer</button>
              <button onClick={onExportPDF} className="rounded-xl border border-zinc-300 bg-white py-2.5 font-[630] flex items-center justify-center gap-1.5"><Download size={16}/> PDF</button>
            </div>
            <button onClick={onSend}
              className="w-full mt-2 rounded-xl bg-[#ff5a14] text-white py-3 font-[730] flex items-center justify-center gap-2 shadow-[0_8px_22px_rgba(255,90,20,.28)]">
              <Send size={17}/> Marquer comme envoyé
            </button>
            <div className="grid grid-cols-3 gap-2 mt-2 text-[12.9px]">
              {[
                {label:"Email", href:`mailto:${devis.client.email}?subject=Devis ${devis.numero} – ${entreprise.nom}&body=Bonjour ${devis.client.nom||""},%0D%0A%0D%0AJe vous transmets le devis ${devis.numero} pour ${devis.objet}. Montant TTC : ${formatEuro(totals.totalTTC)}.%0D%0A%0D%0ABien cordialement,%0D%0A${entreprise.nom}`},
                {label:"WhatsApp", href:`https://wa.me/?text=${encodeURIComponent(`Bonjour ${devis.client.nom||""}, voici le devis ${devis.numero} pour ${devis.objet} – ${formatEuro(totals.totalTTC)} TTC. Dites-moi si c'est OK ! – ${entreprise.nom}`)}`},
                {label:"Copier", action: ()=> { navigator.clipboard.writeText(`Devis ${devis.numero} – ${devis.objet}\n${formatEuro(totals.totalTTC)} TTC`); toast.success("Résumé copié");}}
              ].map(b => (
                b.href ?
                <a key={b.label} href={b.href} target="_blank" className="py-2 rounded-xl border border-zinc-200 bg-white text-center hover:bg-zinc-50">{b.label}</a>
                : <button key={b.label} onClick={b.action} className="py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50">{b.label}</button>
              ))}
            </div>
          </div>

          {/* PDF preview */}
          <div className="rounded-[24px] bg-white border border-[#eadfd0] shadow-soft p-5">
            <div className="text-[12.4px] mono text-zinc-500 mb-2">APERÇU PDF</div>
            <div className="rounded-xl border border-zinc-200 p-4 text-[12.8px] leading-relaxed bg-[#fffcf8]">
              <div className="font-[700] text-[15.2px]">DEVIS {devis.numero}</div>
              <div className="text-zinc-600">{entreprise.nom || "Votre entreprise"} → {devis.client.nom || "Client"}</div>
              <div className="mt-2 text-zinc-700">{devis.objet}</div>
              <div className="mt-2 border-t border-dashed border-zinc-300 pt-2 space-y-1">
                {devis.items.slice(0,4).map(i=>(
                  <div key={i.id} className="flex justify-between gap-4">
                    <span className="truncate">{i.designation}</span>
                    <span className="font-[620]">{formatEuro(i.qty*i.pu_ht)}</span>
                  </div>
                ))}
                {devis.items.length > 4 && <div className="text-zinc-500">… +{devis.items.length - 4} lignes</div>}
              </div>
              <div className="mt-3 text-right text-[16px] font-[780]">Total TTC {formatEuro(totals.totalTTC)}</div>
            </div>
          </div>

          <div className="rounded-[20px] bg-[#fff6ed] border border-[#f1d5bc] p-4 text-[13.2px] text-zinc-700">
            <b>Conseil artisan :</b> envoyez le devis dans l’heure qui suit la visite. +34% de taux d’acceptation observé.
          </div>
        </div>
      </div>
    </div>
  );
}

// --- History View ---
function HistoryView({list, onOpen, onNew, onDuplicate, onDelete, onBack}: {
  list: DevisDoc[];
  onOpen: (d:DevisDoc)=>void;
  onNew: ()=>void;
  onDuplicate: (d:DevisDoc)=>void;
  onDelete: (id:string)=>void;
  onBack: ()=>void;
}) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-7 lg:px-10 py-10">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={onBack} className="text-[13.3px] text-zinc-600">← Accueil</button>
          <h2 className="fraunces text-[38px]">Mes devis</h2>
        </div>
        <button onClick={onNew} className="bg-[#17191d] text-white px-4 py-3 rounded-full font-[700] text-[13.9px] flex items-center gap-2"><Mic size={16}/> Nouveau devis vocal</button>
      </div>

      {list.length===0 ? (
        <div className="mt-7 rounded-[24px] bg-white border border-[#eadfd0] shadow-soft p-10 text-center">
          <FileText size={30} className="mx-auto text-zinc-400"/>
          <div className="mt-3 text-[17px] font-[700]">Aucun devis encore</div>
          <div className="text-zinc-600 mt-1">Dictez votre premier chantier, on s’occupe du reste.</div>
          <button onClick={onNew} className="mt-4 bg-[#ff5a14] text-white px-4 py-2.5 rounded-full font-[700]">Commencer</button>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {list.sort((a,b)=>b.created_at - a.created_at).map(d=>{
            const total = d.items.reduce((s,i)=>s+i.qty*i.pu_ht,0)*(1-d.remise/100)*(1+d.tva_taux/100);
            return (
              <div key={d.id} className="rounded-[20px] bg-white border border-[#eadfd0] shadow-soft px-4 sm:px-5 py-4 flex flex-wrap items-center gap-4 justify-between">
                <div className="min-w-[220px]">
                  <div className="text-[12.3px] text-zinc-500 mono">{d.numero} • {new Date(d.date).toLocaleDateString("fr-FR")}</div>
                  <div className="font-[700]">{d.client.nom || "Client sans nom"}</div>
                  <div className="text-[13.6px] text-zinc-600 truncate max-w-[460px]">{d.objet}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-[760]">{formatEuro(total)}</div>
                    <div className={`text-[11.7px] px-2 py-0.5 rounded-full inline-block ${d.statut==="envoyé" ? "bg-emerald-50 text-emerald-700":"bg-zinc-100 text-zinc-700"}`}>{d.statut}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={()=>onOpen(d)} className="px-3 py-2 rounded-xl bg-zinc-900 text-white text-[13px]">Ouvrir</button>
                    <button onClick={()=>onDuplicate(d)} className="px-3 py-2 rounded-xl border border-zinc-300 bg-white text-[13px]"><Copy size={15}/></button>
                    <button onClick={()=>{ if(confirm("Supprimer ce devis ?")) onDelete(d.id) }} className="px-3 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-500"><Trash2 size={15}/></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// --- Onboarding: Entreprise ---
function Onboarding({ value, onChange, onClose }: { value: EntrepriseInfo; onChange:(v:EntrepriseInfo)=>void; onClose:()=>void }) {
  const [local, setLocal] = useState(value);
  const save = () => {
    onChange(local);
    onClose();
    toast.success("Infos entreprise enregistrées");
  };
  return (
    <div className="fixed inset-0 z-[84] bg-black/40 backdrop-blur-[3px] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-[26px] bg-[#fcf8f2] border border-[#e6d6c2] shadow-soft p-6 sm:p-7">
        <div className="flex items-center justify-between">
          <div className="fraunces text-[27px]">Mon entreprise</div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5"><X size={18}/></button>
        </div>
        <p className="text-[14px] text-zinc-600 mt-1">Ces infos apparaissent sur vos devis PDF. Modifiables à tout moment.</p>
        <div className="grid sm:grid-cols-2 gap-3 mt-5 text-[14.4px]">
          <label className="col-span-2">Nom / Raison sociale
            <input className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 bg-white" value={local.nom} onChange={e=>setLocal({...local, nom:e.target.value})} placeholder="Ex: Rénov'Pro – Martin"/>
          </label>
          <label>Métier principal
            <select className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 bg-white" value={local.metier} onChange={e=>setLocal({...local, metier: e.target.value as Metier})}>
              {(Object.keys(CATALOGUE) as Metier[]).map(m=> <option key={m}>{m}</option>)}
            </select>
          </label>
          <label>SIRET
            <input className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 bg-white" value={local.siret} onChange={e=>setLocal({...local, siret:e.target.value})} placeholder="XXX XXX XXX XXXXX"/>
          </label>
          <label className="col-span-2">Adresse
            <input className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 bg-white" value={local.adresse} onChange={e=>setLocal({...local, adresse:e.target.value})} placeholder="12 rue du Bâtiment, 44000 Nantes"/>
          </label>
          <label>Téléphone
            <input className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 bg-white" value={local.telephone} onChange={e=>setLocal({...local, telephone:e.target.value})}/>
          </label>
          <label>Email
            <input className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 bg-white" value={local.email} onChange={e=>setLocal({...local, email:e.target.value})}/>
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-zinc-300 bg-white">Plus tard</button>
          <button onClick={save} className="px-4 py-2.5 rounded-xl bg-[#17191d] text-white font-[700]">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}