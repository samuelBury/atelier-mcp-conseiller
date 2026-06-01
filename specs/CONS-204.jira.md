# CONS-204 — Donner au conseiller un « briefing du matin » automatique

**Type :** User Story
**Priorité :** Haute (P2)
**Statut :** Ready for Dev
**Composant :** conseiller-assist / mcp
**Sprint :** Sprint 28
**PO :** Sandra D.
**Reporter :** Karim B. (Lead Dev)

## User Story

**En tant que** conseiller CNP,
**je veux** obtenir en une commande le « briefing » de ma journée pour mon portefeuille
(clients à relancer, sinistres en attente de documents, anniversaires de contrat proches),
**afin de** prioriser mes actions du matin sans éplucher chaque dossier.

## Critères d'acceptation

- [ ] Une nouvelle capacité MCP prend en entrée l'identifiant d'un conseiller
- [ ] Elle ne considère que les clients **rattachés à ce conseiller**
- [ ] Elle remonte 3 listes : clients sans contact > 90 j, sinistres avec documents
      manquants, contrats dont l'anniversaire arrive sous 45 j
- [ ] Le résultat est un texte **prêt à lire** (Markdown), pas du JSON brut
- [ ] Si une liste est vide, l'afficher comme telle (pas d'erreur)

## Hors-périmètre

- Pas d'envoi d'e-mail / notification
- Pas d'écriture dans les données (lecture seule)
- Pas de planification d'agenda

## Liens

- Confluence : « Besoin métier — Espace client IARD »
- Repo : `atelier-mcp-conseiller` (MCP Conseiller Assist)
