# Récap projet — Outils techniciens RECORD

## Contexte

Suite de **3 pages web autonomes** (HTML/CSS/JS, aucun framework, aucun backend) destinées aux techniciens de maintenance RECORD sur le terrain (tablette/téléphone). Hébergées gratuitement sur **GitHub Pages**, accessibles via un simple lien.

**Objectif de cette demande :** faire réviser/améliorer le design (UI) par Claude Design, sans casser les fonctionnalités existantes ci-dessous.

---

## Architecture générale

```
index.html          → page d'accueil (choix + administration)
fiche-devis.html     → relevé technicien pour demande de devis
vantaux-sav.html     → descriptif vantail/fixe cassé (SAV)
```

Les 3 fichiers sont sur le **même dépôt GitHub Pages** (même origine), ce qui permet de partager des données entre eux via le `localStorage` du navigateur (voir plus bas).

Aucune base de données, aucun serveur : tout tourne dans le navigateur du technicien.

---

## Design system actuel

**Ambiance visuelle :** ticket/bon de commande papier, sobre et professionnel.

- **Couleurs**
  - Fond page : `#F0ECE2` (beige clair)
  - Carte/fiche : `#FAF8F3` (papier)
  - Bandeau d'en-tête : `#33495C` (bleu ardoise) — texte blanc
  - Accent alerte/attention : `#D98E1E` (ambre)
  - Erreur : `#B8443B` sur fond `#F6E4E1`
  - Succès : `#4C7A47` sur fond `#E7EFE1`
  - Lignes/bordures : `#C9CFC0`
  - Texte principal : `#1C2024`, texte secondaire : `#5B6570`

- **Typographie** : polices système uniquement (`-apple-system, Segoe UI, Roboto...`) — aucune dépendance internet pour l'affichage, fonctionne hors-ligne. Une police mono système pour les références/codes.

- **Composants récurrents**
  - En-tête "ticket" : bandeau bleu avec bord inférieur ondulé (effet ticket de caisse), titre + sous-titre
  - Champs de formulaire : larges (usage tactile), bordure fine, coin arrondi 6px
  - Boutons "toggle" Oui/Non (au lieu de checkbox classiques)
  - Cartes visuelles sélectionnables (grille photo/icône + libellé, bordure bleue quand sélectionné)
  - Bandeau de message (succès vert / erreur rouge), toujours visible et qui scrolle jusqu'à l'utilisateur
  - Crédit pied de page discret ("Réalisation Christophe BATAILLE")

**Axe d'amélioration possible pour Claude Design :** le rendu est fonctionnel mais très "utilitaire" — de la marge existe pour une direction artistique plus travaillée (hiérarchie visuelle, micro-interactions, illustrations plus soignées que nos SVG générés à la main), tant que les contraintes techniques ci-dessous restent respectées.

---

## Page 1 — `index.html` (Accueil)

- Deux cartes cliquables : **Fiche devis** et **Descriptif vantaux SAV**, chacune avec icône, titre, description courte
- Bouton **Administration** (roue crantée en haut à droite) protégé par un code (`RECORD2026`) :
  - Permet d'ajouter/modifier/supprimer une liste de **techniciens** et une liste de **destinataires mail**
  - Ces deux listes sont stockées dans le `localStorage` du navigateur sous les clés `techniciens-preenregistres` et `destinataires-preenregistres`
  - **Important pour le design :** ces mêmes listes sont relues par les deux autres pages pour proposer des suggestions dans leurs champs "Technicien" et "Mail destinataire" — il faut donc garder cette page comme point d'administration central

---

## Page 2 — `fiche-devis.html` (Fiche devis)

Relevé rempli par un technicien après une intervention nécessitant un devis.

**Champs principaux :** technicien (avec suggestions), site/ville, mail client, destinataire, n° équipement, n° FQ, localisation, marque/modèle, temps par technicien, nombre de techniciens, nacelle/PIRL (oui/non obligatoires), statut de l'intervention (porte à l'arrêt / urgent / préventif), descriptif des pièces, **photos obligatoires** (prises directement depuis l'appareil).

**Actions en bas de page :**
- **Partager (PDF + photos)** → génère un PDF reprenant toute la mise en forme de la fiche + les photos, puis ouvre le partage natif du téléphone (Mail, WhatsApp...)
- **Télécharger le PDF** → repli si le partage échoue, pour joindre le PDF à la main
- **Copier le texte** → copie un résumé texte formaté (emplacement de secours)
- **Nouvelle fiche** → réinitialise le formulaire

---

## Page 3 — `vantaux-sav.html` (Descriptif vantaux SAV)

Basée sur une fiche papier existante ("Descriptif commercial vantaux SAV"), pour déclarer un vantail ou fixe cassé à remplacer.

**Sections (dans l'ordre) :**
1. **Identification** — technicien, client/chantier, n° de porte, destinataire
2. **Vantail — dimensions** — hauteur, largeur, finition, type de vitrage (Simple/Double/Tôlée), type et hauteur méca impératif
3. **Configuration & vantail cassé** — grille de 12 configurations de porte illustrées (schémas SVG maison, à améliorer visuellement), puis sélection précise du panneau cassé une fois la configuration choisie
4. **Infos complémentaires** — rails au sol, capot DIN **ou** joint arrière (choix exclusif)
5. **Type de profilé alu** — tableau récapitulatif des 7 profils existants (cotes AV/AR/CI/PL), avec 22R et 32R mis en avant comme gamme actuelle ; grille de photos réelles (extraites du PDF source) pour reconnaître visuellement le bon profil
6. **Récapitulatif avant photos** — un schéma du vantail (élévation) qui se met à jour en direct avec toutes les valeurs saisies (hauteur, largeur, finition, vitrage, méca, cotes AV/AR/CI/PL), pour une vérification globale avant de passer aux photos
7. **Photos** (obligatoires)

Mêmes actions de partage/export PDF que la fiche devis.

**Point d'attention design :** les schémas des 12 configurations et des 7 profilés sont actuellement des dessins SVG simplifiés générés en code (rectangles + flèches). Ce sont les éléments les plus "bruts" visuellement — un bon candidat prioritaire pour une refonte graphique par Claude Design, tant que :
- chaque configuration reste identifiable sans ambiguïté (nombre de vantaux, sens de coulissement, présence de fixe)
- chaque profilé alu reste visuellement distinct des autres

---

## Fonctionnalités transversales à préserver

- **100% hors-ligne après premier chargement** (pas de dépendance à un serveur, sauf la librairie PDF chargée une fois via CDN)
- **Photos** : prise directe caméra ou galerie, compression automatique côté client (JPEG, max 1280px) avant intégration au PDF
- **Génération PDF** : via la librairie jsPDF, entièrement côté client, reprenant la mise en forme de la fiche
- **Partage natif** : utilise l'API `navigator.share` du téléphone pour envoyer texte + PDF en une fois vers l'app de son choix (Mail, WhatsApp...) — nécessite que l'action reste **synchrone** dès le clic (contrainte iOS Safari), donc toute évolution doit éviter d'introduire un traitement asynchrone avant l'appel à `navigator.share`
- **Validation obligatoire** avant export : champs requis marqués d'un astérisque rouge, message d'erreur explicite et bien visible (bandeau coloré qui scrolle jusqu'à l'utilisateur)
- **Aucune donnée envoyée à un serveur** : tout reste dans le navigateur du technicien (confidentialité, fonctionnement hors-ligne)

---

## Ce qui n'est PAS dans le périmètre actuel

- Pas de synchronisation entre appareils (chaque technicien a ses propres suggestions/brouillons locaux, sauf les listes admin qui sont par appareil également)
- Pas de base de données centralisée des fiches envoyées (chaque envoi part directement en PDF, rien n'est archivé côté outil)
- Le calcul automatique de nomenclature (BOM) et les tableaux détaillés vitrages/tôlerie du fichier Excel d'origine ne sont pas repris — volontairement laissés dans l'Excel pour l'instant

---

## Fichiers à fournir à Claude Design

- `index.html`, `fiche-devis.html`, `vantaux-sav.html` (code source complet, autonome)
- Ce présent récapitulatif

**Consigne pour la refonte :** conserver toute la logique JavaScript (validation, PDF, partage, stockage, listes) et se concentrer sur l'habillage visuel (CSS, mise en page, iconographie/schémas) sans casser les identifiants (`id`) utilisés par le code.
