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

## Tester votre MCP dans Copilot (VS Code)

Une fois vos tools/resources/prompts codés, branchez le serveur à **GitHub Copilot**
pour le piloter en langage naturel.

**Prérequis :** GitHub Copilot installé et connecté · `npm run build` exécuté
(le fichier `dist/index.js` doit exister).

1. **La config est déjà fournie** dans `.vscode/mcp.json` :
   ```json
   {
     "servers": {
       "conseiller-assist": {
         "type": "stdio",
         "command": "node",
         "args": ["${workspaceFolder}/dist/index.js"]
       }
     }
   }
   ```
   Rien à modifier : ouvrez simplement le dossier du projet dans VS Code.

2. **Démarrer le serveur** : cliquez sur le bouton **▶ Start** qui apparaît au-dessus de
   `"conseiller-assist"` dans `mcp.json` (ou `Cmd/Ctrl+Shift+P` → **MCP: List Servers** →
   *Start*). Au 1er lancement, **confirmez que vous faites confiance au serveur**.

3. **Tester dans Copilot Chat — en mode Agent** (sélecteur en haut du chat) :
   - **Tools** → bouton **Configure Tools** → cochez vos tools, puis demandez par ex.
     *« Fais-moi la synthèse du portefeuille du client CLI-001. »*
   - **Resources** → **Add Context** → **MCP Resources** → choisissez `cnp://client/...`.
   - **Prompts** → tapez `/conseiller-assist.synthese-client-avant-rdv`.

4. **Boucle de dev** : après chaque modif de `src/index.ts` → `npm run build` →
   **MCP: List Servers** → *Restart* sur `conseiller-assist` → retestez.

> Tool absent ? 3 causes habituelles : build pas refait · serveur pas redémarré ·
> chat pas en **mode Agent**.

### Déclencher chaque primitive à coup sûr

Rappel : le modèle appelle les **Tools** lui-même, mais les **Resources** et **Prompts**
se déclenchent **par l'utilisateur**. Voici comment ne pas se rater.

**🔧 Tool** — nommez-le explicitement dans votre demande :
> *« Utilise l'outil `synthese_portefeuille_client` sur le client CLI-001. »*

**📚 Resource** — vous l'attachez vous-même comme contexte :
1. Bouton **« Add Context… »** (📎) sous la zone de saisie du chat.
2. Choisir **« MCP Resources »** *(visible uniquement si le serveur est démarré)*.
3. Sélectionner la resource (ex. `cnp://client/{id}`).
4. ⚠️ Nos resources sont **templatées** (`{id}`, `{numero}`…) : VS Code vous
   **demande alors de saisir la valeur** (ex. `CLI-001`) avant de l'attacher. C'est normal.
5. Posez votre question : la resource est dans le contexte, donc utilisée à coup sûr.

**⌨️ Prompt** — c'est une slash-command :
1. Tapez **`/`** dans le chat → la liste affiche `conseiller-assist.<nom-du-prompt>`.
2. Sélectionnez, ex. `conseiller-assist.synthese-client-avant-rdv`.
3. Si le prompt a des paramètres (`clientId`), VS Code vous les **demande** (ex. `CLI-001`).
4. Le message construit par votre serveur est injecté dans le chat, prêt à être envoyé.

> 100 % déterministe pour vérifier en dev : `npm run inspect` → onglets
> **Resources / Tools / Prompts** (listing + exécution garantis, sans LLM).

## En cas de blocage

- `npm run build` affiche une erreur ? Lisez le numéro de ligne, c'est presque toujours
  une virgule ou une accolade. Comparez avec l'exemple fourni juste au-dessus.
- Inspecteur qui ne démarre pas ? Vérifiez Node ≥ 20 (`node -v`).
