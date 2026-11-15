import React, { useState, useEffect } from 'react';
import { Send, MessageSquare, Copy, Check, Info, AlertCircle, Loader2 } from 'lucide-react';
import { getActiveTesterCode } from '../services/db';
import { getConnectedUserInfo, sendContactMessage } from '../services/contactService';

export const Suggestions: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('amélioration');
  const [description, setDescription] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const testerCode = getActiveTesterCode() || 'Anonyme';
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

  const suggestionText = `💡 SUGGESTION MARMICOUT
---------------------------------------
👤 Expéditeur : ${name || 'Non renseigné'}
📧 Email : ${email || 'Non renseigné'}
🧪 Testeur : ${testerCode.toUpperCase()}
📌 Type : ${type.toUpperCase()}
📝 Titre : ${title}

💬 Description :
${description}

---------------------------------------
Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
Destinataire : App à la Carte (${recipientEmail})`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !title.trim() || !description.trim()) {
      setStatusMessage({
        type: 'error',
        text: "Veuillez remplir votre nom, votre e-mail, le titre et la description.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const fullMessage = testerCode && testerCode !== 'Anonyme'
      ? `[Espace testeur : ${testerCode.toUpperCase()}]\n\n${description.trim()}`
      : description.trim();

    const result = await sendContactMessage({
      name,
      email,
      subject: `[${type.toUpperCase()}] ${title.trim()}`,
      message: fullMessage,
      source: 'Marmicout – Suggestion',
    });

    setIsSubmitting(false);

    if (result.success) {
      setStatusMessage({ type: 'success', text: 'Message envoyé' });
      setTitle('');
      setDescription('');
    } else {
      setStatusMessage({
        type: 'error',
        text: result.error || "Une erreur est survenue lors de l'envoi de la suggestion.",
      });
    }
  };

  const handleCopy = () => {
    if (!title.trim() || !description.trim()) {
      alert("Veuillez remplir le titre et la description avant de copier.");
      return;
    }

    navigator.clipboard.writeText(suggestionText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* En-tête */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Boîte à suggestions</h1>
          <p className="page-subtitle">
            Proposez des idées d'amélioration, signalez un bug ou demandez une modification directement à l'équipe App à la Carte
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{
            width: '36px', height: '36px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-primary)'
          }}>
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>
              Formulaire de retour d'expérience
            </h3>
            {testerCode && testerCode !== 'Anonyme' && (
              <span style={{ fontSize: '12px', color: 'var(--color-dark-light)' }}>
                Espace testeur actif : <strong>{testerCode.toUpperCase()}</strong>
              </span>
            )}
          </div>
        </div>

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
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
            <label className="form-label">Titre court de votre idée ou problème *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Ex : Ajouter un bouton d'export PDF, Bug sur le stock de beurre..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Type de suggestion</label>
            <select
              className="form-input"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="amélioration">💡 Amélioration / Suggestion</option>
              <option value="bug">🐛 Signalement de bug</option>
              <option value="nouvelle idée">🚀 Nouvelle fonctionnalité</option>
              <option value="autre">💬 Autre retour</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Expliquez votre besoin en détail *</label>
            <textarea
              className="form-input"
              required
              rows={6}
              style={{ minHeight: '120px', resize: 'vertical' }}
              placeholder="Décrivez ce que vous souhaitez modifier, pourquoi c'est important pour vous, et comment vous l'imaginez..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Alert explicative */}
          <div className="card" style={{
            backgroundColor: 'var(--color-light)',
            borderColor: 'var(--color-border)',
            fontSize: '12px',
            marginBottom: '20px',
            padding: '12px 14px'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Info size={16} style={{ color: 'var(--color-dark-light)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                Votre suggestion est transmise directement au serveur central App à la Carte. Si vous préférez, vous pouvez utiliser le bouton <strong>« Copier le texte »</strong> pour nous l'adresser par un autre canal.
              </div>
            </div>
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
                  Envoyer la suggestion
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
            Solution de secours : vous pouvez également nous écrire directement à{' '}
            <a href={`mailto:${recipientEmail}`} style={{ color: 'var(--color-primary)', textDecoration: 'underline', fontWeight: '600' }}>
              {recipientEmail}
            </a>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--color-dark-light)', marginTop: '8px', textAlign: 'center', lineHeight: '1.4' }}>
            Vos retours nous aident à améliorer l'application. Consultez notre{' '}
            <a href="/confidentialite" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
              Politique de Confidentialité
            </a>.
          </p>
        </form>
      </div>
    </div>
  );
};
