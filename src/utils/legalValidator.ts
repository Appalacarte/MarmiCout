import { LegalConfig } from '../config/legalConfig';

export interface LegalValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valide la conformité de la configuration des mentions légales et du contenu rendu
 * selon le droit français à jour de la loi SREN (loi n° 2024-449 du 21 mai 2024) et de la LCEN.
 */
export function validateLegalCompliance(
  config: LegalConfig,
  sourceCodeOrText?: string
): LegalValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. CONTRÔLES BLOQUANTS (ERREURS)

  // Nom et prénom de l'éditeur, avec la mention « EI »
  const hasFullName = Boolean(config.editor.fullName && config.editor.fullName.trim());
  const hasEiMention =
    Boolean(config.editor.legalForm && config.editor.legalForm.includes('EI')) ||
    Boolean(config.editor.fullEditorDesignation && config.editor.fullEditorDesignation.includes('EI'));
  if (!hasFullName || !hasEiMention) {
    errors.push("Le nom et prénom de l'éditeur avec la mention « EI » (ou Entrepreneur individuel (EI)) est obligatoire et manquant.");
  }

  // Adresse professionnelle
  if (!config.editor.address || !config.editor.address.trim()) {
    errors.push("L'adresse professionnelle de l'éditeur est obligatoire et manquante.");
  }

  // Email
  if (!config.editor.email || !config.editor.email.trim() || !config.editor.email.includes('@')) {
    errors.push("L'email de contact officiel de l'éditeur est obligatoire et manquant ou invalide.");
  }

  // Téléphone de l'éditeur (obligatoire SREN)
  if (!config.editor.phone || !config.editor.phone.trim()) {
    errors.push("Le numéro de téléphone professionnel de l'éditeur est obligatoire (loi SREN 2024) et manquant.");
  }

  // SIREN
  if (!config.editor.siren || !config.editor.siren.trim()) {
    errors.push("Le numéro SIREN de l'éditeur est obligatoire et manquant.");
  }

  // Directeur de la publication
  if (!config.editor.publicationDirector || !config.editor.publicationDirector.trim()) {
    errors.push("Le directeur de la publication est obligatoire et manquant.");
  }

  // Hébergeur : nom, adresse ET téléphone
  if (!config.host.name || !config.host.name.trim()) {
    errors.push("Le nom de l'hébergeur est obligatoire et manquant.");
  }
  if (!config.host.address || !config.host.address.trim()) {
    errors.push("L'adresse de l'hébergeur est obligatoire et manquante.");
  }
  if (!config.host.phone || !config.host.phone.trim()) {
    errors.push("Le numéro de téléphone de l'hébergeur est obligatoire (loi SREN 2024) et manquant.");
  }

  // 2. CONTRÔLES D'AVERTISSEMENT (WARNINGS)

  // En-tête : citation de l'article 1-1 au lieu de l'article 6-III
  if (config.legalBasis && config.legalBasis.includes('6-III')) {
    warnings.push("L'en-tête cite encore l'ancien « article 6-III » au lieu de « article 1-1 » de la LCEN modifiée SREN 2024.");
  }
  if (sourceCodeOrText && sourceCodeOrText.includes('6-III')) {
    warnings.push("Le texte ou composant source cite encore l'ancien « article 6-III » au lieu de « article 1-1 ».");
  }

  // Présence de champs non requis (code APE, régime fiscal/social, SIREN du domiciliataire)
  if (sourceCodeOrText) {
    if (/(code ape|6201z|activité principale)/i.test(sourceCodeOrText)) {
      warnings.push("Un champ non requis réapparaît dans la page : Code APE / Activité principale.");
    }
    if (/(micro-bic|micro-social|versement libératoire)/i.test(sourceCodeOrText)) {
      warnings.push("Des champs non requis réapparaissent dans la page : Régime fiscal / social (Micro-BIC / Micro-social).");
    }
    if (/878\s*831\s*312/i.test(sourceCodeOrText)) {
      warnings.push("Le SIREN du domiciliataire HelloDom réapparaît dans la page alors qu'il doit être supprimé.");
    }

    // Nom de l'éditeur ne doit pas apparaître plus de deux fois
    const editorNameMatches = sourceCodeOrText.match(/Hervé\s+CHAMPAGNE/gi);
    const countName = editorNameMatches ? editorNameMatches.length : 0;
    if (countName > 2) {
      warnings.push(`Le nom de l'éditeur apparaît ${countName} fois (recommandé : au maximum deux fois pour éviter les redondances).`);
    }
  }

  // Liens vers politique de confidentialité et CGU/CGV
  const hasPrivacy = config.privacyPolicy.hasPolicy || (sourceCodeOrText && /confidentialité|rgpd|privacy/i.test(sourceCodeOrText));
  const hasTerms = (config.terms.hasCGU || config.terms.hasCGV) || (sourceCodeOrText && /(cgu|cgv|conditions générales)/i.test(sourceCodeOrText));

  if (!hasPrivacy) {
    warnings.push("Aucun renvoi ou section relative à la Politique de Confidentialité (RGPD) n'a été détecté.");
  }
  if (!hasTerms) {
    warnings.push("Aucun lien vers les CGU ou CGV n'est présent (à créer ou préciser pour l'offre commerciale).");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
