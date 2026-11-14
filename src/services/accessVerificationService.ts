import { supabase, getAccessToken } from './supabaseClient';
import { cloudDbService } from './cloudDbService';
import { indexedDbService } from './indexedDbService';

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
  | 'mfa_required'
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
  limits?: Record<string, unknown>;
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

interface CachedSettingEntry {
  key: string;
  value?: AccessVerificationResult;
  cachedAt?: string;
}

class AccessVerificationService {
  private lastResult: AccessVerificationResult | null = null;
  private listeners: ((result: AccessVerificationResult) => void)[] = [];
  private checkIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    void this.loadCachedResult();
    this.startPeriodicCheck();
  }

  private isKnownAccessStillValid(cached: AccessVerificationResult): boolean {
    if (!cached.hasAccess) return false;
    const knownEndStr =
      cached.mode === 'consultation_seule'
        ? cached.consultationUntil || cached.expiresAt
        : cached.expiresAt || cached.consultationUntil;
    if (!knownEndStr) return true;
    const endMs = new Date(knownEndStr).getTime();
    if (Number.isNaN(endMs)) return true;
    return endMs > Date.now();
  }

  private async loadCachedResult() {
    try {
      const items = await indexedDbService.getAll<CachedSettingEntry>('settings');
      const cached = items.find((i) => i.key === 'last_access_verification');
      if (cached && cached.value && !this.lastResult) {
        if (this.isKnownAccessStillValid(cached.value)) {
          this.lastResult = cached.value;
        } else {
          await indexedDbService.delete('settings', 'last_access_verification');
        }
      }
    } catch {
      // Ignorer
    }
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

  private getLoginRedirectUrl(): string {
    const nextTarget =
      typeof window !== 'undefined'
        ? window.location.origin + window.location.pathname
        : '';
    return `${APPALACARTE_URL}/auth/login?next=${encodeURIComponent(nextTarget)}`;
  }

  /**
   * Évalue l'accès en mode hors-ligne à partir de la dernière vérification connue.
   * Hors-ligne, Marmicout continue de fonctionner jusqu'à la date de fin d'accès connue (expiresAt).
   */
  private async resolveOfflineAccess(): Promise<AccessVerificationResult> {
    try {
      const items = await indexedDbService.getAll<CachedSettingEntry>('settings');
      const cached = items.find((i) => i.key === 'last_access_verification');
      if (cached && cached.value && cached.value.hasAccess) {
        if (this.isKnownAccessStillValid(cached.value)) {
          const endStr = cached.value.expiresAt
            ? new Date(cached.value.expiresAt).toLocaleDateString('fr-FR')
            : null;
          const cachedResult: AccessVerificationResult = {
            ...cached.value,
            alertMessage:
              cached.value.alertMessage ||
              (endStr
                ? `Mode hors-ligne : accès valide jusqu'au ${endStr}.`
                : 'Mode hors-ligne : utilisation de vos droits enregistrés localement.'),
          };
          this.notify(cachedResult);
          return cachedResult;
        }

        // La date de fin d'accès connue est dépassée
        await indexedDbService.delete('settings', 'last_access_verification');
        const expiredOfflineResult: AccessVerificationResult = {
          hasAccess: false,
          mode: 'unauthenticated',
          error:
            "Votre période d'accès connue a pris fin. Veuillez vous connecter à internet pour renouveler votre abonnement ou vous reconnecter.",
          actionButtonText: 'Se connecter avec mon compte App à la Carte',
          actionUrl: this.getLoginRedirectUrl(),
          tarifsUrl: `${APPALACARTE_URL}/tarifs?app=marmicout-stock-restauration`,
        };
        this.notify(expiredOfflineResult);
        return expiredOfflineResult;
      }
    } catch (dbErr) {
      console.error('Erreur lecture cache IndexedDB:', dbErr);
    }

    const unauthOfflineResult: AccessVerificationResult = {
      hasAccess: false,
      mode: 'unauthenticated',
      error: 'Aucune session active enregistrée sur cet appareil. Connectez-vous à internet pour vous identifier.',
      actionButtonText: 'Se connecter avec mon compte App à la Carte',
      actionUrl: this.getLoginRedirectUrl(),
      tarifsUrl: `${APPALACARTE_URL}/tarifs?app=marmicout-stock-restauration`,
    };
    this.notify(unauthOfflineResult);
    return unauthOfflineResult;
  }

  /**
   * Déconnexion locale sécurisée :
   * Efface uniquement la session d'authentification locale et le jeton d'accès mis en cache,
   * SANS supprimer aucune donnée métier hors-ligne (produits, recettes, achats, ventes, etc.).
   */
  public async signOutLocal(): Promise<void> {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Ignorer si déjà déconnecté
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem('marmicout_supabase_auth_token');
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has('code') || searchParams.has('sso_token')) {
        searchParams.delete('code');
        searchParams.delete('sso_token');
        const cleanSearch = searchParams.toString();
        window.history.replaceState(
          null,
          '',
          window.location.pathname + (cleanSearch ? `?${cleanSearch}` : '') + window.location.hash
        );
      }
    }

    try {
      await indexedDbService.delete('settings', 'last_access_verification');
    } catch {
      // Ignorer
    }

    const loggedOutResult: AccessVerificationResult = {
      hasAccess: false,
      mode: 'unauthenticated',
      error: 'Vous avez été déconnecté. Vos données locales sur cet appareil ont été conservées.',
      actionButtonText: 'Se connecter avec mon compte App à la Carte',
      actionUrl: this.getLoginRedirectUrl(),
      tarifsUrl: `${APPALACARTE_URL}/tarifs?app=marmicout-stock-restauration`,
    };
    this.notify(loggedOutResult);
  }

  /**
   * Vérifie s'il reste des données hors-ligne non synchronisées, avertit l'utilisateur
   * le cas échéant, puis efface uniquement la session locale sans supprimer les données.
   */
  public async requestSignOutWithWarning(
    checkUnsyncedFn: () => Promise<{
      hasUnsynced: boolean;
      unsyncedCount: number;
      localItemsCount: number;
      isLocalOnlyPlan: boolean;
    }>
  ): Promise<boolean> {
    try {
      const summary = await checkUnsyncedFn();
      if (summary.hasUnsynced && typeof window !== 'undefined') {
        const message = summary.isLocalOnlyPlan
          ? `Attention : vous disposez de ${summary.localItemsCount} donnée(s) enregistrée(s) localement sur cet appareil (mode hors-ligne / Essentiel).\n\nLa déconnexion effacera votre session locale sans supprimer vos données, qui resteront intégralement conservées sur cet appareil.\n\nConfirmer la déconnexion ?`
          : `Attention : il reste des données hors-ligne non synchronisées sur cet appareil (${summary.unsyncedCount} élément(s)).\n\nLa déconnexion effacera votre session locale sans supprimer ces données hors-ligne non synchronisées.\n\nSouhaitez-vous vous déconnecter maintenant ?`;
        const confirmed = window.confirm(message);
        if (!confirmed) {
          return false;
        }
      }
    } catch {
      // En cas d'erreur de lecture, poursuivre la déconnexion sans supprimer les données
    }

    await this.signOutLocal();
    return true;
  }

  /**
   * Vérifie l'accès en appelant l'API centrale d'App à la Carte (/api/access/verify)
   */
  public async verifyAccess(): Promise<AccessVerificationResult> {
    // Si l'appareil est hors-ligne, utiliser immédiatement les droits connus jusqu'à leur date de fin
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return this.resolveOfflineAccess();
    }

    try {
      const token = await getAccessToken();

      if (!token) {
        await indexedDbService.delete('settings', 'last_access_verification').catch(() => {});
        const unauthResult: AccessVerificationResult = {
          hasAccess: false,
          mode: 'unauthenticated',
          error: 'Vous devez être connecté avec votre compte App à la Carte pour utiliser Marmicout.',
          actionButtonText: 'Se connecter avec mon compte App à la Carte',
          actionUrl: this.getLoginRedirectUrl(),
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
        // La réponse du serveur est négative : on invalide le cache local d'accès
        await indexedDbService.delete('settings', 'last_access_verification').catch(() => {});

        if (res.status === 401) {
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          if (typeof window !== 'undefined') {
            localStorage.removeItem('marmicout_supabase_auth_token');
          }
          const unauthResult: AccessVerificationResult = {
            hasAccess: false,
            mode: 'unauthenticated',
            error: data.error || 'Votre session a expiré. Veuillez vous reconnecter.',
            actionButtonText: 'Se connecter avec mon compte App à la Carte',
            actionUrl: this.getLoginRedirectUrl(),
            tarifsUrl: `${APPALACARTE_URL}/tarifs?app=marmicout-stock-restauration`,
          };
          this.notify(unauthResult);
          return unauthResult;
        }

        // Traitement des statuts spécifiques
        if (data.mode === 'mfa_required') {
          const mfaResult: AccessVerificationResult = {
            hasAccess: false,
            mode: 'mfa_required',
            error: data.error || 'Double authentification obligatoire non validée (AAL2 requis).',
            actionButtonText: data.actionButtonText || 'Valider mon code 2FA',
            actionUrl: data.actionUrl || this.getLoginRedirectUrl(),
            tarifsUrl: `${APPALACARTE_URL}/tarifs?app=marmicout-stock-restauration`,
          };
          this.notify(mfaResult);
          return mfaResult;
        }

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

        if (data.mode === 'no_subscription' || data.mode === 'blocked_hard') {
          // Si l'abonnement a pris fin, renvoyer vers la connexion / renouvellement
          const endedResult: AccessVerificationResult = {
            hasAccess: false,
            mode: data.mode,
            status: data.status,
            isOwner: data.isOwner,
            error:
              data.error ||
              "Votre abonnement a pris fin ou aucun abonnement actif n'est associé à ce compte.",
            tarifsUrl: data.tarifsUrl || `${APPALACARTE_URL}/tarifs?app=marmicout-stock-restauration`,
            actionButtonText: 'Se reconnecter / Choisir un forfait',
            actionUrl: this.getLoginRedirectUrl(),
          };
          this.notify(endedResult);
          return endedResult;
        }

        // Autre erreur 403
        const errResult: AccessVerificationResult = {
          hasAccess: false,
          mode: 'unauthenticated',
          error: data.error || 'Session invalide ou abonnement arrivé à échéance. Veuillez vous reconnecter.',
          actionButtonText: 'Se connecter avec mon compte App à la Carte',
          actionUrl: this.getLoginRedirectUrl(),
          tarifsUrl: `${APPALACARTE_URL}/tarifs?app=marmicout-stock-restauration`,
        };
        this.notify(errResult);
        return errResult;
      }

      if (data.establishmentId) {
        cloudDbService.setEstablishmentId(data.establishmentId);
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

      // Sauvegarde du dernier forfait connu et de la date de fin d'accès dans IndexedDB
      try {
        await indexedDbService.put('settings', {
          key: 'last_access_verification',
          value: successResult,
          cachedAt: new Date().toISOString(),
        });
      } catch (cacheErr) {
        console.warn('Erreur mise en cache IndexedDB vérification accès:', cacheErr);
      }

      this.notify(successResult);
      return successResult;
    } catch (err: unknown) {
      console.warn('Erreur réseau verifyAccess (secours IndexedDB jusqu\'à date de fin connue):', err);
      return this.resolveOfflineAccess();
    }
  }

  /**
   * Vérification périodique toutes les 15 minutes
   */
  private startPeriodicCheck() {
    if (this.checkIntervalId) clearInterval(this.checkIntervalId);
    // 15 minutes = 15 * 60 * 1000 = 900000 ms
    this.checkIntervalId = setInterval(() => {
      void this.verifyAccess();
    }, 15 * 60 * 1000);
  }
}

export const accessVerificationService = new AccessVerificationService();
