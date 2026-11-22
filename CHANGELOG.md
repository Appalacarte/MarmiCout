# Journal des Modifications (CHANGELOG)

Toutes les modifications notables apportées à ce projet sont documentées dans ce fichier. Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

---

## [2.0.72] - 2026-11-22

### Redirection des forfaits vers App à la Carte
- **Nouveau service `src/services/appalacarteLink.ts`** : construction du lien de souscription vers la page de l'appli sur App à la Carte (`/souscrire/marmicout-stock-restauration`), avec le forfait (`plan`, essai = `demo_14j`) et la périodicité (`cycle`) choisis.
- **Nouvelle popup `src/components/AppalacarteRedirectModal.tsx`** : prévient le client qu'il va être redirigé vers App à la Carte pour créer son profil et finaliser son essai ou son abonnement.
- **Section tarifs (`src/components/PricingSection.tsx`)** : tout clic sur un forfait ouvre la popup puis redirige vers App à la Carte ; forfaits chargés depuis Supabase avec repli hors connexion. Les props `onSelectPlan` / `onStartTrial` sont marquées obsolètes.
- **Synchronisation de version** : passage en `2.0.72` dans `package.json`, `package-lock.json`, `src/version.ts` et `CHANGELOG.md`.

---

## [2.0.71] - 2026-11-15

### Suppression de l'onglet Devis et envoi direct des formulaires Contact et Suggestions vers l'API centrale
- **Suppression de l'onglet « Devis » (`src/App.tsx`, `src/components/QuoteRequest.tsx`)** :
  - Retrait du type `Tab` et des listes d'onglets valides (`validTabs`).
  - Retrait de l'élément du menu latéral desktop et du tiroir d'actions rapides mobile.
  - Retrait de la route dans le switch `renderActiveView()`.
  - Suppression définitive du fichier composant `src/components/QuoteRequest.tsx`.
- **Formulaire de Contact (`src/components/Contact.tsx`)** :
  - Remplacement de l'ouverture du lien `mailto:` par un envoi direct en HTTP POST vers `{VITE_APPALACARTE_URL}/api/public/contact`.
  - Transmission des champs `name`, `email`, `subject`, `message` et `source: "Marmicout – Support"`.
  - Pré-remplissage automatique du nom et de l'e-mail avec les données du compte connecté (éditables à tout moment).
  - Affichage clair de « Message envoyé » avec validation visuelle en cas de succès, ou affichage détaillé de l'erreur en cas d'échec.
  - Conservation de l'adresse `contact@appalacarte.fr` en lien `mailto:` comme solution de secours.
- **Boîte à suggestions (`src/components/Suggestions.tsx`)** :
  - Remplacement de l'ouverture du lien `mailto:` par un envoi direct en HTTP POST vers `{VITE_APPALACARTE_URL}/api/public/contact`.
  - Ajout des champs modifiables « Votre nom » et « Votre email », pré-remplis avec le compte connecté.
  - Transmission des champs `name`, `email`, `subject`, `message` et `source: "Marmicout – Suggestion"`.
  - Affichage de « Message envoyé » en cas de succès et de l'erreur en cas d'échec.
  - Conservation de l'adresse `contact@appalacarte.fr` en lien `mailto:` comme solution de secours.
- **Service centralisé (`src/services/contactService.ts`)** :
  - Récupération unifiée de l'identité du compte connecté (`getConnectedUserInfo()`) via la session Supabase, le cache d'accès ou les réglages locaux.
  - Envoi sécurisé des messages vers l'API publique (`sendContactMessage()`).

---

## [2.0.70] - 2026-11-15

### Chargement dynamique des forfaits d'abonnement depuis Supabase (table plans) avec solution de secours hors connexion
- **Service de tarification dynamique (`src/services/pricingService.ts`)** :
  - Connexion à la table Supabase `plans` liée à l'application `marmicout-stock-restauration` dans `apps`, triée par `display_order`.
  - Prise en compte des forfaits actifs et publics (`is_active = true` et `visible_public = true`).
  - Utilisation des champs : `name`, `description`, `price_monthly`, `price_yearly`, `features`, `trial_days` et `code`.
  - Détection automatique du forfait d'essai (`code === 'demo_14j'` ou `trial_days > 0`) placé en tête, suivi des forfaits payants dans l'ordre de l'administration.
  - Enrichissement par le tableau de métadonnées spécifiques à Marmicout (`MARMICOUT_PLANS_META` : type de stockage, badge Recommandé, quotas, CTA). Si un forfait n'y figure pas (ex: forfait personnalisé), il s'affiche sans ces informations.
- **Grille tarifaire et sélection (`src/components/PricingSection.tsx`)** :
  - Affichage dynamique des forfaits chargés depuis Supabase avec mise en cache transparente.
  - Conservation de `src/config/pricing.ts` comme solution de secours en cas d'absence de réseau ou d'indisponibilité de Supabase.
  - Mention discrète « Tarifs indicatifs, hors connexion » affichée lorsque les tarifs de secours sont utilisés.
  - Comparaison fiable de la « Formule actuelle » par code de forfait avec prise en charge de la rétrocompatibilité d'essai (`trial` / `demo_14j`).
  - Grille responsive adaptative (`auto-fit`) pour afficher élégamment tout nombre de forfaits configuré dans l'admin.
- **Écran Paramètres Abonnement (`src/components/SubscriptionSettings.tsx`)** :
  - Chargement dynamique du libellé et des caractéristiques de la formule active depuis Supabase via `pricingService`.
  - Conservation du parcours d'abonnement et de résiliation via `subscriptionService`.
- **Service d'abonnement (`src/services/subscriptionService.ts`)** :
  - Prise en charge des codes personnalisés et du code d'essai `demo_14j` aux côtés de `trial`.
- **Tests unitaires (`src/services/pricingService.test.ts`)** :
  - Validation du formatage des prix, du partitionnement essai/payant, de la correspondance des codes et du mécanisme de secours hors connexion.

---

## [2.0.69] - 2026-11-15

### Alignement migration Supabase, RLS check_marmicout_access, typage UUID strict et réinitialisation de planning lors d'annulation de production
- **Migration Supabase corrigée (`supabase/migrations/20261115100000_add_planning.sql`)** :
  - Alignement des 4 politiques RLS de `marmicout_planning` avec `public.check_marmicout_access(establishment_id, 'read')` pour SELECT et `'write'` pour INSERT, UPDATE et DELETE.
  - Clés étrangères strictes : `recipe_id UUID NOT NULL REFERENCES marmicout_recipes(id) ON DELETE CASCADE` et `production_id UUID REFERENCES marmicout_productions(id) ON DELETE SET NULL`.
- **Typage et assainissement UUID (`src/services/cloudDbService.ts`, `src/services/db.ts`)** :
  - `production_id` est rigoureusement transmis à `null` (jamais de chaîne vide `""`) tant que la recette n'est pas cuisinée ou si la valeur n'est pas un UUID valide, évitant les erreurs de syntaxe Postgres.
  - Vérification systématique de validité UUID pour `recipe_id` avant toute écriture en base de données.
- **Cycle de vie production & annulation (`src/services/db.ts`, `src/components/Planning.tsx`)** :
  - Lors de la suppression ou de l'annulation d'une production liée (`dbService.deleteProduction`), la ligne de planning correspondante est automatiquement réinitialisée à `isDone: false` et `productionId: null`.
  - Bouton d'annulation interactif ajouté directement sur les cartes de recettes cuisinées dans le Planning, permettant d'annuler une production et de restaurer les stocks en un clic.
- **Gestion explicite des erreurs d'accès et d'abonnement** :
  - Détection dédiée des erreurs RLS et d'abonnement clos (`check_marmicout_access`, code `42501`) avec affichage d'un message d'erreur clair et convivial pour l'utilisateur.

---

## [2.0.68] - 2026-11-15

### Ajout de l'onglet Planning hebdomadaire, calcul des besoins en ingrédients et stocks, bouton Cuisiner et migration Supabase
- **Nouvel onglet « Planning » (`src/components/Planning.tsx`)** :
  - Vue de la semaine du lundi au dimanche avec sélecteur de semaine (précédente, aujourd'hui, suivante) et libellé calendaire dynamique.
  - Placement de recettes sur chaque jour avec choix du nombre de portions, créneau repas (midi, soir, toute la journée) et notes facultatives.
  - Grille réactive de 7 jours avec cartes de recettes planifiées, portions modulables et raccourci d'ajout rapide par jour.
- **Indicateurs financiers prévisionnels de la semaine (`src/utils/planning.ts`)** :
  - Calcul et affichage en temps réel du coût de revient prévu de la semaine (`costPerPortion * portions`).
  - Calcul du chiffre d'affaires potentiel estimé selon la marge cible définie dans les paramètres.
  - Calcul de la marge brute prévisionnelle et du taux de marge moyen.
  - Taux de réalisation des fabrications prévues sur la semaine.
- **Besoins totaux en ingrédients & détection des ruptures de stocks** :
  - Calcul automatique et agrégation des ingrédients nécessaires pour toutes les recettes planifiées de la semaine.
  - Prise en compte des conversions d'unités (équivalences g/ml, poids pièce).
  - Comparaison avec les stocks réels actuels en magasin/atelier avec badges explicites (en stock ou manquant).
  - Estimation du montant des achats nécessaires pour combler les ruptures de stocks.
  - Bouton « Ouvrir la liste de courses » qui charge directement le tiroir existant (`ShoppingListDrawer`) avec l'ensemble des recettes et portions de la semaine.
- **Bouton « Cuisiner » interactif** :
  - Sur chaque recette planifiée non encore réalisée, un bouton « Cuisiner » lance la fabrication existante (`dbService.addProduction`).
  - Déduction automatique des ingrédients et emballages des stocks avec enregistrement des mouvements de stock.
  - Incrémentation du stock de produit fini de la recette.
  - Marquage automatique de la recette planifiée comme « Cuisiné » avec badge vert de confirmation.
- **Persistance locale & architecture hybride (`src/services/db.ts`, `src/services/indexedDbService.ts`, `src/services/cloudDbService.ts`)** :
  - En mode local (Essentiel) : enregistrement exclusif sur l'appareil (IndexedDB `planning` v2 et `localStorage`).
  - En mode Cloud (Pro / Pro Cloud) : intégration complète dans `cloudDbService` (`marmicout_planning`) avec gestion d'erreurs et mise en miroir locale.
- **Migration Supabase (`supabase/migrations/20261115100000_add_planning.sql`)** :
  - Écriture de la migration créant `marmicout_planning` (multi-tenant avec isolation stricte `establishment_id` et RLS) et `demo_marmicout_planning` (lecture seule démo).
  - Prête à être appliquée dès accord de l'utilisateur.

---

## [2.0.67] - 2026-11-15

### Impression navigateur (feuille de style dédiée) : fiche technique A4, étiquettes traçabilité/DLC et liste de courses
- **Fiche technique de fabrication A4 (`src/components/print/RecipeTechSheet.tsx` & `src/components/Recipes.tsx`)** :
  - Impression d'une fiche A4 professionnelle comprenant le nom de l'établissement, le titre de la recette, sa catégorie, photo, nombre de portions cible modulable, temps de préparation, rendement, matériel et ustensiles, étapes de préparation numérotées, astuces du chef et tableau des allergènes déclarés (règlement UE n° 1169/2011 INCO).
  - Option « Avec les coûts » : affiche le coût de revient total du lot, le coût par portion, le prix de vente conseillé et la marge cible dans un encadré de gestion, ainsi que le coût par ligne d'ingrédient.
  - Sans l'option « Avec les coûts » (par défaut) : aucun prix n'apparaît (fiche dédiée pour l'atelier et la cuisine).
- **Étiquettes de traçabilité / DLC (`src/components/print/RecipeLabels.tsx` & `src/components/Recipes.tsx`)** :
  - Génération d'étiquettes contenant le nom de l'établissement, le nom du produit, la date de fabrication (par défaut aujourd'hui), la date limite calculée selon la durée de conservation saisie (DLC en jours), les allergènes obligatoires mis en gras (`<strong>`), et les consignes de conservation (+0°C à +4°C).
  - Prise en charge de 3 formats d'impression : planche A4 de 21 étiquettes (Avery 3 × 7), planche A4 de 24 étiquettes (Avery 3 × 8), ou étiquette unique par page (format thermique / individuel).
  - Choix du nombre d'étiquettes à imprimer et calcul dynamique de la date limite en direct.
- **Impression de la liste de courses (`src/components/print/ShoppingListPrint.tsx`, `src/components/ShoppingListDrawer.tsx` & `src/components/Recipes.tsx`)** :
  - Ajout du bouton « Imprimer la liste de courses » dans le tiroir principal de la liste de courses et dans la section des ingrédients manquants du détail d'une recette.
  - Impression propre sur page A4 avec case à cocher manuscrite `[ ]` pour chaque ingrédient, regroupement par fournisseur habituel ou liste globale, quantités ajustées, et zone de notes manuscrites.
- **Feuille de style d'impression native (`src/components/print/print.css` & `src/components/print/PrintPreviewModal.tsx`)** :
  - Utilisation exclusive de l'impression du navigateur (`@media print` et `window.print()`) sans nouvelle dépendance lourde.
  - Masquage intégral et strict de l'interface de l'application (menu latéral, barre d'onglets, tiroirs, boutons, modales, en-têtes) lors de l'impression via un portail dédié `#marmicout-print-zone`.
  - Aperçu avant impression interactif à l'écran dans une feuille au format papier avec barre d'outils de paramétrage.

---

## [2.0.66] - 2026-11-14

### Navigation recette ➔ produit (allergènes, équivalences), gestion ingrédients non liés et retour recette
- **Gestion des paramètres de navigation (`src/App.tsx`)** :
  - Suppression de l'effacement prématuré et synchrone de `tabExtraData` dans un `useEffect` : les paramètres restent disponibles jusqu'à leur consommation effective par la vue cible.
  - Transmission du callback `onClearExtraData` pour permettre aux composants de signaler quand ils ont exploité les données.
- **Ouverture directe du produit & positionnement (`src/components/Products.tsx`)** :
  - Recherche du produit ciblé par `initialEditProductId` à la fois dans l'état réactif et directement via `dbService.getProduct()` : garantit l'ouverture immédiate du formulaire même si la liste des produits est encore en cours de chargement initial.
  - Positionnement automatique et centrage fluide sur la section Allergènes (`#product-allergens-section`) lors du clic sur « Renseigner » depuis une recette.
  - Positionnement automatique et focus sur la section Équivalences (`#product-equivalences-section`) lors du clic sur « Préciser l'équivalence » depuis une recette.
- **Ingrédients libres non liés au stock (`src/components/Recipes.tsx`)** :
  - Pour tout ingrédient non lié au stock, la recette ne tente plus d'ouvrir un formulaire vide : elle propose explicitement deux actions ciblées :
    - « Relier dans la recette » : ouvre directement le formulaire d'édition de la recette pour sélectionner un produit du stock existant.
    - « Créer le produit » : bascule vers l'ajout de produit prérempli avec l'intitulé de l'ingrédient, positionné sur la section des allergènes.
- **Bouton « Retour à la recette » (`src/components/Products.tsx`)** :
  - Mémorisation de la recette d'origine (`returnToRecipeId` et `returnToRecipeName`).
  - Affichage d'un raccourci d'accès dans le formulaire d'édition/création du produit.
  - Affichage d'une bannière de confirmation après enregistrement avec le bouton « ↩️ Retour à la recette « [Nom de la recette] » » qui rouvre instantanément le tiroir de détail de la recette d'origine mise à jour.

---

## [2.0.65] - 2026-11-14

### Trois états allergènes produit (non renseigné, vérifié sans allergène, déclarés), filtre et alertes recettes
- **Migration SQL Supabase (`supabase/migrations/20261114221500_add_product_allergens.sql`)** :
  - Mise en accord avec l'application manuelle : `allergens TEXT[] NULL` sans `DEFAULT '{}'` (la colonne vaut `NULL` tant que le produit n'a pas été vérifié).
- **Modèle et services de données (`src/types/index.ts`, `src/services/cloudDbService.ts`, `src/services/db.ts`)** :
  - Support strict des 3 états pour un produit : `null`/`undefined` = « non renseigné » ; `[]` = « vérifié, aucun allergène » ; tableau non vide = allergènes déclarés.
  - Sauvegarde et synchronisation Cloud Supabase préservant `null` sans jamais forcer un tableau vide par défaut.
- **Formulaire Produit (`src/components/Products.tsx`)** :
  - Ajout de la case à cocher « Aucun allergène (vérifié) » permettant d'enregistrer explicitement un tableau vide `[]`.
  - Si aucune case n'est cochée (ni allergène, ni « Aucun allergène »), le produit reste « non renseigné » (`null`).
  - La modification d'un produit pour une autre raison (ex: stock, prix, fournisseur) conserve intact cet état.
  - Les suggestions d'après le nom sont présentées sous forme de bannière interactive mais ne sont jamais pré-cochées ni enregistrées automatiquement sans validation explicite de l'utilisateur.
  - Filtre « ⚠️ Non renseignés » ajouté dans la barre de recherche et filtres de la liste des produits.
- **Recettes & Alertes (`src/components/Recipes.tsx`, `src/utils/allergens.ts`)** :
  - Le badge « Sans allergène » n'apparaît que si tous les ingrédients de la recette sont liés à des produits vérifiés sans allergènes.
  - Dès qu'un produit est « non renseigné » ou qu'un ingrédient n'est pas lié au stock, affichage de l'alerte « ⚠️ Allergènes à vérifier » avec la liste précise des ingrédients concernés et un lien/bouton direct « Renseigner » ouvrant le produit.
  - Le bouton « Copier les allergènes » inclut automatiquement le détail des avertissements « ⚠️ Allergènes à vérifier pour : ... » lorsque la recette n'est pas pleinement vérifiée.
- **Tests unitaires (`src/utils/allergens.test.ts`)** :
  - Couverture complète des 3 états de vérification produit, de la condition stricte du badge « Sans allergène », de la détection des produits non renseignés (`null` et `undefined`), et du formatage de copie avec avertissements.

---

## [2.0.64] - 2026-11-14

### Gestion des 14 allergènes déclarables UE, calcul automatique et alertes recettes
- **Migration Supabase (`supabase/migrations/20261114221500_add_product_allergens.sql`)** :
  - Ajout de la colonne facultative `allergens` (tableau de texte `TEXT[] DEFAULT '{}'`) dans `marmicout_products` et `demo_marmicout_products`.
- **Formulaire Produit (`src/components/Products.tsx`, `src/utils/allergens.ts`)** :
  - Section dédiée avec cases à cocher pour les 14 allergènes à déclaration obligatoire en Europe (gluten, crustacés, œufs, poissons, arachides, soja, lait, fruits à coque, céleri, moutarde, sésame, sulfites, lupin, mollusques).
  - Détection et proposition automatique d'allergènes d'après le nom du produit (ex: farine → gluten, beurre → lait, saumon → poissons...), avec possibilité de corriger ou ajuster librement les cases cochées.
  - Bouton « Suggérer d'après le nom » et « Tout décocher ».
  - Affichage des badges d'allergènes dans le tiroir de détail d'un produit.
- **Calcul automatique et affichage dans les Recettes (`src/components/Recipes.tsx`)** :
  - Détection automatique et agrégation des allergènes à partir de l'ensemble des produits liés de la recette.
  - Affichage sous forme de badges dans la liste des recettes et dans le détail de chaque recette.
  - Alerte visuelle « ⚠️ Allergènes à vérifier » dès qu'un ingrédient n'est pas lié à un produit du stock.
  - Bouton « Copier les allergènes » dans le détail de la recette pour copier rapidement la liste formatée dans le presse-papier.
  - Mention légale d'aide et de responsabilité du professionnel conforme au Règlement UE n° 1169/2011 (INCO).
- **Tests unitaires (`src/utils/allergens.test.ts`)** :
  - Validation de la liste officielle des 14 allergènes, de la suggestion automatique par mots-clés, du calcul sur recette et du formatage.

---

## [2.0.63] - 2026-11-14

### Équivalences de conversion produit (unitWeightG, densityGPerMl), formulaire et liens recettes
- **Migration Supabase (`supabase/migrations/20261114220000_add_product_equivalences.sql`)** :
  - Ajout des colonnes facultatives `unit_weight_g` (NUMERIC NULL) et `density_g_per_ml` (NUMERIC NULL) dans `marmicout_products` et `demo_marmicout_products`.
  - Aucune suppression ni renommage de colonne.
- **Section « Équivalences » dans le formulaire produit (`src/components/Products.tsx`)** :
  - Phrases claires : « 1 [unité] pèse … g » et « 1 litre pèse … kg ».
  - Valeurs proposées avec sélection rapide en un clic : eau (1), huile (0,92), lait (1,03), farine (0,55), sucre (0,85), miel (1,4).
  - Ancrage et focus automatique `#product-equivalences-section` lors de l'ouverture ciblée depuis une recette.
- **Moteur de conversion avec équivalences (`src/utils/units.ts`)** :
  - La conversion prend en compte les équivalences du produit quand elles existent.
  - Masse ↔ Volume devient exacte avec `densityGPerMl` (`approximate = false`).
  - Comptage ↔ Masse devient possible et exacte avec `unitWeightG` (`approximate = false`).
  - Comptage ↔ Volume devient possible avec `unitWeightG` (exacte si `densityGPerMl` est aussi renseigné, sinon approximative).
  - Sans équivalence, conservation stricte du comportement existant (approximation signalée avec `≈` ou `Unités incompatibles`).
- **Lien « Préciser l'équivalence » sur les lignes de recettes (`src/components/Recipes.tsx`)** :
  - Affichage d'un lien d'action direct dès qu'une ligne présente `Unités incompatibles` ou `≈`, permettant d'ouvrir la fiche produit ciblée sur sa section d'équivalences.
- **Synchronisation Cloud & CSV (`cloudDbService.ts`, `db.ts`)** :
  - Prise en charge des deux colonnes dans le mapper `marmicout_products` et l'import/export CSV.
- **Tests unitaires exhaustifs (`src/utils/units.test.ts`)** :
  - Couverture de masse ↔ volume avec densité, comptage ↔ masse, comptage ↔ volume, et absence d'équivalence.

---

## [2.0.62] - 2026-11-14

### Affichage par fournisseur, suivi des achats et validation dans le stock
- **Regroupement par fournisseur habituel (`src/components/ShoppingListDrawer.tsx`, `src/utils/shoppingList.ts`)** :
  - Ajout d'un sélecteur de vue permettant d'afficher les articles de courses « Par fournisseur » ou en liste globale « Tous ».
  - Regroupement des articles à acheter selon le magasin habituel du produit (`mainStoreId`), avec calcul du sous-total estimé par magasin.
  - Gestion automatique des articles sans magasin ou non encore créés en stock sous le groupe dédié « Sans fournisseur ».
- **Case à cocher « Acheté » mémorisée** :
  - Chaque article dispose d'une case à cocher « Acheté » mémorisée pendant toute l'ouverture de la liste.
  - Mise en valeur visuelle immédiate de l'article avec badge « Acheté », marquage de la case et texte barré.
- **Validation et enregistrement des achats réels dans les stocks (`dbService.addPurchase`)** :
  - Ajout d'un bouton « Enregistrer mes achats » activé dès qu'au moins un article lié à un produit est coché.
  - Ouverture d'un écran dédié de validation où l'utilisateur confirme ou corrige la quantité, l'unité, le magasin et le prix total payé de chaque article, avec calcul en temps réel du prix unitaire.
  - Rien n'est enregistré dans la base de données sans validation explicite de l'utilisateur.
  - À la confirmation, les achats sont enregistrés via `dbService.addPurchase`, incrémentant automatiquement le stock et mettant à jour le PMP (Prix Moyen Pondéré).
- **Synchronisation du texte copié et de l'export CSV** :
  - Le texte copié vers le presse-papier et l'export CSV (compatible Excel avec BOM UTF-8) adoptent fidèlement le regroupement par fournisseur actif, en indiquant le magasin et le statut acheté de chaque ligne.
- **Tests unitaires dédiés (`src/utils/shoppingList.test.ts`)** :
  - Couverture complète du regroupement par fournisseur habituel, du groupe sans fournisseur, du calcul des coûts et du formatage texte / CSV.

---

## [2.0.61] - 2026-11-14

### Alertes d'écart de prix d'achat, courbe d'évolution produit et recettes sous marge cible
- **Alerte d'écart de prix d'achat à l'enregistrement (`src/components/Purchases.tsx`, `src/utils/purchasePriceAlert.ts`)** :
  - Comparaison automatique du prix unitaire (ramené à l'unité de stock du produit) avec le prix moyen d'achat précédent lors de la validation d'un achat.
  - Détection automatique si l'écart dépasse 10 % (à la hausse ou à la baisse).
  - Affichage immédiat après l'enregistrement d'un message conforme « Prix en hausse de X % » ou « Prix en baisse de X % » (boîte de dialogue native et bannière visuelle informative détaillée avec repères chiffrés).
- **Évolution du prix d'achat dans la fiche produit (`src/components/Products.tsx`)** :
  - Affichage de la liste des derniers achats avec le prix unitaire systématiquement ramené à l'unité de stock (`selectedProduct.unit`), en conservant également le prix d'achat brut d'origine si l'unité d'achat diffère.
  - Intégration d'une petite courbe vectorielle (SVG réactif) visualisant l'évolution chronologique du prix d'achat au fil du temps avec points interactifs, repères min/max et indicateur de tendance globale.
- **Liste des recettes passées sous la marge cible sur le tableau de bord (`src/components/Dashboard.tsx`, `src/utils/recipeMarginAlert.ts`)** :
  - Identification précise de toutes les recettes dont la marge réelle observée est passée sous la marge cible paramétrée (`settings.defaultTargetMargin`).
  - Détection de l'ingrédient pesant le plus lourd dans le coût de la recette (nom, coût par portion et part en pourcentage du coût total).
  - Calcul et affichage du prix de vente conseillé pour restaurer la marge cible, avec écart de prix à combler et bouton d'accès direct pour ajuster la recette.
- **Tests unitaires dédiés (`src/utils/purchasePriceAlert.test.ts`, `src/utils/recipeMarginAlert.test.ts`)** :
  - Validation exhaustive de la logique de détection de variation de prix (> 10%), du calcul de l'ingrédient principal et du prix conseillé pour rétablir la marge.

---

## [2.0.60] - 2026-11-14

### Sélecteur de Période, KPIs Dynamiques avec Écarts, Total des Achats & Graphique de Chiffre d'Affaires
- **Sélecteur de période temporel mémorisé ([`src/components/Dashboard.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Dashboard.tsx), [`src/utils/dashboardPeriod.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/utils/dashboardPeriod.ts))** :
  - Ajout d'une barre de sélection élégante avec 6 options : *Aujourd'hui*, *7 jours*, *Ce mois* (sélectionné par défaut), *Mois dernier*, *Cette année*, *Tout*.
  - Mémorisation automatique du choix utilisateur dans le `localStorage` (`marmicout_dashboard_period`).
  - Indication claire des bornes de dates et de la période de comparaison dans l'en-tête du sélecteur.
- **Indicateurs recalculés sur la période sélectionnée avec écarts comparatifs ([`src/components/Dashboard.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Dashboard.tsx))** :
  - Chiffre d'affaires, bénéfice estimé et coût moyen de production recalculés dynamiquement selon les ventes et productions de la période.
  - Recettes les plus rentables recalculées selon les ventes constatées sur la période (avec mention du nombre de portions vendues sur la période).
  - Affichage sous chaque indicateur de l'écart avec la période précédente en pourcentage et avec flèche directionnelle (`↑`, `↓`, `→` ou `—`).
- **Total des achats de la période ([`src/components/Dashboard.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Dashboard.tsx))** :
  - Nouvelle carte de mesure KPI dédiée affichant la somme totale des dépenses d'achats réalisées sur la période sélectionnée et son évolution par rapport à la période précédente.
- **Graphique de chiffre d'affaires léger et réactif sans dépendance lourde ([`src/components/Dashboard.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Dashboard.tsx))** :
  - Visualisation vectorielle SVG pure (sans bibliothèque externe supplémentaire) du chiffre d'affaires par jour ou par mois.
  - Bascule interactive « Par jour » / « Par mois », adaptée automatiquement selon l'étendue temporelle sélectionnée.
  - Survol interactif avec infobulles détaillées affichant la date, le montant en devise et le nombre de ventes.
- **Module utilitaire et tests unitaires automatisés ([`src/utils/dashboardPeriod.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/utils/dashboardPeriod.ts), [`src/utils/dashboardPeriod.test.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/utils/dashboardPeriod.test.ts))** :
  - Calculs fiables des plages calendaires, filtrages temporels, agrégation des données de graphique et calculs d'écarts comparatifs.
  - 33 assertions validées dans la suite de tests automatisée intégrée à `npm test`.

---

## [2.0.59] - 2026-11-14

### Alertes DLC / Dates Limites des Achats, Bloc Tableau de Bord & Paramètre de Délai
- **Bloc « À consommer bientôt » sur le Tableau de bord ([`src/components/Dashboard.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Dashboard.tsx))** :
  - Ajout d'une carte dédiée « À consommer bientôt » listant les achats dont la date limite (DLC / DLUO) est dépassée (rouge) ou arrive dans le délai d'alerte (orange).
  - Affichage détaillé pour chaque achat : produit, lot (`batchNo`), date limite formatée avec décompte relatif, et fournisseur lié.
  - Filtrage strict : seuls les produits dont le stock actif est supérieur à 0 sont affichés.
- **Réglage du délai d'alerte dans les Paramètres ([`src/components/Settings.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Settings.tsx), [`src/services/db.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/db.ts), [`src/services/cloudDbService.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/cloudDbService.ts))** :
  - Nouveau champ « Délai d'alerte DLC (jours) » (7 jours par défaut).
  - Stockage transparent dans les réglages applicatifs existants (localStorage & IndexedDB) sans modification de schéma ni ajout de nouvelle colonne dans la base de données Supabase.
- **Prochaine date limite sur la fiche produit ([`src/components/Products.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Products.tsx))** :
  - Affichage direct de la prochaine date limite parmi les achats récents dans le panneau de détails du produit avec badge d'état (dépassée, urgente ou normale) et mention du lot.
  - Affichage enrichi des numéros de lot et des DLC dans l'historique des achats de la fiche produit.
- **Badge d'alertes dans le menu de navigation ([`src/App.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/App.tsx))** :
  - Ajout d'un badge dynamique affichant le nombre d'alertes de date active sur l'entrée de menu « Achats & Entrées », similaire au badge de stocks faibles sur « Produits & Stocks ».
  - Bandeau d'avertissement persistant en cas d'achats à date limite dépassée ou imminente.
- **Module utilitaire et tests unitaires ([`src/utils/expiry.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/utils/expiry.ts), [`src/utils/expiry.test.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/utils/expiry.test.ts))** :
  - Fonctions pures pour le calcul d'écart calendaire, le formatage, le filtrage des achats expirants et l'extraction de la prochaine date limite par produit.
  - Suite de tests unitaires automatisée validant les règles d'expiration et de filtrage.

---

## [2.0.58] - 2026-11-14

### Connexion et Configuration Directes de Google Sheets dans la Carte de Synchronisation
- **Saisie immédiate et intuitive ([`src/components/Settings.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Settings.tsx))** :
  - Ajout d'un champ direct dans la carte « Synchronisation Google Sheets » permettant de coller le lien ou l'ID de son document et de cliquer sur « Connecter ».
  - Activation immédiate des boutons « 🔄 Importer en direct de Google Sheets » et « 📤 Envoyer mes données vers Google Sheets » sans devoir chercher dans le formulaire de gauche.
  - Possibilité de modifier ou déconnecter le Google Sheet en un clic via les boutons dédiés.
  - Champ de saisie direct pour l'URL Web App Apps Script avec bouton « Enregistrer URL » pour l'export.
- **Sécurisation de l'export CSV ([`src/services/db.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/db.ts))** :
  - Référence stricte `dbService.` au lieu de `this.` dans `exportToCSV` pour garantir un fonctionnement sans faille lors de tout appel déstructuré.

---

## [2.0.57] - 2026-11-14

### Suppression de l'ID Google Sheet en Dur, Import/Export Cloud & Annulation des Fabrications
- **Nettoyage et sécurisation Google Sheets ([`src/services/db.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/db.ts), [`src/components/Settings.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Settings.tsx))** :
  - Suppression intégrale de l'ID Google Sheet hardcodé (`1SU8ypH5aufwKVoZLlCfhcw6nwdS6nBwNDvj8hKr0F2k`) dans `INITIAL_SETTINGS` et élimination de sa réimposition automatique au démarrage dans `initDB`.
  - Par défaut, `googleSheetId` et `googleSheetLink` sont vides (`''`), et les réglages personnalisés de l'utilisateur ne sont jamais écrasés.
  - Gestion propre et soignée de l'écran Paramètres lorsqu'aucun Google Sheet n'est configuré (encart explicatif clair, désactivation des boutons de synchronisation/envoi).
- **Importation & Exportation CSV et Google Sheets adaptées au Cloud ([`src/services/db.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/db.ts), [`src/components/Settings.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Settings.tsx))** :
  - `exportToCSV` et l'envoi vers Google Sheets lisent dynamiquement les données du mode en cours (Cloud via cache mémoire/Supabase, ou Local via localStorage/IndexedDB).
  - `importFromCSV` devient asynchrone : en mode Cloud, l'importation passe directement par les méthodes existantes de `dbService` (`saveProduct`, `saveStore`, `saveRecipe`, `savePurchase`, `saveProduction`, `saveSale`, `addStockMovement`, etc.).
  - Conservation stricte des liens et relations inter-tables via une génération déterministe d'identifiants UUID (`toDeterministicUUID`) pour tous les identifiants non-UUID (magasins, produits, recettes, fabrications, mouvements de stock).
  - Affichage précis et vérifié du nombre exact de lignes synchronisées ou message d'erreur explicite en cas d'anomalie.
  - Déclenchement automatique de l'événement `marmicout-data-synced` pour rafraîchir instantanément toutes les vues de l'application après import.
- **Annulation des Fabrications ([`src/components/Productions.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Productions.tsx), [`src/services/db.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/db.ts), [`src/services/cloudDbService.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/services/cloudDbService.ts))** :
  - Ajout d'une colonne « Actions » et d'un bouton « Annuler » avec confirmation sur chaque fabrication dans l'historique.
  - Avertissement renforcé si le stock de produit fini restant est inférieur aux portions produites (cas où une partie ou la totalité du lot a déjà été vendue).
  - Nouvelle méthode `deleteProduction` dans `dbService` et `cloudDbService` :
    - Réintégration en stock des ingrédients et emballages consommés (sur la base des mouvements de stock `PRODUCTION_CONSOMMATION` liés à la fabrication).
    - Déduction des portions produites du stock de produits finis de la recette (avec mise à jour Supabase et locale).
    - Suppression sécurisée de la fabrication et de ses mouvements de stock, aussi bien en mode Cloud qu'en mode Local.
    - Bannière de confirmation visuelle après annulation réussie.

---

## [2.0.56] - 2026-11-14

### Détection de Doublons à la Saisie, Suggestions Interactives, Avertissements et Liaison Rapide
- **Module partagé de détection de doublons ([`src/utils/productDuplicate.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/utils/productDuplicate.ts))** :
  - Normalisation robuste insensible à la casse, aux accents (NFD), aux espaces superflus et au pluriel français (`singularizeFrenchToken` : `-s`, `-x`, `-eaux`, `-eux`, `-aux`, exceptions culinaires comme `yeux` / `aulx`).
  - Comparaison symétrique permettant à « olive noire » de trouver « Olives noires » et inversement.
  - Détection exacte de doublon (`isExactProductNameMatch`, `findExactDuplicateProduct`) tolérant également l'ordre des mots.
  - Recherche graduée de suggestions (`searchDuplicateSuggestions`) dès la première lettre saisie, ordonnée par score de pertinence (correspondance exacte > préfixe > sous-chaîne > correspondance des tokens).
  - Prise en compte de tous les produits existants, y compris les produits inactifs avec la mention `(désactivé)`.
- **Composant réutilisable de suggestions ([`src/components/ProductDuplicateSuggestions.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/ProductDuplicateSuggestions.tsx))** :
  - Affichage sous le champ de saisie de la liste des correspondances (5 maximum) avec nom, marque, stock formaté et unité (`Stock : X kg`).
  - Badge spécifique pour les produits désactivés (`désactivé`).
  - Bouton interactif avec libellé contextuel (`Modifier →`, `Sélectionner →`, `Relier →`).
  - Bannière d'avertissement jaune `⚠️ Ce produit existe déjà` dès que le nom correspond exactement après normalisation.
- **Formulaire Produit ([`src/components/Products.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Products.tsx))** :
  - En mode « Ajouter un produit » : affichage dynamique des suggestions dès le 1er caractère tapé dans « Nom du produit/ingrédient ».
  - Un clic sur une suggestion ferme le formulaire d'ajout et bascule directement sur le formulaire d'édition de ce produit existant.
  - En mode « Modifier le produit » : masquage de la liste de suggestions, avec conservation de l'avertissement si le nom saisi correspond à un autre produit existant (`ignoreProductId`).
  - Blocage/confirmation avant enregistrement si le nom normalisé correspond exactement à un produit existant (`window.confirm`).
- **Création rapide dans « Nouvel Achat » ([`src/components/Purchases.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Purchases.tsx))** :
  - Recherche en temps réel de doublons lors de la saisie dans le tiroir de création rapide de produit.
  - Un clic sur une suggestion ferme le tiroir et sélectionne automatiquement le produit existant dans le formulaire d'achat (avec son unité et son magasin).
  - Demande de confirmation avant enregistrement en cas de doublon exact.
- **Création rapide « + Ajouter à mes produits » ([`src/components/Recipes.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Recipes.tsx) et [`src/components/ShoppingListDrawer.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/ShoppingListDrawer.tsx))** :
  - Recherche dynamique de doublons dans la boîte de dialogue de confirmation de création rapide.
  - Un clic sur une suggestion relie directement l'ingrédient au produit existant sélectionné sans créer de nouveau produit (dans le détail de la recette, dans le formulaire de recette ou dans la liste de courses).
  - Réactivation automatique si le produit sélectionné était inactif.
  - Demande de confirmation avant enregistrement si un doublon exact est soumis.
- **Tests Automatisés ([`src/utils/productDuplicate.test.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/utils/productDuplicate.test.ts))** :
  - Suite de tests complète validant la singularisation française, la normalisation, la détection de doublons exacts, la recherche dès la première lettre (« o »), le plafonnement à 5 résultats et l'inclusion des produits désactivés.

---

## [2.0.55] - 2026-11-14

### Unités Compatibles aux Achats, Création Rapide Produit avec Confirmation, Conversion en Édition & Lisibilité des Stocks
- **Formulaire « Nouvel Achat » ([`src/components/Purchases.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Purchases.tsx))** :
  - Remplacement de l'unité fixe par un menu déroulant d'unités compatibles avec le produit sélectionné (`kg` : `kg`, `g` ; `l` : `l`, `cl`, `ml` ; comptage/pièce : unité seule), sélectionnée par défaut sur l'unité du produit.
  - Ajout en temps réel sous le prix unitaire calculé de la ligne `« soit X €/[unité du stock] »` lorsque l'unité d'achat sélectionnée diffère de l'unité de stock.
  - Conservation de la conversion automatique de quantité par `dbService.addPurchase` vers l'unité de stock, garantissant la justesse du stock et du prix moyen pondéré (PMP).
- **Scanner de Factures ([`src/components/InvoiceScanner.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/InvoiceScanner.tsx))** :
  - Menu déroulant d'unités compatibles sur chaque ligne d'article détectée.
  - Affichage sous le prix unitaire de la ligne `« soit X €/[unité du stock] »` lorsque l'unité d'achat diffère de l'unité du produit lié.
  - Création automatique des nouveaux articles (`productId === 'NEW'`) avec nom nettoyé et unité de stock logique.
- **Création Rapide « + Ajouter à mes produits » ([`src/components/Recipes.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Recipes.tsx) et [`src/components/ShoppingListDrawer.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/ShoppingListDrawer.tsx))** :
  - Nettoyage automatique des noms de produits (`cleanProductName`) retirant les suffixes entre parenthèses (`(g)`, `(cs)`, `(cc)`, `(haché)`, `(râpé)`, etc.).
  - Détermination de l'unité de stock logique (`getLogicalStockUnit`) : `g` ou `kg` donne `kg` ; `ml`, `cl`, `l`, `cs` ou `cc` donne `l` ; sinon `pièce`.
  - Affichage préalable d'une boîte de dialogue de confirmation avec le nom et l'unité de stock modifiables avant création et liaison.
- **Formulaire d'Édition Produit ([`src/components/Products.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Products.tsx))** :
  - En cas de changement vers une unité compatible (ex: `g` vers `kg`, `ml` vers `l`) : conversion automatique instantanée du stock actuel (ex: 4 g → 0,004 kg), du seuil d'alerte et du prix d'achat moyen (ex: un prix au g devient un prix au kg via le facteur de conversion).
  - En cas de changement vers une unité incompatible (ex: `g` vers `pièce`) : demande explicite de confirmation avertissant que le stock et le prix ne peuvent pas être convertis automatiquement et doivent être ressaisis, avec déverrouillage des champs.
- **Lisibilité Générale des Produits et Stocks** :
  - Affichage du stock avec un nombre lisible plafonné à 2 décimales (`formatStock`, ex: `10`, `1,5`, `1,25`, sans zéros inutiles).
  - Nettoyage systématique des suffixes d'unités dans les noms de produits sur l'ensemble des listes, menus déroulants et tableaux ([`Products.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Products.tsx), [`Purchases.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Purchases.tsx), [`Recipes.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Recipes.tsx), [`ShoppingListDrawer.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/ShoppingListDrawer.tsx), [`Sales.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Sales.tsx), [`Dashboard.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/Dashboard.tsx), [`RecipeScanner.tsx`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/components/RecipeScanner.tsx)).
- **Tests Automatisés ([`src/utils/units.test.ts`](file:///d:/Aplli/Marmicout/Appli%20Marmicout/src/utils/units.test.ts))** :
  - Extension de la suite de tests (14/14 tests réussis) couvrant `cleanProductName`, `getLogicalStockUnit`, `getCompatiblePurchaseUnits`, `formatStock` et `convertProductUnitValues`.

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
