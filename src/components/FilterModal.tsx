import React, { useRef, useState, useEffect } from 'react';
import { Check, ArrowLeft, Sparkles, Sliders, Sun, Contrast as ContrastIcon } from 'lucide-react';
import type { FilterType, FilterOptions } from '../types';
import { processImageWithFilter } from '../utils/filters';

interface FilterModalProps {
  isOpen: boolean;
  warpedImageDataUrl: string;
  onClose: () => void;
  onSave: (filteredDataUrl: string, options: FilterOptions) => void;
}

const FILTER_PRESETS: { id: FilterType; label: string; desc: string }[] = [
  { id: 'magic', label: 'Sihirli Renk', desc: 'Gölge siler, kağıdı beyazlatır' },
  { id: 'bw', label: 'Siyah Beyaz', desc: 'Net fotokopi modu' },
  { id: 'grayscale', label: 'Gri Ton', desc: 'Yüksek kontrast gri' },
  { id: 'sharp', label: 'Keskin', desc: 'Yazı netliğini artırır' },
  { id: 'original', label: 'Orijinal', desc: 'Filtresiz düzeltilmiş' },
];

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  warpedImageDataUrl,
  onClose,
  onSave,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('magic');
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [showAdjustments, setShowAdjustments] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const rawCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load initial image into base canvas
  useEffect(() => {
    if (!isOpen || !warpedImageDataUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = warpedImageDataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        rawCanvasRef.current = canvas;
        applyCurrentFilters('magic', 0, 0);
      }
    };
  }, [isOpen, warpedImageDataUrl]);

  const applyCurrentFilters = (
    type: FilterType,
    b: number,
    c: number
  ) => {
    if (!rawCanvasRef.current) return;

    setIsProcessing(true);
    // Defer processing so UI stays responsive
    setTimeout(() => {
      if (!rawCanvasRef.current) return;
      const filtered = processImageWithFilter(rawCanvasRef.current, {
        type,
        brightness: b,
        contrast: c,
      });
      setPreviewUrl(filtered.toDataURL('image/jpeg', 0.95));
      setIsProcessing(false);
    }, 20);
  };

  const handleFilterSelect = (type: FilterType) => {
    setSelectedFilter(type);
    applyCurrentFilters(type, brightness, contrast);
  };

  const handleBrightnessChange = (val: number) => {
    setBrightness(val);
    applyCurrentFilters(selectedFilter, val, contrast);
  };

  const handleContrastChange = (val: number) => {
    setContrast(val);
    applyCurrentFilters(selectedFilter, brightness, val);
  };

  const handleSave = () => {
    onSave(previewUrl || warpedImageDataUrl, {
      type: selectedFilter,
      brightness,
      contrast,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between select-none">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 z-10">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition active:scale-95 text-xs font-semibold"
          title="Vazgeç / Geri Dön"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Vazgeç</span>
        </button>

        <h2 className="text-base font-semibold text-white tracking-wide flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          Filtre & İyileştirme
        </h2>

        <button
          onClick={() => setShowAdjustments(!showAdjustments)}
          className={`p-2.5 rounded-full transition ${
            showAdjustments ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-400'
          }`}
          title="Manuel Ayarlar"
        >
          <Sliders className="w-5 h-5" />
        </button>
      </div>

      {/* Preview Area */}
      <div className="relative flex-1 w-full overflow-hidden flex items-center justify-center p-4 bg-slate-950">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Filtreli Belge"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-opacity duration-150"
          />
        ) : (
          <div className="text-slate-400 flex items-center gap-2">
            <span className="animate-spin w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
            İşleniyor...
          </div>
        )}

        {isProcessing && (
          <div className="absolute top-6 right-6 px-3 py-1.5 bg-black/75 backdrop-blur-md rounded-full text-xs text-emerald-400 font-medium flex items-center gap-1.5 shadow">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Uygulanıyor
          </div>
        )}
      </div>

      {/* Adjustments Panel (Optional dropdown) */}
      {showAdjustments && (
        <div className="bg-slate-900/95 border-t border-slate-800 px-6 py-4 flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 w-28 text-xs font-medium text-slate-300">
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Parlaklık</span>
            </div>
            <input
              type="range"
              min="-40"
              max="40"
              value={brightness}
              onChange={(e) => handleBrightnessChange(Number(e.target.value))}
              className="flex-1 accent-emerald-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
            <span className="w-8 text-right text-xs font-mono text-slate-400">{brightness}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 w-28 text-xs font-medium text-slate-300">
              <ContrastIcon className="w-4 h-4 text-sky-400" />
              <span>Kontrast</span>
            </div>
            <input
              type="range"
              min="-40"
              max="40"
              value={contrast}
              onChange={(e) => handleContrastChange(Number(e.target.value))}
              className="flex-1 accent-emerald-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
            <span className="w-8 text-right text-xs font-mono text-slate-400">{contrast}</span>
          </div>
        </div>
      )}

      {/* Bottom Filter Selectors & Confirm Bar */}
      <div className="bg-slate-900 border-t border-slate-800 p-4 pb-6 flex flex-col gap-4">
        {/* Preset Buttons */}
        <div className="flex items-center justify-around gap-2 overflow-x-auto pb-1">
          {FILTER_PRESETS.map((preset) => {
            const isSelected = selectedFilter === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleFilterSelect(preset.id)}
                className={`flex-1 min-w-[85px] py-2 px-2.5 rounded-xl border flex flex-col items-center justify-center transition active:scale-95 ${
                  isSelected
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-900/30'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-xs font-semibold">{preset.label}</span>
              </button>
            );
          })}
        </div>

        {/* Save & Finish button */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            {FILTER_PRESETS.find((f) => f.id === selectedFilter)?.desc}
          </p>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 transition active:scale-95 ml-auto"
          >
            <span>Sayfayı Kaydet</span>
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
