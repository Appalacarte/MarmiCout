import React, { useState } from 'react';
import { Send, Mail, Copy, Check, Info, Phone, Building2 } from 'lucide-react';

export const Contact: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const recipientEmail = 'contact@appalacarte.fr';

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

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      alert("Veuillez remplir le nom, l'email et le message.");
      return;
    }

    const emailSubject = encodeURIComponent(`[MarmiCout Contact] ${subject || 'Nouveau message'}`);
    const body = encodeURIComponent(contactText);
    const mailtoUrl = `mailto:${recipientEmail}?subject=${emailSubject}&body=${body}`;

    window.open(mailtoUrl, '_blank');
    setSent(true);
    setTimeout(() => setSent(false), 5000);
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
                <div style={{ fontSize: '12px', color: 'var(--color-dark-light)' }}>Email Officiel</div>
                <a href={`mailto:${recipientEmail}`} style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-primary)', textDecoration: 'none' }}>
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
                L'application MarmiCout est un outil de gestion local édité par App à la Carte. Pour toute demande d'assistance technique ou de développement sur-mesure, utilisez ce formulaire direct.
              </div>
            </div>
          </div>
        </div>

        {/* Colonne Droite : Formulaire */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 16px 0' }}>
            Envoyer un message
          </h3>
          
          <form onSubmit={handleSendEmail}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Votre nom *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Ex : Dupont"
                  value={name}
                  onChange={e => setName(e.target.value)}
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
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Sujet</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex : Question sur l'application, Demande de partenariat..."
                value={subject}
                onChange={e => setSubject(e.target.value)}
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
                onChange={e => setMessage(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, minWidth: '160px', height: '44px' }}
              >
                <Send size={16} />
                {sent ? 'Redirection...' : 'Envoyer par mail'}
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

            <p style={{ fontSize: '12px', color: 'var(--color-dark-light)', marginTop: '12px', textAlign: 'center', lineHeight: '1.4' }}>
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
