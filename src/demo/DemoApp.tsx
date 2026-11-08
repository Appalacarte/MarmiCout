import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ChefHat,
  Sparkles,
  DollarSign,
  Store,
  Settings as SettingsIcon,
  Menu,
  X
} from 'lucide-react';

import { DemoBanner } from './components/DemoBanner';
import { DemoReadOnlyModal } from './components/DemoReadOnlyModal';
import { DemoToast } from './components/DemoToast';

import { DemoDashboard } from './components/DemoDashboard';
import { DemoProducts } from './components/DemoProducts';
import { DemoPurchases } from './components/DemoPurchases';
import { DemoRecipes } from './components/DemoRecipes';
import { DemoProductions } from './components/DemoProductions';
import { DemoSales } from './components/DemoSales';
import { DemoStores } from './components/DemoStores';
import { DemoSettings } from './components/DemoSettings';

import { demoDbService, setDemoReadOnlyNotifier } from './services/demoDb';

type Tab = 'Dashboard' | 'Produits' | 'Achats' | 'Recettes' | 'Production' | 'Ventes' | 'Magasins' | 'Paramètres';

export const DemoApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard');
  const [modalAction, setModalAction] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Écouteur global pour intercepter les actions en lecture seule
  useEffect(() => {
    setDemoReadOnlyNotifier((action: string) => {
      setModalAction(action);
      setToastMessage(`${action} est disponible dans la version complète.`);
    });
    return () => setDemoReadOnlyNotifier(null);
  }, []);

  const handleNavigate = (tab: string) => {
    setActiveTab(tab as Tab);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const products = demoDbService.getProducts();
  const lowStockCount = products.filter(p => p.isActive && p.stock <= p.minStockAlert).length;

  const menuItems: { id: Tab; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; badge?: number }[] = [
    { id: 'Dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'Produits', label: 'Produits & Stocks', icon: Package, badge: lowStockCount > 0 ? lowStockCount : undefined },
    { id: 'Achats', label: 'Achats & Entrées', icon: ShoppingCart },
    { id: 'Recettes', label: 'Recettes & Marges', icon: ChefHat },
    { id: 'Production', label: 'Productions Lot', icon: Sparkles },
    { id: 'Ventes', label: 'Ventes & Marges', icon: DollarSign },
    { id: 'Magasins', label: 'Fournisseurs', icon: Store },
    { id: 'Paramètres', label: 'Paramètres', icon: SettingsIcon }
  ];

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Bannière de Démonstration supérieure */}
      <DemoBanner />

      {/* 2. Barre supérieure mobile */}
      <header className="mobile-header" style={{ display: 'none' }}>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
          aria-label="Menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <span style={{ fontWeight: '700', fontSize: '15px' }}>MarmiCout Démo</span>
        <div style={{ width: '24px' }} />
      </header>

      {/* 3. Contenu principal (Sidebar + Contenu) */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Navigation latérale desktop */}
        <aside 
          className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}
          style={{
            width: '240px',
            background: 'var(--color-white)',
            borderRight: '1px solid var(--color-border)',
            padding: '20px 12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div>
            <div style={{ padding: '0 8px 20px 8px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '8px', 
                  background: 'linear-gradient(135deg, #4f46e5, #4338ca)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' 
                }}>
                  <ChefHat size={18} />
                </div>
                <div>
                  <h1 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: 'var(--color-dark)' }}>MarmiCout</h1>
                  <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: '700' }}>MODE DÉMO</span>
                </div>
              </div>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {menuItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isActive ? '#eef2ff' : 'transparent',
                      color: isActive ? '#4338ca' : '#475569',
                      fontWeight: isActive ? '700' : '500',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className="badge badge-danger" style={{ fontSize: '10px', padding: '2px 6px' }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
            <span style={{ fontWeight: '600', color: '#1e293b' }}>Version de démonstration</span><br />
            Aucune donnée réelle n'est modifiée.
          </div>
        </aside>

        {/* Zone de contenu principale */}
        <main style={{ flex: 1, padding: '24px', background: 'var(--color-bg)', overflowY: 'auto' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {activeTab === 'Dashboard' && <DemoDashboard onNavigate={handleNavigate} />}
            {activeTab === 'Produits' && <DemoProducts onNavigate={handleNavigate} />}
            {activeTab === 'Achats' && <DemoPurchases />}
            {activeTab === 'Recettes' && <DemoRecipes />}
            {activeTab === 'Production' && <DemoProductions />}
            {activeTab === 'Ventes' && <DemoSales />}
            {activeTab === 'Magasins' && <DemoStores />}
            {activeTab === 'Paramètres' && <DemoSettings />}
          </div>
        </main>
      </div>

      {/* Modal interactif d'information lecture seule */}
      <DemoReadOnlyModal
        isOpen={Boolean(modalAction)}
        onClose={() => setModalAction(null)}
        actionName={modalAction || ''}
      />

      {/* Toast d'information */}
      <DemoToast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
};
