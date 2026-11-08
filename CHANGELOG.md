# Journal des Modifications (CHANGELOG)

Toutes les modifications notables apportées à ce projet sont documentées dans ce fichier. Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

---

## [2.0.31] - 2026-11-08

### Modifié
- **Lien du QR Code et bouton de partage** :
  - Mise à jour de l'URL cible générée par le composant `InviteQRCode.tsx` vers l'adresse officielle de production directe : `https://marmicout.vercel.app/`.
  - Le scan du QR code et le bouton « Copier le lien » / « Partager » redirigent désormais vers `https://marmicout.vercel.app/`.
- **Synchronisation de version** :
  - Incrémentation SemVer vers `2.0.31` dans `package.json`, `package-lock.json`, `src/version.ts` et `CHANGELOG.md`.

## [2.0.30] - 2026-11-08

### Modifié
- **Déploiement Vercel & configuration domaine** :
  - Déploiement en production de l'application sur Vercel avec le domaine officiel direct `https://marmicout.vercel.app` (et conservation de l'alias de secours `https://marmi-cout.vercel.app`).
  - Configuration du dépôt distant GitHub vers l'organisation officielle App à la Carte : `https://github.com/Appalacarte/MarmiCout.git`.
  - Ajout de l'exclusion `.vercel` dans `.gitignore`.
- **Synchronisation de version** :
  - Incrémentation SemVer vers `2.0.30` dans `package.json`, `package-lock.json`, `src/version.ts` et `CHANGELOG.md`.

## [2.0.29] - 2026-11-08

### Ajouté
- **Fonctionnalité « Démarrer de zéro (Base 100% vierge) » dans la Zone de Danger** :
  - Ajout d'une touche dédiée avec dialogue de confirmation explicatif permettant d'effacer tous les produits, recettes, achats, productions, ventes et fournisseurs de démo.
  - Implémentation du service `clearAllData()` dans `dbService` réinitialisant les tables locales tout en préservant les paramètres de calcul généraux (unités, devises, coefficient de marge).
  - Clarification visuelle et rédactionnelle de la Zone de Danger dans `Settings.tsx` avec distinction nette entre :
    1. « Démarrer de zéro » pour les professionnels qui souhaitent démarrer immédiatement leur propre catalogue ;
    2. « Recharger les données de démo » pour tester l'application avec les exemples prédéfinis de Marmie.

## [2.0.28] - 2026-11-08

### Ajouté
- **Nouvel onglet « Mentions Légales » (`MentionsLegales.tsx`)** :
  - Identification complète et certifiée de l'éditeur : App à la Carte — Hervé CHAMPAGNE EI (Entrepreneur individuel).
  - Adresse professionnelle de domiciliation : 173 rue de Courcelles, 75017 Paris, France (HelloDom, SIREN : 878 831 312).
  - Numéros SIREN (132 021 098) et SIRET (132 021 098 00018), code APE 6201Z (Programmation informatique), immatriculation RNE au 26/10/2026.
  - Mention légale TVA obligatoire : *« TVA non applicable, article 293 B du CGI »* (Micro-BIC, franchise en base de TVA).
  - Coordonnées de l'hébergeur web (Vercel Inc.) et registrar DNS (OVHcloud).
  - Chapitre sur la protection de la vie privée et l'architecture locale (RGPD, absence de fuite de données, fonctionnement hors-ligne en `localStorage`).
- **Pied de page (footer) conforme et interactif** :
  - Intégration du lien d'accès permanent : `App à la Carte — Hervé CHAMPAGNE EI | SIREN : 132 021 098 | v2.0.28 | Mentions légales | Contact`.
  - Navigation directe vers les écrans « Mentions Légales » et « Contact » sur mobile et desktop.
- **Encart Éditeur Officiel dans les Paramètres (`Settings.tsx`)** :
  - Affichage des informations d'App à la Carte et du statut juridique/fiscal.

### Modifié
- **Adresses email de contact & support** :
  - Remplacement de l'adresse provisoire par l'email de contact officiel : `contact@appalacarte.fr` dans les formulaires de Contact (`Contact.tsx`), Demande de devis (`QuoteRequest.tsx`) et Boîte à suggestions (`Suggestions.tsx`).
- **Conformité stricte de communication** :
  - Retrait de tout numéro de téléphone public et clarification des canaux de communication par email officiel.
- **Synchronisation de version** :
  - Incrémentation SemVer vers `2.0.28` dans `package.json`, `package-lock.json` et `src/version.ts`.
