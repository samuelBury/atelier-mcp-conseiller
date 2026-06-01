# Spec — CONS-204 : briefing du matin du conseiller

> Spec dérivée du ticket Jira `CONS-204.jira.md`. Format Spec Kit (6 sections).
> Destinée à être lue par l'agent (Copilot/Claude) qui implémente puis ouvre la PR.

## Feature
Ajouter au MCP « Conseiller Assist » un tool `briefing_journee_conseiller` qui produit,
pour un conseiller donné, le briefing priorisé de sa journée.

## Contexte
Les conseillers commencent leur journée en ouvrant manuellement plusieurs dossiers pour
savoir qui relancer et quels sinistres sont bloqués. On veut une vue unique, en une commande,
restreinte à **leur** portefeuille (`client.conseillerAttribue`). Lecture seule.

## Critères d'acceptation
- Tool nommé `briefing_journee_conseiller`, paramètre `conseillerId: string`.
- Ne considère que les clients dont `conseillerAttribue === conseillerId`.
- Produit 3 sections :
  1. **À relancer** : clients dont `dernierContact` date de plus de **90 jours**.
  2. **Sinistres bloqués** : sinistres de ces clients ayant `documentsManquants` non vide.
  3. **Anniversaires proches** : contrats de ces clients dont `dateAnniversaire` est dans **≤ 45 jours**.
- Sortie en **Markdown lisible** (`content: [{ type: "text", text }]`), jamais de JSON brut.
- Chaque section vide affiche « Aucun · ✅ » sans erreur.

## Contraintes techniques
- Stack existante : `@modelcontextprotocol/sdk`, `zod`, TypeScript, Node ≥ 20.
- Réutiliser les helpers existants ; ajouter au besoin `getAllClients()`, `joursDepuis()`, `joursAvant()`.
- Aucune dépendance nouvelle. Aucune écriture disque. Doit compiler avec `npm run build`.

## Exemples I/O
**Entrée :** `briefing_journee_conseiller({ conseillerId: "conseiller-23" })`
**Sortie (extrait attendu) :**
```
# Briefing du jour — conseiller-23
## 🔁 À relancer (clients > 90 j sans contact)
- CLI-001 Jean Dupont (dernier contact 2024-09-12)
## 📄 Sinistres bloqués (documents manquants)
- Aucun · ✅
## 🎂 Anniversaires de contrat (≤ 45 j)
- CTR-2024-001 (J-XX)
```

## Hors-périmètre
- Pas d'e-mail/notification, pas d'écriture de données, pas d'agenda.
- Pas de pagination ni de tri configurable (v1 simple).
