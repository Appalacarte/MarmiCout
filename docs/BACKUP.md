# Sauvegardes Automatiques Quotidiennes Supabase

Ce guide explique le fonctionnement, la configuration, la restauration et l'utilisation du système de sauvegarde automatique de la base de données PostgreSQL Supabase mis en place sur le projet.

---

> [!WARNING]
> **DÉPÔT PRIVÉ REQUIS**  
> Les sauvegardes génèrent des archives contenant la structure et les données complètes de votre base de données, publiées sous forme d'artefacts GitHub Actions. **Votre dépôt GitHub DOIT impérativement être privé** afin d'éviter toute exposition de données sensibles ou confidentielles à des tiers.

---

## 1. Prérequis et Configuration Initiale sur GitHub

### A. Ajouter le secret GitHub `SUPABASE_DB_URL`

Le workflow utilise la CLI officielle Supabase et nécessite l'URL de connexion PostgreSQL en mode **Session pooler** (compatible IPv4, indispensable pour les runners GitHub Actions hébergés par GitHub).

1. Connectez-vous à votre [Dashboard Supabase](https://supabase.com/dashboard).
2. Sélectionnez votre projet.
3. Cliquez sur le bouton **Connect** (en haut à droite de l'interface).
4. Sélectionnez l'onglet **Session pooler** (port `5432` par défaut).
5. Copiez la chaîne de connexion (URI) qui se présente sous cette forme :
   ```text
   postgresql://postgres.[project-ref]:[VOTRE-MOT-DE-PASSE]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```
   *(Pensez à remplacer `[VOTRE-MOT-DE-PASSE]` par le mot de passe réel de votre base de données).*
6. Rendez-vous sur votre dépôt GitHub :
   - Allez dans **Settings** > **Secrets and variables** > **Actions**.
   - Cliquez sur le bouton vert **New repository secret**.
   - Nom : `SUPABASE_DB_URL`
   - Secret : Collez votre chaîne de connexion complète.
   - Cliquez sur **Add secret**.

> [!IMPORTANT]
> Ne commitez jamais cette URL de connexion dans Git ni dans aucun fichier de code source.

---

### B. Activer la variable de dépôt `BACKUP_ENABLED`

Par sécurité, les sauvegardes planifiées quotidiennes ne s'exécutent que si la variable de dépôt `BACKUP_ENABLED` vaut `true`.

Vous avez deux méthodes pour la créer / l'activer :

#### Méthode 1 : En une seule ligne via le script de contrôle (recommandé)
```bash
./scripts/backup.sh on
```
*(ou `npm run backup:on`)*

#### Méthode 2 : Directement sur l'interface GitHub
1. Sur votre dépôt GitHub, allez dans **Settings** > **Secrets and variables** > **Actions** > onglet **Variables**.
2. Cliquez sur **New repository variable**.
3. Nom : `BACKUP_ENABLED`
4. Valeur : `true`
5. Cliquez sur **Add variable**.

---

## 2. Fonctionnement du Workflow GitHub Actions (`supabase-backup.yml`)

Le workflow se trouve dans `.github/workflows/supabase-backup.yml` :

- **Planification automatique (`schedule`)** : Tous les jours à **03h00 UTC** (`0 3 * * *`).
- **Déclenchement manuel (`workflow_dispatch`)** : Avec une option booléenne `force` (par défaut `false`). Si `force` est coché, la sauvegarde s'exécute même si `BACKUP_ENABLED` vaut `false`.
- **Condition d'exécution** : Le job ne s'exécute que si `vars.BACKUP_ENABLED == 'true' || inputs.force == true`.
- **Étapes exécutées** :
  1. Extraction du dépôt (`actions/checkout@v4`).
  2. Installation de la CLI Supabase (`supabase/setup-cli@v1`).
  3. Dumps PostgreSQL séparés et stricts :
     - `roles.sql` : dump des rôles Supabase (`--role-only`).
     - `schema.sql` : dump complet du schéma (tables, extensions, vues, fonctions, triggers, RLS).
     - `data.sql` : dump des données brutes avec `COPY` (`--use-copy --data-only`).
  4. Compression dans une archive `backup-AAAA-MM-JJ.tar.gz`.
  5. Publication de l'artefact GitHub Actions (`supabase-backup-AAAA-MM-JJ`) avec une durée de conservation de **30 jours**.

> [!NOTE]
> En cas d'échec sur l'un des dumps (problème réseau, mot de passe incorrect, etc.), le workflow s'interrompt immédiatement avec une erreur claire et **aucune archive partielle n'est publiée**.

---

## 3. Commandes de Contrôle (`scripts/backup.sh`)

Le script `scripts/backup.sh` utilise la CLI GitHub (`gh`). Assurez-vous d'avoir installé `gh` et de vous être connecté (`gh auth login`).

### Liste des commandes :

| Commande | Équivalent NPM | Description |
| :--- | :--- | :--- |
| `./scripts/backup.sh on` | `npm run backup:on` | Active la sauvegarde quotidienne automatique (`BACKUP_ENABLED=true`) |
| `./scripts/backup.sh off` | `npm run backup:off` | Désactive la sauvegarde quotidienne automatique (`BACKUP_ENABLED=false`) |
| `./scripts/backup.sh status` | `npm run backup:status` | Affiche l'état de `BACKUP_ENABLED` et les 5 dernières exécutions du workflow |
| `./scripts/backup.sh run` | `npm run backup:run` | Déclenche immédiatement une sauvegarde forcée (`force=true`) sans attendre |
| `./scripts/backup.sh download` | `npm run backup:download` | Télécharge la dernière sauvegarde réussie dans le dossier `./backups-local/` |
| `./scripts/backup.sh help` | - | Affiche le menu d'aide du script |

---

## 4. Procédure de Restauration en Local

Pour restaurer une sauvegarde sur votre environnement Supabase local :

### Étape 1 : Récupérer et décompresser l'archive
Téléchargez l'archive via la commande :
```bash
./scripts/backup.sh download
```
Rendez-vous dans le dossier téléchargé et décompressez l'archive :
```bash
cd backups-local
tar -xzvf backup-AAAA-MM-JJ.tar.gz
```
Vous obtiendrez les trois fichiers :
- `roles.sql`
- `schema.sql`
- `data.sql`

### Étape 2 : Démarrer Supabase en local
À la racine de votre projet avec la configuration Supabase :
```bash
supabase start
```
*(Par défaut, PostgreSQL local écoute sur le port `54322`, base `postgres`, utilisateur `postgres`)*.

### Étape 3 : Restaurer avec `psql` dans l'ordre strict
Exécutez impérativement la restauration dans l'ordre suivant :

```bash
# 1. Rôles et utilisateurs
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f roles.sql

# 2. Schéma, tables, contraintes et politiques RLS
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f schema.sql

# 3. Données des tables
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f data.sql
```

---

## 5. Ce qui n'est PAS inclus dans ces sauvegardes

> [!IMPORTANT]
> **Fichiers Supabase Storage non inclus**  
> Les dumps effectués via `supabase db dump` sauvegardent l'intégralité de la base relationnelle PostgreSQL (données des tables, métadonnées, rôles, schémas).  
> **Les fichiers binaires stockés dans les buckets Supabase Storage (images, photos, documents PDF, avatars) ne sont PAS inclus dans ces sauvegardes SQL.**  
> Pour sauvegarder les objets du Storage, il convient d'utiliser les API S3 de Supabase Storage ou un script dédié de synchronisation de bucket.
