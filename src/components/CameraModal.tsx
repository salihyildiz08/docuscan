import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Zap, ZapOff, Image as ImageIcon } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
  onSelectFromGallery: (file: File | null) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  onSelectFromGallery,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Initialize camera stream
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 2560 },
          height: { ideal: 1440 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check torch capability
      const track = stream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities?.() || {}) as { torch?: boolean };
      setHasTorch(Boolean(capabilities.torch));
    } catch (err: unknown) {
      console.warn('Camera stream error:', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play();
        }
      } catch (fallbackErr: unknown) {
        const errorMsg = fallbackErr instanceof Error ? fallbackErr.message : 'Kameraya erişilemedi';
        setCameraError(`Kamera başlatılamadı: ${errorMsg}. Lütfen izinleri kontrol edin veya dosya yükleyin.`);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const newTorch = !torchOn;
      // @ts-expect-error torch constraint
      await track.applyConstraints({ advanced: [{ torch: newTorch }] });
      setTorchOn(newTorch);
    } catch (e) {
      console.error('Torch error:', e);
    }
  };

  const takeSnapshot = () => {
    if (!videoRef.current || isCapturing) return;

    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    // Flash animation trigger & transition directly to crop
    setTimeout(() => {
      setIsCapturing(false);
      onCapture(dataUrl);
      onClose();
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent z-10">
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white transition active:scale-95"
          title="Kapat"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2.5 rounded-full transition active:scale-95 ${
                torchOn ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800/80 text-white'
              }`}
              title="Flaş Aç/Kapat"
            >
              {torchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={toggleFacingMode}
            className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white transition active:scale-95"
            title="Kamera Değiştir"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Camera Viewfinder */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {cameraError ? (
          <div className="text-center p-6 max-w-md bg-slate-800/90 rounded-2xl mx-4 border border-slate-700">
            <p className="text-amber-400 font-medium mb-3">{cameraError}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition"
            >
              Galeriden Fotoğraf Seç
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Document Frame Guide Overlay */}
            <div className="absolute inset-8 sm:inset-16 border-2 border-emerald-400/60 rounded-2xl pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.38)]">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm"></div>
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm"></div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm"></div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-sm"></div>

              <div className="absolute inset-x-0 top-3 text-center">
                <span className="bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-medium text-emerald-300">
                  Belgeyi çerçeveye hizalayıp çekin
                </span>
              </div>
            </div>

            {/* White flash effect on capture */}
            {isCapturing && (
              <div className="absolute inset-0 bg-white transition-opacity duration-150 animate-pulse" />
            )}
          </>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-gradient-to-t from-black/95 via-black/80 to-transparent p-6 pb-8 z-10 flex flex-col items-center gap-4">
        <div className="w-full flex items-center justify-around max-w-sm">
          {/* Gallery single picker button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white transition active:scale-95"
            title="Galeriden Tek Fotoğraf Seç"
          >
            <ImageIcon className="w-6 h-6" />
          </button>

          {/* Shutter Button */}
          <button
            onClick={takeSnapshot}
            disabled={isCapturing}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 bg-white/20 active:scale-90 transition transform"
          >
            <div className="w-full h-full bg-emerald-500 hover:bg-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/50">
              <Camera className="w-7 h-7 text-white" />
            </div>
          </button>

          <div className="w-12" />
        </div>
      </div>

      {/* Single file input (no multiple) */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          if (file) {
            onSelectFromGallery(file);
            onClose();
          }
        }}
      />
    </div>
  );
};
