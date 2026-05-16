import React, { useEffect, useState } from 'react';
import { Loader2, Save, Settings } from 'lucide-react';
import { api } from '../services/api';
import { SystemSettings } from '../types';

interface SystemSettingsTabProps {
  onSettingsUpdate: (settings: SystemSettings) => void;
}

const SystemSettingsTab: React.FC<SystemSettingsTabProps> = ({ onSettingsUpdate }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await api.getSystemSettings();
      setSettings(data);
      setLoading(false);
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setSuccess(false);
    try {
      const updated = await api.updateSystemSettings(settings);
      setSettings(updated);
      onSettingsUpdate(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof SystemSettings, value: string) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
        Cargando configuración...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-[#171717] p-6 lg:p-10">
      <div className="flex items-center gap-3 border-b border-white/10 pb-6 mb-6">
        <Settings className="h-6 w-6 text-sky-400" />
        <div>
          <h2 className="text-xl font-semibold">Configuración del Sistema</h2>
          <p className="text-sm text-gray-400">Personaliza la apariencia y opciones de pago del campus.</p>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Generales */}
        <div className="space-y-5">
          <h3 className="font-semibold text-sky-300 uppercase tracking-widest text-xs">General y Apariencia</h3>
          
          <div>
            <label className="mb-2 block text-sm text-gray-400">Nombre del Campus</label>
            <input
              value={settings.campusName}
              onChange={(e) => handleChange('campusName', e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-sky-500/50"
            />
          </div>
          
          <div>
            <label className="mb-2 block text-sm text-gray-400">URL del Logo (Opcional)</label>
            <input
              value={settings.logoUrl}
              onChange={(e) => handleChange('logoUrl', e.target.value)}
              placeholder="https://ejemplo.com/logo.png"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-sky-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm text-gray-400">Moneda (Símbolo)</label>
              <input
                value={settings.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                placeholder="S/."
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-sky-500/50"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-400">Código ISO</label>
              <input
                value={settings.currencyCode}
                onChange={(e) => handleChange('currencyCode', e.target.value)}
                placeholder="PEN"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-sky-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-2 block text-sm text-gray-400">Color Primario</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  className="h-12 w-12 rounded-lg cursor-pointer bg-black/20"
                />
                <input
                  type="text"
                  value={settings.primaryColor}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-sky-500/50"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-400">Color Secundario</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.secondaryColor}
                  onChange={(e) => handleChange('secondaryColor', e.target.value)}
                  className="h-12 w-12 rounded-lg cursor-pointer bg-black/20"
                />
                <input
                  type="text"
                  value={settings.secondaryColor}
                  onChange={(e) => handleChange('secondaryColor', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-sky-500/50"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-400">Color Acento</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => handleChange('accentColor', e.target.value)}
                  className="h-12 w-12 rounded-lg cursor-pointer bg-black/20"
                />
                <input
                  type="text"
                  value={settings.accentColor}
                  onChange={(e) => handleChange('accentColor', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-sky-500/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pagos */}
        <div className="space-y-5">
          <h3 className="font-semibold text-emerald-300 uppercase tracking-widest text-xs">Datos de Pago (Yape / Banco)</h3>
          
          <div>
            <label className="mb-2 block text-sm text-gray-400">Instrucciones generales</label>
            <textarea
              value={settings.paymentInstructions}
              onChange={(e) => handleChange('paymentInstructions', e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none resize-none focus:border-emerald-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm text-gray-400">Número Yape</label>
              <input
                value={settings.yapeNumber}
                onChange={(e) => handleChange('yapeNumber', e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-400">Titular Yape</label>
              <input
                value={settings.yapeName}
                onChange={(e) => handleChange('yapeName', e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-2 block text-sm text-gray-400">Banco</label>
              <input
                value={settings.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-2 block text-sm text-gray-400">Titular Cuenta</label>
              <input
                value={settings.bankHolder}
                onChange={(e) => handleChange('bankHolder', e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-2 block text-sm text-gray-400">N° Cuenta</label>
              <input
                value={settings.bankAccount}
                onChange={(e) => handleChange('bankAccount', e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-2 block text-sm text-gray-400">CCI</label>
              <input
                value={settings.bankCci}
                onChange={(e) => handleChange('bankCci', e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-2 block text-sm text-gray-400">DNI Titular</label>
              <input
                value={settings.bankDni}
                onChange={(e) => handleChange('bankDni', e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-end gap-4 border-t border-white/10 pt-6">
        {success && <span className="text-sm text-emerald-400">¡Configuración guardada!</span>}
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-2xl bg-white px-8 py-3 font-bold text-black transition hover:bg-gray-200 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Guardar Cambios
        </button>
      </div>
    </form>
  );
};

export default SystemSettingsTab;
