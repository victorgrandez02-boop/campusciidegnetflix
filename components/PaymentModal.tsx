import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Edit2,
  Image as ImageIcon,
  Loader2,
  Lock,
  Phone,
  Send,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { Course, SystemSettings, User } from '../types';

interface PaymentModalProps {
  course: Course;
  currentUser: User;
  settings: SystemSettings;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  course,
  currentUser,
  settings,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'instructions' | 'form' | 'success'>('instructions');
  const [voucherPreview, setVoucherPreview] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [formName, setFormName] = useState(currentUser.fullName);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currency = settings.currency || 'S/.';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo no debe superar los 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setVoucherPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!voucherPreview) {
      setError('Debes adjuntar la imagen del voucher de pago.');
      return;
    }
    if (!formName.trim()) {
      setError('El nombre no puede estar vacío.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.submitPaymentRequest({
        userId: currentUser.id,
        courseId: course.id,
        userName: formName.trim(),
        userEmail: currentUser.email,
        courseTitle: course.title,
        amount: course.price,
        voucherImage: voucherPreview,
        paymentDate: new Date(formDate).toISOString(),
      });
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el comprobante.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0D1B2A] text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-sky-400" />
            <div>
              <p className="text-xs uppercase tracking-widest text-sky-400">Inscripción</p>
              <h2 className="text-lg font-bold">{course.title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 hover:bg-white/20 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── STEP 1: Instrucciones ─────────────────────────────── */}
        {step === 'instructions' && (
          <div className="max-h-[80vh] overflow-y-auto px-6 py-6 space-y-6">
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5">
              <p className="text-sm text-gray-300 leading-relaxed">{settings.paymentInstructions}</p>
            </div>

            {/* Inversión */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-emerald-400">Inversión del curso</p>
                <p className="mt-1 text-4xl font-bold text-white">
                  {currency} {course.price.toFixed(2)}
                </p>
              </div>
              <Banknote className="h-12 w-12 text-emerald-400 opacity-50" />
            </div>

            {/* Yape */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
              <div className="flex items-center gap-2 text-green-400 font-semibold">
                <Phone className="h-5 w-5" />
                Pago por Yape
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-400">Número</p>
                  <p className="font-mono font-semibold text-white text-lg">{settings.yapeNumber}</p>
                </div>
                <div>
                  <p className="text-gray-400">Nombre</p>
                  <p className="font-semibold text-white">{settings.yapeName}</p>
                </div>
              </div>
            </div>

            {/* Cuenta bancaria */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
              <div className="flex items-center gap-2 text-blue-400 font-semibold">
                <Banknote className="h-5 w-5" />
                Transferencia Bancaria — {settings.bankName}
              </div>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Titular</span>
                  <span className="font-semibold text-white">{settings.bankHolder}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">DNI</span>
                  <span className="font-mono text-white">{settings.bankDni}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">N° Cta. Soles</span>
                  <span className="font-mono text-white">{settings.bankAccount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">CCI</span>
                  <span className="font-mono text-white text-xs">{settings.bankCci}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep('form')}
              className="w-full rounded-2xl bg-[#003F6F] py-4 font-bold text-white hover:bg-[#075B98] transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="h-5 w-5" />
              Ya realicé mi pago
            </button>
          </div>
        )}

        {/* ── STEP 2: Formulario de comprobante ──────────────────── */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto px-6 py-6 space-y-5">
            <p className="text-sm text-gray-400">
              Completa los datos de tu comprobante. El gestor los verificará y activará tu acceso al curso.
            </p>

            {/* Nombre */}
            <div>
              <label className="mb-2 block text-xs uppercase tracking-widest text-gray-400">
                Nombre del pagador
              </label>
              <div className="flex items-center gap-2">
                {editingName ? (
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                    autoFocus
                  />
                ) : (
                  <div className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white">
                    {formName}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setEditingName((v) => !v)}
                  className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition"
                  title="Editar nombre"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Fecha */}
            <div>
              <label className="mb-2 block text-xs uppercase tracking-widest text-gray-400">
                Fecha del pago
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              />
            </div>

            {/* Voucher */}
            <div>
              <label className="mb-2 block text-xs uppercase tracking-widest text-gray-400">
                Imagen / Captura del voucher
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-white/20 bg-black/20 p-6 flex flex-col items-center justify-center gap-3 hover:border-sky-500/50 hover:bg-sky-500/5 transition"
              >
                {voucherPreview ? (
                  <img
                    src={voucherPreview}
                    alt="Voucher"
                    className="max-h-48 rounded-xl object-contain"
                  />
                ) : (
                  <>
                    <ImageIcon className="h-10 w-10 text-gray-500" />
                    <p className="text-sm text-gray-400">
                      Haz clic para seleccionar imagen (JPG, PNG, max 5 MB)
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {voucherPreview && (
                <button
                  type="button"
                  onClick={() => setVoucherPreview(null)}
                  className="mt-2 text-xs text-red-400 hover:text-red-300"
                >
                  Quitar imagen
                </button>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('instructions')}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 font-semibold hover:bg-white/10 transition"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-2xl bg-[#003F6F] py-3 font-bold text-white hover:bg-[#075B98] disabled:opacity-60 transition flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {saving ? 'Enviando...' : 'Enviar comprobante'}
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 3: Éxito ─────────────────────────────────────── */}
        {step === 'success' && (
          <div className="px-6 py-10 flex flex-col items-center text-center space-y-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold">¡Comprobante enviado!</h3>
            <p className="max-w-md text-gray-400 text-sm leading-relaxed">
              Tu comprobante fue enviado al gestor del campus. Una vez verificado el pago, recibirás
              una notificación y podrás acceder al curso.
            </p>
            <p className="text-xs text-gray-500">El proceso suele tomar entre 1 y 24 horas hábiles.</p>
            <button
              type="button"
              onClick={onSuccess}
              className="rounded-2xl bg-white px-8 py-3 font-bold text-black hover:bg-gray-100 transition"
            >
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
