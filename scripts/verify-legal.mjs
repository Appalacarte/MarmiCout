import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 [Contrôle Légal SREN 2024] Vérification de conformité des mentions légales...');

const configPath = path.join(rootDir, 'src', 'config', 'legalConfig.ts');
const componentPath = path.join(rootDir, 'src', 'components', 'MentionsLegales.tsx');
const confidentialitePath = path.join(rootDir, 'src', 'components', 'Confidentialite.tsx');
const cguPath = path.join(rootDir, 'src', 'components', 'CGU.tsx');
const appPath = path.join(rootDir, 'src', 'App.tsx');
const welcomePath = path.join(rootDir, 'src', 'components', 'WelcomeScreen.tsx');
const vercelConfigPath = path.join(rootDir, 'vercel.json');

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
const appContent = fs.existsSync(appPath) ? fs.readFileSync(appPath, 'utf-8') : '';
const welcomeContent = fs.existsSync(welcomePath) ? fs.readFileSync(welcomePath, 'utf-8') : '';

const errors = [];
const warnings = [];

// =========================================================================
// 1. CONTRÔLES BLOQUANTS DU CONTENU DES MENTIONS LÉGALES (ERREURS)
// =========================================================================

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

// =========================================================================
// 2. CONTRÔLES BLOQUANTS DES ROUTES ET DE L'ACCESSIBILITÉ (ERREURS)
// =========================================================================

// La route /mentions-legales existe et n'exige pas d'être connecté
const routeMentionsExists = appContent.includes('/mentions-legales');
const rendersBeforeAuthCheck = appContent.indexOf("routeState.path === '/mentions-legales'") < appContent.indexOf("!hasCode") &&
  appContent.indexOf("routeState.path === '/mentions-legales'") !== -1;

if (!routeMentionsExists || !rendersBeforeAuthCheck) {
  errors.push("La route dédiée /mentions-legales doit exister et s'afficher directement sans exiger d'être connecté (avant le contrôle !hasCode).");
}

// vercel.json permet l'accès direct aux routes /mentions-legales, /confidentialite et /cgu
if (!fs.existsSync(vercelConfigPath)) {
  errors.push("Le fichier vercel.json est manquant pour assurer les réécritures SPA sur Vercel sans erreur 404.");
} else {
  try {
    const vercelContent = fs.readFileSync(vercelConfigPath, 'utf-8');
    const vercelJson = JSON.parse(vercelContent);
    const rewrites = vercelJson.rewrites || [];
    const handlesMentions = rewrites.some(r => r.source === '/mentions-legales' || r.source === '/(.*)');
    const handlesConfidentialite = rewrites.some(r => r.source === '/confidentialite' || r.source === '/(.*)');
    const handlesCGU = rewrites.some(r => r.source === '/cgu' || r.source === '/(.*)');
    
    if (!handlesMentions || !handlesConfidentialite || !handlesCGU) {
      errors.push("vercel.json ne configure pas la réécriture nécessaire pour /mentions-legales, /confidentialite ou /cgu.");
    }
  } catch (err) {
    errors.push(`Erreur de lecture ou de parsing de vercel.json : ${err.message}`);
  }
}

// Les liens vers ces trois pages sont présents dans le pied de page, sur l'écran de connexion et sur l'écran d'inscription
const footerHasMentions = appContent.includes('href="/mentions-legales"');
const footerHasConf = appContent.includes('href="/confidentialite"');
const footerHasCGU = appContent.includes('href="/cgu"');

if (!footerHasMentions || !footerHasConf || !footerHasCGU) {
  errors.push("Les liens vers /mentions-legales, /confidentialite et /cgu doivent être présents dans le pied de page principal.");
}

const welcomeHasMentions = welcomeContent.includes('href="/mentions-legales"');
const welcomeHasConf = welcomeContent.includes('href="/confidentialite"');
const welcomeHasCGU = welcomeContent.includes('href="/cgu"');

if (!welcomeHasMentions || !welcomeHasConf || !welcomeHasCGU) {
  errors.push("Les liens vers /mentions-legales, /confidentialite et /cgu doivent être visibles sur l'écran de connexion / inscription (WelcomeScreen).");
}

// =========================================================================
// 3. CONTRÔLES D'AVERTISSEMENT (AVERTISSEMENTS)
// =========================================================================

// Citation de l'ancien article 6-III
if (componentContent.includes('6-III') || configContent.includes('6-III')) {
  warnings.push("La page cite encore l'ancien « article 6-III » au lieu de « article 1-1 » de la LCEN modifiée SREN 2024.");
}

// AVERTISSEMENT si un lien utilise encore l'ancienne adresse « #Mentions Légales »
const allSrcFiles = [];
function findSrcFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      findSrcFiles(full);
    } else if (item.endsWith('.tsx') || item.endsWith('.ts') || item.endsWith('.html')) {
      allSrcFiles.push(full);
    }
  }
}
findSrcFiles(path.join(rootDir, 'src'));

for (const f of allSrcFiles) {
  const content = fs.readFileSync(f, 'utf-8');
  if (/href=["']#Mentions(\s+|%20)L[ée]gales["']/i.test(content)) {
    warnings.push(`Un lien dans ${path.relative(rootDir, f)} utilise encore l'ancienne adresse « #Mentions Légales » au lieu de /mentions-legales.`);
  }
}

// AVERTISSEMENT si /confidentialite ou /cgu affiche encore « en cours de rédaction »
if (fs.existsSync(confidentialitePath)) {
  const confContent = fs.readFileSync(confidentialitePath, 'utf-8');
  if (/en cours de r[ée]daction/i.test(confContent)) {
    warnings.push("La page /confidentialite affiche encore « Document en cours de rédaction » (à formaliser dès finalisation du texte officiel).");
  }
} else {
  warnings.push("Le composant dédié pour la page /confidentialite est introuvable.");
}

if (fs.existsSync(cguPath)) {
  const cguContent = fs.readFileSync(cguPath, 'utf-8');
  if (/en cours de r[ée]daction/i.test(cguContent)) {
    warnings.push("La page /cgu affiche encore « Document en cours de rédaction » (à formaliser dès finalisation des conditions contractuelles).");
  }
} else {
  warnings.push("Le composant dédié pour la page /cgu est introuvable.");
}

// Nom de l'éditeur apparaît plus de 2 fois
const editorNameMatches = (configContent + componentContent).match(/Hervé\s+CHAMPAGNE/gi);
const nameCount = editorNameMatches ? editorNameMatches.length : 0;
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

// =========================================================================
// 4. RAPPORT FINAL
// =========================================================================

if (warnings.length > 0) {
  console.warn('\n⚠️  AVERTISSEMENTS MENTIONS LÉGALES & CONFORMITÉ :');
  warnings.forEach(w => console.warn(`   - ${w}`));
}

if (errors.length > 0) {
  console.error('\n❌ ERREURS BLOQUANTES MENTIONS LÉGALES :');
  errors.forEach(e => console.error(`   - ${e}`));
  process.exit(1);
}

console.log('\n✅ [SUCCÈS] Mentions Légales et routes publiques 100% conformes aux exigences LCEN & SREN 2024.');
