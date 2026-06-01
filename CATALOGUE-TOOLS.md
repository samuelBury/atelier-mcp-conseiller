# Catalogue de Tools à distribuer — 1 par participant

**Usage formateur :** distribuez une ligne à chaque participant. Chacun code **un tool différent**
dans `src/index.ts`. À la fin, on rassemble tout et on inspecte un MCP « collectif ».

- ✅ = **corrigé fourni** dans la branche `corrige` (`src/index.ts`).
- 💡 = **idée d'extension** (pas de corrigé : pour les plus rapides / avancés).
- Niveau : ⭐ accessible · ⭐⭐ intermédiaire · ⭐⭐⭐ exigeant.

> Rappel : un tool = une **intention métier**, pas un endpoint REST.
> Signature : `server.tool(nom, description, { params zod }, handler)`.

## Données disponibles (rappel des champs)
- **client** : `id, nom, prenom, dateNaissance, email, telephone, adresse, conseillerAttribue, segment, contratsLies[], scoreEngagement, dernierContact, preferences{canalPrefere, frequenceRevue}`
- **contrat** : `numero, type, souscripteur, dateEffet, dateAnniversaire, primeAnnuelle, capitalGaranti, beneficiaires[], clauses[], statut, derniereModification, commentaires[]`
- **sinistre** : `id, contratLie, clientLie, dateDeclaration, type, description, statut, montantReclame, montantValide, documentsRecus[], documentsManquants[], expert, commentaires[]`

---

## 🧑 Domaine CLIENT

| # | Tool | Intention | Paramètres | Niveau | |
|---|------|-----------|------------|--------|---|
| 1 | `synthese_portefeuille_client` | Vue 360° d'un client (profil + contrats + sinistres + indicateurs) | `clientId` | ⭐⭐ | ✅ |
| 2 | `evaluer_risque_churn` | Score de risque de départ + facteurs + reco | `clientId` | ⭐⭐⭐ | ✅ |
| 3 | `rechercher_clients_a_recontacter` | Clients sans contact depuis > N jours, triés | `joursDepuisDernierContact` | ⭐⭐ | ✅ |
| 4 | `lister_clients_par_segment` | Clients d'un segment (premium…) triés par score | `segment` | ⭐ | ✅ |
| 5 | `rechercher_client_par_nom` | Recherche plein-texte nom/prénom | `recherche` | ⭐ | ✅ |
| 6 | `actions_prioritaires_client` | Agrège churn + sinistres + anniversaire → to-do | `clientId` | ⭐⭐⭐ | ✅ |
| 7 | `historique_recent_client` | Fusionne et trie les commentaires contrats+sinistres | `clientId` | ⭐⭐⭐ | ✅ |
| 8 | `score_engagement_moyen` | Score d'engagement moyen + médiane sur tout le parc | _(aucun)_ | ⭐ | 💡 |
| 9 | `clients_anniversaire_naissance` | Clients dont l'anniversaire de naissance arrive sous N jours | `jours` | ⭐⭐ | 💡 |
| 10 | `repartition_par_canal_prefere` | Combien de clients préfèrent téléphone / mail / … | _(aucun)_ | ⭐ | 💡 |
| 11 | `fiche_contact_client` | Mini-fiche contact prête à appeler (tel, mail, canal, dernier contact) | `clientId` | ⭐ | 💡 |

## 📄 Domaine CONTRAT

| # | Tool | Intention | Paramètres | Niveau | |
|---|------|-----------|------------|--------|---|
| 12 | `analyser_conformite_contrat` | Alertes clauses/bénéficiaires/statut + niveau de risque | `contratId` | ⭐⭐ | ✅ |
| 13 | `preparer_revue_anniversaire` | Dossier de revue anniversaire complet | `contratId` | ⭐⭐ | ✅ |
| 14 | `lister_contrats_par_statut` | Tous les contrats d'un statut donné | `statut` | ⭐ | ✅ |
| 15 | `detecter_contrats_sans_beneficiaire` | Alerte conformité : contrats sans bénéficiaire | _(aucun)_ | ⭐ | ✅ |
| 16 | `alertes_anniversaires_proches` | Contrats dont l'anniversaire arrive sous N jours | `jours` | ⭐⭐ | ✅ |
| 17 | `comparer_contrats` | Comparaison côte à côte de 2 contrats | `contratA, contratB` | ⭐⭐ | ✅ |
| 18 | `valeur_portefeuille_conseiller` | Primes/capitaux/clients gérés par un conseiller | `conseillerId` | ⭐⭐ | ✅ |
| 19 | `top_contrats_par_capital` | Top N des contrats par capital garanti | `n` | ⭐⭐ | 💡 |
| 20 | `contrats_a_forte_prime` | Contrats dont la prime dépasse un seuil | `seuil` | ⭐ | 💡 |
| 21 | `anciennete_moyenne_contrats` | Ancienneté moyenne du parc (depuis dateEffet) | _(aucun)_ | ⭐⭐ | 💡 |
| 22 | `contrats_modifies_recemment` | Contrats modifiés dans les N derniers jours | `jours` | ⭐⭐ | 💡 |
| 23 | `simuler_hausse_prime` | Recalcule la prime totale d'un client après +X % | `clientId, pourcentage` | ⭐⭐⭐ | 💡 |

## ⚠️ Domaine SINISTRE

| # | Tool | Intention | Paramètres | Niveau | |
|---|------|-----------|------------|--------|---|
| 24 | `suivre_sinistre` | État + documents reçus/manquants + prochaine action | `sinistreId` | ⭐⭐ | ✅ |
| 25 | `lister_sinistres_en_cours` | Tous les sinistres en cours d'instruction | _(aucun)_ | ⭐ | ✅ |
| 26 | `documents_manquants_tous_sinistres` | Documents manquants par dossier, tous sinistres | _(aucun)_ | ⭐⭐ | ✅ |
| 27 | `sinistres_sans_expert` | Sinistres en cours sans expert affecté | _(aucun)_ | ⭐ | 💡 |
| 28 | `montant_total_sinistres_en_cours` | Somme des montants réclamés non encore validés | _(aucun)_ | ⭐⭐ | 💡 |
| 29 | `delai_traitement_sinistre` | Nb de jours écoulés depuis la déclaration | `sinistreId` | ⭐ | 💡 |
| 30 | `sinistres_du_client` | Tous les sinistres liés à un client, avec statut | `clientId` | ⭐ | 💡 |

## 🔀 Domaine TRANSVERSE (bonus, pour les plus avancés)

| # | Tool | Intention | Paramètres | Niveau | |
|---|------|-----------|------------|--------|---|
| 31 | `statistiques_globales` | Tableau de bord : clients/contrats/sinistres + répartitions | _(aucun)_ | ⭐⭐ | ✅ |
| 32 | `briefing_journee_conseiller` | Agrège, pour un conseiller, ses RDV/relances/sinistres du jour | `conseillerId` | ⭐⭐⭐ | 💡 |
| 33 | `detecter_incoherences_donnees` | Contrôle qualité : contratsLies du client ⟷ souscripteur des contrats | _(aucun)_ | ⭐⭐⭐ | 💡 |
| 34 | `opportunites_multi_equipement` | Clients premium avec un seul contrat (cible cross-sell) | _(aucun)_ | ⭐⭐⭐ | 💡 |

---

## Conseils d'attribution en salle

- **Débutants** → 4, 5, 10, 11, 14, 15, 20, 25, 29, 30 (⭐).
- **Intermédiaires** → 1, 3, 12, 13, 16, 17, 18, 24, 26, 31 (⭐⭐).
- **À l'aise / rapides** → 2, 6, 7, 23, 32, 33, 34 (⭐⭐⭐) ou les 💡 sans corrigé.
- Tous les `✅` ont une solution dans la branche `corrige` → vous pouvez débloquer n'importe qui.
- À la fin : chaque participant **colle son tool** dans un `src/index.ts` commun → `npm run build` →
  `npm run inspect` → vous obtenez un **MCP collectif** avec 20-30 tools. Effet « waouh » garanti.
