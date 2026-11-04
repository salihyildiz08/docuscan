import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCw, RotateCcw, Check, ArrowLeft, Wand2, Maximize2, GitBranch, Ratio } from 'lucide-react';
import type { Point, DocumentCorners } from '../types';
import { warpPerspective, midpoint } from '../utils/geometry';
import { detectDocumentCorners, getDefaultCorners } from '../utils/edgeDetection';

interface CropModalProps {
  isOpen: boolean;
  imageDataUrl: string;
  onClose: () => void;
  onSave: (warpedDataUrl: string, corners: DocumentCorners) => void;
}

type ActiveHandle =
  | 'tl'
  | 'tr'
  | 'br'
  | 'bl'
  | 'curveTop'
  | 'curveRight'
  | 'curveBottom'
  | 'curveLeft'
  | null;

export const CropModal: React.FC<CropModalProps> = ({
  isOpen,
  imageDataUrl,
  onClose,
  onSave,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);

  const [corners, setCorners] = useState<DocumentCorners | null>(null);
  const [activeHandle, setActiveHandle] = useState<ActiveHandle>(null);
  const [isCurvedMode, setIsCurvedMode] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<'a4' | 'auto'>('a4');
  const [imgSize, setImgSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [displayRect, setDisplayRect] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [cursorPos, setCursorPos] = useState<Point | null>(null);

  useEffect(() => {
    if (!isOpen || !imageDataUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageDataUrl;
    img.onload = () => {
      imageRef.current = img;
      setImgSize({ width: img.naturalWidth, height: img.naturalHeight });

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.naturalWidth;
      tempCanvas.height = img.naturalHeight;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const detected = detectDocumentCorners(tempCanvas);
        setCorners(detected);
      } else {
        const def = getDefaultCorners(img.naturalWidth, img.naturalHeight);
        setCorners(def);
      }
    };
  }, [isOpen, imageDataUrl]);

  const initCornersWithCurves = (baseCorners: DocumentCorners) => {
    const edgeCurves = baseCorners.edgeCurves || {
      top: midpoint(baseCorners.topLeft, baseCorners.topRight),
      right: midpoint(baseCorners.topRight, baseCorners.bottomRight),
      bottom: midpoint(baseCorners.bottomLeft, baseCorners.bottomRight),
      left: midpoint(baseCorners.topLeft, baseCorners.bottomLeft),
    };
    setCorners({ ...baseCorners, edgeCurves });
  };

  const updateDisplayRect = useCallback(() => {
    if (!containerRef.current || !imgSize.width || !imgSize.height) return;

    const container = containerRef.current;
    const containerW = container.clientWidth - 32;
    const containerH = container.clientHeight - 32;

    const scale = Math.min(containerW / imgSize.width, containerH / imgSize.height);
    const width = imgSize.width * scale;
    const height = imgSize.height * scale;
    const x = (container.clientWidth - width) / 2;
    const y = (container.clientHeight - height) / 2;

    setDisplayRect({ x, y, width, height });
  }, [imgSize]);

  useEffect(() => {
    updateDisplayRect();
    window.addEventListener('resize', updateDisplayRect);
    return () => window.removeEventListener('resize', updateDisplayRect);
  }, [updateDisplayRect]);

  const imageToDisplay = (pt: Point): Point => {
    if (!imgSize.width || !imgSize.height) return pt;
    const scaleX = displayRect.width / imgSize.width;
    const scaleY = displayRect.height / imgSize.height;
    return {
      x: displayRect.x + pt.x * scaleX,
      y: displayRect.y + pt.y * scaleY,
    };
  };

  const displayToImage = (pt: Point): Point => {
    if (!displayRect.width || !displayRect.height) return pt;
    const scaleX = imgSize.width / displayRect.width;
    const scaleY = imgSize.height / displayRect.height;
    const x = Math.max(0, Math.min(imgSize.width, (pt.x - displayRect.x) * scaleX));
    const y = Math.max(0, Math.min(imgSize.height, (pt.y - displayRect.y) * scaleY));
    return { x: Math.round(x), y: Math.round(y) };
  };

  const drawLoupe = (imgPoint: Point) => {
    const canvas = loupeCanvasRef.current;
    if (!canvas || !imageRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const zoom = 2.5;
    const size = canvas.width;
    const radius = size / 2;

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(radius, radius, radius - 2, 0, Math.PI * 2);
    ctx.clip();

    const srcSize = size / zoom;
    const sx = Math.max(0, Math.min(imgSize.width - srcSize, imgPoint.x - srcSize / 2));
    const sy = Math.max(0, Math.min(imgSize.height - srcSize, imgPoint.y - srcSize / 2));

    ctx.drawImage(imageRef.current, sx, sy, srcSize, srcSize, 0, 0, size, size);

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(radius - 16, radius);
    ctx.lineTo(radius + 16, radius);
    ctx.moveTo(radius, radius - 16);
    ctx.lineTo(radius, radius + 16);
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(radius, radius, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(radius, radius, radius - 1.5, 0, Math.PI * 2);
    ctx.stroke();
  };

  const handlePointerDown = (handle: ActiveHandle, e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveHandle(handle);

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const clientPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setCursorPos(clientPt);
      if (corners) {
        const imgPt = getPointForHandle(handle, corners);
        drawLoupe(imgPt);
      }
    }
  };

  const getPointForHandle = (handle: ActiveHandle, c: DocumentCorners): Point => {
    switch (handle) {
      case 'tl': return c.topLeft;
      case 'tr': return c.topRight;
      case 'br': return c.bottomRight;
      case 'bl': return c.bottomLeft;
      case 'curveTop': return c.edgeCurves?.top || midpoint(c.topLeft, c.topRight);
      case 'curveRight': return c.edgeCurves?.right || midpoint(c.topRight, c.bottomRight);
      case 'curveBottom': return c.edgeCurves?.bottom || midpoint(c.bottomLeft, c.bottomRight);
      case 'curveLeft': return c.edgeCurves?.left || midpoint(c.topLeft, c.bottomLeft);
      default: return c.topLeft;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeHandle || !corners || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setCursorPos(clientPt);

    const targetImgPt = displayToImage(clientPt);
    drawLoupe(targetImgPt);

    setCorners((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      const curves = { ...next.edgeCurves };

      if (activeHandle === 'tl') next.topLeft = targetImgPt;
      else if (activeHandle === 'tr') next.topRight = targetImgPt;
      else if (activeHandle === 'br') next.bottomRight = targetImgPt;
      else if (activeHandle === 'bl') next.bottomLeft = targetImgPt;
      else if (activeHandle === 'curveTop') curves.top = targetImgPt;
      else if (activeHandle === 'curveRight') curves.right = targetImgPt;
      else if (activeHandle === 'curveBottom') curves.bottom = targetImgPt;
      else if (activeHandle === 'curveLeft') curves.left = targetImgPt;

      next.edgeCurves = curves;
      return next;
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    setActiveHandle(null);
    setCursorPos(null);
  };

  const rotateImage = (degrees: number) => {
    if (!imageRef.current) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    if (degrees === 90 || degrees === 270) {
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
    } else {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const newImg = new Image();
    newImg.src = rotatedDataUrl;
    newImg.onload = () => {
      imageRef.current = newImg;
      setImgSize({ width: newImg.naturalWidth, height: newImg.naturalHeight });
      initCornersWithCurves(getDefaultCorners(newImg.naturalWidth, newImg.naturalHeight));
    };
  };

  const handleApplyCrop = () => {
    if (!imageRef.current || !corners) return;

    setIsProcessing(true);
    setTimeout(() => {
      try {
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = imageRef.current!.naturalWidth;
        sourceCanvas.height = imageRef.current!.naturalHeight;
        const ctx = sourceCanvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(imageRef.current!, 0, 0);

        const finalCorners: DocumentCorners = isCurvedMode
          ? corners
          : { ...corners, edgeCurves: undefined };

        // Pass selected aspect ratio
        const warpedCanvas = warpPerspective(sourceCanvas, finalCorners, undefined, undefined, aspectRatio);
        const warpedDataUrl = warpedCanvas.toDataURL('image/jpeg', 0.95);

        onSave(warpedDataUrl, finalCorners);
      } catch (err) {
        console.error('Dewarp error:', err);
      } finally {
        setIsProcessing(false);
      }
    }, 50);
  };

  if (!isOpen) return null;

  const dtTL = corners ? imageToDisplay(corners.topLeft) : { x: 0, y: 0 };
  const dtTR = corners ? imageToDisplay(corners.topRight) : { x: 0, y: 0 };
  const dtBR = corners ? imageToDisplay(corners.bottomRight) : { x: 0, y: 0 };
  const dtBL = corners ? imageToDisplay(corners.bottomLeft) : { x: 0, y: 0 };

  const topCurvePt = corners?.edgeCurves?.top ? imageToDisplay(corners.edgeCurves.top) : { x: (dtTL.x + dtTR.x) / 2, y: (dtTL.y + dtTR.y) / 2 };
  const rightCurvePt = corners?.edgeCurves?.right ? imageToDisplay(corners.edgeCurves.right) : { x: (dtTR.x + dtBR.x) / 2, y: (dtTR.y + dtBR.y) / 2 };
  const bottomCurvePt = corners?.edgeCurves?.bottom ? imageToDisplay(corners.edgeCurves.bottom) : { x: (dtBL.x + dtBR.x) / 2, y: (dtBL.y + dtBR.y) / 2 };
  const leftCurvePt = corners?.edgeCurves?.left ? imageToDisplay(corners.edgeCurves.left) : { x: (dtTL.x + dtBL.x) / 2, y: (dtTL.y + dtBL.y) / 2 };

  const topCtrl = { x: 2 * topCurvePt.x - 0.5 * (dtTL.x + dtTR.x), y: 2 * topCurvePt.y - 0.5 * (dtTL.y + dtTR.y) };
  const rightCtrl = { x: 2 * rightCurvePt.x - 0.5 * (dtTR.x + dtBR.x), y: 2 * rightCurvePt.y - 0.5 * (dtTR.y + dtBR.y) };
  const bottomCtrl = { x: 2 * bottomCurvePt.x - 0.5 * (dtBL.x + dtBR.x), y: 2 * bottomCurvePt.y - 0.5 * (dtBL.y + dtBR.y) };
  const leftCtrl = { x: 2 * leftCurvePt.x - 0.5 * (dtTL.x + dtBL.x), y: 2 * leftCurvePt.y - 0.5 * (dtTL.y + dtBL.y) };

  const curveSvgPath = isCurvedMode
    ? `M ${dtTL.x} ${dtTL.y} Q ${topCtrl.x} ${topCtrl.y} ${dtTR.x} ${dtTR.y} Q ${rightCtrl.x} ${rightCtrl.y} ${dtBR.x} ${dtBR.y} Q ${bottomCtrl.x} ${bottomCtrl.y} ${dtBL.x} ${dtBL.y} Q ${leftCtrl.x} ${leftCtrl.y} ${dtTL.x} ${dtTL.y} Z`
    : `M ${dtTL.x} ${dtTL.y} L ${dtTR.x} ${dtTR.y} L ${dtBR.x} ${dtBR.y} L ${dtBL.x} ${dtBL.y} Z`;

  const loupePos = cursorPos
    ? {
        x: Math.max(70, Math.min((containerRef.current?.clientWidth || 300) - 70, cursorPos.x)),
        y: cursorPos.y > 150 ? cursorPos.y - 95 : cursorPos.y + 95,
      }
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 z-10">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition active:scale-95 text-xs font-semibold"
          title="Vazgeç / Çıkış"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Vazgeç</span>
        </button>

        {/* Mode Controls: Curved Dewarp + Aspect Ratio */}
        <div className="flex items-center gap-2">
          {/* Curved Mode Toggle */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setIsCurvedMode(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                isCurvedMode
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Kıvrım & Bükülme</span>
            </button>
            <button
              onClick={() => setIsCurvedMode(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                !isCurvedMode
                  ? 'bg-slate-700 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Düz Çerçeve
            </button>
          </div>

          {/* Aspect Ratio Preset */}
          <div className="hidden sm:flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setAspectRatio('a4')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                aspectRatio === 'a4'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="A4 Doğal Kağıt Oranı (Yassılaşmayı önler)"
            >
              <Ratio className="w-3 h-3" />
              <span>A4 Oranı</span>
            </button>
            <button
              onClick={() => setAspectRatio('auto')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                aspectRatio === 'auto'
                  ? 'bg-slate-700 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Serbest
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => rotateImage(270)}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
            title="Sola Döndür"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={() => rotateImage(90)}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
            title="Sağa Döndür"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center touch-none bg-slate-950"
      >
        {imageDataUrl && (
          <img
            src={imageDataUrl}
            alt="Belge"
            className="pointer-events-none absolute select-none shadow-2xl"
            style={{
              left: `${displayRect.x}px`,
              top: `${displayRect.y}px`,
              width: `${displayRect.width}px`,
              height: `${displayRect.height}px`,
            }}
          />
        )}

        {/* SVG Guidelines */}
        {corners && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <mask id="crop-mask">
                <rect width="100%" height="100%" fill="white" />
                <path d={curveSvgPath} fill="black" />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.58)"
              mask="url(#crop-mask)"
            />

            <path
              d={curveSvgPath}
              fill="rgba(16, 185, 129, 0.08)"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeDasharray={activeHandle ? '6 4' : 'none'}
            />
          </svg>
        )}

        {/* 4 Interactive Corner Handles */}
        {corners && (
          <>
            <div
              onPointerDown={(e) => handlePointerDown('tl', e)}
              onPointerUp={handlePointerUp}
              className="absolute w-10 h-10 -ml-5 -mt-5 flex items-center justify-center cursor-nwse-resize z-30"
              style={{ left: `${dtTL.x}px`, top: `${dtTL.y}px` }}
            >
              <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-lg shadow-emerald-500/50 hover:scale-125 transition-transform" />
            </div>

            <div
              onPointerDown={(e) => handlePointerDown('tr', e)}
              onPointerUp={handlePointerUp}
              className="absolute w-10 h-10 -ml-5 -mt-5 flex items-center justify-center cursor-nesw-resize z-30"
              style={{ left: `${dtTR.x}px`, top: `${dtTR.y}px` }}
            >
              <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-lg shadow-emerald-500/50 hover:scale-125 transition-transform" />
            </div>

            <div
              onPointerDown={(e) => handlePointerDown('br', e)}
              onPointerUp={handlePointerUp}
              className="absolute w-10 h-10 -ml-5 -mt-5 flex items-center justify-center cursor-nwse-resize z-30"
              style={{ left: `${dtBR.x}px`, top: `${dtBR.y}px` }}
            >
              <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-lg shadow-emerald-500/50 hover:scale-125 transition-transform" />
            </div>

            <div
              onPointerDown={(e) => handlePointerDown('bl', e)}
              onPointerUp={handlePointerUp}
              className="absolute w-10 h-10 -ml-5 -mt-5 flex items-center justify-center cursor-nesw-resize z-30"
              style={{ left: `${dtBL.x}px`, top: `${dtBL.y}px` }}
            >
              <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-lg shadow-emerald-500/50 hover:scale-125 transition-transform" />
            </div>

            {/* Edge Curve Handles */}
            {isCurvedMode && (
              <>
                <div
                  onPointerDown={(e) => handlePointerDown('curveTop', e)}
                  onPointerUp={handlePointerUp}
                  className="absolute w-10 h-10 -ml-5 -mt-5 flex items-center justify-center cursor-ns-resize z-30"
                  style={{ left: `${topCurvePt.x}px`, top: `${topCurvePt.y}px` }}
                  title="Üst Kenar Bükümünü Ayarla"
                >
                  <div className="w-4 h-4 rounded-full bg-sky-400 border-2 border-white shadow-md hover:scale-125 transition-transform" />
                </div>

                <div
                  onPointerDown={(e) => handlePointerDown('curveRight', e)}
                  onPointerUp={handlePointerUp}
                  className="absolute w-10 h-10 -ml-5 -mt-5 flex items-center justify-center cursor-ew-resize z-30"
                  style={{ left: `${rightCurvePt.x}px`, top: `${rightCurvePt.y}px` }}
                  title="Sağ Kenar Bükümünü Ayarla"
                >
                  <div className="w-4 h-4 rounded-full bg-sky-400 border-2 border-white shadow-md hover:scale-125 transition-transform" />
                </div>

                <div
                  onPointerDown={(e) => handlePointerDown('curveBottom', e)}
                  onPointerUp={handlePointerUp}
                  className="absolute w-10 h-10 -ml-5 -mt-5 flex items-center justify-center cursor-ns-resize z-30"
                  style={{ left: `${bottomCurvePt.x}px`, top: `${bottomCurvePt.y}px` }}
                  title="Alt Kenar Bükümünü Ayarla"
                >
                  <div className="w-4 h-4 rounded-full bg-sky-400 border-2 border-white shadow-md hover:scale-125 transition-transform" />
                </div>

                <div
                  onPointerDown={(e) => handlePointerDown('curveLeft', e)}
                  onPointerUp={handlePointerUp}
                  className="absolute w-10 h-10 -ml-5 -mt-5 flex items-center justify-center cursor-ew-resize z-30"
                  style={{ left: `${leftCurvePt.x}px`, top: `${leftCurvePt.y}px` }}
                  title="Sol Kenar Bükümünü Ayarla"
                >
                  <div className="w-4 h-4 rounded-full bg-sky-400 border-2 border-white shadow-md hover:scale-125 transition-transform" />
                </div>
              </>
            )}
          </>
        )}

        {/* CamScanner Magnifying Loupe Window */}
        <div
          className={`absolute pointer-events-none transition-opacity duration-150 z-40 ${
            activeHandle ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            left: `${loupePos?.x || 0}px`,
            top: `${loupePos?.y || 0}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <canvas
            ref={loupeCanvasRef}
            width={120}
            height={120}
            className="rounded-full shadow-2xl shadow-black/80"
          />
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (imageRef.current) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = imageRef.current.naturalWidth;
                tempCanvas.height = imageRef.current.naturalHeight;
                const ctx = tempCanvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(imageRef.current, 0, 0);
                  initCornersWithCurves(detectDocumentCorners(tempCanvas));
                }
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium transition"
          >
            <Wand2 className="w-4 h-4 text-emerald-400" />
            <span>Otomatik Algıla</span>
          </button>

          <button
            onClick={() => initCornersWithCurves(getDefaultCorners(imgSize.width, imgSize.height, 0))}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium transition"
          >
            <Maximize2 className="w-4 h-4 text-sky-400" />
            <span>Tamamı</span>
          </button>
        </div>

        <button
          onClick={handleApplyCrop}
          disabled={isProcessing}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm sm:text-base shadow-lg shadow-emerald-500/25 transition active:scale-95 disabled:opacity-50"
        >
          {isProcessing ? (
            <span>Düzeltiliyor & Ütüleniyor...</span>
          ) : (
            <>
              <span>Düzelt & Devam Et</span>
              <Check className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
