import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Clock,
  CreditCard,
  Building,
  Download,
  ExternalLink,
  Loader2,
  CheckCircle2,
  UserCheck
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import {
  accessVerificationService,
  AccessVerificationResult,
} from '../services/accessVerificationService';
import { dbService } from '../services/db';
import { exportAllDataAsJSON } from '../utils/exportAllData';
import { APP_VERSION } from '../version';

const APPALACARTE_URL = import.meta.env.VITE_APPALACARTE_URL || 'https://appalacarte.fr';

interface MarmicoutAccessGateProps {
  children: React.ReactNode;
}

export const MarmicoutAccessGate: React.FC<MarmicoutAccessGateProps> = ({ children }) => {
  const [accessState, setAccessState] = useState<AccessVerificationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [cloudError, setCloudError] = useState<{ title: string; details: string; timestamp: number } | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleCloudError = (e: Event) => {
      const customEvt = e as CustomEvent<{ title: string; details: string; timestamp: number }>;
      if (customEvt.detail) {
        setCloudError(customEvt.detail);
      }
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('marmicout-cloud-error', handleCloudError);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('marmicout-cloud-error', handleCloudError);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1. Abonnement au service de vérification
    const unsubscribe = accessVerificationService.subscribe((res) => {
      if (!isMounted) return;
      setAccessState(res);
      setLoading(false);

      // Si client payant authentifié, supprimer tout code testeur résiduel de l'URL
      if (
        res.hasAccess &&
        (res.planCode === 'pro' || res.planCode === 'pro_cloud' || res.planCode === 'essentiel') &&
        typeof window !== 'undefined'
      ) {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.has('code') || searchParams.has('sso_token')) {
          searchParams.delete('code');
          searchParams.delete('sso_token');
          const cleanSearch = searchParams.toString();
          const newUrl =
            window.location.pathname +
            (cleanSearch ? `?${cleanSearch}` : '') +
            window.location.hash;
          window.history.replaceState(null, '', newUrl);
        }
      }

      if (
        res.hasAccess &&
        (res.planCode === 'pro' ||
          res.planCode === 'pro_cloud' ||
          res.planCode === 'demo_14j' ||
          res.status === 'demo' ||
          res.status === 'demo_active')
      ) {
        dbService.syncFromCloud().catch((err) => {
          console.error('[Marmicout] Erreur synchronisation initiale:', err);
        });
      }
    });

    // 2. Échange du jeton signé à usage unique (sso_token) contre une session Supabase puis nettoyage immédiat de l'URL
    async function initAccess() {
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const ssoToken = searchParams.get('sso_token');

        if (ssoToken) {
          // Suppression immédiate du jeton signé et de tout code testeur dans l'URL
          searchParams.delete('sso_token');
          searchParams.delete('code');
          const cleanSearch = searchParams.toString();
          const cleanUrl =
            window.location.pathname +
            (cleanSearch ? `?${cleanSearch}` : '') +
            window.location.hash;
          window.history.replaceState(null, '', cleanUrl);

          try {
            const res = await fetch(`${APPALACARTE_URL}/api/auth/sso-exchange`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ssoToken,
                appSlug: 'marmicout-stock-restauration',
              }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.success && data.access_token) {
              await supabase.auth.setSession({
                access_token: data.access_token,
                refresh_token: data.refresh_token || '',
              });
            }
          } catch (ssoErr) {
            console.error('[Marmicout] Erreur échange jeton SSO:', ssoErr);
          }
        }
      }

      try {
        await accessVerificationService.verifyAccess();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initAccess();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Écran de chargement
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: '#94a3b8',
        fontFamily: "'Inter', sans-serif",
      }}>
        <Loader2 size={40} className="animate-spin text-indigo-500" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', fontSize: '14px', fontWeight: '500' }}>
          Vérification sécurisée de votre accès Marmicout...
        </p>
      </div>
    );
  }

  // Si non connecté : écran d'authentification centralisée
  if (accessState?.mode === 'unauthenticated') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        padding: '24px',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '44px 36px',
          maxWidth: '460px',
          width: '100%',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          textAlign: 'center',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 10px 25px rgba(79, 70, 229, 0.35)',
          }}>
            <UserCheck size={32} color="#ffffff" />
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
            Connexion requise
          </h1>
          <p style={{ fontSize: '14px', color: '#475569', marginBottom: '24px', lineHeight: '1.6' }}>
            Connectez-vous avec votre compte central <strong>App à la Carte</strong> pour accéder à votre espace Marmicout et synchroniser vos données.
          </p>

          <a
            href={accessState.actionUrl || `${APPALACARTE_URL}/auth/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '14px 20px',
              background: '#4f46e5',
              color: '#ffffff',
              borderRadius: '14px',
              fontSize: '14px',
              fontWeight: '700',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
              transition: 'background 0.2s',
            }}
          >
            <span>Se connecter avec mon compte App à la Carte</span>
            <ExternalLink size={16} />
          </a>

          <div style={{ marginTop: '16px' }}>
            <a
              href={accessState.tarifsUrl || 'https://appalacarte.fr/applications/marmicout-stock-restauration'}
              style={{ fontSize: '13px', color: '#6366f1', textDecoration: 'underline', fontWeight: '600' }}
            >
              Vous n&apos;avez pas encore de compte ? Découvrir les forfaits
            </a>
          </div>

          <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#94a3b8' }}>
            © 2026 App à la Carte ·{' '}
            <a href={`${APPALACARTE_URL}/mentions-legales`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>Mentions légales</a>
            {' · '}
            <a href={`${APPALACARTE_URL}/politique-de-confidentialite`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>Confidentialité</a>
            {' · '}
            <a href={`${APPALACARTE_URL}/conditions-generales`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>CGU</a>
            {' · '}
            <a href={`${APPALACARTE_URL}/contact`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>Contact</a>
            {' · '}
            <span>v{APP_VERSION}</span>
          </div>
        </div>
      </div>
    );
  }

  // Si double authentification obligatoire non complétée (AAL1 au lieu de AAL2)
  if (accessState?.mode === 'mfa_required') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        padding: '24px',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '44px 36px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          textAlign: 'center',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #d97706, #b45309)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 10px 25px rgba(217, 119, 6, 0.35)',
          }}>
            <ShieldAlert size={32} color="#ffffff" />
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
            Double authentification requise
          </h1>
          <p style={{ fontSize: '14px', color: '#475569', marginBottom: '24px', lineHeight: '1.6' }}>
            Votre compte central <strong>App à la Carte</strong> est protégé par la validation en deux étapes (2FA).
            Veuillez saisir votre code TOTP sur le portail d&apos;authentification afin de valider votre session.
          </p>

          <a
            href={accessState.actionUrl || `${APPALACARTE_URL}/auth/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '14px 20px',
              background: '#d97706',
              color: '#ffffff',
              borderRadius: '14px',
              fontSize: '14px',
              fontWeight: '700',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(217, 119, 6, 0.4)',
              transition: 'background 0.2s',
            }}
          >
            <span>{accessState.actionButtonText || 'Valider mon code 2FA'}</span>
            <ExternalLink size={16} />
          </a>

          <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#94a3b8' }}>
            © 2026 App à la Carte ·{' '}
            <a href={`${APPALACARTE_URL}/mentions-legales`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>Mentions légales</a>
            {' · '}
            <a href={`${APPALACARTE_URL}/politique-de-confidentialite`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>Confidentialité</a>
            {' · '}
            <a href={`${APPALACARTE_URL}/conditions-generales`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>CGU</a>
            {' · '}
            <a href={`${APPALACARTE_URL}/contact`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>Contact</a>
            {' · '}
            <span>v{APP_VERSION}</span>
          </div>
        </div>
      </div>
    );
  }

  // Écran « Virement en attente »
  if (accessState?.mode === 'virement_en_attente') {
    const vir = accessState.virementInfo;
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        padding: '24px',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '44px 36px',
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Building size={32} color="#ffffff" />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
              Virement en attente
            </h1>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
              Votre paiement par virement n&apos;est pas encore arrivé. Il est généralement reçu sous 1 à 3 jours ouvrés.
            </p>
          </div>

          {vir && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px',
              fontSize: '13px',
              color: '#334155',
              marginBottom: '24px',
              lineHeight: '1.8',
            }}>
              <div><strong>Bénéficiaire :</strong> {vir.beneficiaire}</div>
              <div><strong>IBAN :</strong> <span style={{ fontFamily: 'monospace' }}>{vir.iban}</span></div>
              <div><strong>BIC :</strong> <span style={{ fontFamily: 'monospace' }}>{vir.bic}</span></div>
              <div><strong>Référence obligatoire :</strong> <span style={{ fontFamily: 'monospace', color: '#4f46e5', fontWeight: 'bold' }}>{vir.reference}</span></div>
            </div>
          )}

          <a
            href={accessState.espaceClientUrl || 'https://appalacarte.fr/compte'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '14px 20px',
              background: '#0f172a',
              color: '#ffffff',
              borderRadius: '14px',
              fontSize: '14px',
              fontWeight: '700',
              textDecoration: 'none',
              marginBottom: '12px',
            }}
          >
            <span>Accéder à mon espace client</span>
            <ExternalLink size={16} />
          </a>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#94a3b8' }}>
            © 2026 App à la Carte ·{' '}
            <a href={`${APPALACARTE_URL}/mentions-legales`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>Mentions légales</a>
            {' · '}
            <a href={`${APPALACARTE_URL}/politique-de-confidentialite`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>Confidentialité</a>
            {' · '}
            <a href={`${APPALACARTE_URL}/conditions-generales`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>CGU</a>
            {' · '}
            <a href={`${APPALACARTE_URL}/contact`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>Contact</a>
            {' · '}
            <span>v{APP_VERSION}</span>
          </div>
        </div>
      </div>
    );
  }

  // Écran « Aucun abonnement »
  if (accessState?.mode === 'no_subscription') {
    const isOwner = accessState.isOwner !== false;
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        padding: '24px',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '44px 36px',
          maxWidth: '460px',
          width: '100%',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          textAlign: 'center',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <CreditCard size={32} color="#ffffff" />
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
            {isOwner ? "Vous n'avez pas d'abonnement actif à Marmicout" : "Établissement sans forfait actif"}
          </h1>
          <p style={{ fontSize: '14px', color: '#475569', marginBottom: '24px', lineHeight: '1.6' }}>
            {isOwner
              ? "Souscrivez un abonnement Essentiel, Pro ou activez votre essai de 14 jours pour utiliser Marmicout."
              : "L'établissement auquel vous appartenez ne dispose pas d'abonnement actif. Contactez votre responsable pour débloquer l'accès."}
          </p>

          <a
            href={accessState.actionUrl || 'https://appalacarte.fr/tarifs?app=marmicout-stock-restauration'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '14px 20px',
              background: '#4f46e5',
              color: '#ffffff',
              borderRadius: '14px',
              fontSize: '14px',
              fontWeight: '700',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
            }}
          >
            <span>{accessState.actionButtonText || 'Découvrir les forfaits'}</span>
            <ExternalLink size={16} />
          </a>

          <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#94a3b8' }}>
            © 2026 App à la Carte ·{' '}
            <a href={`${APPALACARTE_URL}/mentions-legales`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>Mentions légales</a>
            {' · '}
            <a href={`${APPALACARTE_URL}/politique-de-confidentialite`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>Confidentialité</a>
            {' · '}
            <a href={`${APPALACARTE_URL}/conditions-generales`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>CGU</a>
            {' · '}
            <a href={`${APPALACARTE_URL}/contact`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>Contact</a>
            {' · '}
            <span>v{APP_VERSION}</span>
          </div>
        </div>
      </div>
    );
  }

  // Écran « Blocage total après 30 jours » (délai de grâce et consultation dépassés)
  if (accessState?.mode === 'blocked_hard') {
    const isOwner = accessState.isOwner !== false;
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        padding: '24px',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '44px 36px',
          maxWidth: '460px',
          width: '100%',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          textAlign: 'center',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <ShieldAlert size={32} color="#ffffff" />
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
            Accès fermé
          </h1>
          <p style={{ fontSize: '14px', color: '#475569', marginBottom: '24px', lineHeight: '1.6' }}>
            {accessState.error || (isOwner
              ? "Votre période d'essai et le délai de consultation de 30 jours sont terminés."
              : "L'abonnement de votre établissement a expiré. Contactez le propriétaire de l'établissement.")}
          </p>

          <a
            href={accessState.actionUrl || 'https://appalacarte.fr/tarifs?app=marmicout-stock-restauration'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '14px 20px',
              background: '#dc2626',
              color: '#ffffff',
              borderRadius: '14px',
              fontSize: '14px',
              fontWeight: '700',
              textDecoration: 'none',
            }}
          >
            <span>{accessState.actionButtonText || (isOwner ? 'Choisir un forfait' : 'Contacter le propriétaire')}</span>
            <ExternalLink size={16} />
          </a>

          <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#94a3b8' }}>
            © 2026 App à la Carte ·{' '}
            <a href={`${APPALACARTE_URL}/mentions-legales`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>Mentions légales</a>
            {' · '}
            <a href={`${APPALACARTE_URL}/politique-de-confidentialite`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>Confidentialité</a>
            {' · '}
            <a href={`${APPALACARTE_URL}/conditions-generales`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>CGU</a>
            {' · '}
            <a href={`${APPALACARTE_URL}/contact`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'underline' }}>Contact</a>
            {' · '}
            <span>v{APP_VERSION}</span>
          </div>
        </div>
      </div>
    );
  }

  // ACCÈS VALIDE (Plein accès OU Consultation seule 30j)
  const isReadOnly = accessState?.mode === 'consultation_seule';
  const isGrace = !!accessState?.isPastDueGrace;
  const isSepa = !!accessState?.isSepaProcessing;
  const isDemoActive = accessState?.status === 'demo_active' || accessState?.status === 'demo';
  const isEssentiel = accessState?.planCode === 'essentiel';
  const isPro = (accessState?.planCode === 'pro' || accessState?.planCode === 'pro_cloud') && !isDemoActive && !isReadOnly;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* 0. Alerte d'erreur Cloud explicite (Aucun échec silencieux) */}
      {cloudError && (
        <div style={{
          background: '#b91c1c',
          color: '#ffffff',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          fontSize: '13px',
          fontWeight: '600',
          boxShadow: '0 4px 14px rgba(185, 28, 28, 0.4)',
          position: 'sticky',
          top: 0,
          zIndex: 10000,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={20} color="#fee2e2" />
            <div>
              <span style={{ fontWeight: '800' }}>Erreur de synchronisation cloud : </span>
              <span>{cloudError.title} — {cloudError.details}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCloudError(null)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              padding: '4px 10px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: '700',
            }}
          >
            Fermer
          </button>
        </div>
      )}
      
      {/* 1. Bandeau Persistant : Mode Consultation seule 30 jours */}
      {isReadOnly && (
        <div style={{
          background: '#78350f',
          color: '#fef3c7',
          padding: '10px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          fontSize: '13px',
          fontWeight: '600',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          position: 'sticky',
          top: 0,
          zIndex: 9999,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#fde68a" />
            <span>
              {accessState?.bannerMessage || 'Votre période d\'essai est terminée – mode consultation seule (données conservées 30 jours).'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={exportAllDataAsJSON}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              <Download size={14} />
              <span>Exporter mes données</span>
            </button>

            <a
              href={accessState?.actionUrl || 'https://appalacarte.fr/tarifs?app=marmicout-stock-restauration'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: '#f59e0b',
                color: '#78350f',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '800',
                textDecoration: 'none',
              }}
            >
              <span>{accessState?.actionButtonText || 'Choisir un forfait'}</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}

      {/* 2. Bandeau d'alerte : Paiement échoué pendant période de grâce de 7 jours */}
      {isGrace && (
        <div style={{
          background: '#991b1b',
          color: '#fee2e2',
          padding: '10px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          fontSize: '13px',
          fontWeight: '600',
          position: 'sticky',
          top: 0,
          zIndex: 9999,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="#fca5a5" />
            <span>{accessState?.alertMessage || 'Votre paiement a échoué – régularisez votre situation pour maintenir l\'accès.'}</span>
          </div>

          <a
            href={accessState?.updatePaymentUrl || 'https://appalacarte.fr/compte/paiement'}
            style={{
              padding: '6px 14px',
              background: '#ffffff',
              color: '#991b1b',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '800',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Mettre à jour mon moyen de paiement</span>
            <ExternalLink size={14} />
          </a>
        </div>
      )}

      {/* 3. Bandeau discret : Prélèvement SEPA en cours */}
      {isSepa && (
        <div style={{
          background: '#1e3a8a',
          color: '#dbeafe',
          padding: '6px 16px',
          fontSize: '12px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}>
          <CheckCircle2 size={14} color="#93c5fd" />
          <span>Prélèvement en cours de traitement</span>
        </div>
      )}

      {/* 4. Bandeau discret : Démo 14j active */}
      {isDemoActive && !isReadOnly && (
        <div style={{
          background: '#312e81',
          color: '#e0e7ff',
          padding: '6px 16px',
          fontSize: '12px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={14} color="#a5b4fc" />
            <span>Démo – {accessState?.daysRemaining ?? 14} jours restants</span>
          </div>
          <a
            href={accessState?.tarifsUrl || 'https://appalacarte.fr/tarifs?app=marmicout-stock-restauration'}
            style={{ color: '#ffffff', textDecoration: 'underline', fontWeight: '700', fontSize: '11px' }}
          >
            Passer en Pro →
          </a>
        </div>
      )}

      {/* 4b. Bandeau discret : Forfait Pro / Pro Cloud actif */}
      {isPro && (
        <div style={{
          background: '#1e1b4b',
          color: '#c7d2fe',
          padding: '6px 16px',
          fontSize: '12px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          borderBottom: '1px solid #312e81',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px' }}>✨</span>
            <span style={{ fontWeight: '700', color: '#e0e7ff' }}>
              {accessState?.planName || (accessState?.planCode === 'pro_cloud' ? 'Forfait Pro Cloud' : 'Forfait Pro')}
            </span>
            <span>· Données synchronisées dans le Cloud Supabase (UE)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#a5b4fc' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            <span>Synchronisation active</span>
          </div>
        </div>
      )}

      {/* 5. Bandeau discret : Mode local (Essentiel) */}
      {isEssentiel && !isReadOnly && (
        <div style={{
          background: '#047857',
          color: '#ecfdf5',
          padding: '6px 16px',
          fontSize: '12px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px' }}>💾</span>
            <span>Mode local (Essentiel) – Données stockées sur cet appareil</span>
          </div>
          <button
            type="button"
            onClick={exportAllDataAsJSON}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            <Download size={12} />
            <span>Exporter mes données</span>
          </button>
        </div>
      )}

      {/* 6. Bandeau hors connexion : Consultation seule 72h */}
      {isOffline && !isEssentiel && (
        <div style={{
          background: '#b45309',
          color: '#fef3c7',
          padding: '8px 16px',
          fontSize: '12px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="#fde68a" />
            <span>Hors connexion : consultation seule (cache local actif 72 h)</span>
          </div>
          <button
            type="button"
            onClick={exportAllDataAsJSON}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            <Download size={12} />
            <span>Exporter mes données</span>
          </button>
        </div>
      )}

      {/* Rendu de l'application */}
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
};
