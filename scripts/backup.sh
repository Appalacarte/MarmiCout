#!/usr/bin/env bash
# ==============================================================================
# Script de gestion des sauvegardes automatiques Supabase via GitHub Actions
# ==============================================================================

set -e

WORKFLOW_FILE="supabase-backup.yml"
VARIABLE_NAME="BACKUP_ENABLED"
LOCAL_BACKUP_DIR="./backups-local"

# Affichage de l'aide
show_help() {
  echo "Usage: ./scripts/backup.sh <commande>"
  echo ""
  echo "Commandes disponibles :"
  echo "  on        Active les sauvegardes automatiques quotidiennes (BACKUP_ENABLED=true)"
  echo "  off       Désactive les sauvegardes automatiques quotidiennes (BACKUP_ENABLED=false)"
  echo "  status    Affiche l'état de BACKUP_ENABLED et les 5 dernières exécutions"
  echo "  run       Déclenche immédiatement une sauvegarde forcée (force=true)"
  echo "  download  Télécharge la dernière archive de sauvegarde dans ./backups-local/"
  echo "  help      Affiche cette aide"
  echo ""
}

# Vérification de l'installation et de l'authentification de gh
check_gh() {
  if ! command -v gh >/dev/null 2>&1; then
    echo "❌ Erreur : La CLI GitHub (gh) n'est pas installée."
    echo "👉 Pour l'installer :"
    echo "   - Windows : winget install --id GitHub.cli"
    echo "   - macOS   : brew install gh"
    echo "   - Linux   : https://cli.github.com/"
    exit 1
  fi

  if ! gh auth status >/dev/null 2>&1; then
    echo "❌ Erreur : Vous n'êtes pas authentifié auprès de GitHub CLI."
    echo "👉 Exécutez la commande suivante pour vous connecter :"
    echo "   gh auth login"
    exit 1
  fi
}

# Action selon l'argument
case "$1" in
  on)
    check_gh
    echo "▶ Activation des sauvegardes automatiques quotidiennes..."
    gh variable set "$VARIABLE_NAME" --body true
    echo "✅ Variable $VARIABLE_NAME définie sur 'true'."
    ;;

  off)
    check_gh
    echo "▶ Désactivation des sauvegardes automatiques quotidiennes..."
    gh variable set "$VARIABLE_NAME" --body false
    echo "⏸️ Variable $VARIABLE_NAME définie sur 'false'."
    ;;

  status)
    check_gh
    echo "========================================================"
    echo "             STATUT DES SAUVEGARDES SUPABASE            "
    echo "========================================================"
    echo ""
    echo "▶ État de la variable $VARIABLE_NAME :"
    if VAR_VALUE=$(gh variable get "$VARIABLE_NAME" 2>/dev/null); then
      echo "  $VARIABLE_NAME = $VAR_VALUE"
    else
      echo "  $VARIABLE_NAME n'est pas définie (considérée comme désactivée)"
    fi
    echo ""
    echo "▶ 5 dernières exécutions du workflow ($WORKFLOW_FILE) :"
    gh run list --workflow "$WORKFLOW_FILE" -L 5
    echo ""
    ;;

  run)
    check_gh
    echo "▶ Déclenchement manuel d'une sauvegarde (avec force=true)..."
    gh workflow run "$WORKFLOW_FILE" -f force=true
    echo "✅ Sauvegarde lancée avec succès !"
    echo "👉 Pour suivre l'exécution, lancez : ./scripts/backup.sh status"
    ;;

  download)
    check_gh
    echo "▶ Recherche de la dernière sauvegarde réussie..."
    LATEST_RUN_ID=$(gh run list --workflow "$WORKFLOW_FILE" --status success -L 1 --json databaseId -q '.[0].databaseId' 2>/dev/null || true)

    if [ -z "$LATEST_RUN_ID" ]; then
      echo "❌ Aucune exécution réussie trouvée pour le workflow $WORKFLOW_FILE."
      echo "👉 Vérifiez avec : ./scripts/backup.sh status"
      exit 1
    fi

    echo "▶ Téléchargement de l'archive (Run ID: $LATEST_RUN_ID) dans $LOCAL_BACKUP_DIR..."
    mkdir -p "$LOCAL_BACKUP_DIR"
    gh run download "$LATEST_RUN_ID" --dir "$LOCAL_BACKUP_DIR"
    echo "✅ Archive téléchargée avec succès dans $LOCAL_BACKUP_DIR/ !"
    ;;

  help|--help|-h)
    show_help
    ;;

  *)
    if [ -n "$1" ]; then
      echo "❌ Commande inconnue : $1"
      echo ""
    fi
    show_help
    exit 1
    ;;
esac
