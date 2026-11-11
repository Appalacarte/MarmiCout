import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const marmicoutRoot = path.resolve(__dirname, '..');
const centralLegalPath = path.resolve(marmicoutRoot, '..', '..', 'Créateur_application', 'src', 'config', 'legal.ts');

console.log('🔄 Synchronisation de la configuration légale depuis App à la Carte (source unique de vérité)...');

if (!fs.existsSync(centralLegalPath)) {
  console.warn(`⚠️ Fichier central introuvable à : ${centralLegalPath}. Utilisation de la configuration par défaut.`);
  process.exit(0);
}

const centralContent = fs.readFileSync(centralLegalPath, 'utf-8');

// Extraction des données de legal.ts
const extractValue = (pattern) => {
  const match = centralContent.match(pattern);
  return match ? match[1] : '';
};

const hostAddress = extractValue(/host:\s*{[\s\S]*?address:\s*['"]([^'"]+)['"]/);
const hostPhone = extractValue(/host:\s*{[\s\S]*?phone:\s*['"]([^'"]+)['"]/);
const editorName = extractValue(/editor:\s*{[\s\S]*?name:\s*['"]([^'"]+)['"]/);
const editorAddress = extractValue(/editor:\s*{[\s\S]*?address:\s*['"]([^'"]+)['"]/);
const editorPhone = extractValue(/editor:\s*{[\s\S]*?phone:\s*['"]([^'"]+)['"]/);
const editorEmail = extractValue(/editor:\s*{[\s\S]*?email:\s*['"]([^'"]+)['"]/);
const editorSiren = extractValue(/editor:\s*{[\s\S]*?siren:\s*['"]([^'"]+)['"]/);
const editorSiret = extractValue(/editor:\s*{[\s\S]*?siret:\s*['"]([^'"]+)['"]/);

const targetFile = path.join(marmicoutRoot, 'src', 'config', 'legalConfig.ts');

const generatedConfig = `/**
 * CE FICHIER EST GÉNÉRÉ AUTOMATIQUEMENT DEPUIS src/config/legal.ts D'APP À LA CARTE.
 * NE PAS MODIFIER DIRECTEMENT. SOURCE UNIQUE DE VÉRITÉ : Créateur_application/src/config/legal.ts
 */

export interface LegalConfig {
  legalBasis: string;
  editor: {
    commercialName: string;
    fullName: string;
    legalForm: string;
    fullEditorDesignation: string;
    address: string;
    siren: string;
    siret: string;
    rcs?: string;
    phone: string;
    phoneRaw: string;
    email: string;
    publicationDirector: string;
  };
  tva: {
    mention: string;
  };
  host: {
    name: string;
    address: string;
    phone: string;
    phoneRaw: string;
    website: string;
  };
  registrar: {
    name: string;
    address: string;
    phone: string;
    phoneRaw: string;
    website: string;
  };
  privacyPolicy: {
    hasPolicy: boolean;
    dataPrivacyFrameworkMentioned: boolean;
    cookiePolicyMentioned: boolean;
    url?: string;
  };
  terms: {
    hasCGU: boolean;
    hasCGV: boolean;
    urlCGU?: string;
    urlCGV?: string;
  };
}

export const LEGAL_CONFIG: LegalConfig = {
  legalBasis:
    "Conformément à l'article 1-1 de la loi n° 2004-575 du 21 juin 2004 pour la Confiance dans l'Économie Numérique (LCEN), modifiée par la loi n° 2024-449 du 21 mai 2024 (SREN), et à l'article 19 de cette même loi.",
  editor: {
    commercialName: "App à la Carte",
    fullName: "${editorName || 'Hervé CHAMPAGNE'}",
    legalForm: "Entrepreneur individuel (EI)",
    fullEditorDesignation: "Hervé CHAMPAGNE, Entrepreneur individuel (EI)",
    address: "${editorAddress || '173 rue de Courcelles, 75017 Paris, France (domiciliation HelloDom)'}",
    siren: "${editorSiren || '132 021 098'}",
    siret: "${editorSiret || '132 021 098 00018'}",
    rcs: "", // Activité libérale non réglementée au RNE (INPI), non inscrit au RCS
    phone: "${editorPhone || '07 69 59 04 70'}",
    phoneRaw: "+33769590470",
    email: "${editorEmail || 'contact@appalacarte.fr'}",
    publicationDirector: "l'éditeur",
  },
  tva: {
    mention: "TVA non applicable, article 293 B du CGI.",
  },
  host: {
    name: "Vercel Inc.",
    address: "${hostAddress || '440 N Barranca Ave #4133, Covina, CA 91723, USA'}",
    phone: "${hostPhone || '+1 951-383-6898'}",
    phoneRaw: "+19513836898",
    website: "https://vercel.com",
  },
  registrar: {
    name: "OVHcloud (OVH SAS)",
    address: "2 rue Kellermann, 59100 Roubaix, France",
    phone: "+33 9 72 10 10 07",
    phoneRaw: "+33972101007",
    website: "https://www.ovhcloud.com",
  },
  privacyPolicy: {
    hasPolicy: true,
    dataPrivacyFrameworkMentioned: true,
    cookiePolicyMentioned: true,
  },
  terms: {
    hasCGU: false,
    hasCGV: false,
  },
};
`;

fs.writeFileSync(targetFile, generatedConfig, 'utf-8');
console.log('✅ Configuration légale Marmicout synchronisée avec succès depuis App à la Carte.');
