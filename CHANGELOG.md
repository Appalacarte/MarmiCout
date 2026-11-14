# Journal des Modifications (CHANGELOG)

Toutes les modifications notables apportées à ce projet sont documentées dans ce fichier. Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

---

## [2.0.54] - 2026-11-14

### Refonte Complète de la Conversion d'Unités (`src/utils/units.ts`), Cuillères (`cs` / `cc`), Contrôle d'Incompatibilité & Détail des Prix
- **Module de conversion d'unités ([`src/utils/units.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/utils/units.ts))** :
  - Trois familles d'unités strictes : **Masse** (`mg`, `g`, `kg`), **Volume** (`ml`, `cl`, `dl`, `l`, `cc` = 5 ml, `cs` = 15 ml) et **Comptage** (`pièce`, `sachet`, `pot`, `bouteille`, `boite`, non convertibles entre eux).
  - Ajout de `normalizeUnit` reconnaissant les variantes courantes (`gr`, `grammes`, `kilo`, `litre`, `L`, `c. à soupe`, `c.à.s`, `cas`, `tbsp`, `c. à café`, `cac`, `tsp`, `pièces`, `unité`, etc.).
  - `convertUnits` renvoie `null` lorsque la conversion est impossible (et jamais la quantité inchangée). `convertUnitsWithInfo` signale l'approximation `1 ml = 1 g` (`approximate: true`) entre masse et volume, et refuse toute conversion entre comptage et masse/volume.
- **Ajout de `cs` et `cc` & Sélection d'unité dans les recettes** :
  - Ajout de `cs` et `cc` aux unités par défaut et injection automatique dans les réglages existants (`ensureRequiredUnits`).
  - Dans le formulaire de recette et le scanner, normalisation de l'unité réelle de l'ingrédient et ajout dynamique en `<option>` si elle ne figure pas dans la liste au lieu de basculer sur `kg`.
  - Lors de la liaison d'un ingrédient à un produit du stock, conservation de l'unité de la recette si elle est compatible avec celle du produit, ou bascule sur l'unité du produit dans le cas contraire.
  - Import de recettes ([`src/services/recipeImportService.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/recipeImportService.ts) et [`src/components/RecipeScanner.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/RecipeScanner.tsx)) : reconnaissance des cuillères à soupe en `cs` et cuillères à café en `cc` au lieu de `pièce`.
- **Gestion des unités incompatibles, blocage de « Cuisiner » & Affichage détaillé des prix** :
  - Mise à jour de tous les appelants (`calculateRecipeCost`, `addProduction`, `Recipes.tsx`, `ShoppingListDrawer.tsx`, `Productions.tsx`, `Sales.tsx`, `Dashboard.tsx`, `Purchases.tsx`, `Products.tsx`, `RecipeScanner.tsx`).
  - En cas d'unités incompatibles : aucun faux coût n'est additionné, affichage d'un avertissement visible `« Unités incompatibles : recette en X, stock en Y »` sur la ligne et blocage de l'action « Cuisiner » avec un message explicite avant toute déduction de stock.
  - En cas de conversion approximative (masse ↔ volume), affichage de l'indicateur `≈`.
  - Précision systématique de l'unité sur tous les prix unitaires (`€/kg`, `€/l`, `€/pièce`, `€/portion`) et affichage du détail complet du calcul sur chaque ligne d'ingrédient (ex. `300 g × 12,00 €/kg = 3,60 €`).
- **Tests automatisés ([`src/utils/units.test.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/utils/units.test.ts))** :
  - Suite de 9 tests unitaires couvrant toutes les conversions, approximations, cas impossibles et variantes de `normalizeUnit`.

---

## [2.0.53] - 2026-11-14

### Édition Produit, « Corriger le stock », Prix de départ sans achat & Suppression / Désactivation Sécurisée
- **Formulaire d'édition de produit ([`src/components/Products.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Products.tsx))** :
  - Renommage du champ « Stock initial » en « Stock actuel » en mode édition et ajout des lignes d'aide sous « Stock actuel » (*« Le stock se modifie par un achat ou par “Corriger le stock” »*) et sous « Prix d'achat moyen » (*« Calculé automatiquement à partir de vos achats »*).
  - Autorisation de la saisie du « Prix d'achat moyen » en édition tant que le produit n'a encore aucun achat enregistré ; verrouillage automatique dès qu'au moins un achat existe.
- **Fonctionnalité « Corriger le stock »** :
  - Ajout du bouton « Corriger le stock » à côté du champ stock en édition et dans le panneau de détail du produit.
  - Saisie de la quantité réelle constatée et du motif (*Inventaire*, *Casse / perte*, *Erreur de saisie*, *Autre*), mise à jour immédiate du stock et création d'un mouvement de stock `AJUSTEMENT` avec l'écart, visible dans l'historique du produit.
- **Boutons « Modifier » et « Supprimer »** :
  - Ajout du bouton « Modifier » à côté de « Approvisionner (+ Achat) » dans le panneau de détail d'un produit.
  - Ajout du bouton rouge « Supprimer » avec confirmation dans le formulaire d'édition : si le produit est utilisé dans une recette, un achat ou un mouvement de stock, la suppression est remplacée par une proposition de désactivation (`isActive = false`) avec explication ; sinon suppression via `dbService.deleteProduct`.
  - Rechargement systématique de la liste et affichage d'un message d'erreur clair à l'écran en cas d'échec.

---

## [2.0.52] - 2026-11-14

### Conformité NOT NULL Cloud (`cloudDbService.ts`) & Affichage des Erreurs de Création Rapide Produit
- **Remplacement de `null` par des chaînes vides `''` et valeurs par défaut sur les colonnes `NOT NULL` dans [`src/services/cloudDbService.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/cloudDbService.ts)** :
  - `marmicout_products` (`saveProduct`) : envoi de `''` au lieu de `null` pour `brand`, `format`, `barcode` et `notes`, avec valeurs par défaut sur `category` (`'Épicerie'`), `unit` (`'kg'`), `stock` (`0`), `min_stock_alert` (`0`), `avg_purchase_price` (`0`) et `is_active` (`true`).
  - `marmicout_stores` (`saveStore`) : envoi de `''` au lieu de `null` pour `address`, `phone` et `notes`, et valeur par défaut `'Grossiste'` pour `type`.
  - `marmicout_recipes` (`saveRecipe`) : envoi de `''` au lieu de `null` pour `description`, `utensils_notes`, `notes` et `instructions`, et valeurs par défaut pour `category`, `portions`, `yield_qty`, `yield_unit`, `stock` et `is_active`.
  - `marmicout_recipe_ingredients` & `marmicout_recipe_packaging` (`saveRecipe`) : envoi de `''` au lieu de `null` pour `custom_name`, valeurs numériques non nulles pour `qty_used`, `custom_cost_per_unit` et `cost_per_unit`, et remontée explicite des erreurs d'insertion.
  - `marmicout_purchases` (`savePurchase`) : envoi de `''` au lieu de `null` pour `batch_no` et `notes`, et valeurs par défaut pour `purchase_date`, `qty`, `unit`, `unit_price` et `price_paid`.
  - `marmicout_productions` (`saveProduction`) : vérification de `recipe_id` (`NOT NULL`), envoi de `''` au lieu de `null` pour `notes`, et valeurs par défaut pour `production_date`, `portions_produced` et `calculated_cost`.
  - `marmicout_sales` (`saveSale`) : vérification de `item_id` (`NOT NULL`), envoi de `''` au lieu de `null` pour `notes`, et valeurs par défaut pour `sale_date`, `item_type`, `qty_sold`, `unit_price` et `location`.
  - `marmicout_stock_movements` (`saveStockMovement`) : vérification de `product_id` (`NOT NULL`), envoi de `''` au lieu de `null` pour `notes`, et valeurs par défaut pour `movement_date`, `qty`, `type` et `ref_id`.
  - `marmicout_settings` (`saveSettings`) : envoi de `''` au lieu de `null` pour `google_sheet_link`, `google_sheet_id` et `google_web_app_url`.
- **Affichage clair des erreurs sur « + Ajouter à mes produits »** :
  - Dans [`src/components/Recipes.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Recipes.tsx) et [`src/components/ShoppingListDrawer.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/ShoppingListDrawer.tsx) : affichage d'un bandeau d'erreur explicite à l'écran si l'enregistrement rapide d'un produit échoue.

---

## [2.0.51] - 2026-11-14

### Liste de Courses Complète (Ingrédients Non Liés), Bouton « Ajouter à mes produits » & Écoute Synchronisation Cloud
- **Prise en compte des ingrédients non liés dans la liste de courses et la faisabilité** :
  - Dans [`src/components/Recipes.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Recipes.tsx) : tout ingrédient sans produit lié (`customName`) ou dont le produit lié est introuvable est désormais considéré comme manquant en totalité. Il apparaît dans « Ingrédients manquants (Liste de courses) » avec la quantité complète pour le nombre de portions choisi et est inclus dans « Copier la liste de courses ».
  - Le bandeau de faisabilité tient compte des ingrédients non liés ou introuvables (la recette n'est pas affichée comme « réalisable » tant qu'un ingrédient n'est pas en stock).
  - Dans [`src/components/ShoppingListDrawer.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/ShoppingListDrawer.tsx) : fusion des ingrédients non gérés en stock directement dans la section « À acheter » avec leur quantité totale, leur inclusion dans le texte copié et l'export CSV.
- **Création rapide et liaison de produit (« Ajouter à mes produits »)** :
  - Ajout du bouton « Ajouter à mes produits » à côté de chaque ingrédient non lié (dans le détail de recette, la liste de courses et le formulaire de recette) qui crée le produit (nom et unité pré-remplis, stock 0) et relie immédiatement l'ingrédient à ce produit.
- **Réactivité à la synchronisation Cloud (`marmicout-data-synced`)** :
  - Ajout d'un écouteur d'événement `marmicout-data-synced` dans `Recipes.tsx`, `Products.tsx`, `Dashboard.tsx`, `Purchases.tsx`, `Productions.tsx`, `Sales.tsx` et `Stores.tsx` pour recharger automatiquement les données (et recalculer les ingrédients et le coût si un détail de recette est ouvert).

---

## [2.0.50] - 2026-11-14

### Bouton « Se déconnecter », Préservation des Données Hors-Ligne & Contrôle de Date de Fin Hors-Ligne
- **Bouton « Se déconnecter » dans le menu et les paramètres** :
  - Ajout du bouton « Se déconnecter » dans la barre latérale et le tiroir mobile ([`src/App.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/App.tsx)) ainsi que dans l'écran Paramètres ([`src/components/Settings.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Settings.tsx)).
  - La déconnexion efface uniquement la session locale (`supabase.auth.signOut({ scope: 'local' })`, `marmicout_supabase_auth_token`, cache `last_access_verification`) sans supprimer aucune donnée hors-ligne non synchronisée.
  - Détection automatique des données hors-ligne non synchronisées (`dbService.checkUnsyncedOfflineData()`) avec message d'avertissement et confirmation avant déconnexion.
- **Revérification en ligne & Validité hors-ligne jusqu'à la date de fin connue** :
  - Dans [`src/services/accessVerificationService.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/accessVerificationService.ts) et [`src/components/MarmicoutAccessGate.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/MarmicoutAccessGate.tsx) : à chaque ouverture avec internet (et au retour de connexion), revérification via `/api/access/verify` et renvoi vers la connexion si la session est invalide ou si l'abonnement a pris fin.
  - Hors-ligne, l'application continue de fonctionner jusqu'à la date de fin d'accès connue (`expiresAt` / `consultationUntil` dans IndexedDB) et bloque l'accès une fois cette date dépassée.

---

## [2.0.49] - 2026-11-14

### Sécurité SSO à Usage Unique, Suppression des QR Codes de Partage & Codes Testeurs Longs
- **Échange de jeton SSO signé à usage unique (Clients payants)** :
  - Dans [`src/components/MarmicoutAccessGate.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/MarmicoutAccessGate.tsx) : détection du paramètre `?sso_token=...`, suppression immédiate de `sso_token` et de tout `code` résiduel de l'URL (`history.replaceState`), puis échange serveur sécurisé via `POST /api/auth/sso-exchange` contre une session Supabase.
  - Dans [`src/services/db.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/db.ts) : `getActiveTesterCode()` renvoie désormais `null` pour tout client abonné (`pro`, `pro_cloud`, `essentiel`), supprimant l'indicateur « Espace Testeur ».
  - Dans [`src/services/supabaseClient.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/supabaseClient.ts) : désactivation de `detectSessionInUrl` au profit de l'échange serveur par jeton signé à usage unique.
- **Renforcement des codes testeurs (24 caractères aléatoires)** :
  - Dans [`src/services/testerCodes.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/testerCodes.ts) : génération de codes aléatoires de 24 caractères (~117 bits d'entropie) sans biais de modulo via `crypto.getRandomValues`.
  - Dans [`src/components/WelcomeScreen.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/WelcomeScreen.tsx) : remplacement du code basé sur le prénom/surnom court par un jeton aléatoire de 24 caractères.
- **Suppression des QR codes de partage** :
  - Suppression des composants `QRCodePage.tsx`, `InviteQRCode.tsx`, des entrées de menu associées dans `App.tsx` et de la dépendance inutilisée `qrcode.react`.

---

## [2.0.48] - 2026-11-11

### Sécurisation OCR Serveur, Distinction Forfait Cloud / Essentiel & Cache Local IndexedDB
- **Sécurisation Mindee & OCR Serveur (Point 4)** :
  - Suppression intégrale de toute clé Mindee du client Marmicout et de `marmicout_settings` (migration Supabase dédiée).
  - Déplacement de l'analyse OCR côté backend App à la Carte sur l'endpoint sécurisé `/api/marmicout/ocr` avec contrôle de forfait et quotas (5 démo / 150 Pro).
  - Suppression de la dépendance npm `mindee` dans Marmicout (`git grep -i mindee` = 0).
- **Distinction Stricte Mode Cloud vs Essentiel (Points 1 & 2)** :
  - `isCloudMode()` s'appuie désormais STRICTEMENT sur le forfait renvoyé par `/api/access/verify` (`demo_14j`, `pro`, `pro_cloud`).
  - Les utilisateurs du forfait `essentiel` écrivent exclusivement en local (IndexedDB) et JAMAIS sur Supabase.
  - `syncFromCloud()` est strictement interdit et ignoré pour le forfait Essentiel afin de préserver l'intégrité de ses données locales.
  - Pendant le chargement de la vérification des droits, les écritures sont bloquées avec écran de chargement dédié (`assertAccessKnown`).
  - En mode hors-ligne, le dernier forfait connu est relu depuis IndexedDB.
- **Cache Local IndexedDB Pur en Mode Cloud (Point 6)** :
  - Élimination des écritures de données métier dans `localStorage` en mode cloud pour éviter toute saturation de la limite 5 Mo.
  - Le cache local hors-ligne en mode cloud s'appuie désormais sur IndexedDB avec projection mémoire instantanée.
- **Suppression des Fallbacks Silencieux (Point 5)** :
  - Suppression de la suppression silencieuse de colonnes dans `cloudDbService.ts` : toute anomalie de schéma lève une erreur explicite.
- **Cycle de Vie Service Worker & En-têtes No-Cache (Points 0 & 7)** :
  - `/sw.js` servi avec les en-têtes `Cache-Control: no-cache, no-store, must-revalidate`.
  - Notification automatique et actualisation lors de l'activation d'un nouveau cache shell (`self.clients.claim()`).
  - Affichage stylisé de la version `v2.0.48` dans le pied de page de Marmicout.

---

## [2.0.47] - 2026-11-11

### Neutralisation Service Worker sur Localhost & Renforcement Détection Cloud-First
- **Désactivation Totale du Service Worker en Local (Point 1)** :
  - Dans [`src/services/pwaService.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/pwaService.ts) : désenregistrement automatique de tout Service Worker actif et suppression des Caches Storage sur `localhost` et `127.0.0.1`.
  - Dans [`public/sw.js`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/public/sw.js) : bypass immédiat de tout cache pour les requêtes émises sur `localhost` / `127.0.0.1`.
- **Fiabilisation Synchrone du Mode Cloud (Points 2 & 3)** :
  - Dans [`src/services/db.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/db.ts) : `isCloudMode()` intègre un contrôle direct du token de session Supabase (`marmicout_supabase_auth_token`), interdisant tout repli clandestin en stockage local si un utilisateur est authentifié. Prise en compte du statut `'demo_active'`.
  - Dans [`src/services/cloudDbService.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/cloudDbService.ts) : `getEstablishmentId()` et `ensureEstablishmentId()` inspectent `localStorage` et interrogent directement `marmicout_establishments` en cas d'absence en mémoire.

---

## [2.0.46] - 2026-11-11

### Ordre d'Écriture Cloud-First, Gestion des Erreurs UI avec Bouton Réessayer & Migration IndexedDB
- **Ordre d'Écriture Cloud-First & Rejet sans Pollution Locale (Point 2)** :
  - Dans [`src/services/db.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/db.ts) : toutes les méthodes d'écriture (`saveRecipe`, `saveProduct`, `saveStore`, `addPurchase`, `addProduction`, `addSale`, `saveSettings`, etc.) écrivent en priorité absolue dans Supabase. En cas de refus ou d'échec réseau, le cache local n'est JAMAIS modifié et l'erreur est levée.
  - Dans tous les formulaires UI (`Recipes.tsx`, `Products.tsx`, `Stores.tsx`, `Purchases.tsx`, `Productions.tsx`, `Sales.tsx`, `Settings.tsx`) : en cas d'erreur de persistance Cloud, le drawer reste ouvert, les saisies de l'utilisateur sont conservées intactes, un bandeau d'erreur explicite est affiché et le bouton d'action se transforme en « Réessayer ».
- **Alignement Schéma & Fallback Robuste (Point 0)** :
  - Dans [`src/services/cloudDbService.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/cloudDbService.ts) : normalisation des champs facultatifs (ex: `description: recipe.description ? recipe.description.trim() : ''`) évitant les violations NOT NULL. Mécanisme de fallback gracieux si les colonnes étendues ne sont pas encore migrées sur le serveur Supabase.
  - `syncFromCloud()` remplace intégralement le cache local par les données réelles du serveur Supabase, nettoyant automatiquement les données fantômes non persistées.
- **Migration IndexedDB Complète (Point 3)** :
  - Dans [`src/services/indexedDbService.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/indexedDbService.ts) : migration automatique de l'ensemble des données `localStorage` vers `IndexedDB` au premier lancement pour le forfait Essentiel.

---

## [2.0.45] - 2026-11-11

### Façade Hybride dbService / cloudDbService, Alertes Cloud Explicites & Indicateur Forfait Pro
- **Façade Hybride `dbService` / `cloudDbService` (Point 3)** :
  - Dans [`src/services/db.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/db.ts) : transformation en façade réactive pour l'ensemble des écrans (recettes, produits, achats, productions, ventes, magasins, réglages).
  - Mode Essentiel : écritures purement locales, zéro appel réseau vers Supabase.
  - Mode Cloud (`pro`, `pro_cloud`, `demo_14j`) : double écriture locale et cloud immédiate via `cloudDbService`.
  - Normalisation automatique des identifiants en UUID RFC 4122 compatibles PostgreSQL.
  - Ajout de `syncFromCloud()` synchronisant les données distantes au lancement.
- **Zéro Échec Silencieux (Point 4)** :
  - Dans [`src/components/MarmicoutAccessGate.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/MarmicoutAccessGate.tsx) : écouteur d'événement `marmicout-cloud-error` affichant un bandeau d'alerte rouge immédiat en cas d'erreur de rejet RLS, de réseau ou d'établissement manquant.
  - Journalisation systématique des erreurs dans la console avec horodatage et contexte.
- **Indicateur Discret « Forfait Pro » (Point 5)** :
  - Dans [`src/components/MarmicoutAccessGate.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/MarmicoutAccessGate.tsx) : disparition du bandeau de démo après passage en Pro, et affichage du bandeau discret « ✨ Forfait Pro · Données synchronisées dans le Cloud Supabase (UE) » avec pastille verte « Synchronisation active ».
- **Alignement Strict du Schéma SQL Supabase** :
  - Correction dans [`src/services/cloudDbService.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/cloudDbService.ts) des noms de colonnes SQL (`purchase_date`, `production_date`, `sale_date`, `movement_date`, `qty_used`, `qty`, `unit_price`).

---

## [2.0.44] - 2026-11-11

### Étape c) Architecture Hybride, Contrôle 2FA (AAL2), Intégrité Export/Import & Sync Mentions Légales
- **Écran Dédié Double Authentification (2FA / AAL2) (Point 3)** :
  - Dans [`src/components/MarmicoutAccessGate.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/MarmicoutAccessGate.tsx) et [`src/services/accessVerificationService.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/accessVerificationService.ts) : prise en charge du mode `mfa_required` affichant un portail dédié demandant à l'utilisateur de valider son code TOTP sur App à la Carte pour escalader sa session au niveau AAL2.
- **Synchronisation Automatique de la Configuration Légale (Point 1)** :
  - Création de [`scripts/sync-legal-from-central.mjs`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/scripts/sync-legal-from-central.mjs) qui génère `src/config/legalConfig.ts` directement depuis `Créateur_application/src/config/legal.ts` (source unique de vérité).
  - Adresse officielle de Vercel Inc. vérifiée et validée : `440 N Barranca Ave #4133, Covina, CA 91723, USA`.
  - Mise à jour de `scripts/verify-legal.mjs` pour rejeter formellement toute mention obsolète de `340 S Lemon Ave` ou `Walnut`.
- **Intégrité 100% Export / Réimport Ligne pour Ligne (Point 2)** :
  - Implémentation de `importAllDataFromJSON()` dans [`src/utils/exportAllData.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/utils/exportAllData.ts) et des setters de collections dans [`src/services/db.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/db.ts).
  - Création de [`scripts/test-export-import-integrity.mjs`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/scripts/test-export-import-integrity.mjs) validant l'égalité stricte ligne par ligne sur les 10 tables opérationnelles : `products`, `stores`, `purchases`, `recipes`, `recipe_ingredients`, `recipe_packaging`, `productions`, `sales`, `stock_movements`, `settings`.
- **Architecture Étape c) Simplifiée (Stockage Local Pur vs Cloud Direct)** :
  - [`src/services/indexedDbService.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/indexedDbService.ts) : moteur IndexedDB dédié pour le stockage local pur (forfait Essentiel) et le miroir de cache local (72h).
  - [`src/services/cloudDbService.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/cloudDbService.ts) : écritures directes dans Supabase PostgreSQL pour Pro et Pro Cloud avec mise en cache automatique, et bascule transparente en consultation seule 72h hors connexion.
  - Bandeau discret Essentiel dans `MarmicoutAccessGate.tsx` : « Mode local (Essentiel) – Données stockées sur cet appareil » avec accès immédiat à « Exporter mes données ».
  - Bandeau consultation seule hors connexion (72h) pour Pro/Pro Cloud.

---

## [2.0.43] - 2026-11-11

### Corrigé & Amélioré
- **Sécurisation du SSO Local et Interception de Jeton** :
  - Dans [`src/components/MarmicoutAccessGate.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/MarmicoutAccessGate.tsx), l'interception automatique du jeton de session dans l'ancre `#access_token=...` est désormais strictement conditionnée à un environnement local de développement (`window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'`). En production, aucun fragment d'URL n'est jamais traité.
- **Correction des URLs d'Authentification Centralisée** :
  - Remplacement de l'ancien lien en 404 (`/auth/connexion?redirect=...`) par l'URL officielle d'App à la Carte : `${APPALACARTE_URL}/auth/login?next=${encodeURIComponent(window.location.href)}` dans [`src/services/accessVerificationService.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/accessVerificationService.ts) et dans les boutons d'action de [`MarmicoutAccessGate.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/MarmicoutAccessGate.tsx).
- **Liens Légaux Dynamiques vers la Plateforme Centrale** :
  - Tous les liens légaux du pied de page des écrans d'accès pointent via la variable d'environnement `VITE_APPALACARTE_URL` vers les pages officielles :
    - Mentions légales : `${APPALACARTE_URL}/mentions-legales`
    - Politique de confidentialité : `${APPALACARTE_URL}/politique-de-confidentialite`
    - CGU / CGV : `${APPALACARTE_URL}/conditions-generales`
    - Contact : `${APPALACARTE_URL}/contact`
- **Export Complet des 10 Tables de Données** :
  - Mise à jour de [`src/utils/exportAllData.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/utils/exportAllData.ts) et [`src/services/db.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/db.ts) pour exporter l'intégralité des 10 collections : `products`, `stores`, `purchases`, `recipes`, `recipe_ingredients`, `recipe_packaging`, `productions`, `sales`, `stock_movements`, `settings`.
- **Validation Conformité Légale SREN 2024** :
  - Script `scripts/verify-legal.mjs` validé avec succès (100% conforme).

---

## [2.0.42] - 2026-11-09

### Ajouté
- **Identité visuelle officielle et icônes (« La marmite qui monte »)** :
  - Déploiement complet des icônes dans `public/icons/` (favicon.svg, favicon-16, favicon-32, favicon-48, apple-touch-icon, icon-192, icon-512, icon-192-maskable, icon-512-maskable).
  - Déploiement du favicon multi-résolution `public/favicon.ico` et des logos officiels dans `public/brand/` et `src/assets/brand/` (`logo-marmicout.svg`, `logo-marmicout-fond-sombre.svg`, `icon.svg`).
  - Remplacement de l'ancienne toque dans la barre latérale par `icon.svg` (32 px) avec support du thème sombre (`logo-marmicout-fond-sombre.svg`) et attribut `alt="MarmiCout"`.
- **Installabilité PWA sur PC / Mac / Mobile (Chrome & Edge)** :
  - Intégration du manifest officiel `site.webmanifest` (`display: standalone`, couleurs de marque `#2F6B4F`, icônes maskable).
  - Ajout du Service Worker `public/sw.js` pour la mise en cache de l'app shell et le respect des critères stricts d'installabilité PWA.
  - Création du service PWA (`src/services/pwaService.ts`) avec détection automatique du mode autonome et écoute de `beforeinstallprompt`.
  - Bouton interactif « Installer l'application sur ce PC » dans l'écran Paramètres, visible uniquement lorsque l'installation est disponible et masqué une fois l'application installée.
- **Optimisation du cache navigateur & Balises `<head>`** :
  - Mise à jour de `index.html` avec le snippet complet d'icônes, incluant le paramètre de version `?v=2` pour forcer le rafraîchissement immédiat du cache navigateur.
  - Titre d'onglet officiel : `<title>MarmiCout — Coûts de revient & marges</title>`.
- **Synchronisation de version** :
  - Incrémentation SemVer vers `2.0.42` dans `package.json`, `src/version.ts` et `CHANGELOG.md`.

---

## [2.0.41] - 2026-11-09

### Ajouté
- **Configuration tarifaire centralisée (`src/config/pricing.ts`)** :
  - Source unique de vérité pour toutes les formules : Essai gratuit (14 jours, 0 €), Essentiel (14,90 €/mois, 149 €/an), Pro (24,90 €/mois, 249 €/an), Pro Cloud (34,90 €/mois, 349 €/an - feature flag `cloudSyncEnabled: false`), et Offre Fondateur (249 € la 1ʳᵉ année, tarif Pro Cloud garanti à vie).
  - Gestion des feature flags : `cloudSyncEnabled: false`, `founderOfferEnabled: true`, `founderSeatsLeft: null`.
  - Intégration de l'argumentaire complet et exact : « Un abonnement remboursé dès votre première fournée », « Le calcul qui convainc », « Pourquoi choisir le Cloud ? », « Positionnement » (sans citation de concurrents), et bandeau de réassurance.
  - Conformité fiscale : affichage systématique de « Prix nets, TVA non applicable (art. 293 B du CGI) ».
  - Tableau comparatif détaillé repliable (« Comparer toutes les fonctionnalités ») et FAQ tarifs interactive en accordéon.
- **Service d'abonnement & gestion des quotas (`src/services/subscriptionService.ts`)** :
  - Suivi local de la formule active, calcul des jours d'essai restants (sur 14 jours).
  - Mémorisation du choix d'intervalle de facturation (Annuel par défaut avec 2 mois offerts).
  - Gestion automatique des quotas de scans OCR avec réinitialisation le 1er de chaque mois et protection d'accès aux données existantes.
  - Système d'inscription liste d'attente email « Être prévenu » pour la future sortie de la sauvegarde Cloud.
- **Section Tarifs réutilisable (`src/components/PricingSection.tsx`)** :
  - Composant responsive 4 cartes en desktop (Essai, Essentiel, Pro, Pro Cloud ⭐ Recommandé), empilement vertical sur mobile avec affichage de Pro Cloud en tête (`order: -1`).
  - Bandeau dédié pour l'Offre Fondateur avec compteur de places masqué si `null`.
  - Modale interactive de collecte d'email pour l'option « Être prévenu du lancement » du Pro Cloud.
- **Écran « Paramètres > Abonnement » (`src/components/SubscriptionSettings.tsx`)** :
  - Affichage clair de la formule actuelle, jours d'essai restants, et barre de progression du quota mensuel de scans.
  - Changement de formule immédiat et bouton de résiliation en un clic sans aucun frais.
- **Page d'accueil / Landing Page enrichie (`src/components/WelcomeScreen.tsx`)** :
  - Intégration harmonieuse de la section Tarifs sous le formulaire d'accès direct atelier.
  - Header de navigation avec ancre `#tarifs` et accès rapide.

### Modifié
- **Scanner de factures (`src/components/InvoiceScanner.tsx`)** :
  - Décompte automatique du quota mensuel de scans OCR lors d'une analyse réussie.
  - Alerte amicale et non bloquante en cas de quota atteint avec invitation à faire évoluer la formule.
- **Paramètres (`src/components/Settings.tsx`)** :
  - Ajout des sous-onglets « Configuration & Google Sheets » et « Mon Abonnement & Quotas ».
- **Synchronisation de version** :
  - Incrémentation SemVer vers `2.0.41` dans `package.json`, `src/version.ts` et `CHANGELOG.md`.

### Ajouté
- **Sauvegardes automatiques quotidiennes Supabase via GitHub Actions** :
  - Création du workflow `.github/workflows/supabase-backup.yml` planifié quotidiennement à 03h00 UTC et déclenchable manuellement avec paramètre `force`.
  - Condition d'exécution au niveau du job (`vars.BACKUP_ENABLED == 'true' || inputs.force == true`).
  - Dumps complets via la Supabase CLI : `roles.sql` (`--role-only`), `schema.sql`, et `data.sql` (`--use-copy --data-only`).
  - Compression en archive tar.gz horodatée (`backup-YYYY-MM-DD.tar.gz`) et upload d'artefact GitHub Actions conservé pendant 30 jours.
- **Script de contrôle GitHub CLI (`scripts/backup.sh`)** :
  - Sous-commandes `on`, `off`, `status`, `run`, `download` avec vérification de l'installation et de l'authentification de `gh`.
  - Ajout des raccourcis correspondants dans `package.json` (`npm run backup:on`, etc.).
- **Protection et Documentation** :
  - Ajout des dossiers `backups/` et `backups-local/` ainsi que `*.tar.gz` au `.gitignore`.
  - Rédaction du guide complet `docs/BACKUP.md`.
- **Synchronisation de version** :
  - Incrémentation SemVer vers `2.0.40` dans `package.json`, `src/version.ts` et `CHANGELOG.md`.

## [2.0.39] - 2026-11-08

### Modifié
- **Centralisation stricte des mentions légales détaillées sur `/mentions-legales`** :
  - **Pied de page global** : remplacement des lignes détaillées par une seule ligne sobre : `« © 2026 App à la Carte · Mentions légales · Confidentialité · CGU · Contact · v2.0.39 »`. Suppression du nom de l'éditeur, du SIREN et de la mention TVA partout hors de la page dédiée.
  - **Page Contact (`Contact.tsx`)** : suppression des blocs d'identification détaillée (nom, SIREN, adresse professionnelle). Conservation de l'email officiel (`contact@appalacarte.fr`), du numéro de téléphone obligatoire (`07 69 59 04 70`) et ajout de la mention avec lien : *« Informations légales de l'éditeur : voir les Mentions légales »*.
  - **Page Paramètres & Sync (`Settings.tsx`)** : suppression du bloc étendu de l'éditeur officiel, remplacé par une ligne sobre : *« Application éditée par App à la Carte — Version 2.0.39 · Mentions légales · Confidentialité · CGU »*.
  - **Écrans pré-authentification (`WelcomeScreen`, `ExpiredScreen`) & Documents légaux (`CGU`, `Confidentialite`)** : uniformisation des pieds de page vers la formule sobre et centralisée.
- **Mise à jour du script de contrôle automatique (`scripts/verify-legal.mjs`)** :
  - Ajout du contrôle avec AVERTISSEMENT si le nom de l'éditeur, le SIREN, le SIRET, l'adresse professionnelle ou la mention fiscale « 293 B » apparaissent dans un composant autre que `MentionsLegales.tsx`.
  - Maintien du contrôle bloquant (ERREUR) en cas d'absence du lien « Mentions légales » dans le pied de page global ou sur l'écran d'accueil/connexion.
- **Synchronisation de version** :
  - Incrémentation SemVer vers `2.0.39` dans `package.json`, `src/version.ts` et `CHANGELOG.md`.

## [2.0.38] - 2026-11-08

### Modifié
- **Certification officielle des données d'entreprise (Source RNE / INPI du 28/10/2026)** :
  - Validation et confirmation des données d'identification issues de l'attestation RNE (`D:\Aplli\Mon Compte entreprise\Sedomicilier\Siren.pdf`).
  - Confirmation définitive du statut RCS : non applicable (activité libérale non réglementée, immatriculation exclusive au RNE de l'INPI — champ RCS maintenu vide sans mention superflue).
  - Validation de l'objet d'activité officiel complet enregistré au Guichet Unique.
  - Mise à jour des règles globales éditeur (`GEMINI.md`) et de la compétence globale `mentions-legales`.
- **Synchronisation de version** :
  - Incrémentation SemVer vers `2.0.38` dans `package.json`, `src/version.ts` et `CHANGELOG.md`.

## [2.0.37] - 2026-11-08

### Ajouté
- **Routes publiques stables et permanentes pour la conformité juridique** :
  - `/mentions-legales` : accessible publiquement, sans login/code, rechargement direct (F5) et partageable. Titre d'onglet : *« Mentions légales – App à la Carte »*.
  - `/confidentialite` : route dédiée pour la politique de confidentialité avec statut *« Document en cours de rédaction »*. Titre d'onglet : *« Politique de confidentialité – App à la Carte »*.
  - `/cgu` : route dédiée pour les CGU/CGV avec statut *« Document en cours de rédaction »*. Titre d'onglet : *« Conditions Générales d'Utilisation – App à la Carte »*.
- **Règles de réécriture SPA pour Vercel (`vercel.json`)** :
  - Support natif des rechargements directs (F5) et accès externes sur `/mentions-legales`, `/confidentialite`, `/cgu` sans erreur 404.
- **Redirection automatique de compatibilité** :
  - Détection automatique et redirection propre de l'ancienne adresse `/#Mentions Légales` (et ses variantes encodées) vers `/mentions-legales` avec `window.history.replaceState`.
- **Intégration systématique des liens légaux** :
  - Pied de page principal : liens directs cliquables vers `/mentions-legales`, `/confidentialite`, `/cgu`.
  - Écran de bienvenue / connexion / inscription (`WelcomeScreen`) : liens légaux visibles avant toute création de compte ou saisie de code.
  - Formulaires (`WelcomeScreen`, `Contact`, `QuoteRequest`, `Suggestions`) : mention d'information sous les boutons d'envoi avec lien vers `/confidentialite`.
  - Demande de devis & souscription (`QuoteRequest`) : ajout d'une case obligatoire d'acceptation des CGU/CGV pointant vers `/cgu`.
- **Mise à jour du script de contrôle automatique (`scripts/verify-legal.mjs`)** :
  - Vérification de l'existence des routes sans prérequis d'authentification.
  - Contrôle de la présence des règles de réécriture dans `vercel.json`.
  - Contrôle de la présence des liens dans le footer et sur l'écran de bienvenue.
  - Détection et avertissement en cas d'anciennes adresses `#Mentions Légales` ou de statut « en cours de rédaction ».
- **Synchronisation de version** :
  - Incrémentation SemVer vers `2.0.37` dans `package.json`, `src/version.ts` et `CHANGELOG.md`.

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
  - Mise à jour des QR codes d'essai dans `flyer_marmicout.html` et `flyer_marmicout2.html` pointant directement vers `https://marmicout.appalacarte.fr/`.
  - Harmonisation du domaine affiché (`marmicout.appalacarte.fr`) et de l'email officiel `contact@appalacarte.fr`.
- **Synchronisation de version** :
  - Incrémentation SemVer vers `2.0.32` dans `package.json`, `package-lock.json`, `src/version.ts` et `CHANGELOG.md`.

## [2.0.31] - 2026-11-08

### Modifié
- **Lien du QR Code et bouton de partage** :
  - Mise à jour de l'URL cible générée par le composant `InviteQRCode.tsx` vers l'adresse officielle de production directe : `https://marmicout.appalacarte.fr/`.
  - Le scan du QR code et le bouton « Copier le lien » / « Partager » redirigent désormais vers `https://marmicout.appalacarte.fr/`.
- **Synchronisation de version** :
  - Incrémentation SemVer vers `2.0.31` dans `package.json`, `package-lock.json`, `src/version.ts` et `CHANGELOG.md`.

## [2.0.30] - 2026-11-08

### Modifié
- **Déploiement Vercel & configuration domaine** :
  - Déploiement en production de l'application sur Vercel avec le domaine officiel direct `https://marmicout.appalacarte.fr` (et conservation de l'alias de secours `https://marmi-cout.vercel.app`).
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
