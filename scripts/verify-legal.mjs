import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 [Contrôle Légal SREN 2024] Vérification de conformité des mentions légales...');

const configPath = path.join(rootDir, 'src', 'config', 'legalConfig.ts');
const componentPath = path.join(rootDir, 'src', 'components', 'MentionsLegales.tsx');

if (!fs.existsSync(configPath)) {
  console.error('❌ ERREUR : Le fichier de configuration src/config/legalConfig.ts est introuvable.');
  process.exit(1);
}

if (!fs.existsSync(componentPath)) {
  console.error('❌ ERREUR : Le composant src/components/MentionsLegales.tsx est introuvable.');
  process.exit(1);
}

const configContent = fs.readFileSync(configPath, 'utf-8');
const componentContent = fs.readFileSync(componentPath, 'utf-8');

const errors = [];
const warnings = [];

// 1. Contrôles Bloquants (ERREURS)

// Nom et prénom avec EI
const hasEditorConfig = configContent.includes('Hervé CHAMPAGNE') && configContent.includes('EI');
const rendersEditor = componentContent.includes('LEGAL_CONFIG.editor.fullEditorDesignation') ||
  (componentContent.includes('Hervé CHAMPAGNE') && componentContent.includes('EI'));
if (!hasEditorConfig || !rendersEditor) {
  errors.push("Nom/prénom de l'éditeur ou mention « EI » manquante dans la configuration ou l'affichage.");
}

// Adresse professionnelle
const hasAddressConfig = configContent.includes('173 rue de Courcelles') && configContent.includes('75017 Paris');
const rendersAddress = componentContent.includes('LEGAL_CONFIG.editor.address') || componentContent.includes('173 rue de Courcelles');
if (!hasAddressConfig || !rendersAddress) {
  errors.push("Adresse professionnelle de l'éditeur (173 rue de Courcelles, 75017 Paris) manquante.");
}

// Email
const hasEmailConfig = configContent.includes('contact@appalacarte.fr');
const rendersEmail = componentContent.includes('LEGAL_CONFIG.editor.email') || componentContent.includes('contact@appalacarte.fr');
if (!hasEmailConfig || !rendersEmail) {
  errors.push("Email officiel (contact@appalacarte.fr) manquant.");
}

// Téléphone éditeur (07 69 59 04 70 / tel:+33769590470) - OBLIGATOIRE SREN 2024
const hasPhoneConfig = configContent.includes('07 69 59 04 70') && (configContent.includes('+33769590470') || configContent.includes('tel:'));
const rendersPhone = (componentContent.includes('LEGAL_CONFIG.editor.phone') && componentContent.includes('tel:')) ||
  componentContent.includes('tel:+33769590470');
if (!hasPhoneConfig || !rendersPhone) {
  errors.push("Numéro de téléphone de l'éditeur (07 69 59 04 70) obligatoire (SREN 2024) et manquant avec lien tel:+33769590470.");
}

// SIREN (132 021 098)
const hasSirenConfig = configContent.includes('132 021 098');
const rendersSiren = componentContent.includes('LEGAL_CONFIG.editor.siren') || componentContent.includes('132 021 098');
if (!hasSirenConfig || !rendersSiren) {
  errors.push("Numéro SIREN (132 021 098) manquant.");
}

// Directeur de la publication
const hasPubDirConfig = configContent.includes('publicationDirector');
const rendersPubDir = componentContent.includes('publicationDirector') ||
  componentContent.includes("Directeur de la publication") ||
  componentContent.includes("Directrice de la publication");
if (!hasPubDirConfig || !rendersPubDir) {
  errors.push("Mention du Directeur de la publication manquante.");
}

// Hébergeur : nom, adresse ET téléphone (OBLIGATOIRES)
const hasHostName = configContent.includes('Vercel Inc.');
const hasHostAddr = configContent.includes('340 S Lemon Ave') || configContent.includes('Walnut');
const hasHostPhone = configContent.includes('+1 951-383-6898') || configContent.includes('+19513836898');
const rendersHost = componentContent.includes('LEGAL_CONFIG.host.name') || componentContent.includes('Vercel Inc.');
const rendersHostPhone = componentContent.includes('LEGAL_CONFIG.host.phone') || componentContent.includes('+1 951-383-6898');

if (!hasHostName || !hasHostAddr || !hasHostPhone || !rendersHost || !rendersHostPhone) {
  errors.push("Hébergeur incomplet : le nom (Vercel Inc.), l'adresse (340 S Lemon Ave #4133 Walnut) ET le téléphone (+1 951-383-6898) sont obligatoires.");
}

// 2. Contrôles d'Avertissement (AVERTISSEMENTS)

// Citation de l'ancien article 6-III
if (componentContent.includes('6-III') || configContent.includes('6-III')) {
  warnings.push("La page cite encore l'ancien « article 6-III » au lieu de « article 1-1 » de la LCEN modifiée SREN 2024.");
}

// Nom de l'éditeur apparaît plus de 2 fois
const editorNameMatches = (configContent + componentContent).match(/Hervé\s+CHAMPAGNE/gi);
const nameCount = editorNameMatches ? editorNameMatches.length : 0;
// In config: fullName: "Hervé CHAMPAGNE", fullEditorDesignation: "...". In component: JSX comments / static.
if (nameCount > 4) { // 2 in config + at most 2 in component
  warnings.push(`Le nom de l'éditeur apparaît trop souvent (${nameCount} occurrences détectées, recommandé : max 2 dans la page).`);
}

// Champs non requis réapparus
if (/code ape|6201z|activité principale/i.test(componentContent)) {
  warnings.push("Un champ non requis est présent dans le composant : Code APE / Activité principale.");
}
if (/micro-bic|micro-social/i.test(componentContent)) {
  warnings.push("Des mentions de régime fiscal/social personnel (Micro-BIC / Micro-social) sont présentes.");
}
if (/878\s*831\s*312/.test(componentContent)) {
  warnings.push("Le SIREN du domiciliataire HelloDom est encore présent.");
}

// Présence politique de confidentialité et CGU/CGV
if (!/confidentialité|rgpd/i.test(componentContent)) {
  warnings.push("Aucun renvoi ou section relative à la Politique de Confidentialité (RGPD) n'a été détecté.");
}
if (!/cgu|cgv|conditions générales/i.test(componentContent)) {
  warnings.push("Aucun renvoi vers les CGU/CGV n'a été détecté.");
}

// 3. Rapport final
if (warnings.length > 0) {
  console.warn('\n⚠️  AVERTISSEMENTS MENTIONS LÉGALES :');
  warnings.forEach(w => console.warn(`   - ${w}`));
}

if (errors.length > 0) {
  console.error('\n❌ ERREURS BLOQUANTES MENTIONS LÉGALES :');
  errors.forEach(e => console.error(`   - ${e}`));
  process.exit(1);
}

console.log('\n✅ [SUCCÈS] Mentions Légales 100% conformes aux exigences LCEN & SREN 2024.');
