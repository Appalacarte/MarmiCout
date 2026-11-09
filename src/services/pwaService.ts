/**
 * Service PWA MarmiCout
 * Gère l'enregistrement du Service Worker, la détection d'installabilité sur Chrome/Edge/Safari,
 * et le déclenchement de l'invite d'installation (beforeinstallprompt).
 */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

class PwaService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstalledState = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.checkIfInstalled();
      this.initListeners();
      this.registerServiceWorker();
    }
  }

  private checkIfInstalled(): void {
    if (typeof window === 'undefined') return;

    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    this.isInstalledState = isStandalone;
  }

  private initListeners(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Empêcher la mini-infobar par défaut de Chrome sur mobile si souhaité
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      window.dispatchEvent(new Event('marmicout_pwa_state_change'));
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalledState = true;
      this.deferredPrompt = null;
      window.dispatchEvent(new Event('marmicout_pwa_state_change'));
      console.info('[MarmiCout PWA] Application installée avec succès sur cet appareil.');
    });

    // Écouter les changements de display-mode
    try {
      window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
        this.isInstalledState = e.matches;
        window.dispatchEvent(new Event('marmicout_pwa_state_change'));
      });
    } catch {
      // Fallback anciens navigateurs
    }
  }

  private registerServiceWorker(): void {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.info('[MarmiCout PWA] Service Worker actif (scope:', reg.scope, ')');
          })
          .catch((err) => {
            console.warn('[MarmiCout PWA] Erreur enregistrement Service Worker :', err);
          });
      });
    }
  }

  /**
   * Indique si l'application est déjà exécutée en mode installé (PWA autonome)
   */
  public isInstalled(): boolean {
    this.checkIfInstalled();
    return this.isInstalledState;
  }

  /**
   * Indique si l'invite d'installation peut être affichée (événement reçu et non encore installée)
   */
  public canInstall(): boolean {
    if (this.isInstalled()) return false;
    return this.deferredPrompt !== null;
  }

  /**
   * Déclenche la fenêtre native d'installation de Chrome / Edge
   */
  public async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        this.deferredPrompt = null;
        window.dispatchEvent(new Event('marmicout_pwa_state_change'));
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[MarmiCout PWA] Erreur lors du prompt d’installation :', err);
      return false;
    }
  }
}

export const pwaService = new PwaService();
