import React, { useState, useRef } from 'react';
import { Building2, Save, Loader2, Upload, X, AlertCircle } from 'lucide-react';

interface SetupPageProps {
  uid: string;
  onSave: (uid: string, data: { name: string; logoUrl: string; description: string }) => void | Promise<void>;
}

export default function SetupPage({ uid, onSave }: SetupPageProps) {
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [logoPreviewError, setLogoPreviewError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('File must be an image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoUrl(ev.target?.result as string);
      setLogoPreviewError(false);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    setLogoPreviewError(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Store name is required');
      return;
    }
    if (trimmedName.length < 2) {
      setError('Store name must be at least 2 characters');
      return;
    }

    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 600));

    try {
      await onSave(uid, {
        name: trimmedName,
        logoUrl: logoUrl.trim(),
        description: description.trim(),
      });
    } catch (err) {
      setIsSaving(false);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Erro ao salvar: ${msg}`);
      return;
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-[560px] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-slate-900 dark:bg-slate-700 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white dark:text-slate-300" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Configure sua loja</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Você pode alterar essas informações depois no seu perfil.</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {/* Store Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Nome da loja <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="Ex: Camisas Football Store"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 focus:border-slate-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-colors outline-none text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-700 placeholder:text-slate-400"
            />
          </div>

          {/* Logo Upload */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Logo <span className="text-slate-400 font-normal">(opcional)</span>
            </label>

            {/* Drop zone / preview */}
            {logoUrl && !logoPreviewError ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="w-14 h-14 object-contain rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 p-1"
                  onError={() => setLogoPreviewError(true)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium truncate">Logo预览</p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-slate-300 dark:hover:border-slate-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-5 h-5 text-slate-400" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Clique para enviar ou arraste uma imagem
                </p>
                <p className="text-xs text-slate-400">PNG, JPG até 5MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  className="hidden"
                />
              </div>
            )}

            {/* URL input */}
            <input
              type="url"
              value={logoUrl.startsWith('data:') ? '' : logoUrl}
              onChange={(e) => { setLogoUrl(e.target.value); setLogoPreviewError(false); }}
              placeholder="Ou cole a URL da imagem..."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-600 focus:border-slate-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-colors outline-none text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-700 placeholder:text-slate-400"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Descrição <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição da sua loja..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 focus:border-slate-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-colors outline-none text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-700 placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSaving || !name.trim()}
            className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white font-medium text-sm py-3 px-6 rounded-lg transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Criar minha loja
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
