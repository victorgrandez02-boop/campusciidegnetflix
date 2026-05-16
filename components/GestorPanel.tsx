import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Loader2,
  MessageSquare,
  RefreshCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { PaymentRequest, User } from '../types';

interface GestorPanelProps {
  currentUser: User;
  onBack: () => void;
  isEmbedded?: boolean;
}

const statusLabel = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
} as const;

const statusClass = {
  pending: 'bg-amber-500/10 text-amber-200 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-200 border-red-500/20',
} as const;

const GestorPanel: React.FC<GestorPanelProps> = ({ currentUser, onBack, isEmbedded }) => {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [noteModal, setNoteModal] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [noteText, setNoteText] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getAllPaymentRequests();
      setRequests(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setSaving(id);
    try {
      if (action === 'approve') {
        await api.approvePaymentRequest(id, noteText || undefined);
      } else {
        await api.rejectPaymentRequest(id, noteText || undefined);
      }
      setNoteModal(null);
      setNoteText('');
      await load();
    } finally {
      setSaving(null);
    }
  };

  const openNoteModal = (id: string, action: 'approve' | 'reject') => {
    setNoteText('');
    setNoteModal({ id, action });
  };

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className={`text-white ${isEmbedded ? '' : 'min-h-screen bg-[#101010]'}`}>
      {/* Header */}
      {!isEmbedded && (
        <div className="border-b border-white/10 bg-gradient-to-r from-slate-950 via-[#101010] to-[#101010]">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-8 md:px-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-amber-400">Panel de Gestión</p>
                <h1 className="mt-2 text-3xl font-bold">Verificación de Pagos</h1>
                <p className="mt-2 text-sm text-gray-400">
                  Revisa y aprueba los comprobantes enviados por los alumnos.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={load}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <RefreshCcw className="mr-2 inline h-4 w-4" />
                  Actualizar
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black"
                >
                  Volver al campus
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-3">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    filter === f ? 'bg-white text-black' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {f === 'all' ? 'Todos' : statusLabel[f]}
                  {f === 'pending' && pendingCount > 0 && (
                    <span className="ml-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-black font-bold">
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isEmbedded && (
        <div className="mx-auto max-w-[1400px] px-4 md:px-10 pb-4">
          <div className="flex flex-wrap gap-3 mt-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  filter === f ? 'bg-sky-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {f === 'all' ? 'Todos' : statusLabel[f]}
                {f === 'pending' && pendingCount > 0 && (
                  <span className="ml-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-black font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
            <button
              type="button"
              onClick={load}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 ml-auto flex items-center"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Actualizar
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-10">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="mr-3 h-6 w-6 animate-spin" />
            Cargando solicitudes...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#171717] p-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-600" />
            <p className="mt-4 text-gray-400">
              {filter === 'pending'
                ? 'No hay comprobantes pendientes de verificación.'
                : 'No hay solicitudes en esta categoría.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {filtered.map((request) => (
              <article
                key={request.id}
                className="rounded-3xl border border-white/10 bg-[#171717] overflow-hidden"
              >
                {/* Voucher image */}
                {request.voucherImage && (
                  <button
                    type="button"
                    onClick={() => setPreviewImage(request.voucherImage)}
                    className="relative block w-full overflow-hidden group"
                    title="Ver voucher completo"
                  >
                    <img
                      src={request.voucherImage}
                      alt="Voucher de pago"
                      className="h-44 w-full object-cover transition group-hover:opacity-80"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40">
                      <ExternalLink className="h-6 w-6 text-white" />
                      <span className="ml-2 text-sm font-semibold text-white">Ver imagen</span>
                    </div>
                  </button>
                )}

                <div className="p-5 space-y-4">
                  {/* Status + badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">{request.courseTitle}</p>
                      <p className="text-sm text-gray-400">Alumno: {request.userName}</p>
                      <p className="text-xs text-gray-500">{request.userEmail}</p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass[request.status]}`}
                    >
                      {statusLabel[request.status]}
                    </span>
                  </div>

                  {/* Datos */}
                  <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                    <div>
                      <p className="text-gray-400">Monto</p>
                      <p className="font-bold text-emerald-400 text-lg">
                        S/. {request.amount.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Fecha pago</p>
                      <p className="font-semibold">
                        {new Date(request.paymentDate).toLocaleDateString('es-PE')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Enviado el</p>
                      <p className="font-semibold text-xs">
                        {new Date(request.submittedAt).toLocaleString('es-PE')}
                      </p>
                    </div>
                    {request.gestorNote && (
                      <div className="col-span-2">
                        <p className="text-gray-400">Nota del gestor</p>
                        <p className="italic text-gray-300">{request.gestorNote}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {request.status === 'pending' && (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        disabled={saving === request.id}
                        onClick={() => openNoteModal(request.id, 'approve')}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                      >
                        {saving === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Aprobar acceso
                      </button>
                      <button
                        type="button"
                        disabled={saving === request.id}
                        onClick={() => openNoteModal(request.id, 'reject')}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" />
                        Rechazar
                      </button>
                    </div>
                  )}

                  {request.status === 'approved' && (
                    <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                      <ShieldCheck className="h-4 w-4" />
                      Acceso activado correctamente.
                    </div>
                  )}

                  {request.status === 'rejected' && (
                    <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      <AlertCircle className="h-4 w-4" />
                      Solicitud rechazada.
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Note modal */}
      {noteModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0D1B2A] p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="h-5 w-5 text-sky-400" />
              <h3 className="text-lg font-bold">
                {noteModal.action === 'approve' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
              </h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              {noteModal.action === 'approve'
                ? 'El alumno recibirá acceso al curso inmediatamente. Puedes agregar una nota opcional.'
                : 'El alumno será notificado. Indica el motivo del rechazo.'}
            </p>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={
                noteModal.action === 'approve'
                  ? 'Nota opcional para el alumno...'
                  : 'Motivo del rechazo (recomendado)...'
              }
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none resize-none placeholder:text-gray-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setNoteModal(null)}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 font-semibold hover:bg-white/10 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving === noteModal.id}
                onClick={() => handleAction(noteModal.id, noteModal.action)}
                className={`flex-1 rounded-2xl py-3 font-bold transition flex items-center justify-center gap-2 ${
                  noteModal.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                } disabled:opacity-60`}
              >
                {saving === noteModal.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : noteModal.action === 'approve' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {noteModal.action === 'approve' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image preview lightbox */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Voucher de pago"
            className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl"
          />
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-3 hover:bg-white/20"
            onClick={() => setPreviewImage(null)}
          >
            <XCircle className="h-6 w-6 text-white" />
          </button>
        </div>
      )}
    </div>
  );
};

export default GestorPanel;
