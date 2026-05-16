import React, { useEffect, useRef, useState } from 'react';
import { Code2, ExternalLink, X } from 'lucide-react';

interface HtmlPreviewModalProps {
  title: string;
  htmlContent: string; // puede ser código HTML directo o una URL que apunta a HTML
  onClose: () => void;
}

/**
 * HtmlPreviewModal
 * Renderiza un modal a pantalla completa con dos modos:
 *  - Si htmlContent empieza con "http", carga la URL en un iframe.
 *  - En caso contrario, trata el valor como código HTML crudo y lo inyecta
 *    en un iframe sandboxed para prevenir XSS.
 */
const HtmlPreviewModal: React.FC<HtmlPreviewModalProps> = ({ title, htmlContent, onClose }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const isUrl = /^https?:\/\//i.test(htmlContent.trim());

  // Cerrar con Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Inyectar HTML crudo en el iframe cuando no es URL
  useEffect(() => {
    if (!isUrl && activeTab === 'preview' && iframeRef.current) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
      }
    }
  }, [isUrl, htmlContent, activeTab]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0D1B2A] shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20">
              <Code2 className="h-4 w-4 text-sky-400" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Material HTML</p>
              <h2 className="text-base font-semibold text-white">{title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tabs preview / code (solo para HTML crudo) */}
            {!isUrl && (
              <div className="flex rounded-xl border border-white/10 bg-black/30 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                    activeTab === 'preview'
                      ? 'bg-sky-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Vista previa
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                    activeTab === 'code'
                      ? 'bg-sky-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Código
                </button>
              </div>
            )}

            {/* Abrir en nueva pestaña (solo para URL) */}
            {isUrl && (
              <a
                href={htmlContent}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 transition hover:bg-white/10"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'code' && !isUrl ? (
            /* Visor de código */
            <div className="h-full overflow-auto bg-[#0A0F1A] p-6">
              <pre className="text-sm leading-7 text-green-300">
                <code>{htmlContent}</code>
              </pre>
            </div>
          ) : (
            /* iframe de preview */
            <iframe
              ref={isUrl ? undefined : iframeRef}
              title={title}
              src={isUrl ? htmlContent : undefined}
              sandbox="allow-scripts allow-same-origin"
              className="h-full w-full border-0 bg-white"
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 py-3">
          <p className="text-xs text-gray-500">
            Presiona <kbd className="rounded bg-white/10 px-1 py-0.5 text-gray-300">Esc</kbd> o
            haz clic fuera del modal para cerrar.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HtmlPreviewModal;
