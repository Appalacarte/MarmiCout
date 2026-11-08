# Journal des Modifications (CHANGELOG)

Toutes les modifications notables apportées à ce projet sont documentées dans ce fichier. Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

---

## [2.0.36] - 2026-11-08

### Modifié
- **Mise en conformité des Mentions Légales selon la loi SREN (loi n° 2024-449 du 21 mai 2024) et la LCEN** :
  - **En-tête juridique actualisé** : référence à l'article 1-1 de la LCEN modifiée par la loi SREN 2024 et à l'article 19.
  - **Section 1 Éditeur assainie** : fusion des champs « Entrepreneur » et « Forme juridique » sous *« Hervé CHAMPAGNE, Entrepreneur individuel (EI) »* (nom cité une seule fois), suppression des données personnelles superflues (code APE, immatriculation RNE et date de début d'activité, SIREN du domiciliataire).
  - **Ajout des numéros de téléphone obligatoires** : téléphone de l'éditeur `07 69 59 04 70` avec lien `tel:+33769590470`, et téléphone de l'hébergeur Vercel `+1 951-383-6898`.
  - **Mise à jour de l'adresse de l'hébergeur** : Vercel Inc. à Walnut, CA 91789 (remplaçant l'adresse obsolète de Covina).
  - **Section 2 simplifiée** : conservation exclusive de la mention légale *« TVA non applicable, article 293 B du CGI »* avec retrait des détails fiscaux et sociaux privés.
  - **Section 4 RGPD enrichie** : précision sur les transferts encadrés par le Data Privacy Framework (DPF UE-États-Unis) pour Vercel et conformité CNIL sur les cookies.
- **Création du module partagé de configuration et de validation légale** :
  - `src/config/legalConfig.ts` : centralisation typée des mentions légales réutilisables pour toutes les applications.
  - `src/utils/legalValidator.ts` : moteur de validation avec contrôles bloquants (ERREUR) et alertes (AVERTISSEMENT).
  - `scripts/verify-legal.mjs` : script de vérification automatisé intégré au script `npm run build` et exécutable via `npm run check:legal`.
- **Synchronisation de version** :
  - Incrémentation SemVer vers `2.0.36` dans `package.json`, `src/version.ts` et `CHANGELOG.md`.

## [2.0.35] - 2026-11-08

### Modifié
- **Support des paramètres URL `?tab=...` pour captures d'écran et accès direct** :
  - Ajout de la prise en charge de `window.location.search` (`?tab=Produits`, `?tab=Recettes`, etc.) en complément de `window.location.hash`.
  - Permet aux outils de capture automatisée et aux liens marketing de charger directement le bon écran sans délai.
- **Synchronisation de version** :
  - Incrémentation SemVer vers `2.0.35` dans `package.json`, `src/version.ts` et `CHANGELOG.md`.

## [2.0.34] - 2026-11-08

### Ajouté
- **Support de la navigation par hash URL pour les captures et accès direct aux onglets** :
  - Support de `window.location.hash` (`#Dashboard`, `#Produits`, `#Achats`, `#Recettes`, `#Production`, `#Ventes`, `#Magasins`, `#Paramètres`, `#Mentions Légales`).
  - Synchronisation de l'URL hash lors du changement d'onglet dans la barre latérale pour faciliter le partage et les tutoriels vidéo.
- **Synchronisation de version** :
  - Incrémentation SemVer vers `2.0.34` dans `package.json`, `src/version.ts` et `CHANGELOG.md`.

## [2.0.33] - 2026-11-08

### Ajouté
- **Dossier Marketing Complet & Guide Vidéo PC Écran par Écran (`Marketing_MarmiCout_Guide_Video_PC.md`)** :
  - Création du script de formation vidéo PC complet écran par écran (Tableau de bord, Produits & Stocks, Achats & Factures OCR, Recettes & Marges, Productions Lot, Ventes & Profits, Fournisseurs, Paramètres & Synchronisation, Utilitaires).
  - Rédaction des 10 slogans stratégiques avec scores d'impact et cas d'usage.
  - Structure de la Landing Page de vente avec placeholders administrables Appalacarte.
  - Fiches de soumission App Store et Google Play conformes ASO.
  - Catalogue des 20 visuels et médias administrables.
- **Synchronisation de version** :
  - Incrémentation SemVer vers `2.0.33` dans `package.json`, `src/version.ts` et `CHANGELOG.md`.

## [2.0.32] - 2026-11-08

### Modifié
- **Harmonisation des supports marketing (flyers)** :
  - Mise à jour des QR codes d'essai dans `flyer_marmicout.html` et `flyer_marmicout2.html` pointant directement vers `https://marmicout.vercel.app/`.
  - Harmonisation du domaine affiché (`marmicout.vercel.app`) et de l'email officiel `contact@appalacarte.fr`.
- **Synchronisation de version** :
  - Incrémentation SemVer vers `2.0.32` dans `package.json`, `package-lock.json`, `src/version.ts` et `CHANGELOG.md`.

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
