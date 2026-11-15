import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Eye } from 'lucide-react';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  toolbarControls?: React.ReactNode;
  children: React.ReactNode;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  toolbarControls,
  children,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);

  // Empêcher le scroll du body quand le modal est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Écouteur pour fermer avec la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleTriggerPrint = () => {
    setIsPrinting(true);
    // Petit délai pour laisser le rendu react se stabiliser avant d'ouvrir la boîte de dialogue native
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 1. PORTAIL D'IMPRESSION NATIF DANS DOCUMENT.BODY (SEUL ÉLÉMENT IMPRIMÉ EN @media print) */}
      {createPortal(
        <div id="marmicout-print-zone" aria-hidden="true">
          {children}
        </div>,
        document.body
      )}

      {/* 2. MODAL D'APERÇU À L'ÉCRAN (@media screen uniquement) */}
      <div className="print-modal-backdrop" onClick={onClose}>
        <div
          className="print-modal-container"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* HEADER MODAL */}
          <div className="print-modal-header">
            <div className="header-titles">
              <h3 className="modal-title">{title}</h3>
              {subtitle && <p className="modal-subtitle">{subtitle}</p>}
            </div>
            <div className="header-actions">
              <button
                type="button"
                className="btn btn-primary btn-print-launch"
                onClick={handleTriggerPrint}
                disabled={isPrinting}
              >
                <Printer size={18} />
                <span>{isPrinting ? 'Préparation...' : 'Lancer l\'impression'}</span>
              </button>
              <button
                type="button"
                className="modal-close-btn"
                onClick={onClose}
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* BARRE D'OPTIONS DE CONFIGURATION AVANT IMPRESSION */}
          {toolbarControls && (
            <div className="print-modal-toolbar">
              {toolbarControls}
            </div>
          )}

          {/* ZONE D'APERÇU FEUILLE DE PAPIER */}
          <div className="print-modal-preview-wrapper">
            <div className="preview-label-bar">
              <Eye size={15} />
              <span>Aperçu en direct du document tel qu'il sera imprimé sur papier :</span>
            </div>
            <div className="preview-paper-frame">
              {children}
            </div>
          </div>

          {/* FOOTER MODAL */}
          <div className="print-modal-footer">
            <div className="print-tip">
              💡 Astuce : vous pouvez aussi ajuster les marges et l'échelle directement dans la boîte d'impression de votre navigateur.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Fermer
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleTriggerPrint}
              >
                <Printer size={16} />
                Imprimer
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
