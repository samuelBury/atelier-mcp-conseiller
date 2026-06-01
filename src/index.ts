#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  CORRIGÉ FORMATEUR — MCP « Conseiller Assist »                         ║
 * ║  ⚠️  NE PAS DISTRIBUER AUX PARTICIPANTS (c'est la branche `corrige`)   ║
 * ║  CIDFP — Formation MCP / LLM / Prompts                                 ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Contient une solution de référence pour :
 *   - 4 Resources (client, contrat, portefeuille, sinistre)
 *   - 18 Tools métier (voir CATALOGUE-TOOLS.md pour la correspondance)
 *   - 2 Prompts (workflows conseiller)
 *
 * Sert à : débloquer un groupe, montrer la solution, comparer en fin d'atelier.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

const server = new McpServer({ name: "conseiller-assist-corrige", version: "1.0.0" });

/* ═══════════════════════════ HELPERS ═══════════════════════════ */
async function readJson(path: string): Promise<any> {
  return JSON.parse(await readFile(path, "utf-8"));
}
async function listDir(subdir: string): Promise<string[]> {
  const files = await readdir(join(DATA_DIR, subdir));
  return files.filter((f) => f.endsWith(".json"));
}
async function getClient(id: string) { return readJson(join(DATA_DIR, "clients", `${id}.json`)); }
async function getContrat(numero: string) { return readJson(join(DATA_DIR, "contrats", `${numero}.json`)); }
async function getSinistre(id: string) { return readJson(join(DATA_DIR, "sinistres", `${id}.json`)); }

async function getAll(subdir: string): Promise<any[]> {
  const files = await listDir(subdir);
  return Promise.all(files.map((f) => readJson(join(DATA_DIR, subdir, f))));
}
async function getAllContratsFor(clientId: string): Promise<any[]> {
  return (await getAll("contrats")).filter((c) => c.souscripteur === clientId);
}
async function getAllSinistresFor(clientId: string): Promise<any[]> {
  return (await getAll("sinistres")).filter((s) => s.clientLie === clientId);
}
function joursAvant(dateISO: string): number {
  const today = new Date();
  const d = new Date(dateISO);
  d.setFullYear(today.getFullYear());
  if (d < today) d.setFullYear(today.getFullYear() + 1);
  return Math.ceil((d.getTime() - today.getTime()) / 86_400_000);
}
function joursDepuis(dateISO: string): number {
  return Math.floor((Date.now() - new Date(dateISO).getTime()) / 86_400_000);
}
const txt = (text: string) => ({ content: [{ type: "text" as const, text }] });

/* ═══════════════════════════ RESOURCES ═══════════════════════════ */
server.resource("client", "cnp://client/{id}", async (uri) => {
  const client = await getClient(uri.pathname.split("/").pop() || "");
  return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(client, null, 2) }] };
});

server.resource("contrat", "cnp://contrat/{numero}", async (uri) => {
  const c = await getContrat(uri.pathname.split("/").pop() || "");
  return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(c, null, 2) }] };
});

server.resource("sinistre", "cnp://sinistre/{id}", async (uri) => {
  const s = await getSinistre(uri.pathname.split("/").pop() || "");
  return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(s, null, 2) }] };
});

server.resource("portefeuille", "cnp://portefeuille/{clientId}", async (uri) => {
  const clientId = uri.pathname.split("/").pop() || "";
  const client = await getClient(clientId);
  const contrats = await getAllContratsFor(clientId);
  const sinistres = await getAllSinistresFor(clientId);
  const portefeuille = {
    client, contrats, sinistres,
    synthese: {
      nbContrats: contrats.length,
      primeAnnuelleTotale: contrats.reduce((s, c) => s + c.primeAnnuelle, 0),
      capitalTotal: contrats.reduce((s, c) => s + c.capitalGaranti, 0),
      nbSinistresActifs: sinistres.filter((s) => s.statut === "en_cours_instruction").length,
    },
  };
  return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(portefeuille, null, 2) }] };
});

/* ═══════════════════════════ TOOLS ═══════════════════════════ */

// T1 — Synthèse portefeuille client
server.tool("synthese_portefeuille_client",
  "Synthèse métier complète d'un client : profil, contrats, sinistres, indicateurs.",
  { clientId: z.string() },
  async ({ clientId }) => {
    const client = await getClient(clientId);
    const contrats = await getAllContratsFor(clientId);
    const sinistres = await getAllSinistresFor(clientId);
    return txt(`# Synthèse client — ${client.prenom} ${client.nom} (${client.id})

**Segment :** ${client.segment} | **Score engagement :** ${client.scoreEngagement}/100
**Dernier contact :** ${client.dernierContact} | **Canal préféré :** ${client.preferences.canalPrefere}

## Contrats (${contrats.length})
${contrats.map((c) => `- ${c.numero} — ${c.type} | prime ${c.primeAnnuelle}€ | statut ${c.statut}`).join("\n") || "Aucun"}

## Sinistres (${sinistres.length})
${sinistres.map((s) => `- ${s.id} — ${s.type} | statut ${s.statut}`).join("\n") || "Aucun"}

## Indicateurs
- Prime annuelle totale : ${contrats.reduce((s, c) => s + c.primeAnnuelle, 0)}€
- Capital garanti total : ${contrats.reduce((s, c) => s + c.capitalGaranti, 0)}€`);
  });

// T2 — Analyse conformité contrat
server.tool("analyser_conformite_contrat",
  "Analyse la conformité d'un contrat (clauses, bénéficiaires, statut) avec niveau de risque.",
  { contratId: z.string() },
  async ({ contratId }) => {
    const c = await getContrat(contratId);
    const alertes: string[] = [];
    if (c.statut !== "actif") alertes.push(`⚠ Statut '${c.statut}' — à vérifier`);
    if (!c.beneficiaires || c.beneficiaires.length === 0) alertes.push("⚠ Aucun bénéficiaire désigné");
    if ((c.beneficiaires || []).some((b: string) => b.toLowerCase().includes("association")))
      alertes.push("ℹ Bénéficiaire association — vérifier conformité fiscale");
    const niveau = alertes.length === 0 ? "FAIBLE" : alertes.length === 1 ? "MOYEN" : "ÉLEVÉ";
    return txt(`# Analyse conformité — ${c.numero}

**Type :** ${c.type} | **Statut :** ${c.statut} | **Risque :** ${niveau}

## Clauses (${c.clauses.length})
${c.clauses.map((cl: string) => `- ${cl}`).join("\n")}

## Bénéficiaires (${c.beneficiaires.length})
${c.beneficiaires.map((b: string) => `- ${b}`).join("\n")}

## Alertes
${alertes.length ? alertes.join("\n") : "✅ Aucune alerte."}`);
  });

// T3 — Préparer revue anniversaire
server.tool("preparer_revue_anniversaire",
  "Dossier de revue anniversaire d'un contrat : situation, points à aborder, derniers échanges.",
  { contratId: z.string() },
  async ({ contratId }) => {
    const c = await getContrat(contratId);
    const client = await getClient(c.souscripteur);
    return txt(`# Revue anniversaire — ${c.numero}

**Client :** ${client.prenom} ${client.nom} (${client.segment})
**Anniversaire :** ${c.dateAnniversaire} (J-${joursAvant(c.dateAnniversaire)})
**Canal préféré :** ${client.preferences.canalPrefere}

## Situation
- Prime annuelle : ${c.primeAnnuelle}€
- Capital garanti : ${c.capitalGaranti}€
- Ancienneté : ${new Date().getFullYear() - new Date(c.dateEffet).getFullYear()} ans

## Points à aborder
1. Cohérence bénéficiaires (${c.beneficiaires.length})
2. Évolution patrimoniale du client
3. Ajustement de la prime
4. Revue des clauses

## Derniers échanges
${c.commentaires.slice(-3).map((cm: any) => `- ${cm.date} : ${cm.texte}`).join("\n")}`);
  });

// T4 — Évaluer risque de churn
server.tool("evaluer_risque_churn",
  "Évalue le risque de désengagement d'un client (score, dernier contact, sinistres, contrats).",
  { clientId: z.string() },
  async ({ clientId }) => {
    const client = await getClient(clientId);
    const contrats = await getAllContratsFor(clientId);
    const sinistres = await getAllSinistresFor(clientId);
    const facteurs: string[] = [];
    let score = 100;
    if (client.scoreEngagement < 60) { score -= 30; facteurs.push("Score engagement bas"); }
    const jc = joursDepuis(client.dernierContact);
    if (jc > 180) { score -= 20; facteurs.push(`Aucun contact depuis ${jc} jours`); }
    const sc = sinistres.filter((s) => s.statut === "en_cours_instruction").length;
    if (sc > 0) { score -= 15; facteurs.push(`${sc} sinistre(s) en cours`); }
    if (contrats.some((c) => c.statut !== "actif")) { score -= 10; facteurs.push("Contrat non actif"); }
    const niveau = score > 75 ? "FAIBLE" : score > 50 ? "MOYEN" : "ÉLEVÉ";
    return txt(`# Risque de churn — ${client.prenom} ${client.nom}

**Score fidélisation : ${score}/100 — Risque : ${niveau}**

## Facteurs
${facteurs.length ? facteurs.map((f) => `- ${f}`).join("\n") : "✅ Aucun facteur détecté."}

## Recommandations
${score < 75 ? "- Contact proactif sous 30 jours\n- Proposer une revue patrimoniale" : "- Profil stable, à valoriser"}`);
  });

// T5 — Rechercher clients à recontacter
server.tool("rechercher_clients_a_recontacter",
  "Liste les clients sans contact depuis plus de N jours, triés par score décroissant.",
  { joursDepuisDernierContact: z.number().default(120) },
  async ({ joursDepuisDernierContact }) => {
    const clients = (await getAll("clients"))
      .filter((c) => joursDepuis(c.dernierContact) > joursDepuisDernierContact)
      .sort((a, b) => b.scoreEngagement - a.scoreEngagement);
    return txt(`# Clients à recontacter (> ${joursDepuisDernierContact} j)

${clients.length ? clients.map((c) => `- **${c.id}** ${c.prenom} ${c.nom} | ${c.segment} | score ${c.scoreEngagement} | dernier contact ${c.dernierContact}`).join("\n") : "Aucun."}`);
  });

// T6 — Lister contrats par statut
server.tool("lister_contrats_par_statut",
  "Liste tous les contrats ayant un statut donné (ex. actif, en_revision).",
  { statut: z.string() },
  async ({ statut }) => {
    const contrats = (await getAll("contrats")).filter((c) => c.statut === statut);
    return txt(`# Contrats au statut « ${statut} » (${contrats.length})

${contrats.map((c) => `- ${c.numero} — ${c.type} | souscripteur ${c.souscripteur} | prime ${c.primeAnnuelle}€`).join("\n") || "Aucun."}`);
  });

// T7 — Détecter contrats sans bénéficiaire
server.tool("detecter_contrats_sans_beneficiaire",
  "Repère les contrats sans bénéficiaire désigné (alerte conformité).",
  {},
  async () => {
    const ko = (await getAll("contrats")).filter((c) => !c.beneficiaires || c.beneficiaires.length === 0);
    return txt(`# Contrats sans bénéficiaire (${ko.length})

${ko.length ? ko.map((c) => `- ⚠ ${c.numero} — ${c.type} (souscripteur ${c.souscripteur})`).join("\n") : "✅ Tous les contrats ont au moins un bénéficiaire."}`);
  });

// T8 — Suivre un sinistre
server.tool("suivre_sinistre",
  "État d'avancement d'un sinistre : statut, documents reçus/manquants, prochaine action.",
  { sinistreId: z.string() },
  async ({ sinistreId }) => {
    const s = await getSinistre(sinistreId);
    const action = (s.documentsManquants && s.documentsManquants.length)
      ? `Relancer le client pour : ${s.documentsManquants.join(", ")}`
      : (s.expert ? "Dossier complet — suivre l'expertise" : "Dossier complet — affecter un expert");
    return txt(`# Suivi sinistre — ${s.id}

**Type :** ${s.type} | **Statut :** ${s.statut}
**Déclaré le :** ${s.dateDeclaration} | **Montant réclamé :** ${s.montantReclame}€${s.montantValide != null ? ` | validé : ${s.montantValide}€` : ""}

## Documents reçus
${(s.documentsRecus || []).map((d: string) => `- ✅ ${d}`).join("\n") || "Aucun"}
## Documents manquants
${(s.documentsManquants || []).map((d: string) => `- ❌ ${d}`).join("\n") || "Aucun"}

## Prochaine action
➡ ${action}`);
  });

// T9 — Lister sinistres en cours
server.tool("lister_sinistres_en_cours",
  "Liste tous les sinistres en cours d'instruction, avec documents manquants.",
  {},
  async () => {
    const enCours = (await getAll("sinistres")).filter((s) => s.statut === "en_cours_instruction");
    return txt(`# Sinistres en cours d'instruction (${enCours.length})

${enCours.map((s) => `- **${s.id}** (${s.clientLie}) — ${s.type} | manquant : ${(s.documentsManquants || []).join(", ") || "rien"}`).join("\n") || "Aucun."}`);
  });

// T10 — Valeur du portefeuille d'un conseiller
server.tool("valeur_portefeuille_conseiller",
  "Agrège la valeur (primes, capitaux, nb clients) gérée par un conseiller donné.",
  { conseillerId: z.string() },
  async ({ conseillerId }) => {
    const clients = (await getAll("clients")).filter((c) => c.conseillerAttribue === conseillerId);
    const contrats = await getAll("contrats");
    const ids = new Set(clients.map((c) => c.id));
    const leurs = contrats.filter((c) => ids.has(c.souscripteur));
    return txt(`# Portefeuille du conseiller ${conseillerId}

- Clients gérés : ${clients.length} (${clients.map((c) => c.id).join(", ") || "—"})
- Contrats : ${leurs.length}
- Prime annuelle totale : ${leurs.reduce((s, c) => s + c.primeAnnuelle, 0)}€
- Capital garanti total : ${leurs.reduce((s, c) => s + c.capitalGaranti, 0)}€`);
  });

// T11 — Lister clients par segment
server.tool("lister_clients_par_segment",
  "Liste les clients d'un segment donné (ex. premium), triés par score.",
  { segment: z.string() },
  async ({ segment }) => {
    const clients = (await getAll("clients"))
      .filter((c) => c.segment === segment)
      .sort((a, b) => b.scoreEngagement - a.scoreEngagement);
    return txt(`# Clients segment « ${segment} » (${clients.length})

${clients.map((c) => `- ${c.id} ${c.prenom} ${c.nom} | score ${c.scoreEngagement}`).join("\n") || "Aucun."}`);
  });

// T12 — Rechercher un client par nom
server.tool("rechercher_client_par_nom",
  "Recherche des clients dont le nom ou prénom contient le texte donné.",
  { recherche: z.string() },
  async ({ recherche }) => {
    const q = recherche.toLowerCase();
    const found = (await getAll("clients")).filter(
      (c) => c.nom.toLowerCase().includes(q) || c.prenom.toLowerCase().includes(q));
    return txt(`# Recherche « ${recherche} » (${found.length})

${found.map((c) => `- ${c.id} — ${c.prenom} ${c.nom} | ${c.segment} | ${c.email}`).join("\n") || "Aucun résultat."}`);
  });

// T13 — Alertes anniversaires proches
server.tool("alertes_anniversaires_proches",
  "Liste les contrats dont l'anniversaire arrive dans moins de N jours.",
  { jours: z.number().default(60) },
  async ({ jours }) => {
    const proches = (await getAll("contrats"))
      .map((c) => ({ c, j: joursAvant(c.dateAnniversaire) }))
      .filter((x) => x.j <= jours)
      .sort((a, b) => a.j - b.j);
    return txt(`# Anniversaires de contrat dans les ${jours} jours (${proches.length})

${proches.map((x) => `- J-${x.j} : ${x.c.numero} (${x.c.souscripteur}) — ${x.c.type}`).join("\n") || "Aucun."}`);
  });

// T14 — Comparer deux contrats
server.tool("comparer_contrats",
  "Compare deux contrats côte à côte (type, prime, capital, statut).",
  { contratA: z.string(), contratB: z.string() },
  async ({ contratA, contratB }) => {
    const a = await getContrat(contratA);
    const b = await getContrat(contratB);
    const row = (label: string, va: any, vb: any) => `| ${label} | ${va} | ${vb} |`;
    return txt(`# Comparaison ${a.numero} vs ${b.numero}

| Critère | ${a.numero} | ${b.numero} |
|---|---|---|
${row("Type", a.type, b.type)}
${row("Prime annuelle", a.primeAnnuelle + "€", b.primeAnnuelle + "€")}
${row("Capital garanti", a.capitalGaranti + "€", b.capitalGaranti + "€")}
${row("Statut", a.statut, b.statut)}
${row("Bénéficiaires", a.beneficiaires.length, b.beneficiaires.length)}`);
  });

// T15 — Statistiques globales
server.tool("statistiques_globales",
  "Tableau de bord global : nb clients/contrats/sinistres, primes, répartition statuts.",
  {},
  async () => {
    const [clients, contrats, sinistres] = await Promise.all([getAll("clients"), getAll("contrats"), getAll("sinistres")]);
    const parStatut: Record<string, number> = {};
    for (const s of sinistres) parStatut[s.statut] = (parStatut[s.statut] || 0) + 1;
    return txt(`# Tableau de bord global

- Clients : ${clients.length}
- Contrats : ${contrats.length} | prime totale ${contrats.reduce((s, c) => s + c.primeAnnuelle, 0)}€
- Sinistres : ${sinistres.length}

## Sinistres par statut
${Object.entries(parStatut).map(([k, v]) => `- ${k} : ${v}`).join("\n") || "Aucun"}`);
  });

// T16 — Actions prioritaires pour un client
server.tool("actions_prioritaires_client",
  "Agrège churn, sinistres en cours et anniversaire proche pour proposer les actions du jour.",
  { clientId: z.string() },
  async ({ clientId }) => {
    const client = await getClient(clientId);
    const contrats = await getAllContratsFor(clientId);
    const sinistres = await getAllSinistresFor(clientId);
    const actions: string[] = [];
    if (joursDepuis(client.dernierContact) > 120) actions.push("📞 Recontacter (silence > 120 j)");
    for (const s of sinistres.filter((s) => (s.documentsManquants || []).length))
      actions.push(`📄 Sinistre ${s.id} : relancer pour ${s.documentsManquants.join(", ")}`);
    for (const c of contrats.filter((c) => joursAvant(c.dateAnniversaire) <= 60))
      actions.push(`🎂 Préparer la revue de ${c.numero} (J-${joursAvant(c.dateAnniversaire)})`);
    for (const c of contrats.filter((c) => !c.beneficiaires?.length))
      actions.push(`⚠ Contrat ${c.numero} sans bénéficiaire`);
    return txt(`# Actions prioritaires — ${client.prenom} ${client.nom}

${actions.length ? actions.map((a, i) => `${i + 1}. ${a}`).join("\n") : "✅ Rien d'urgent."}`);
  });

// T17 — Documents manquants (tous sinistres)
server.tool("documents_manquants_tous_sinistres",
  "Liste, tous sinistres confondus, les documents encore manquants par dossier.",
  {},
  async () => {
    const avecManques = (await getAll("sinistres")).filter((s) => (s.documentsManquants || []).length);
    return txt(`# Documents manquants — ${avecManques.length} dossier(s)

${avecManques.map((s) => `- ${s.id} (${s.clientLie}) : ${s.documentsManquants.join(", ")}`).join("\n") || "✅ Aucun document manquant."}`);
  });

// T18 — Historique récent d'un client
server.tool("historique_recent_client",
  "Fusionne et trie les derniers commentaires des contrats et sinistres d'un client.",
  { clientId: z.string() },
  async ({ clientId }) => {
    const contrats = await getAllContratsFor(clientId);
    const sinistres = await getAllSinistresFor(clientId);
    const events: { date: string; source: string; texte: string }[] = [];
    for (const c of contrats) for (const cm of (c.commentaires || [])) events.push({ date: cm.date, source: c.numero, texte: cm.texte });
    for (const s of sinistres) for (const cm of (s.commentaires || [])) events.push({ date: cm.date, source: s.id, texte: cm.texte });
    events.sort((a, b) => b.date.localeCompare(a.date));
    return txt(`# Historique récent — ${clientId} (${events.length} événements)

${events.map((e) => `- ${e.date} [${e.source}] ${e.texte}`).join("\n") || "Aucun événement."}`);
  });

/* ═══════════════════════════ PROMPTS ═══════════════════════════ */
server.prompt("synthese-client-avant-rdv",
  "Prépare une fiche de synthèse complète d'un client en vue d'un rendez-vous.",
  { clientId: z.string().describe("Identifiant du client à préparer") },
  ({ clientId }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Tu es conseiller CNP Assurances. Tu prépares un RDV avec le client ${clientId}.
1. Appelle synthese_portefeuille_client("${clientId}").
2. Appelle evaluer_risque_churn("${clientId}").
3. Appelle actions_prioritaires_client("${clientId}").
Produis une fiche prête à imprimer : profil, contrats + alertes, risque de churn, et 3 sujets à aborder en priorité.`,
      },
    }],
  }));

server.prompt("argumentaire-renouvellement",
  "Construit un argumentaire de renouvellement pour un contrat.",
  { contratId: z.string().describe("Numéro du contrat à renouveler") },
  ({ contratId }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Tu es conseiller CNP Assurances. Prépare un argumentaire de renouvellement pour le contrat ${contratId}.
1. Appelle analyser_conformite_contrat("${contratId}").
2. Appelle preparer_revue_anniversaire("${contratId}").
Rédige ensuite un argumentaire commercial structuré : valeur déjà apportée, points de vigilance, 2 propositions d'évolution adaptées au profil.`,
      },
    }],
  }));

/* ═══════════════════════════ DÉMARRAGE ═══════════════════════════ */
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("MCP Conseiller Assist (CORRIGÉ) démarré sur stdio.");
