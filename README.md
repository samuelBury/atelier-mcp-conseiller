# Atelier Design Board — MCP « Conseiller Assist »

Vous allez exposer un **faux SI d'assurance** (clients, contrats, sinistres) à un agent IA,
en concevant un **vrai MCP métier** : des **Resources**, des **Tools** et des **Prompts**.

## Le faux SI (déjà fourni)

```
data/
├── clients/    CLI-001.json, CLI-002.json, CLI-003.json
├── contrats/   CTR-2024-001.json, ...
└── sinistres/  SIN-2024-001.json, ...
```

Ce sont vos données. Tout est déjà branché : vous codez uniquement la **couche d'exposition**.

## Installation (une fois, ~1 min)

Pré-requis : **Node.js ≥ 20**.

```bash
npm install
npm run build
```

## Lancer en visuel (MCP Inspector)

```bash
npm run inspect
```

Une page s'ouvre dans le navigateur : onglets **Resources / Tools / Prompts**.
Vous pouvez appeler chaque entrée en live et voir ce que **recevrait le LLM**.

## Votre mission

Ouvrez `src/index.ts`. Tout est commenté. Un **exemple complet** est déjà fourni pour
chaque famille (1 Resource, 1 Tool, 1 Prompt). Complétez les blocs marqués `👉 TODO 👈` :

| # | À créer | Indice |
|---|---------|--------|
| 1 | Resource `contrat` | `cnp://contrat/{numero}` + `getContrat()` |
| 2 | Resource `portefeuille` | agréger client + contrats + sinistres |
| 3 | Tool `analyser_conformite_contrat` | alertes + niveau de risque |
| 4 | Tool `rechercher_clients_a_recontacter` | filtrer par date de dernier contact |
| 5 | Prompt `argumentaire-renouvellement` | workflow déclenché par l'utilisateur |

Après chaque modif : `npm run build` puis rechargez l'inspecteur.

## La règle d'or de l'atelier

> Un **Tool** n'est pas un endpoint REST (`GET_client_email`).
> C'est une **intention métier** (`synthese_portefeuille_client`).
> On expose **le métier**, pas **le SI brut**.

## En cas de blocage

- `npm run build` affiche une erreur ? Lisez le numéro de ligne, c'est presque toujours
  une virgule ou une accolade. Comparez avec l'exemple fourni juste au-dessus.
- Inspecteur qui ne démarre pas ? Vérifiez Node ≥ 20 (`node -v`).
