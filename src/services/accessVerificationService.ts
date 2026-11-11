import { supabase, getAccessToken } from './supabaseClient';

const APPALACARTE_URL = import.meta.env.VITE_APPALACARTE_URL || 'https://appalacarte.fr';

export interface VirementInfo {
  iban: string;
  bic: string;
  beneficiaire: string;
  reference: string;
}

export type AccessMode =
  | 'full'
  | 'consultation_seule'
  | 'virement_en_attente'
  | 'no_subscription'
  | 'blocked_hard'
  | 'unauthenticated'
  | 'loading'
  | 'error';

export interface AccessVerificationResult {
  hasAccess: boolean;
  mode: AccessMode;
  status?: string;
  isOwner?: boolean;
  memberRole?: string;
  establishmentId?: string | null;
  planCode?: string;
  planName?: string;
  features?: string[];
  limits?: Record<string, any>;
  expiresAt?: string;
  daysRemaining?: number;
  consultationUntil?: string;
  gracePeriodEndsAt?: string;
  isPastDueGrace?: boolean;
  isSepaProcessing?: boolean;
  bannerMessage?: string;
  alertMessage?: string;
  actionButtonText?: string;
  actionUrl?: string;
  updatePaymentUrl?: string;
  virementInfo?: VirementInfo;
  tarifsUrl?: string;
  espaceClientUrl?: string;
  error?: string;
  userEmail?: string;
}

class AccessVerificationService {
  private lastResult: AccessVerificationResult | null = null;
  private listeners: ((result: AccessVerificationResult) => void)[] = [];
  private checkIntervalId: any = null;

  constructor() {
    this.startPeriodicCheck();
  }

  public subscribe(callback: (result: AccessVerificationResult) => void): () => void {
    this.listeners.push(callback);
    if (this.lastResult) {
      callback(this.lastResult);
    }
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify(result: AccessVerificationResult) {
    this.lastResult = result;
    this.listeners.forEach((callback) => {
      try {
        callback(result);
      } catch (err) {
        console.error('Erreur listener access verification:', err);
      }
    });
  }

  public getLastResult(): AccessVerificationResult | null {
    return this.lastResult;
  }

  /**
   * Vérifie l'accès en appelant l'API centrale d'App à la Carte
   */
  public async verifyAccess(): Promise<AccessVerificationResult> {
    try {
      const token = await getAccessToken();

      if (!token) {
        const unauthResult: AccessVerificationResult = {
          hasAccess: false,
          mode: 'unauthenticated',
          error: 'Vous devez être connecté avec votre compte App à la Carte pour utiliser Marmicout.',
          actionButtonText: 'Se connecter avec mon compte App à la Carte',
          actionUrl: `${APPALACARTE_URL}/auth/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`,
          tarifsUrl: `${APPALACARTE_URL}/tarifs?app=marmicout-stock-restauration`,
        };
        this.notify(unauthResult);
        return unauthResult;
      }

      const res = await fetch(`${APPALACARTE_URL}/api/access/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appSlug: 'marmicout-stock-restauration',
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Traitement des statuts spécifiques
        if (data.mode === 'virement_en_attente') {
          const virResult: AccessVerificationResult = {
            hasAccess: false,
            mode: 'virement_en_attente',
            status: data.status,
            isOwner: data.isOwner,
            error: data.error,
            virementInfo: data.virementInfo,
            espaceClientUrl: data.espaceClientUrl || `${APPALACARTE_URL}/compte`,
            tarifsUrl: data.tarifsUrl || `${APPALACARTE_URL}/tarifs?app=marmicout-stock-restauration`,
          };
          this.notify(virResult);
          return virResult;
        }

        if (data.mode === 'no_subscription') {
          const noSubResult: AccessVerificationResult = {
            hasAccess: false,
            mode: 'no_subscription',
            isOwner: data.isOwner,
            error: data.error,
            tarifsUrl: data.tarifsUrl || `${APPALACARTE_URL}/tarifs?app=marmicout-stock-restauration`,
            actionButtonText: 'Découvrir les forfaits',
            actionUrl: `${APPALACARTE_URL}/tarifs?app=marmicout-stock-restauration`,
          };
          this.notify(noSubResult);
          return noSubResult;
        }

        if (data.mode === 'blocked_hard') {
          const blockedResult: AccessVerificationResult = {
            hasAccess: false,
            mode: 'blocked_hard',
            status: data.status,
            isOwner: data.isOwner,
            error: data.error,
            tarifsUrl: data.tarifsUrl || `${APPALACARTE_URL}/tarifs?app=marmicout-stock-restauration`,
            actionButtonText: data.isOwner ? 'Choisir un forfait' : 'Contacter le propriétaire',
            actionUrl: data.isOwner ? `${APPALACARTE_URL}/tarifs?app=marmicout-stock-restauration` : `${APPALACARTE_URL}/contact`,
          };
          this.notify(blockedResult);
          return blockedResult;
        }

        // Autre erreur 401/403
        const errResult: AccessVerificationResult = {
          hasAccess: false,
          mode: res.status === 401 ? 'unauthenticated' : 'error',
          error: data.error || 'Erreur lors de la vérification de vos droits.',
          tarifsUrl: `${APPALACARTE_URL}/tarifs?app=marmicout-stock-restauration`,
        };
        this.notify(errResult);
        return errResult;
      }

      // Résultat HTTP 200 OK
      const successResult: AccessVerificationResult = {
        hasAccess: true,
        mode: data.mode || 'full',
        status: data.status,
        isOwner: data.isOwner !== false,
        memberRole: data.memberRole || 'owner',
        establishmentId: data.establishmentId || null,
        planCode: data.planCode,
        planName: data.planName,
        features: data.features || [],
        limits: data.limits || {},
        expiresAt: data.expiresAt,
        daysRemaining: data.daysRemaining,
        consultationUntil: data.consultationUntil,
        gracePeriodEndsAt: data.gracePeriodEndsAt,
        isPastDueGrace: !!data.isPastDueGrace,
        isSepaProcessing: !!data.isSepaProcessing,
        bannerMessage: data.bannerMessage,
        alertMessage: data.alertMessage,
        actionButtonText: data.actionButtonText,
        actionUrl: data.actionUrl,
        updatePaymentUrl: data.updatePaymentUrl || `${APPALACARTE_URL}/compte/paiement`,
        userEmail: data.userEmail,
        tarifsUrl: `${APPALACARTE_URL}/tarifs?app=marmicout-stock-restauration`,
      };

      this.notify(successResult);
      return successResult;
    } catch (err: any) {
      console.error('Erreur verifyAccess:', err);
      const networkErrResult: AccessVerificationResult = {
        hasAccess: false,
        mode: 'error',
        error: 'Impossible de joindre le serveur d\'authentification App à la Carte.',
      };
      this.notify(networkErrResult);
      return networkErrResult;
    }
  }

  /**
   * Vérification périodique toutes les 15 minutes
   */
  private startPeriodicCheck() {
    if (this.checkIntervalId) clearInterval(this.checkIntervalId);
    // 15 minutes = 15 * 60 * 1000 = 900000 ms
    this.checkIntervalId = setInterval(() => {
      this.verifyAccess();
    }, 15 * 60 * 1000);
  }
}

export const accessVerificationService = new AccessVerificationService();
