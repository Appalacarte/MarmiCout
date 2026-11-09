import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ChefHat,
  Sparkles,
  DollarSign,
  Store,
  Settings as SettingsIcon,
  AlertTriangle,
  Plus,
  Camera,
  MessageSquare,
  FileText,
  Mail,
  QrCode,
  ShieldCheck
} from 'lucide-react';
import './App.css'; // Nous allons vider ce fichier pour éviter les conflits

// Importation des composants
import { Dashboard } from './components/Dashboard';
import { Products } from './components/Products';
import { Purchases } from './components/Purchases';
import { Recipes } from './components/Recipes';
import { Productions } from './components/Productions';
import { Sales } from './components/Sales';
import { Stores } from './components/Stores';
import { Settings } from './components/Settings';
import { Drawer } from './components/Drawer';
import { Suggestions } from './components/Suggestions';
import { QuoteRequest } from './components/QuoteRequest';
import { Contact } from './components/Contact';
import { QRCodePage } from './components/QRCodePage';
import { ExpiredScreen } from './components/ExpiredScreen';
import { MentionsLegales } from './components/MentionsLegales';
import { Confidentialite } from './components/Confidentialite';
import { CGU } from './components/CGU';
import { WelcomeScreen } from './components/WelcomeScreen';

import { dbService, getActiveTesterCode } from './services/db';
import { markTesterCodeIssued, isTesterCodeExpired, getTesterCodeExpiryDate } from './services/testerCodes';
import { APP_VERSION } from './version';

type Tab = 'Dashboard' | 'Produits' | 'Achats' | 'Recettes' | 'Production' | 'Ventes' | 'Magasins' | 'Paramètres' | 'Suggestions' | 'Devis' | 'Contact' | 'QR Code' | 'Mentions Légales';

type LegalRoute = '/mentions-legales' | '/confidentialite' | '/cgu';

type RouteState =
  | { type: 'legal'; path: LegalRoute }
  | { type: 'app'; tab: Tab };

const resolveCurrentRoute = (): RouteState => {
  if (typeof window !== 'undefined') {
    // 1. Rediriger l'ancienne adresse « #Mentions Légales » (et ses variantes encodées)
    if (window.location.hash) {
      const raw = window.location.hash.replace('#', '');
      const decoded = decodeURIComponent(raw).trim().toLowerCase();
      if (decoded === 'mentions légales' || decoded === 'mentions-legales' || decoded === 'mentions legales') {
        const search = window.location.search || '';
        window.history.replaceState(null, '', `/mentions-legales${search}`);
        return { type: 'legal', path: '/mentions-legales' };
      }
      if (decoded === 'confidentialite' || decoded === 'confidentialité') {
        const search = window.location.search || '';
        window.history.replaceState(null, '', `/confidentialite${search}`);
        return { type: 'legal', path: '/confidentialite' };
      }
      if (decoded === 'cgu' || decoded === 'cgv') {
        const search = window.location.search || '';
        window.history.replaceState(null, '', `/cgu${search}`);
        return { type: 'legal', path: '/cgu' };
      }
    }

    // 2. Vérifier les URL propres dédiées
    const pathname = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
    if (pathname === '/mentions-legales') {
      return { type: 'legal', path: '/mentions-legales' };
    }
    if (pathname === '/confidentialite') {
      return { type: 'legal', path: '/confidentialite' };
    }
    if (pathname === '/cgu') {
      return { type: 'legal', path: '/cgu' };
    }

    // 3. Paramètre ?tab=
    try {
      const search = window.location.search;
      if (search) {
        const params = new URLSearchParams(search);
        const tabParam = params.get('tab');
        if (tabParam) {
          const decoded = decodeURIComponent(tabParam).trim();
          if (decoded.toLowerCase() === 'mentions légales' || decoded.toLowerCase() === 'mentions-legales') {
            const cleanSearch = search.replace(/[?&]tab=[^&]*/, '').replace(/^&/, '?');
            window.history.replaceState(null, '', `/mentions-legales${cleanSearch}`);
            return { type: 'legal', path: '/mentions-legales' };
          }
          const validTabs: Tab[] = ['Dashboard', 'Produits', 'Achats', 'Recettes', 'Production', 'Ventes', 'Magasins', 'Paramètres', 'Suggestions', 'Devis', 'Contact', 'QR Code', 'Mentions Légales'];
          const found = validTabs.find(t => t.toLowerCase() === decoded.toLowerCase());
          if (found) return { type: 'app', tab: found };
        }
      }
    } catch {
      // ignore
    }

    // 4. Hash standard pour les onglets applicatifs
    if (window.location.hash) {
      const raw = window.location.hash.replace('#', '');
      const decoded = decodeURIComponent(raw).trim();
      const validTabs: Tab[] = ['Dashboard', 'Produits', 'Achats', 'Recettes', 'Production', 'Ventes', 'Magasins', 'Paramètres', 'Suggestions', 'Devis', 'Contact', 'QR Code', 'Mentions Légales'];
      const found = validTabs.find(t => t.toLowerCase() === decoded.toLowerCase());
      if (found) return { type: 'app', tab: found };
    }
  }

  return { type: 'app', tab: 'Dashboard' };
};

function App() {
  const [routeState, setRouteState] = useState<RouteState>(resolveCurrentRoute);
  const [tabExtraData, setTabExtraData] = useState<Record<string, unknown> | null>(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [isMobileActionOpen, setIsMobileActionOpen] = useState(false);

  useEffect(() => {
    const handleLocationChange = () => {
      setRouteState(resolveCurrentRoute());
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const testerCode = getActiveTesterCode();
  const isExpired = testerCode ? isTesterCodeExpired(testerCode) : false;

  useEffect(() => {
    if (testerCode) markTesterCodeIssued(testerCode);
  }, [testerCode]);

  // Navigation vers une URL propre dédiée
  const navigateToPath = (path: LegalRoute | '/') => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      const target = path === '/' ? (search ? `/${search}` : '/') : (search ? `${path}${search}` : path);
      window.history.pushState(null, '', target);
      setRouteState(resolveCurrentRoute());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Mettre à jour le nombre d'alertes de stock
  const updateAlerts = () => {
    const products = dbService.getProducts();
    const lowStock = products.filter(p => p.isActive && p.stock <= p.minStockAlert).length;
    setLowStockCount(lowStock);
  };

  const activeTab = routeState.type === 'app' ? routeState.tab : 'Dashboard';

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateAlerts();
    const interval = setInterval(updateAlerts, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Gérer la navigation inter-onglets avec paramètres
  const handleNavigate = (tab: string, extraData?: Record<string, unknown>) => {
    if (tab === 'Mentions Légales') {
      navigateToPath('/mentions-legales');
      return;
    }
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const target = search ? `/${search}#${encodeURIComponent(tab)}` : `/#${encodeURIComponent(tab)}`;
    window.history.pushState(null, '', target);
    setRouteState({ type: 'app', tab: tab as Tab });
    if (extraData) {
      setTabExtraData(extraData);
    } else {
      setTabExtraData(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Effacer les données supplémentaires après le rendu pour éviter de les réappliquer en boucle
  useEffect(() => {
    if (tabExtraData !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTabExtraData(null);
    }
  }, [tabExtraData]);

  // Si l'utilisateur est sur une route légale publique dédiée, l'afficher directement
  if (routeState.type === 'legal') {
    if (routeState.path === '/mentions-legales') {
      return <MentionsLegales onBack={() => navigateToPath('/')} />;
    }
    if (routeState.path === '/confidentialite') {
      return <Confidentialite onBack={() => navigateToPath('/')} />;
    }
    if (routeState.path === '/cgu') {
      return <CGU onBack={() => navigateToPath('/')} />;
    }
  }

  // Vérifier la présence d'un code utilisateur actif / création d'espace
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const hasCode = urlParams ? (urlParams.has('code') && urlParams.get('code')!.trim().length > 0) : false;

  if (!hasCode) {
    return <WelcomeScreen />;
  }

  if (isExpired && testerCode) {
    return <ExpiredScreen code={testerCode} expiryDate={getTesterCodeExpiryDate(testerCode)} />;
  }

  // Liste des liens de navigation principale
  const menuItems = [
    { id: 'Dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'Produits', label: 'Produits & Stocks', icon: Package, badge: () => lowStockCount > 0 ? lowStockCount : undefined },
    { id: 'Achats', label: 'Achats & Entrées', icon: ShoppingCart },
    { id: 'Recettes', label: 'Recettes & Marges', icon: ChefHat },
    { id: 'Production', label: 'Productions Lot', icon: Sparkles },
    { id: 'Ventes', label: 'Ventes & Profits', icon: DollarSign },
    { id: 'Magasins', label: 'Fournisseurs', icon: Store },
    { id: 'Paramètres', label: 'Paramètres & Sync', icon: SettingsIcon },
    { id: 'Suggestions', label: 'Suggestions', icon: MessageSquare },
    { id: 'Devis', label: 'Demande de devis', icon: FileText },
    { id: 'Contact', label: 'Contact', icon: Mail },
    { id: 'Mentions Légales', label: 'Mentions Légales', icon: ShieldCheck, path: '/mentions-legales' as const },
    { id: 'QR Code', label: 'QR Code', icon: QrCode }
  ];

  // Rendu de la vue active
  const renderActiveView = () => {
    const extra = tabExtraData;

    switch (activeTab) {
      case 'Dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'Produits':
        return (
          <Products
            initialTriggerAdd={extra?.triggerAdd as any}
            onNavigate={handleNavigate}
          />
        );
      case 'Achats':
        return (
          <Purchases
            initialTriggerScan={extra?.triggerScan as any}
            initialPrefillProductId={extra?.prefillProductId as any}
          />
        );
      case 'Recettes':
        return (
          <Recipes
            initialTriggerAdd={extra?.triggerAdd as any}
            initialViewRecipeId={extra?.viewRecipeId as any}
          />
        );
      case 'Production':
        return <Productions initialTriggerAdd={extra?.triggerAdd as any} />;
      case 'Ventes':
        return <Sales initialTriggerAdd={extra?.triggerAdd as any} />;
      case 'Magasins':
        return <Stores />;
      case 'Paramètres':
        return <Settings initialSubTab={extra?.subTab as any} />;
      case 'Suggestions':
        return <Suggestions />;
      case 'Devis':
        return <QuoteRequest />;
      case 'Contact':
        return <Contact />;
      case 'Mentions Légales':
        return <MentionsLegales />;
      case 'QR Code':
        return <QRCodePage />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  const currentSettings = dbService.getSettings();

  return (
    <div className="app-container">

      {/* --- SIDEBAR LATÉRALE (PC / TABLETTE HORIZONTALE) --- */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <picture>
            <source media="(prefers-color-scheme: dark)" srcSet="/brand/logo-marmicout-fond-sombre.svg" />
            <img 
              src="/brand/icon.svg" 
              alt="MarmiCout" 
              width={32} 
              height={32} 
              style={{ display: 'inline-block', verticalAlign: 'middle', borderRadius: '8px' }} 
            />
          </picture>
          <span className="logo-text">MarmiCout</span>
        </div>

        <nav className="sidebar-menu">
          <ul>
            {menuItems.map(item => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;
              const badgeVal = item.badge ? item.badge() : undefined;

              return (
                <li key={item.id} className="menu-item">
                  <a
                    href={'path' in item && item.path ? item.path : `#${item.id}`}
                    className={`menu-link ${isActive ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if ('path' in item && item.path) {
                        navigateToPath(item.path as LegalRoute);
                      } else {
                        handleNavigate(item.id);
                      }
                    }}
                  >
                    <IconComponent size={20} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {badgeVal !== undefined && (
                      <span className="badge badge-danger" style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '10px' }}>
                        {badgeVal}
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div>{currentSettings.businessName}</div>
          <div style={{ fontSize: '11px', color: 'var(--color-dark-light)', marginTop: '2px' }}>
            MarmiCout v{APP_VERSION}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-dark-light)', marginTop: '2px' }}>
            Édité par App à la Carte
          </div>
          {(() => {
            const code = getActiveTesterCode();
            return code ? (
              <div style={{
                marginTop: '8px',
                padding: '4px 8px',
                backgroundColor: 'var(--color-warning-light)',
                color: 'var(--color-warning)',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 'bold',
                textAlign: 'center',
                border: '1px solid rgba(242, 185, 34, 0.2)'
              }}>
                🧪 Espace Testeur : {code.toUpperCase()}
              </div>
            ) : null;
          })()}
        </div>
      </aside>

      {/* --- HEADER GLOBAL (MOBILE SENSITIVE) --- */}
      <main className="main-content">

        {/* Avertissement de stock faible persistant dans le header mobile */}
        {lowStockCount > 0 && activeTab !== 'Produits' && (
          <div
            onClick={() => handleNavigate('Produits')}
            style={{
              backgroundColor: 'var(--color-danger-light)',
              color: 'var(--color-danger)',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              marginBottom: '20px',
              border: '1px solid rgba(255, 75, 75, 0.15)'
            }}
          >
            <AlertTriangle size={16} />
            <span>Attention : {lowStockCount} produit(s) en stock faible ou nul. Gérer</span>
          </div>
        )}

        {/* Rendu du composant React actif */}
        {renderActiveView()}

        {/* Pied de page global sobre conforme */}
        <footer style={{
          textAlign: 'center',
          padding: '24px 16px 40px',
          fontSize: '12px',
          color: 'var(--color-dark-light)',
          borderTop: '1px solid var(--color-border)',
          marginTop: '40px',
          lineHeight: '1.8'
        }}>
          <div>
            © 2026 App à la Carte ·{' '}
            <a
              href="/mentions-legales"
              onClick={(e) => {
                e.preventDefault();
                navigateToPath('/mentions-legales');
              }}
              style={{
                color: 'var(--color-primary)',
                fontWeight: '600',
                textDecoration: 'underline',
                padding: '0 4px',
              }}
            >
              Mentions légales
            </a>
            {' · '}
            <a
              href="/confidentialite"
              onClick={(e) => {
                e.preventDefault();
                navigateToPath('/confidentialite');
              }}
              style={{
                color: 'var(--color-primary)',
                fontWeight: '600',
                textDecoration: 'underline',
                padding: '0 4px',
              }}
            >
              Confidentialité
            </a>
            {' · '}
            <a
              href="/cgu"
              onClick={(e) => {
                e.preventDefault();
                navigateToPath('/cgu');
              }}
              style={{
                color: 'var(--color-primary)',
                fontWeight: '600',
                textDecoration: 'underline',
                padding: '0 4px',
              }}
            >
              CGU
            </a>
            {' · '}
            <button
              type="button"
              onClick={() => handleNavigate('Contact')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                cursor: 'pointer',
                fontWeight: '600',
                textDecoration: 'underline',
                padding: '0 4px',
                fontSize: 'inherit',
                fontFamily: 'inherit'
              }}
            >
              Contact
            </button>
            {' · '}
            <span>v{APP_VERSION}</span>
          </div>
        </footer>
      </main>

      {/* --- TABBAR DE NAVIGATION BASSE (MOBILE) --- */}
      <nav className="tabbar">
        <a
          href="#Dashboard"
          className={`tabbar-item ${activeTab === 'Dashboard' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); handleNavigate('Dashboard'); }}
        >
          <LayoutDashboard size={20} />
          <span>Accueil</span>
        </a>

        <a
          href="#Produits"
          className={`tabbar-item ${activeTab === 'Produits' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); handleNavigate('Produits'); }}
        >
          <div style={{ position: 'relative' }}>
            <Package size={20} />
            {lowStockCount > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-danger)' }} />
            )}
          </div>
          <span>Stocks</span>
        </a>

        {/* Bouton Central de Scan / Ajout rapide mobile */}
        <button
          className="tabbar-item tabbar-item-center"
          onClick={() => setIsMobileActionOpen(true)}
          aria-label="Actions rapides"
        >
          <Plus size={24} />
        </button>

        <a
          href="#Recettes"
          className={`tabbar-item ${activeTab === 'Recettes' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); handleNavigate('Recettes'); }}
        >
          <ChefHat size={20} />
          <span>Recettes</span>
        </a>

        <a
          href="#Ventes"
          className={`tabbar-item ${activeTab === 'Ventes' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); handleNavigate('Ventes'); }}
        >
          <DollarSign size={20} />
          <span>Ventes</span>
        </a>
      </nav>

      {/* --- DRAWER D'ACTIONS RAPIDES POUR MOBILE --- */}
      <Drawer
        title="Actions rapides"
        isOpen={isMobileActionOpen}
        onClose={() => setIsMobileActionOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0' }}>

          <button
            className="btn btn-primary"
            style={{ height: '54px', fontSize: '15px', justifyContent: 'flex-start', paddingLeft: '20px' }}
            onClick={() => {
              setIsMobileActionOpen(false);
              handleNavigate('Achats', { triggerScan: true });
            }}
          >
            <Camera size={20} style={{ marginRight: '12px' }} />
            Scanner un code-barres (Achat)
          </button>

          <button
            className="btn btn-secondary"
            style={{ height: '50px', justifyContent: 'flex-start', paddingLeft: '20px' }}
            onClick={() => {
              setIsMobileActionOpen(false);
              handleNavigate('Ventes', { triggerAdd: true });
            }}
          >
            <DollarSign size={18} style={{ marginRight: '12px', color: 'var(--color-secondary)' }} />
            Enregistrer une vente
          </button>

          <button
            className="btn btn-secondary"
            style={{ height: '50px', justifyContent: 'flex-start', paddingLeft: '20px' }}
            onClick={() => {
              setIsMobileActionOpen(false);
              handleNavigate('Production', { triggerAdd: true });
            }}
          >
            <Sparkles size={18} style={{ marginRight: '12px', color: 'var(--color-warning)' }} />
            Déclarer une production
          </button>

          <button
            className="btn btn-secondary"
            style={{ height: '50px', justifyContent: 'flex-start', paddingLeft: '20px' }}
            onClick={() => {
              setIsMobileActionOpen(false);
              handleNavigate('Produits', { triggerAdd: true });
            }}
          >
            <Package size={18} style={{ marginRight: '12px' }} />
            Créer un nouvel ingrédient
          </button>

          <button
            className="btn btn-secondary"
            style={{ height: '50px', justifyContent: 'flex-start', paddingLeft: '20px' }}
            onClick={() => {
              setIsMobileActionOpen(false);
              handleNavigate('Paramètres');
            }}
          >
            <SettingsIcon size={18} style={{ marginRight: '12px' }} />
            Aller aux paramètres
          </button>

          <button
            className="btn btn-secondary"
            style={{ height: '50px', justifyContent: 'flex-start', paddingLeft: '20px' }}
            onClick={() => {
              setIsMobileActionOpen(false);
              handleNavigate('Suggestions');
            }}
          >
            <MessageSquare size={18} style={{ marginRight: '12px', color: 'var(--color-primary)' }} />
            Boîte à suggestions
          </button>

          <button
            className="btn btn-secondary"
            style={{ height: '50px', justifyContent: 'flex-start', paddingLeft: '20px' }}
            onClick={() => {
              setIsMobileActionOpen(false);
              handleNavigate('Devis');
            }}
          >
            <FileText size={18} style={{ marginRight: '12px', color: 'var(--color-primary)' }} />
            Demande de devis
          </button>

          <button
            className="btn btn-secondary"
            style={{ height: '50px', justifyContent: 'flex-start', paddingLeft: '20px' }}
            onClick={() => {
              setIsMobileActionOpen(false);
              handleNavigate('Contact');
            }}
          >
            <Mail size={18} style={{ marginRight: '12px', color: 'var(--color-primary)' }} />
            Contact
          </button>

          <button
            className="btn btn-secondary"
            style={{ height: '50px', justifyContent: 'flex-start', paddingLeft: '20px' }}
            onClick={() => {
              setIsMobileActionOpen(false);
              navigateToPath('/mentions-legales');
            }}
          >
            <ShieldCheck size={18} style={{ marginRight: '12px', color: 'var(--color-primary)' }} />
            Mentions Légales
          </button>

          <button
            className="btn btn-secondary"
            style={{ height: '50px', justifyContent: 'flex-start', paddingLeft: '20px' }}
            onClick={() => {
              setIsMobileActionOpen(false);
              handleNavigate('QR Code');
            }}
          >
            <QrCode size={18} style={{ marginRight: '12px', color: 'var(--color-primary)' }} />
            QR Code
          </button>

          <button
            className="btn btn-danger"
            style={{ height: '44px', marginTop: '12px' }}
            onClick={() => setIsMobileActionOpen(false)}
          >
            Fermer
          </button>

        </div>
      </Drawer>

    </div>
  );
}

export default App;
