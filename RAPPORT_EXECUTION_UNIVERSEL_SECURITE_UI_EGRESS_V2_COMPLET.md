# 📘 RAPPORT D'EXECUTION UNIVERSEL - VERSION COMPLETE (V2)

## 🧭 1) OBJET DU RAPPORT D'EXECUTION

### 🎯 But
- ✅ Ameliorer l'application sans casser les donnees.
- ✅ Ameliorer l'UI/UX sans casser l'existant.
- ✅ Preserver l'authentification et les regles Supabase.
- ✅ Assurer une execution stable, reversible, traçable.

### 📌 Portee
- ✅ UI / UX
- ✅ Performance front
- ✅ Reduction des couts Supabase (egress + stockage)
- ✅ Stabilite fonctionnelle globale
- ✅ Methode de travail reutilisable multi-projets

### ⛔ Contraintes non negociables
- ❌ Aucun changement des flux entrants/sortants Supabase.
- ❌ Aucune modification des tables Supabase.`r`n- ❌ Aucune modification des formats JSON stockes dans Supabase.
- ❌ Aucune modification RLS / GRANT.
- ❌ Aucune casse de la liaison PC / mobile / Supabase.
- ❌ Aucune regression visuelle ou fonctionnelle.
- ✅ Modifications reversibles lot par lot.

---

## 🔒 2) POLITIQUE DE SECURITE AVANT EXECUTION (OBLIGATOIRE)

### 🟦 2.1 Sauvegarde GitHub (universelle)
- ✅ Sauvegarde complete du depot local avant lot.
- ✅ Commande de reference :
  - `git bundle create backup-YYYYMMDD_HHMMSS.bundle --all`
- ✅ Verifier l'existence du backup dans un dossier dedie hors repo.
- ✅ Dossier backup ignore via `.gitignore`.

### 🟩 2.2 Sauvegarde Supabase (universelle)
- ✅ Preparer acces Supabase (login + link deja faits).
- ✅ Export complet en SQL via CLI vers dossier hors code.
- ✅ Fichiers cibles recommandes :
  - `backup_full_schema.sql`
  - `backup_full_data.sql`
  - `backup_full.sql`
- ✅ Verifier presence des fichiers et taille > 0.
- ⚠️ Si Docker Desktop indisponible : utiliser export depuis interface Supabase ou methode CLI compatible environnement.

### 🟨 2.3 Verification pre-plan
- ✅ Backups lisibles et disponibles.
- ✅ Backups separes du code versionne.
- ✅ Aucun flux production stoppe.
- ✅ Plan interruptible / reprenable sans perte.

---

## 🧱 3) INTERDICTIONS FORMELLES (BLOCAGE)

### 🚫 Interdictions techniques
- ❌ Modifier les tables Supabase.`r`n- ❌ Modifier les formats JSON stockes dans Supabase.
- ❌ Modifier les GRANT.`r`n- ❌ Modifier les politiques RLS.
- ❌ Changer les endpoints/API existants sans demande explicite.
- ❌ Modifier l'authentification.
- ❌ Changer la structure metier globale sans validation.

### 🚫 Interdictions produit
- ❌ Casser UI existante.
- ❌ Casser comportement des modales/filtres/navigation.
- ❌ Casser compatibilite mobile si lien encore actif.

### 🚫 Interdictions methode
- ❌ Refonte globale non demandee.
- ❌ Multiples changements non lies dans un meme lot.
- ❌ Action destructive sans accord explicite.
- ❌ Suppression massive de CSS sans preuve d'inutilisation réelle.
- ❌ Pas d'ajout de librairie/package sans bénéfice clair.
- ✅ Préférer les capacités natives déjà présentes dans le projet.

### 🛑 Règle d'incertitude
- ✅ En cas de doute sur un impact métier, arrêter l'exécution et demander confirmation.
- ❌ Ne jamais deviner une logique métier ou une dépendance critique.
  - Exemples sensibles : `state_json`, synchronisation mobile, realtime, calculs KPI, Gantt.

---

## 🚀 4) PLAN GLOBAL EXHAUSTIF (UI + UX + DONNEES + EGRESS + STOCKAGE)

### 🔹 4.1 Axe A - Stabilite et non-regression

#### 🎯 Objectif
- ✅ Toutes les fonctions existantes restent utilisables.

#### 🛠️ Actions
- ✅ Modifier par petites etapes locales.
- ✅ 1 lot = 1 intention metier claire.
- ✅ Validation visuelle apres push de chaque lot.

#### ⚠️ Risques suivis
- ⚠️ Navigation / focus modifies involontairement.
- ⚠️ Filtres incoherents.
- ⚠️ Modales qui s'ouvrent mais ne sauvegardent plus.

---

### 🔹 4.2 Axe B - Reduction egress Supabase

#### 🎯 Objectif
- ✅ Reduire appels reseau inutiles sans casser la synchro.

### 👀 Mode observation obligatoire
- ✅ Avant toute optimisation importante, observer le comportement réel :
  - fréquence d'utilisation,
  - volume de données,
  - nombre d'appels réseau,
  - temps de rendu,
  - impact utilisateur réel.
- ❌ Ne pas optimiser une zone peu utilisée sans preuve d'impact.

#### 🛠️ Actions prudentes
- ✅ Allonger cache TTL en lecture sur donnees stables.
- ✅ Eviter relances en boucle apres 401/403/erreur reseau.
- ✅ Ecriture uniquement si donnees reelles ont change.
- ✅ Grouper synchronisations utiles.
- ✅ Ralentir/retirer refresh auto trop frequents.
- ✅ Eviter relecture uniquement pour rafraichir visuel.
- ✅ Réduire les re-renders inutiles et recalculs front coûteux.
- ✅ Préférer les optimisations simples, lisibles et maintenables.
- ❌ Pas d'optimisation complexe sans bénéfice mesurable.

#### 📈 Budget performance
- ✅ Toute optimisation doit maintenir ou améliorer :
  - temps de chargement,
  - fluidité UI,
  - poids JS chargé,
  - nombre de requêtes réseau.
- ❌ Refuser une optimisation egress qui dégrade fortement l'UX ou les performances front.

#### 📏 Controle
- ✅ Suivre logs egress mensuels Supabase.
- ✅ Prioriser suppression des boucles SELECT/POST.

#### 🧪 4.2.1 Mesure egress en conditions réelles (10 min)
- ✅ Objectif : vérifier si les appels réseau continuent d'augmenter vite ou se stabilisent.
- ✅ Principe : suivre uniquement l'évolution sur fenêtre glissante de 10 minutes (pas la valeur brute seule).
- ✅ Cible :
  - si le trafic reste stable sur plusieurs rafraîchissements, traitement correct;
  - si la taille monte vite sans action métier, il reste un problème d'egress.
- ✅ Mesures suivies :
  - taille des réponses par route,
  - nombre de requêtes par route,
  - durée moyenne des appels,
  - part des réponses mises en cache (304/local).
- ✅ Risques :
  - confusion si le debug est lu sans fenêtre temporelle;
  - biais si plusieurs appareils chargent la même vue en même temps.

#### ✅ Implémentation livrée sans toucher aux flux métiers
- ✅ Ajout de trace réseau front (console) pour vérifier la dérive egress en temps réel.
- ✅ Export du rapport via :
  - `window.dotationsGetNetworkDebug()`
  - `window.dotationsResetNetworkDebug()`
- ✅ Les traces restent locales au navigateur (pas d'exposition de nouveaux endpoints).

---

### 🔹 4.3 Axe C - Politique 0.5 GB stockage Supabase

#### 🎯 Objectif
- ✅ Ne pas depasser durablement 500 Mo.

#### 🛠️ Actions
- ✅ Seuil d'alerte preventif a 450 Mo.
- ✅ Alerte UI non bloquante (simple et discrete).
- ✅ Rotation / archivage logs non critiques.
- ✅ Nettoyage programme des donnees inactives.
- ✅ Compactage des champs lourds si possible.
- ✅ Eviter stockage redondant via sync inutile.

#### 🧷 Regle forte
- ❌ Pas de verrou metier dur qui bloque l'usage normal.
- ✅ Reduire consommation sans bloquer la production.

---

### 🔹 4.4 Axe D - Amelioration UI / UX

#### 🎯 Objectif
- ✅ Navigation claire, effort reduit, confort augmente.

#### 🛠️ Priorites
- ✅ Topbar propre (retirer bruit technique).
- ✅ Cohesion typo / contraste / boutons actifs.
- ✅ Gantt lisible (lignes propres, focus visuel juste).
- ✅ Sidebar/logo harmonises.
- ✅ Modales/popup plus predictibles.

#### ♻️ Methode
- ✅ Lots visuels independants et reversibles.

---

### 🔹 4.5 Axe E - Flux saisie heures (heures reelles)

#### 🎯 Objectif
- ✅ Parcours clavier fluide, non bloquant.

#### 📋 Regles a conserver
- ✅ Ouverture sur 1ere case a completer.
- ✅ Tab/Entree suit ordre metier attendu.
- ✅ Validation possible meme si incomplet.
- ✅ Bouton Valider selon decision fonctionnelle validee.

#### 🔎 Verification
- ✅ Parcours jour par jour dans meme tache avant tache suivante.
- ✅ Pas de saut intempestif.

### 🔹 4.6 Axe F - Audit visuel, mini bugs UI et améliorations UX

#### 🎯 Objectif
- ✅ Identifier et corriger les petits défauts visuels ou ergonomiques non évidents, sans refonte globale.

#### ⚙️ Périmètre autorisé
- ✅ Alignements incohérents.
- ✅ Espacements irréguliers.
- ✅ Contrastes faibles.
- ✅ Boutons trop proches ou mal hiérarchisés.
- ✅ Libellés tronqués.
- ✅ Débordements responsive.
- ✅ Modales mal centrées.
- ✅ États hover/focus absents ou incohérents.
- ✅ Badges, KPI, tableaux, cartes ou Gantt visuellement déséquilibrés.
- ✅ Micro-optimisations CSS simples.
- ✅ Nettoyage de styles redondants uniquement si sans risque.

#### 🚫 Interdictions
- ❌ Pas de refonte graphique complète.
- ❌ Pas de changement de structure métier.
- ❌ Pas de changement des données.
- ❌ Pas de changement Supabase.
- ❌ Pas de modification massive du CSS.
- ❌ Pas de modification des composants fonctionnels sans raison claire.
- ✅ Préserver l'identité visuelle et les habitudes utilisateur existantes, sauf demande explicite.

#### 🗂️ Méthode
- ✅ Faire un audit visuel global sans modifier.
- ✅ Classer chaque point en :
  - bug visuel,
  - amélioration UX,
  - optimisation CSS/performance.
- ✅ Proposer des micro-lots.
- ✅ Attendre GO avant correction.
- ✅ Corriger un lot à la fois.
- ✅ Tester visuellement après chaque lot.

#### 👤 Validation utilisateur réelle
- ✅ Toute amélioration UX doit rester cohérente avec les usages réels métier.
- ❌ Ne pas optimiser uniquement selon critères techniques ou théoriques.

#### 📤 Sortie attendue (par point)
- ✅ Zone concernée.
- ✅ Problème constaté.
- ✅ Impact utilisateur.
- ✅ Risque de correction.
- ✅ Micro-lot proposé.

---

## 🧪 5) AJOUTS DE ROBUSTESSE (VERSION ETENDUE)

### 🔁 5.1 Plan de rollback clair
- ✅ Noter commit de depart avant chaque lot.
- ✅ Garder un retour arriere facile.
- ✅ En cas de souci : retour immediat au dernier etat stable.

### 📊 5.2 Matrice de risques minimale
- 🟢 Risque faible : CSS/UI pure.
- 🟠 Risque moyen : logique front locale.
- 🔴 Risque haut : donnees/synchro/etat global.
- ⛔ Lots risque haut sans GO explicite : interdits.

### 📌 Priorisation obligatoire
- P1 = egress / stabilité / bugs critiques
- P2 = UX gênante
- P3 = optimisation légère
- P4 = cosmétique mineure

### ✅ 5.3 Verification anti-regression (5 points)
- ✅ Auth / ouverture.
- ✅ Sauvegarde + chargement donnees.
- ✅ Saisie heures (ouverture, tab/entree, validation).
- ✅ Gantt / filtres.
- ✅ Topbar / actions principales.

### 🚨 5.4 Seuils securite operationnels
- ✅ Alerte non bloquante si proche limite stockage.
- ✅ Zones 80/90% : alerte + preparation nettoyage.
- ❌ Aucune action automatique destructive.

### 🗂️ 5.5 Journal d'execution standard
Pour chaque lot:
- ✅ objectif
- ✅ fichiers modifies
- ✅ impact utilisateur
- ✅ statut fait/non fait
- ✅ risque percu
- ✅ test visuel fait/non fait
- ✅ lot reversible (oui/non)

### 🧭 5.6 Regle "pas de surprise"
- ✅ Pas de double changement dans meme lot.
- ✅ Explication simple avant action.
- ✅ GO obligatoire avant action.

---

## 🛠️ 6) PIPELINE DE TRAVAIL IMPOSE (OPERATOIRE)

1. ✅ Reformulation simple de la prochaine action.
2. 🛑 Attente du `GO`.
3. ✅ Modification ciblee.
4. ⏱️ Attente 30 secondes.
5. ✅ Commit + push.
6. ✅ Retour statut `fait / non fait`.
7. ✅ Prochaine action proposee.
8. ✅ Vérification visuelle desktop + mobile obligatoire pour chaque lot UI.

### ✍️ Format commit francais (obligatoire)
- `feat: optimiser les lectures Supabase et reduire les appels`
- `fix: ameliorer la navigation clavier dans la saisie heures`
- `style: harmoniser la topbar et retirer les infos techniques`
- `chore: sauvegarde pre-operation et securite des exports`

---

## 📋 7) SUIVI VISUEL Fait / Non Fait

- 🟢 `Fait`
- 🔴 `Non fait`
- 🟠 `En attente GO`
- 🔵 `A verifier`
- ⚠️ `Point de vigilance`

---

## 🧭 8) PRINCIPES COMPLEMENTAIRES A CONSERVER

- ✅ Changements courts, cibles, reversibles.
- ✅ Compatibilite ascendante prioritaire.
- ✅ Pas de refonte globale si lot cible suffit.
- ✅ Pas de "brouillon" technique : resultat simple et exploitable.
- ✅ En cas de doute data/securite : arret + confirmation avant action.

---

## 🌍 9) ADAPTABILITE MULTI-PROJETS

### ✅ Ce protocole est reutilisable tel quel
- meme logique de backup,
- meme garde-fous,
- meme pipeline GO,
- meme discipline anti-regression,
- meme blocage RLS/GRANT/tables,
- meme priorite egress + stockage + stabilite.

### 🧩 Conditions d'adaptation rapide
- Adapter seulement:
  - chemins de sauvegarde,
  - nom du projet,
  - seuils d'alerte si quotas differents.
- Conserver le noyau methode inchange.

---

## 📌 10) ETAT DE CONFORMITE DU PROTOCOLE

- ✅ Politique securite definie.
- ✅ Interdictions formalisees.
- ✅ Pipeline GO + 30s documente.
- ✅ Reversibilite lot par lot explicite.
- ✅ Strategie egress + stockage 0.5 GB integree.
- ✅ Strategie UI/UX + saisie heures integree.
- ⚠️ Execution pratique conditionnee par GO lot par lot.
- ✅ Applicabilite universelle confirmee.

## 🧪 LOT 0 - MESURE EGRESS SANS RISQUE (EXÉCUTÉ)

- 🎯 Objectif
  - mesurer egress et charges réseau sans changer le comportement métier.
- ✅ Statut
  - FAIT.
- ✅ Contraintes respectees
  - pas de changement `reloadAfter`,
  - pas de changement polling mobile,
  - pas de changement de sauvegardes,
  - pas de changement Supabase,
  - pas de changement UI,
  - pas de nouveau endpoint,
  - pas de changement fonctionnel.
- ✅ Fichiers modifies
  - `app.js` (ajout d’indicateurs locaux debug).
- ✅ Ajouts fait dans le navigateur
  - `window.getNetworkDebug()` -> lit et affiche les compteurs réseau locaux,
  - `window.resetNetworkDebug()` -> remet à zero les compteurs.
- ✅ Compatibilite historique (alias deja present)
  - `window.dotationsGetNetworkDebug()`,
  - `window.dotationsResetNetworkDebug()`.
- ✅ Validation metier
  - aucune modif de flux de donnees Supabase,
  - aucune modif de l'UI visible attendue.
- ✅ Verification technique
  - `node --check app.js` OK.
- ✅ Methode 10 min (avant toute optimisation)
  - 1) ouvrir l’UI (desktop + mobile si possible),
  - 2) lancer `window.resetNetworkDebug()`,
  - 3) utiliser les cas normaux pendant 10 min,
  - 4) lancer `window.getNetworkDebug()`,
  - 5) comparer l’evolution sur la periode (ex: 13.1 stable vs 13.2 en 10 min = alerte).
- ✅ Suivi des KPIs
  - nb requetes,
  - volume total octets (egress),
  - repartition par route/fonction,
  - temps moyen de rendu associes.
- 🧭 Prochaine etape recommandee
  - passer en audit de causes :
    - boucle realtime non unsubscribee,
    - reload complet de `state_json`,
    - polling trop frequent,
    - payload JSON géant.

## 🧪 LOT 1 - AUDIT EGRESS (NON-EXÉCUTION)

- 🎯 Objectif
  - identifier précisément les appels répétés et les points susceptibles d’augmenter l’egress.
- ✅ Statut
  - FAIT (audit uniquement).
- ✅ Fichiers audités
  - `app.js`

### 1) Causes probables (probabilité + risque)

- 🟥 Risque haut – Rechargements complets trop fréquents pour signature mobile
  - Fonctions : `pollMobileSignatureRequest` → `fetchSupabaseStateData` / `fetchLatestDataSnapshot`.
  - Lignes : `app.js:4710-4756`, `app.js:4825-4899`, `app.js:4939-4944`, `app.js:4953-4967`.
  - Explication : `pollMobileSignatureRequest` télécharge le snapshot complet de l’état applicatif même si un seul document change, dès qu’un document mobile est en attente.

- 🟠 Risque moyen – Rechargement complet de l’état au démarrage/chaque action métier
  - Fonctions : `reloadData` → `fetchLatestDataSnapshot`, `loadData`.
  - Lignes : `app.js:4125-4156`, `app.js:3990-4038`, `app.js:2940-3076`.
  - Explication : la logique de chargement reste fonctionnelle mais potentiellement coûteuse si déclenchée trop souvent (chargement complet + migration + rendu global).

- 🟠 Risque moyen – Mouvements `renderPage` en chaîne après interactions fréquentes
  - Fonctions : `schedulePageRender`, événements de saisie/filtres, navigation fiche / documents.
  - Lignes : `app.js:6254-6261`, `app.js:6188-6205`, `app.js:6138-6160`, `app.js:16075-16100`.
  - Explication : les handlers appellent souvent des rendus complets de page ; le throttle via RAF limite déjà la fréquence, mais les recalculs internes peuvent rester coûteux.

- 🟢 Risque faible – Polling mobile avec backoff déjà présent, pas de websocket non maîtrisée
  - Pas de `supabase.channel()` ni de `subscription` détecté.
  - Les recherches ont été faites sur `app.js`.

- 🟢 Risque faible – Appels admin/role ponctuels
  - Fonctions : endpoints admin et `refreshCurrentUserRoleLabel`.
  - Lignes : `app.js:1670-1699`, `app.js:1899-1915`, `app.js:2150-2200`.
  - Explication : appels rares liés à usages spécifiques, faible pression continue.

### 2) Risques transverses identifiés

- ⚠️ Taille possible du payload global
  - `fetchSupabaseStateData` lit `app_state.payload` intégral dans Supabase (`app_states`).
  - Lignes : `app.js:2570-2600`.

- ⚠️ Redondance potentielle en polling signature
  - En mode `arrival-document` / `exit-document`, le statut de signature peut déclencher des vérifications supplémentaires.
  - Lignes : `app.js:4679-4720`, `app.js:4845-4918`.

- ✅ Mécanisme anti-requêtes déjà utile
  - ETag + cache session sur `/api/data`.
  - Lignes : `app.js:2952-3015`.

### 3) Priorisation recommandée

- P1 : réduire la charge du polling mobile sans casser le flux de validation (impact direct sur egress).
- P2 : stabiliser les changements d’onglets Entrée / Sortie via rendu conditionné et cache vue.
- P2 : réduire les re-rendus inutiles en navigation interne quand l’état utile n’a pas changé.
- P3 : micro-optimisations ciblées du rendu liste/table si validées par mesure.

### 4) Lot prioritaire recommandé (prochain lot)

- Lot 1.1 (P1) : audit terrain sur 10 min avec `window.resetNetworkDebug()` / `window.getNetworkDebug()`, puis réduction du polling mobile (ajustement interval + évitement de vérifications redondantes).

### 5) Preuve “logique métier préservée” (audit lot)

- Aucun changement dans les règles métier (`app_states`, signatures, navigation).
- Aucune suppression/addition de flux Supabase.
- Aucune modification UI/UX effectuée.

## 🧪 LOT 1.2 - OPTIMISATION RENDER (P2, GO VALIDÉ)

- 🎯 Objectif
  - réduire les rerenders inutiles sur Entrée / Sortie sans modifier la logique métier.
- ✅ Statut
  - FAIT.
- ✅ Fichiers modifiés
  - `app.js`
- ✅ Actions réalisées
  - ajout d’un cache d’état du sélecteur de personne (`state.personPickerRenderCache`) ;
  - si la page, la personne et le `state_supabaseRevision` n’ont pas changé, on saute le recalcul/listage complet du picker.
- ✅ Effet attendu
  - bascule d’onglets Entrée/Sortie plus fluide quand rien n’a changé côté données utiles ;
  - moins de re-render DOM sur des données identiques.
 - ⚠️ Risque
  - faible, contrôlé : risque d’affichage obsolète uniquement si la source de données externe change sans mettre à jour la revision/compte.
 - ✅ Contrôle
  - validation visuelle : changement de personne, changement d’onglet, signature mobile entrante.

## 🧪 LOT 1.3 - RÉDUCTION DU COÛT DE RENDU (P2, GO À EXÉCUTER)

- 🎯 Objectif
  - réduire le recalcul de la liste filtrée lorsque la page active n’a pas besoin de cette donnée.
  - garder la même logique métier et la même UI, uniquement le chemin de calcul.
- ✅ Statut
  - À EXÉCUTER (lancement suite au GO).
- ✅ Fichiers modifiés
  - `app.js`
- ✅ Actions prévues
  - ajout d’un cache local `state.filteredPersonsCache` (clé + résultat),
  - calcul de `getFilteredPersons()` uniquement pour les pages qui en ont besoin (`overview`, `global`),
  - réutilisation du cache tant que `filters`, `urgentMode`, `supabaseRevision` ne changent pas.
- ✅ Effet attendu
  - passage moins coûteux entre pages quand aucun changement métier n’a eu lieu,
  - moins de recalcul JS en arrière-plan sur les rendus redondants,
  - amélioration de la fluidité perçue au clic d’onglets.
- ⚠️ Risque
  - très faible,
  - le filtre affiché reste identique car le cache dépend explicitement de la revision + de tous les critères métier de filtre.
 - ✅ Contrôle
  - vérifier en pratique : changement filtre, changement d’onglet, changement de personne, changement de statut urgent.

## 🧪 LOT 1.4 - OPTIMISATION DU LABEL DE SAUVEGARDE (P2, EXÉCUTÉ)

- 🎯 Objectif
  - éviter de relancer le rendu du bandeau/labels de sauvegarde quand son état n’a pas bougé.
- ✅ Statut
  - FAIT.
- ✅ Fichiers modifiés
  - `app.js`
- ✅ Actions réalisées
  - ajout d’une signature de cache `state.dirtyStateRenderSignature`,
  - `renderDirtyState()` compare l’état courant (`isDirty`, `saveButtonLatchedDirty`, nombre et classes des boutons `.js-save-data`) avant de refaire le DOM.
- ✅ Effet attendu
  - rendu plus léger sur navigation/rafraîchissements fréquents,
  - baisse des recalculs visuels du bloc “modifications” sans impact métier.
- ⚠️ Risque
  - faible, limité au gain de rendu; garde-fou métier inchangé.
 - ✅ Contrôle
  - valider visuellement : passage d’état sale/net, clic “enregistrer”, changement page.

## 🧪 LOT 1.5 - LIEN D’EVITEMENT SUR LES RE-BINDS TABLEAU (P2, EXÉCUTÉ)

- 🎯 Objectif
  - supprimer les réattributions répétitives de clics “SUPPRIMER” sur les lignes overview / global quand la vue est déjà rendue.
- ✅ Statut
  - FAIT.
- ✅ Fichiers modifiés
  - `app.js`
- ✅ Actions réalisées
  - `bindPersonRowActions()` reçoit maintenant aussi la gestion du bouton `js-delete-person` en délégation;
  - on conserve la protection de bind par `data-bound` sur chaque `tbody`;
  - on supprime les rebonds d’appels `bindDeletePersonButtons()` en chargement/refresh de liste.
- ✅ Effet attendu
  - moins de recalcul JS à chaque rafraîchissement de tableau;
  - rendu plus fluide sur navigation rapide (Overview / Global).
- ⚠️ Risque
  - faible, la logique métier de suppression reste inchangée (fonction `deletePerson` inchangée).
 - ✅ Contrôle
  - vérifier que “SUPPRIMER” déclenche bien la suppression en mode Overview et Global.

## 🧪 LOT 1.6 - ACTIONS ALERTES OVERVIEW EN DÉLÉGATION (P2, EXÉCUTÉ)

- 🎯 Objectif
  - supprimer les rebinds répétitifs sur les alertes d’overview quand la liste se reconstruit.
- ✅ Statut
  - FAIT.
- ✅ Fichiers modifiés
  - `app.js`
- ✅ Actions réalisées
  - ajout de `bindOverviewAlertActions()` avec un listener unique sur `#overview-alerts-list`;
  - suppression du rebind des `.js-open-person-alert` dans `renderOverview`;
  - appel du binding au démarrage.
- ✅ Effet attendu
  - moins de travaux d’attachement d’événements lors des rafraîchissements;
  - comportement clic identique: ouvrir la fiche personne ciblée.
 - ⚠️ Risque
  - faible, logique métier inchangée (`openPersonSheet(personId)`).
 - ✅ Contrôle
  - vérifier visuellement qu’un clic alerte ouvre bien la fiche associée.

## 🧪 LOT 1.7 - SUPPRESSION DE BINDS RÉDONDANTS (P3, EXÉCUTÉ)

- 🎯 Objectif
  - supprimer du code de binding jamais appelé pour éviter du travail inutile au chargement.
- ✅ Statut
  - FAIT.
- ✅ Fichiers modifiés
  - `app.js`
- ✅ Actions réalisées
  - suppression de `bindDeletePersonButtons()` devenu redondant (suppression déclenchée déjà via délégation dans `bindPersonRowActions`);
  - suppression de `bindOpenPersonLinks()` devenu inutilisé.
- ✅ Effet attendu
  - moins de code exécuté au chargement et zéro comportement utilisateur modifié.
- ⚠️ Risque
  - très faible, fonctions orphelines retirées uniquement.
- ✅ Contrôle
  - vérifier visuellement suppression via bouton et navigation fiche toujours opérationnelles depuis la vue.

## 🧪 LOT 1.8 - CONTEXTE FICHE PERSONNE SUR LIEN DE LIGNE (P3, EXÉCUTÉ)

- 🎯 Objectif
  - conserver le comportement de transition vers fiche personne sur les liens “VOIR” sans binding dédié.
- ✅ Statut
  - FAIT.
- ✅ Fichiers modifiés
  - `app.js`
- ✅ Actions réalisées
  - dans `bindPersonRowActions()`, ajout de la prise en charge des liens `.js-open-person-link` en délégation;
  - appel de `setCurrentPersonId(personId, "replace")` lors du clic “VOIR”.
- ✅ Effet attendu
  - navigation cohérente vers la personne visée avec moins de fonctions de binding autonomes.
- ⚠️ Risque
  - faible, logique métier inchangée (navigation + identifiant courant uniquement).
 - ✅ Contrôle
  - vérifier que le clic “VOIR” reste correct en overview/global.

## 🧪 LOT 1.9 - TRI DES TABLEAUX PAR TÊTE BINDING PROPRE (P2, EXÉCUTÉ)

- 🎯 Objectif
  - éviter les doubles liaisons d’événements sur les en-têtes de tri.
- ✅ Statut
  - FAIT.
- ✅ Fichiers modifiés
  - `app.js`
- ✅ Actions réalisées
  - simplification de `bindEffectTableSorting()` en binding direct par en-tête via `data-sort-bound`;
  - suppression du cache local de binding global qui pouvait empêcher un nouveau binding propre après reconstruction du tableau;
  - maintien du comportement métier (`setEffectTableSort` + `schedulePageRender`) identique.
- ✅ Effet attendu
  - moins de traitements au rechargement de la page;
  - moins de risques de doublons d’écouteurs quand les tableaux sont recréés.
- ⚠️ Risque
  - faible, uniquement lié à la mécanique d’attachement d’événements; la logique métier n’est pas modifiée.
- ✅ Contrôle
  - vérifier que cliquer sur les entêtes “Type / Désignation / ...” trie toujours immédiatement les tableaux.

## 🧪 LOT 1.10 - ÉVITER LES RAFRAÎCHISSEMENTS DE TRI À L'ARRIVÉE/SORTIE (P2, EXÉCUTÉ)

- 🎯 Objectif
  - enlever les recalculs de tri inutiles quand la vue Entrée/SORTIE n’a pas changé.
- ✅ Statut
  - FAIT.
- ✅ Fichiers modifiés
  - `app.js`
- ✅ Actions réalisées
  - suppression des appels redondants `updateSortableHeaders("arrivalEffects")` et `updateSortableHeaders("exitEffects")` dans `renderPage()`;
  - la mise à jour d’entêtes se fait désormais dans les rendus documentaires concernés quand l’affichage change réellement.
- ✅ Effet attendu
  - moins d’opérations DOM lors des changements rapides entre vues Arrivée et Sortie;
  - fluidité améliorée sans changement de données.
- ⚠️ Risque
  - faible; le tri visuel reste piloté par les fonctions `renderArrivalDocument()` et `renderExitDocument()`.
- ✅ Contrôle
  - vérifier que le tri Arrivée/Sortie fonctionne encore après clic sur entête.

## 🧪 LOT 1.11 - ÉVITER LES RAFRAÎCHISSEMENTS DE TRI REDONDANTS EN CHANGEMENT DE PERSONNE (P2, EXÉCUTÉ)

- 🎯 Objectif
  - supprimer les appels de tri répétés lors du clic sur une personne dans les pages Document Entrée / Document Sortie.
- ✅ Statut
  - FAIT.
- ✅ Fichiers modifiés
  - `app.js`
- ✅ Actions réalisées
  - suppression des appels `updateSortableHeaders("arrivalEffects")` et `updateSortableHeaders("exitEffects")` dans `applyDocumentNavigation()`;
  - le tri visuel reste piloté par `renderArrivalDocument()` et `renderExitDocument()` déjà appelées juste après la sélection.
- ✅ Effet attendu
  - léger gain de réactivité lors de la navigation entre fiches dans les onglets document;
  - disparition de recalculs visuels en doublon sans effet métier.
- ⚠️ Risque
  - faible; comportement identique car la source réelle de mise à jour est gardée.
- ✅ Contrôle
  - vérifier qu’un clic sur une personne réaffiche bien les effets, puis tri et flèches restent cohérents.

## 🧪 LOT 1.12 - ÉVITER LE RAFRAÎCHISSEMENT DES CANEVAS LORS D'UNE RE-SELECTION IDENTIQUE (P2, EXÉCUTÉ)

- 🎯 Objectif
  - éviter les redessins de canvas de signature et certains recalculs quand la même personne est re-sélectionnée.
- ✅ Statut
  - FAIT.
- ✅ Fichiers modifiés
  - `app.js`
- ✅ Actions réalisées
  - `renderArrivalDocument()` et `renderExitDocument()` renvoient maintenant un booléen :
    - `true` si un vrai rendu a été exécuté,
    - `false` si le cache indique qu’aucun changement utile n’existe.
  - `applyDocumentNavigation()` n’appelle `refreshDocumentSignatureCanvases()` que quand le rendu indique un changement.
- ✅ Effet attendu
  - moins de travail inutile au ré-choix de la même personne dans une vue document;
  - meilleure fluidité perçue, mêmes données affichées.
- ⚠️ Risque
  - faible, logique métier inchangée.
- ✅ Contrôle
  - re-sélectionner la même personne plusieurs fois dans Entrée ou Sortie ne doit pas changer visuellement la page (pas de blocage), mais doit quand même afficher correctement les signatures/canaux déjà visibles.

## 🧪 LOT 1.13 - ÉVITER LES RAFRAÎCHISSEMENTS LORS DE RENDER SANS CHANGEMENT DE VUE (P2, EXÉCUTÉ)

- 🎯 Objectif
  - éviter les synchronisations mobile et rafraîchissements canvas quand la vue Arrivée / Sortie n’a pas changé.
- ✅ Statut
  - FAIT.
- ✅ Fichiers modifiés
  - `app.js`
- ✅ Actions réalisées
  - dans `renderPage()`, on ne met à jour le rendu signature/état mobile que si la signature de vue (`documentViewRenderCache`) change;
  - si la signature ne change pas, plus de `refreshDocumentSignatureCanvases()` ni de `scheduleMobileSignatureRenderSync()` inutiles.
- ✅ Effet attendu
  - moins de travaux CPU/UI au passage/rechargement de page sans mutation de données;
  - meilleure fluidité et moins de surcharge perçue.
- ⚠️ Risque
  - faible; logique métier inchangée, conditionnelle appliquée uniquement à des appels déjà redondants.
- ✅ Contrôle
  - revenir sur une même personne/page sans modification de données ne déclenche plus de rafraîchissement signature duplicate.

## 🧪 LOT 1.14 - ÉVITER LE SYNC MOBILE SIGNATURE REDONDANT AU CHOIX DE PERSONNE (P2, EXÉCUTÉ)

- 🎯 Objectif
  - ne pas relancer la synchronisation mobile quand la sélection de la même personne ne change pas le rendu.
- ✅ Statut
  - FAIT.
- ✅ Fichiers modifiés
  - `app.js`
- ✅ Actions réalisées
  - dans `applyDocumentNavigation()` (picker document) :
    - on ne lance `scheduleMobileSignatureRenderSync()` que si le rendu document retourne un vrai changement.
  - on garde le rafraîchissement canvas aligné sur ce même conditionnel.
- ✅ Effet attendu
  - encore moins d'appels de synchronisation mobile inutiles;
  - comportement inchangé en cas de sélection réelle différente.
- ⚠️ Risque
  - faible; aucune logique métier déplacée.
- ✅ Contrôle
  - re-sélection d’une même personne ne doit pas relancer un cycle mobile inutile, mais doit rester visuellement stable.

## 🧪 LOT 1.15 - CACHE DE LA PAGE ARCHIVES POUR RENDU CONDITIONNEL (P2, EXÉCUTÉ)

- 🎯 Objectif
  - ne plus refaire le rendu de la table archive si les filtres/personne/état de données n’ont pas changé.
- ✅ Statut
  - FAIT.
- ✅ Fichiers modifiés
  - `app.js`
- ✅ Actions réalisées
  - ajout d’un cache `state.listRenderCache.documentsArchives`;
  - `renderDocumentsArchivePage()` calcule une signature de vue et retourne `false` si aucun changement;
  - `renderPage()` n’exécute les bindings tri/entêtes que quand le rendu archive a changé.
- ✅ Effet attendu
  - moins d’appels de reconstruction du tableau “Documents archivés” en navigation/rafraîchissement sans mutation.
- ⚠️ Risque
  - faible; métier inchangé.
- ✅ Contrôle
  - naviguer plusieurs fois sur Documents archive sans modifier filtres/données doit éviter un rerendu complet.

## 🧪 LOT 1.16 - ÉVITER LE RAFRAÎCHISSEMENT EN-TÊTES SUR OVERVIEW SI INCHANGÉ (P2, EXÉCUTÉ)

- 🎯 Objectif
  - ne plus relancer `updateSortableHeaders("overviewPersons")` quand les données Overview n’ont pas changé.
- ✅ Statut
  - FAIT.
- ✅ Fichiers modifiés
  - `app.js`
- ✅ Actions réalisées
  - `renderPage()` :
    - appel `updateSortableHeaders("overviewPersons")` seulement si `renderOverview()` signale un vrai changement.
  - `renderOverview()` :
    - retourne un booléen `hasOverviewRowsChanged` ;
    - ne fait plus d’update d’en-têtes en flux permanent.
- ✅ Effet attendu
  - moins de DOM updates à chaque passage sur l’overview.
- ⚠️ Risque
  - faible; logique métier inchangée.
- ✅ Contrôle
  - vérifier que le tri/sortage Overview reste visible/correct après tri ou changement de filtre.

---

## 🧾 RESUME EXECUTIF
- 🔒 Avant action: backup GitHub + backup Supabase obligatoires.
- 🚫 Interdits absolus: tables, RLS, GRANT, auth, flux Supabase.
- 🚀 Priorites: reduction egress, maitrise stockage 0.5 GB, UI/UX stable.
- 🧱 Methode: micro-lots, GO obligatoire, attente 30s, commit/push trace.
- ♻️ Securite d'exploitation: reversibilite, anti-regression, journal par lot.
- 🌍 Usage: document directement reutilisable sur n'importe quel projet.

