#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  ATELIER DESIGN BOARD — MCP « Conseiller Assist »  (SQUELETTE)         ║
 * ║  CIDFP — Formation MCP / LLM / Prompts                                 ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Votre faux SI = le dossier ../data avec 3 domaines :
 *   - data/clients/    (CLI-001.json, ...)
 *   - data/contrats/   (CTR-2024-001.json, ...)
 *   - data/sinistres/  (SIN-2024-001.json, ...)
 *
 * Votre mission : exposer ce SI à un agent IA en VRAI design métier.
 * Tout est déjà branché (serveur, lecture des données, helpers).
 * Vous n'avez qu'à remplir les blocs marqués  👉 TODO 👈  :
 *   - au moins 2 Resources de plus
 *   - au moins 2 Tools de plus
 *   - au moins 1 Prompt de plus
 *
 * Lancer en visuel :   npm run inspect
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

const server = new McpServer({
  name: "conseiller-assist-atelier",
  version: "1.0.0",
});

/* ═══════════════════════════════════════════════════════════════════════
 *  HELPERS — déjà écrits pour vous. Servez-vous en, ne les modifiez pas.
 * ═══════════════════════════════════════════════════════════════════════ */
async function readJson(path: string) {
  return JSON.parse(await readFile(path, "utf-8"));
}
async function listDir(subdir: string) {
  const files = await readdir(join(DATA_DIR, subdir));
  return files.filter((f) => f.endsWith(".json"));
}
async function getClient(id: string) {
  return readJson(join(DATA_DIR, "clients", `${id}.json`));
}
async function getContrat(numero: string) {
  return readJson(join(DATA_DIR, "contrats", `${numero}.json`));
}
async function getSinistre(id: string) {
  return readJson(join(DATA_DIR, "sinistres", `${id}.json`));
}
async function getAllContratsFor(clientId: string) {
  const files = await listDir("contrats");
  const all = await Promise.all(files.map((f) => readJson(join(DATA_DIR, "contrats", f))));
  return all.filter((c) => c.souscripteur === clientId);
}
async function getAllSinistresFor(clientId: string) {
  const files = await listDir("sinistres");
  const all = await Promise.all(files.map((f) => readJson(join(DATA_DIR, "sinistres", f))));
  return all.filter((s) => s.clientLie === clientId);
}

// --- Ajouts CONS-204 (briefing conseiller) ---
async function getAllClients(): Promise<any[]> {
  const files = await listDir("clients");
  return Promise.all(files.map((f) => readJson(join(DATA_DIR, "clients", f))));
}
async function getAllContrats(): Promise<any[]> {
  const files = await listDir("contrats");
  return Promise.all(files.map((f) => readJson(join(DATA_DIR, "contrats", f))));
}
async function getAllSinistres(): Promise<any[]> {
  const files = await listDir("sinistres");
  return Promise.all(files.map((f) => readJson(join(DATA_DIR, "sinistres", f))));
}
function joursDepuis(dateISO: string): number {
  return Math.floor((Date.now() - new Date(dateISO).getTime()) / 86_400_000);
}
function joursAvant(dateAnnivISO: string): number {
  const today = new Date();
  const d = new Date(dateAnnivISO);
  d.setFullYear(today.getFullYear());
  if (d < today) d.setFullYear(today.getFullYear() + 1);
  return Math.ceil((d.getTime() - today.getTime()) / 86_400_000);
}

/* ═══════════════════════════════════════════════════════════════════════
 *  1) RESOURCES — des objets métier adressables par URI (lecture seule)
 * ═══════════════════════════════════════════════════════════════════════ */

/* ---- EXEMPLE FOURNI (à recopier comme modèle) ------------------------- */
server.resource(
  "client",
  "cnp://client/{id}",
  async (uri) => {
    const id = uri.pathname.split("/").pop() || "";
    const client = await getClient(id);
    return {
      contents: [
        { uri: uri.href, mimeType: "application/json", text: JSON.stringify(client, null, 2) },
      ],
    };
  }
);

/* 👉 TODO #1 — Resource « contrat » -------------------------------------
 * URI suggérée : cnp://contrat/{numero}
 * Doit renvoyer le JSON du contrat (utilisez getContrat()).
 *
 * server.resource("contrat", "cnp://contrat/{numero}", async (uri) => {
 *   // ... à compléter
 * });
 */

/* 👉 TODO #2 — Resource « portefeuille » --------------------------------
 * URI suggérée : cnp://portefeuille/{clientId}
 * Idée métier : agréger client + ses contrats + ses sinistres en UN objet,
 * avec une petite synthèse (nb contrats, prime totale, capital total).
 * Helpers utiles : getClient, getAllContratsFor, getAllSinistresFor.
 */

/* ═══════════════════════════════════════════════════════════════════════
 *  2) TOOLS — des INTENTIONS MÉTIER (pas des endpoints REST !)
 *     Signature : server.tool(nom, description, { params zod }, handler)
 *     Le handler renvoie { content: [{ type: "text", text: "..." }] }
 * ═══════════════════════════════════════════════════════════════════════ */

/* ---- EXEMPLE FOURNI (à recopier comme modèle) ------------------------- */
server.tool(
  "synthese_portefeuille_client",
  "Donne une synthèse métier complète d'un client (profil, contrats, sinistres, indicateurs) prête à lire.",
  { clientId: z.string() },
  async ({ clientId }) => {
    const client = await getClient(clientId);
    const contrats = await getAllContratsFor(clientId);
    const sinistres = await getAllSinistresFor(clientId);

    const primeTotale = contrats.reduce((s, c) => s + c.primeAnnuelle, 0);
    const capitalTotal = contrats.reduce((s, c) => s + c.capitalGaranti, 0);

    const synthese = `# Synthèse client — ${client.prenom} ${client.nom} (${client.id})

**Segment :** ${client.segment}  |  **Score engagement :** ${client.scoreEngagement}/100
**Dernier contact :** ${client.dernierContact}  |  **Canal préféré :** ${client.preferences.canalPrefere}

## Contrats (${contrats.length})
${contrats.map((c) => `- ${c.numero} — ${c.type} | prime ${c.primeAnnuelle}€ | statut ${c.statut}`).join("\n") || "Aucun"}

## Sinistres (${sinistres.length})
${sinistres.map((s) => `- ${s.id} — ${s.type} | statut ${s.statut}`).join("\n") || "Aucun"}

## Indicateurs
- Prime annuelle totale : ${primeTotale}€
- Capital garanti total : ${capitalTotal}€`;

    return { content: [{ type: "text", text: synthese }] };
  }
);

/* ---- CONS-204 — briefing du matin du conseiller (implémente la spec) -- */
server.tool(
  "briefing_journee_conseiller",
  "Briefing priorisé de la journée d'un conseiller : clients à relancer, sinistres bloqués, anniversaires de contrat proches (lecture seule, son portefeuille).",
  { conseillerId: z.string() },
  async ({ conseillerId }) => {
    const clients = (await getAllClients()).filter((c) => c.conseillerAttribue === conseillerId);
    const ids = new Set(clients.map((c) => c.id));

    const aRelancer = clients.filter((c) => joursDepuis(c.dernierContact) > 90);
    const sinistresBloques = (await getAllSinistres())
      .filter((s) => ids.has(s.clientLie) && (s.documentsManquants || []).length > 0);
    const anniv = (await getAllContrats())
      .filter((c) => ids.has(c.souscripteur))
      .map((c) => ({ c, j: joursAvant(c.dateAnniversaire) }))
      .filter((x) => x.j <= 45)
      .sort((a, b) => a.j - b.j);

    const briefing = `# Briefing du jour — ${conseillerId}

## 🔁 À relancer (clients > 90 j sans contact)
${aRelancer.length ? aRelancer.map((c) => `- ${c.id} ${c.prenom} ${c.nom} (dernier contact ${c.dernierContact})`).join("\n") : "- Aucun · ✅"}

## 📄 Sinistres bloqués (documents manquants)
${sinistresBloques.length ? sinistresBloques.map((s) => `- ${s.id} (${s.clientLie}) — manque : ${s.documentsManquants.join(", ")}`).join("\n") : "- Aucun · ✅"}

## 🎂 Anniversaires de contrat (≤ 45 j)
${anniv.length ? anniv.map((x) => `- ${x.c.numero} (${x.c.souscripteur}) — J-${x.j}`).join("\n") : "- Aucun · ✅"}`;

    return { content: [{ type: "text", text: briefing }] };
  }
);

/* 👉 TODO #3 — Tool « analyser_conformite_contrat » ---------------------
 * Param : { contratId: z.string() }
 * Intention : lire un contrat, repérer des alertes (statut, bénéficiaires,
 * clauses), donner un niveau de risque, renvoyer un rapport Markdown.
 */

/* 👉 TODO #4 — Tool « rechercher_clients_a_recontacter » ----------------
 * Param : { joursDepuisDernierContact: z.number().default(120) }
 * Intention : lister les clients dont 'dernierContact' dépasse le seuil,
 * triés par scoreEngagement décroissant. (Helpers : listDir, readJson)
 */

/* (Idées bonus de tools métier : preparer_revue_anniversaire,
 *  evaluer_risque_churn, suivre_sinistre_en_cours ...) */

/* ═══════════════════════════════════════════════════════════════════════
 *  3) PROMPTS — des workflows que l'utilisateur déclenche (slash-commands)
 *     Signature : server.prompt(nom, description, { params zod }, handler)
 * ═══════════════════════════════════════════════════════════════════════ */

/* ---- EXEMPLE FOURNI (à recopier comme modèle) ------------------------- */
server.prompt(
  "synthese-client-avant-rdv",
  "Prépare une fiche de synthèse complète d'un client en vue d'un rendez-vous.",
  { clientId: z.string().describe("Identifiant du client à préparer") },
  ({ clientId }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Tu es conseiller CNP Assurances. Tu prépares un RDV avec le client ${clientId}.
1. Appelle synthese_portefeuille_client("${clientId}").
2. Repère les contrats à risque et les sinistres en cours.
Produis une fiche prête à imprimer : profil, contrats + alertes, et 3 sujets à aborder en priorité.`,
        },
      },
    ],
  })
);

/* 👉 TODO #5 — Prompt « argumentaire-renouvellement » -------------------
 * Param : { contratId: z.string() }
 * Intention : générer un message guidant le LLM pour bâtir un argumentaire
 * de renouvellement à partir du contrat (utilisez les tools que vous créez).
 */

/* ═══════════════════════════════════════════════════════════════════════
 *  Démarrage du serveur — NE PAS MODIFIER
 * ═══════════════════════════════════════════════════════════════════════ */
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("MCP Conseiller Assist (atelier) démarré sur stdio.");
