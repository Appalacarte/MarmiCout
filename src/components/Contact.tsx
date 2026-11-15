import React, { useState, useEffect } from 'react';
import { Send, Mail, Copy, Check, Info, Phone, Building2, AlertCircle, Loader2 } from 'lucide-react';
import { getConnectedUserInfo, sendContactMessage } from '../services/contactService';

export const Contact: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const recipientEmail = 'contact@appalacarte.fr';

  useEffect(() => {
    let isMounted = true;
    getConnectedUserInfo().then((info) => {
      if (!isMounted) return;
      if (info.name) setName((prev) => (prev ? prev : info.name));
      if (info.email) setEmail((prev) => (prev ? prev : info.email));
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const contactText = `✉️ MESSAGE DE CONTACT MARMICOUT
---------------------------------------
👤 Expéditeur : ${name}
📧 Email : ${email}
📌 Sujet : ${subject}

💬 Message :
${message}

---------------------------------------
Destinataire : App à la Carte (contact@appalacarte.fr)
Généré depuis l'application MarmiCout`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatusMessage({ type: 'error', text: "Veuillez remplir le nom, l'e-mail et le message." });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const result = await sendContactMessage({
      name,
      email,
      subject: subject.trim() || 'Demande de contact',
      message,
      source: 'Marmicout – Support',
    });

    setIsSubmitting(false);

    if (result.success) {
      setStatusMessage({ type: 'success', text: 'Message envoyé' });
      setMessage('');
      setSubject('');
    } else {
      setStatusMessage({
        type: 'error',
        text: result.error || "Une erreur est survenue lors de l'envoi du message.",
      });
    }
  };

  const handleCopy = () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      alert("Veuillez remplir les champs obligatoires avant de copier.");
      return;
    }

    navigator.clipboard.writeText(contactText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* En-tête */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Contact & Support Éditeur</h1>
          <p className="page-subtitle">
            Une question, une remarque ou besoin d'une assistance technique ? Contactez App à la Carte.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'start' }}>

        {/* Colonne Gauche : Infos de contact */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} style={{ color: 'var(--color-primary)' }} />
              Coordonnées Éditeur
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                backgroundColor: 'var(--color-primary-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-primary)', flexShrink: 0
              }}>
                <Mail size={16} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-dark-light)' }}>Email Officiel (Solution de secours)</div>
                <a href={`mailto:${recipientEmail}`} style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-primary)', textDecoration: 'underline' }}>
                  {recipientEmail}
                </a>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                backgroundColor: 'var(--color-secondary-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-secondary)', flexShrink: 0
              }}>
                <Phone size={16} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-dark-light)' }}>Téléphone</div>
                <a href="tel:+33769590470" style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-dark)', textDecoration: 'none' }}>
                  07 69 59 04 70
                </a>
              </div>
            </div>

            <div style={{
              fontSize: '12px',
              color: 'var(--color-dark-light)',
              paddingTop: '12px',
              borderTop: '1px solid var(--color-border)',
              marginTop: '4px'
            }}>
              Informations légales de l'éditeur : voir les{' '}
              <a href="/mentions-legales" style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'underline' }}>
                Mentions légales
              </a>
            </div>
          </div>

          <div className="card" style={{ padding: '16px', backgroundColor: 'var(--color-light)', borderColor: 'var(--color-border)' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Info size={16} style={{ color: 'var(--color-dark-light)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                L'application MarmiCout est un outil de gestion édité par App à la Carte. Votre message est transmis directement à notre équipe technique. En cas d'indisponibilité du réseau, vous pouvez utiliser l'adresse e-mail de secours.
              </div>
            </div>
          </div>
        </div>

        {/* Colonne Droite : Formulaire */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 16px 0' }}>
            Envoyer un message
          </h3>

          {statusMessage && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: statusMessage.type === 'success' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: statusMessage.type === 'success' ? '#16a34a' : '#dc2626',
                border: `1px solid ${statusMessage.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}
            >
              {statusMessage.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
              <span style={{ flex: 1 }}>{statusMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Votre nom *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Ex : Dupont"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Votre email *</label>
                <input
                  type="email"
                  className="form-input"
                  required
                  placeholder="Ex : contact@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Sujet</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex : Question sur l'application, Assistance technique..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Votre message *</label>
              <textarea
                className="form-input"
                required
                rows={5}
                style={{ minHeight: '100px', resize: 'vertical' }}
                placeholder="Saisissez votre message ici..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ flex: 1, minWidth: '160px', height: '44px', opacity: isSubmitting ? 0.7 : 1 }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Envoyer le message
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: '44px', minWidth: '140px' }}
                onClick={handleCopy}
              >
                {copied ? <Check size={16} style={{ color: 'var(--color-secondary)' }} /> : <Copy size={16} />}
                {copied ? 'Copié !' : 'Copier le texte'}
              </button>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--color-dark-light)', marginTop: '14px', lineHeight: '1.5', textAlign: 'center' }}>
              Solution de secours : en cas de difficulté d'envoi, écrivez-nous directement à{' '}
              <a href={`mailto:${recipientEmail}`} style={{ color: 'var(--color-primary)', textDecoration: 'underline', fontWeight: '600' }}>
                {recipientEmail}
              </a>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--color-dark-light)', marginTop: '8px', textAlign: 'center', lineHeight: '1.4' }}>
              Les informations recueillies sont destinées à traiter votre demande. Consultez notre{' '}
              <a href="/confidentialite" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
                Politique de Confidentialité
              </a>.
            </p>
          </form>
        </div>

      </div>
    </div>
  );
};
