# CHARTE PROJET

## 1. PERIMETRE

- Le projet est local dans `C:\Users\sebastien.duc\CLOUD\02_ARCHIVAGE PERSONNEL\DASHBOARDS\DASHBOARD GESTION DES ACCÈS & EFFETS SENSIBLES 02`.
- La base technique visee est simple : `HTML + CSS + JS + JSON`.
- L'objectif est un outil local, clair, evolutif, puis adaptable plus tard a `SUPABASE + GITHUB`.
- Le projet doit etre pense des maintenant pour pouvoir etre heberge proprement a terme.

## 2. METHODE

- Le projet avance pas a pas.
- Les points importants sont valides avant implementation.
- Les choix simples et solides sont privilegies.
- Les decisions techniques evidentes et coherentes peuvent etre prises directement si elles respectent cette charte.
- Les erreurs deja rencontrees doivent etre consolidees pour eviter leur retour.
- Apres un audit, les corrections sures prioritaires passent avant les nouvelles evolutions.

## 3. SECURITE DES MODIFICATIONS

- L'existant est toujours lu avant modification.
- Aucun fichier n'est modifie sans comprendre son role.
- Chaque changement reste limite au besoin reel.
- Toute modification doit etre verifiee pour ne pas casser le reste du projet.

## 4. POLITIQUE DE SNAPSHOTS

- Si une modification est jugee risquee, un snapshot est cree avant intervention.
- Les snapshots plus anciens sont conserves tant que la modification n'est pas completement validee.
- Les anciens snapshots ne sont supprimes qu'apres validation complete.
- Cette regle est appliquee automatiquement au fil du projet.

## 5. QUALITE D'IMPLEMENTATION

- Le code doit rester clair, lisible et solide.
- La structure, le style, la logique et les donnees sont separes proprement.
- L'interface doit rester dense, propre et sans elements grossiers.
- Les noms utilises doivent etre simples, coherents et stables.
- La structure du dossier source doit etre optimisee regulierement.
- Les fichiers et sous-dossiers doivent etre ranges intelligemment au fil du projet.
- Le fichier HTML d'ouverture doit rester a la racine du projet.

## 6. DONNEES

- Les donnees metier sont normalisees en `MAJUSCULES SANS ACCENTS`.
- Le JSON doit rester lisible et modifiable a la main.
- Les listes de reference doivent rester faciles a faire evoluer.
- La structure doit preparer une future migration sans compliquer inutilement la version locale.
- La signature mobile par flashcode doit pouvoir fonctionner en mode local (meme reseau) et en mode heberge (URL publique configurable).

## 7. VALIDATION

- Apres chaque modification importante, la coherence generale est verifiee.
- La coherence des codes doit toujours etre verifiee avant de livrer un resultat.
- Les points touches sont controles : affichage, filtres, KPI, statuts, sauvegarde.
- Si un doute reste present, il doit etre signale clairement.
- Le comportement du bouton `SAUVEGARDER` doit, pour l'instant, ouvrir une invite de telechargement du fichier de donnees mis a jour.

## 8. COMMUNICATION

- Toutes les reponses doivent utiliser un vocabulaire simple et concis.
- Les termes trop techniques sont evites, surtout pour expliquer un probleme.
- Les explications doivent rester claires pour une personne qui ne code pas les fichiers elle-meme.
- Si une demande n'est pas assez claire, des questions doivent etre posees avant d'agir.
- Si une demande se termine par `?`, une reponse doit toujours etre donnee avant toute action.
- Si une correction passe par plusieurs essais et qu'une iteration precedente etait mauvaise, cela doit etre dit clairement.
- Quand la bonne iteration est validee, il faut alerter explicitement qu'on peut remettre sans risque les elements retires a tort.
- Ce retour de clarification doit etre fait avant de poursuivre les modifications suivantes.

## 9. COLLABORATION

- L'utilisateur ne code pas les fichiers lui-meme.
- L'utilisateur peut, si besoin, saisir du code dans la console du navigateur pour donner des retours.
- Plus tard, l'utilisateur pourra aussi executer les requetes ou actions donnees pour `SUPABASE` ou `GITHUB`.
- Les demandes seront guidees de facon simple, progressive et exploitable.
- Des propositions regulieres d'ameliorations metier et visuelles doivent etre donnees au fil du projet.
- Quand les etapes necessaires deja traitees le permettent, des ameliorations utiles doivent etre proposees spontanement.

## 10. PRIORITES

- Priorite 1 : ne pas casser l'existant.
- Priorite 2 : garder une structure simple et compréhensible.
- Priorite 3 : preparer correctement les evolutions futures.
