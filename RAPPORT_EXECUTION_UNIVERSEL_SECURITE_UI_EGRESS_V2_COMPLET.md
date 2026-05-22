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

#### 🛠️ Actions prudentes
- ✅ Allonger cache TTL en lecture sur donnees stables.
- ✅ Eviter relances en boucle apres 401/403/erreur reseau.
- ✅ Ecriture uniquement si donnees reelles ont change.
- ✅ Grouper synchronisations utiles.
- ✅ Ralentir/retirer refresh auto trop frequents.
- ✅ Eviter relecture uniquement pour rafraichir visuel.

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

---

## 🧾 RESUME EXECUTIF
- 🔒 Avant action: backup GitHub + backup Supabase obligatoires.
- 🚫 Interdits absolus: tables, RLS, GRANT, auth, flux Supabase.
- 🚀 Priorites: reduction egress, maitrise stockage 0.5 GB, UI/UX stable.
- 🧱 Methode: micro-lots, GO obligatoire, attente 30s, commit/push trace.
- ♻️ Securite d'exploitation: reversibilite, anti-regression, journal par lot.
- 🌍 Usage: document directement reutilisable sur n'importe quel projet.

