import { supabase } from './supabaseClient';
import { accessVerificationService } from './accessVerificationService';
import { dbService } from './db';

const APPALACARTE_URL = import.meta.env.VITE_APPALACARTE_URL || 'https://appalacarte.fr';

export interface ConnectedUserInfo {
  name: string;
  email: string;
}

export interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  source: 'Marmicout – Support' | 'Marmicout – Suggestion';
}

export interface ContactSendResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Récupère le nom et l'e-mail du compte connecté pour pré-remplir les formulaires de contact.
 */
export async function getConnectedUserInfo(): Promise<ConnectedUserInfo> {
  let name = '';
  let email = '';

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      if (user.email) email = user.email;
      const meta = (user.user_metadata || {}) as Record<string, unknown>;
      const fullName = (meta.full_name || meta.name) as string | undefined;
      const firstName = (meta.first_name || meta.given_name) as string | undefined;
      const lastName = (meta.last_name || meta.family_name) as string | undefined;
      if (fullName && typeof fullName === 'string' && fullName.trim()) {
        name = fullName.trim();
      } else if (firstName || lastName) {
        name = [firstName, lastName].filter(Boolean).join(' ').trim();
      }
    }
  } catch {
    // Mode hors-ligne ou session non connectée
  }

  if (!email) {
    const cached = accessVerificationService.getLastResult();
    if (cached?.userEmail) {
      email = cached.userEmail;
    }
  }

  if (!name) {
    const settings = dbService.getSettings();
    if (settings?.businessName) {
      name = settings.businessName;
    }
  }

  return { name, email };
}

/**
 * Envoie un message de contact ou de suggestion à la plateforme App à la Carte via POST /api/public/contact.
 */
export async function sendContactMessage(payload: ContactPayload): Promise<ContactSendResult> {
  const trimmedName = payload.name.trim();
  const trimmedEmail = payload.email.trim();
  const trimmedMessage = payload.message.trim();
  const trimmedSubject = payload.subject.trim();

  if (!trimmedName || !trimmedEmail || !trimmedMessage) {
    return {
      success: false,
      error: "Veuillez renseigner votre nom, votre e-mail et votre message.",
    };
  }

  try {
    const url = `${APPALACARTE_URL}/api/public/contact`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: trimmedName,
        email: trimmedEmail,
        subject: trimmedSubject || (payload.source === 'Marmicout – Suggestion' ? 'Suggestion Marmicout' : 'Demande de contact'),
        message: trimmedMessage,
        source: payload.source,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.success === false) {
      return {
        success: false,
        error: data.error || `Erreur lors de l'envoi (${res.status}). Veuillez réessayer ou utiliser l'adresse de secours.`,
      };
    }

    return {
      success: true,
      message: data.message || 'Message envoyé',
    };
  } catch (err) {
    console.error('[contactService] Erreur réseau lors de l\'envoi du message:', err);
    return {
      success: false,
      error: "Impossible de joindre le serveur. Vérifiez votre connexion internet ou écrivez-nous directement par e-mail.",
    };
  }
}
