# REGLES PROJET (DOTATIONS) - SOURCE UNIQUE

Date de mise a jour: 10/05/2026

## 1) Perimetre

- Travailler uniquement dans `Dotations`.
- Ne rien modifier hors `Dotations` sans demande explicite.
- Ne jamais copier de fichiers depuis un autre projet.

## 2) Politique snapshots (obligatoire)

- Interdiction de creer un snapshot dans le repo `Dotations`.
- Avant toute modification: faire un snapshot cible hors repo.
- Le nom du snapshot doit etre en francais, clair et date (exemple: `avant-correction-signature-2026-05-10_1430`).
- Dossier autorise pour snapshots:
  `C:\Users\sebastien.duc\CLOUD\02_ARCHIVAGE PERSONNEL\DASHBOARDS\DOTATIONS SNAPSHOTS`.

## 3) Pipeline de travail (obligatoire)

1. Lire la demande.
2. Preparer un snapshot cible hors repo.
3. Attendre le `GO` utilisateur avant de coder.
4. Faire des modifications petites et ciblees.
5. Verifier que signatures/PDF/archives ne sont pas casses.
6. Verifier la syntaxe JS (`node --check app.js`) si `app.js` est touche.
7. Donner le resultat simplement.
8. Proposer une phrase de commit.
9. Attendre `go commit` pour lancer le commit local.
10. Repondre apres commit: `COMMIT TERMINE - TU PEUX PUSH`.

## 4) Regles de securite fonctionnelle

- `OUVRIR EN PDF` bloque tant que les 2 signatures ne sont pas validees.
- Les archives ne doivent contenir que des documents signes.
- Toute correction doit inclure une verification anti-regression UI des zones proches.

## 5) Securite de codage (priorite maximale)

- Aucune modification ne doit detruire une fonction qui marche deja.
- Aucune modification ne doit perturber une fonction qui marche deja.
- Objectif obligatoire: zero effet de bord visible.
- Objectif obligatoire: zero regression fonctionnelle.
- Objectif obligatoire: zero erreur introduite.
- Faire des changements petits, controles et faciles a verifier.
- Toujours verifier explicitement les zones voisines impactees avant validation.
- En cas de doute: stopper, signaler le risque, attendre validation utilisateur.

## 6) Style de reponse assistant (obligatoire)

- Repondre en francais tres simple (niveau tres facile).
- Toujours faire des phrases tres simples (presque enfantines).
- Toujours expliquer clairement:
  - le probleme,
  - ce qui se passe,
  - ce que l'assistant va faire,
  - comment il va le faire,
  - le resultat attendu.
- Expliquer la solution avant execution quand c'est utile.
- Donner ensuite le resultat concret.
- Ne pas pousser automatiquement.

### Communication attendue (niveau enfant)

- Avant toute action, expliquer en termes simples:
  - le probleme,
  - le plan,
  - les etapes.
- Avant d'executer, annoncer :
  - ce que je vais faire,
  - pourquoi,
  - ce que tu dois attendre.
- Attendre le `GO` de l'utilisateur avant de coder.
- Apres action, expliquer clairement:
  - ce qui a été modifie,
  - pourquoi,
  - ce que tu dois verifier.
- Toujours donner un resultat attendu concret et lisible.

## 7) Regles de mails (authentification)

- Mot de passe oublié:
  - Message envoyé par Supabase avec lien de réinitialisation.
  - Le lien doit mener à `index.html?view=desktop` après clic (ou autre page définie).
- Identifiant oublié:
  - Pas de mail automatique Supabase.
  - Ouverture d'un mail préparé pour l'administrateur (`ADMIN_CONTACT_EMAIL`).
  - Sujet: `SUIVI DES DOTATIONS - Demande identifiant oublié`.
- Invitation utilisateur:
  - Le bouton `Envoyer invitation` appelle l'API `admin/users/invite`.
  - Le mail part vers l'utilisateur saisi.
  - Il doit contenir un clic direct pour rejoindre le tableau de bord.
  - Aucun appel à `requestSupabasePasswordReset` sur ce chemin.

## 8) Commits

- Format recommande: `type(scope): resume court`.
- La phrase de commit doit etre en francais.
- Types: `fix`, `feat`, `docs`, `chore`.

## 9) Double explication obligatoire (normal + enfant)

- A chaque explication technique, fournir 2 versions:
  - `Explication normale`
  - `Version enfant`
- Les 2 versions doivent etre donnees ligne par ligne, dans le meme ordre.
- La `Version enfant` doit utiliser des mots tres simples.
- Si un mot difficile apparait, le definir en phrase courte juste apres.
- Cette regle s'applique:
  - avant action (plan),
  - pendant action (point d'etape),
  - apres action (resultat et verification).

## 10) Format de restitution apres chaque correction (obligatoire)

- Apres chaque correction, toujours fournir:
  - resultat attendu,
  - comportement,
  - impact visuel,
  - points a verifier (si necessaire).
- Ce format est obligatoire meme pour les petits lots.
- Toujours ajouter aussi:
  - la phrase de commit,
  - le statut des verifications anti-regression.
