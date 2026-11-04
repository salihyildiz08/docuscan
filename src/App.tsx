import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  FileDown,
  Trash2,
  Crop,
  Sparkles,
  RotateCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  FolderDown,
  ArrowLeftRight,
  GripVertical,
  Home,
  Crown,
  User,
  LogOut,
  Gift,
  Tag,
} from 'lucide-react';
import type { ScannedPage, DocumentCorners, FilterOptions } from './types';
import type { UserProfile } from './types/auth';
import { CameraModal } from './components/CameraModal';
import { CropModal } from './components/CropModal';
import { FilterModal } from './components/FilterModal';
import { AdminPanel } from './components/AdminPanel';
import { UpgradeModal } from './components/UpgradeModal';
import { AuthModal } from './components/AuthModal';
import { generatePdf, downloadBlob } from './utils/pdfExport';
import { getCurrentUser, signOut, isUserProActive, initAuthListener } from './services/authService';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const App: React.FC = () => {
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [docTitle, setDocTitle] = useState<string>('Yeni Belge');
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [showHomeConfirm, setShowHomeConfirm] = useState<boolean>(false);

  // User & SaaS State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getCurrentUser());
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);

  // Drag and drop state for reordering
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Modals state
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cropTarget, setCropTarget] = useState<{
    pageIndex: number;
    imageDataUrl: string;
    isNew: boolean;
  } | null>(null);
  const [filterTarget, setFilterTarget] = useState<{
    pageIndex: number;
    warpedDataUrl: string;
    isNew: boolean;
    provisionalPage?: ScannedPage;
  } | null>(null);

  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const unsubscribe = initAuthListener((user) => {
      if (user) {
        setCurrentUser(user);
        notify(`Hoş geldiniz, ${user.name}! (7 Günlük Deneme Aktif)`);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (pages.length > 0 && selectedPageIndex >= pages.length) {
      setSelectedPageIndex(pages.length - 1);
    }
  }, [pages.length, selectedPageIndex]);

  // Handle single camera capture
  const handleCameraCapture = (imageDataUrl: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      notify('Belge tarayabilmek için lütfen önce giriş yapın.');
      return;
    }

    setCropTarget({
      pageIndex: pages.length,
      imageDataUrl,
      isNew: true,
    });
  };

  // Handle single file upload
  const handleFileSelect = (file: File | null) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      notify('Belge yükleyebilmek için lütfen önce giriş yapın.');
      return;
    }

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setCropTarget({
          pageIndex: pages.length,
          imageDataUrl: dataUrl,
          isNew: true,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Step 1: Crop -> Filter (provisional, not added to pages yet)
  const handleCropComplete = (warpedDataUrl: string, corners: DocumentCorners) => {
    if (!cropTarget) return;

    if (cropTarget.isNew) {
      const newPage: ScannedPage = {
        id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        originalImageDataUrl: cropTarget.imageDataUrl,
        originalWidth: 0,
        originalHeight: 0,
        corners,
        rotation: 0,
        filter: { type: 'magic', brightness: 0, contrast: 0 },
        processedImageDataUrl: warpedDataUrl,
      };

      setCropTarget(null);
      setFilterTarget({
        pageIndex: pages.length,
        warpedDataUrl,
        isNew: true,
        provisionalPage: newPage,
      });
    } else {
      setPages((prev) => {
        const next = [...prev];
        const p = next[cropTarget.pageIndex];
        if (p) {
          next[cropTarget.pageIndex] = {
            ...p,
            corners,
            processedImageDataUrl: warpedDataUrl,
          };
        }
        return next;
      });
      setCropTarget(null);
      setFilterTarget({
        pageIndex: cropTarget.pageIndex,
        warpedDataUrl,
        isNew: false,
      });
    }
  };

  // Step 2: Filter -> Saved to Document
  const handleFilterComplete = (
    filteredDataUrl: string,
    options: FilterOptions
  ) => {
    if (!filterTarget) return;

    if (filterTarget.isNew && filterTarget.provisionalPage) {
      const completedPage: ScannedPage = {
        ...filterTarget.provisionalPage,
        processedImageDataUrl: filteredDataUrl,
        filter: options,
      };
      setPages((prev) => [...prev, completedPage]);
      setSelectedPageIndex(pages.length);
    } else {
      setPages((prev) => {
        const next = [...prev];
        const targetPage = next[filterTarget.pageIndex];
        if (targetPage) {
          next[filterTarget.pageIndex] = {
            ...targetPage,
            processedImageDataUrl: filteredDataUrl,
            filter: options,
          };
        }
        return next;
      });
      setSelectedPageIndex(filterTarget.pageIndex);
    }

    setFilterTarget(null);
    notify('Sayfa başarıyla belgenize eklendi!');
  };

  // Delete page
  const handleDeletePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
    notify('Sayfa silindi');
  };

  // Move page left/right
  const handleMovePage = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= pages.length) return;

    setPages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
    setSelectedPageIndex(targetIdx);
    notify(`Sayfa ${targetIdx + 1}. sıraya taşındı`);
  };

  // Drag and Drop reordering
  const handleDragStart = (index: number) => {
    setDraggedIdx(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDrop = (index: number) => {
    if (draggedIdx === null || draggedIdx === index) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    setPages((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(draggedIdx, 1);
      copy.splice(index, 0, removed);
      return copy;
    });

    setSelectedPageIndex(index);
    setDraggedIdx(null);
    setDragOverIdx(null);
    notify(`Sayfa ${index + 1}. konuma taşındı`);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  // Rotate 90 degrees
  const handleRotatePage = (index: number) => {
    const page = pages[index];
    if (!page || !page.processedImageDataUrl) return;

    const img = new Image();
    img.src = page.processedImageDataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setPages((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], processedImageDataUrl: rotatedDataUrl };
        return next;
      });
    };
  };

  // Export as multi-page PDF
  const handleExportPdf = async () => {
    if (!currentUser) {
      setIsAuthOpen(true);
      notify('PDF indirebilmek için lütfen önce giriş yapın.');
      return;
    }

    if (pages.length === 0) return;

    setIsExportingPdf(true);
    try {
      const pdfBytes = await generatePdf(pages, { pageSize: 'a4', quality: 0.92 });
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      downloadBlob(blob, `${docTitle.trim() || 'Tarama'}.pdf`);
      notify('PDF başarıyla indirildi!');
    } catch (err) {
      console.error('PDF export error:', err);
      notify('PDF oluşturulurken bir hata oluştu.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export as ZIP of images
  const handleExportZip = async () => {
    if (!currentUser) {
      setIsAuthOpen(true);
      notify('Görselleri indirebilmek için lütfen önce giriş yapın.');
      return;
    }

    if (pages.length === 0) return;

    try {
      const zip = new JSZip();
      pages.forEach((page, i) => {
        const dataUrl = page.processedImageDataUrl || page.originalImageDataUrl;
        const base64 = dataUrl.split(',')[1];
        zip.file(`sayfa-${i + 1}.jpg`, base64, { base64: true });
      });

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${docTitle.trim() || 'Tarama'}-gorseller.zip`);
      notify('Görseller ZIP olarak indirildi!');
    } catch (err) {
      console.error('ZIP export error:', err);
      notify('Görseller dışa aktarılırken hata oluştu.');
    }
  };

  const handleLogout = () => {
    signOut();
    setCurrentUser(null);
    setShowUserMenu(false);
    notify('Başarıyla çıkış yapıldı.');
  };

  const activePage = pages[selectedPageIndex];
  const proStatus = isUserProActive(currentUser);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Confirmation Modal to Exit to Home */}
      {showHomeConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Ana Sayfaya Dönüş</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Mevcut taranan {pages.length} sayfayı temizleyip yeni bir tarama başlatmak istiyor musunuz?
              </p>
            </div>
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => setShowHomeConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Vazgeç
              </button>
              <button
                onClick={() => {
                  setPages([]);
                  setDocTitle('Yeni Belge');
                  setShowHomeConfirm(false);
                  notify('Ana sayfaya dönüldü');
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition"
              >
                Evet, Ana Sayfa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Prominent Home / Return Button */}
          {pages.length > 0 && (
            <button
              onClick={() => setShowHomeConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition active:scale-95 border border-slate-700 mr-1 shadow-sm"
              title="Ana Sayfaya Dön / Yeni Belge"
            >
              <Home className="w-4 h-4 text-emerald-400" />
              <span>Ana Sayfa</span>
            </button>
          )}

          <div
            onClick={() => {
              if (pages.length > 0) setShowHomeConfirm(true);
            }}
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 cursor-pointer hover:scale-105 transition-transform"
            title="DocuScan"
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="bg-transparent text-base sm:text-lg font-bold text-white border-b border-transparent hover:border-slate-700 focus:border-emerald-500 focus:outline-none transition py-0.5"
                placeholder="Belge Adı"
              />
            </div>
            <p className="text-xs text-slate-400">
              {pages.length > 0 ? `${pages.length} Sayfa taranmış` : 'DocuScan - Akıllı Belge Tarayıcı'}
            </p>
          </div>
        </div>

        {/* Action & Auth Buttons in Header */}
        <div className="flex items-center gap-2">
          {/* Admin Panel Button (Exclusive to Admin) */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setIsAdminOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition active:scale-95"
              title="Yönetim Paneli"
            >
              <Crown className="w-3.5 h-3.5 fill-current" />
              <span>Yönetim Paneli</span>
            </button>
          )}

          {/* User Pro / Trial Badge / Upgrade Trigger */}
          {proStatus.reason === 'trial' ? (
            <button
              onClick={() => setIsUpgradeOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition hover:bg-emerald-900/60"
            >
              <Gift className="w-3.5 h-3.5 text-emerald-400" />
              <span>7 Günlük Deneme ({proStatus.daysLeft} gün)</span>
            </button>
          ) : proStatus.reason === 'pro' ? (
            <button
              onClick={() => setIsUpgradeOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-950/70 border border-sky-500/40 text-sky-300 text-xs font-semibold transition"
            >
              <Crown className="w-3.5 h-3.5 text-sky-400 fill-current" />
              <span>PRO Üye</span>
            </button>
          ) : (
            <button
              onClick={() => setIsUpgradeOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Kupon / PRO</span>
            </button>
          )}

          {/* Export Actions if Pages exist */}
          {pages.length > 0 && (
            <>
              <button
                onClick={handleExportZip}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                title="Tüm sayfaları ZIP olarak indir"
              >
                <FolderDown className="w-4 h-4 text-sky-400" />
                <span>ZIP</span>
              </button>

              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-500/25 transition active:scale-95 disabled:opacity-50"
              >
                <FileDown className="w-4 h-4" />
                <span>{isExportingPdf ? 'Oluşturuluyor...' : 'PDF İndir'}</span>
              </button>
            </>
          )}

          {/* User Profile / Login Button */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 pl-2 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-700 transition"
              >
                <span className="text-xs font-semibold text-slate-200 max-w-[100px] truncate hidden sm:inline">
                  {currentUser.name}
                </span>
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-xl object-cover border border-slate-600"
                />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 top-11 w-52 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl z-50 flex flex-col gap-1 text-xs">
                  <div className="p-2.5 border-b border-slate-800">
                    <p className="font-bold text-white truncate">{currentUser.name}</p>
                    <p className="text-slate-400 text-[11px] truncate">{currentUser.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setIsUpgradeOpen(true);
                    }}
                    className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-800 text-slate-200 text-left transition"
                  >
                    <Tag className="w-4 h-4 text-amber-400" />
                    <span>Kupon Kullan / Paketler</span>
                  </button>

                  {currentUser.role === 'admin' && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setIsAdminOpen(true);
                      }}
                      className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-800 text-amber-400 text-left transition font-semibold"
                    >
                      <Crown className="w-4 h-4" />
                      <span>Yönetim Paneli</span>
                    </button>
                  )}

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 p-2 rounded-xl hover:bg-rose-950/40 text-rose-400 text-left transition border-t border-slate-800 mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Çıkış Yap</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition active:scale-95"
            >
              <User className="w-4 h-4 text-emerald-400" />
              <span>Giriş Yap</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {!currentUser ? (
          /* Strict Auth Gate: User MUST log in before doing anything */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-12 border border-slate-800 rounded-3xl bg-slate-900/60 shadow-2xl my-auto max-w-xl mx-auto w-full">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center mb-5 shadow-xl shadow-emerald-500/20 text-white">
              <Sparkles className="w-10 h-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
              DocuScan Akıllı Tarayıcı
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
              Belge taramak, 3D bükülme düzeltmek ve yüksek kaliteli A4 PDF üretmek için lütfen giriş yapın.
            </p>

            {/* 7-Day Free Trial Banner */}
            <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/40 text-left flex items-start gap-3 mb-6 shadow-lg shadow-emerald-950/30">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white mb-1">
                  🎁 İlk 1 Hafta Tamamen Ücretsiz!
                </h4>
                <p className="text-[11px] sm:text-xs text-emerald-300/90 leading-relaxed">
                  Kayıt olan tüm kullanıcılara 7 gün boyunca tüm PRO özellikler (Sihirli Renk filtresi, 3D eğrilik düzeltme ve sınırsız PDF dışa aktarma) anında hediye edilir. Kredi kartı gerekmez.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsAuthOpen(true)}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm sm:text-base shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2.5 transition active:scale-95"
            >
              <User className="w-5 h-5 fill-current" />
              <span>Giriş Yap / 7 Gün Ücretsiz Başla</span>
            </button>

            {/* Security & Feature Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 w-full text-left">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1" />
                <h5 className="text-[11px] font-bold text-white">%100 Güvenli</h5>
                <p className="text-[10px] text-slate-400">Verileriniz sunucuya gitmez, cihazda işlenir.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <Sparkles className="w-4 h-4 text-teal-400 mb-1" />
                <h5 className="text-[11px] font-bold text-white">Sihirli Renk</h5>
                <p className="text-[10px] text-slate-400">Gölgeleri temizler, stüdyo çıktısı verir.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <Crown className="w-4 h-4 text-amber-400 mb-1" />
                <h5 className="text-[11px] font-bold text-white">Kupon Desteği</h5>
                <p className="text-[10px] text-slate-400">Tek kullanımlık kodlarla sınırsız Pro üyelik.</p>
              </div>
            </div>
          </div>
        ) : pages.length === 0 ? (
          /* Empty State: Prompt user to scan or upload */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-12 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/40 my-auto">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/10">
              <Camera className="w-10 h-10 text-emerald-400" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Belgenizi Taramaya Başlayın
            </h2>
            <p className="text-slate-400 max-w-md text-sm sm:text-base mb-8 leading-relaxed">
              Kameranızla çekin veya galeriden fotoğraf yükleyin. Otomatik köşe algılama,
              büyüteçli kıvrım düzeltme ve Sihirli Renk filtresiyle tertemiz PDF oluşturun.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-sm">
              <button
                onClick={() => setIsCameraOpen(true)}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base shadow-xl shadow-emerald-500/30 transition active:scale-95"
              >
                <Camera className="w-5 h-5" />
                <span>Kamera ile Tara</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-base border border-slate-700 transition active:scale-95"
              >
                <Upload className="w-5 h-5 text-slate-300" />
                <span>Fotoğraf Yükle</span>
              </button>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 w-full max-w-2xl text-left">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-2 text-emerald-400">
                  <Zap className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-white mb-1">Cihaz Üstü Hız</h4>
                <p className="text-xs text-slate-400">
                  Tüm işlemler doğrudan tarayıcınızda 0 ms gecikmeyle çalışır.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center mb-2 text-teal-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-white mb-1">%100 Gizlilik</h4>
                <p className="text-xs text-slate-400">
                  Belgeleriniz asla sunuculara yüklenmez, cihazınızda kalır.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center mb-2 text-sky-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-white mb-1">Sihirli Renk Filtresi</h4>
                <p className="text-xs text-slate-400">
                  Gölgeleri yok eder, kağıdı bembeyaz ve yazıları net yapar.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Document Inspector View */
          <div className="flex-1 flex flex-col lg:flex-row gap-6">
            {/* Main Page Preview Area */}
            <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              {/* Active Page Header Bar */}
              <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold text-xs">
                    Sayfa {selectedPageIndex + 1} / {pages.length}
                  </span>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">
                    {activePage?.filter.type}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Reorder Buttons */}
                  <button
                    onClick={() => handleMovePage(selectedPageIndex, 'left')}
                    disabled={selectedPageIndex === 0}
                    className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition disabled:opacity-30"
                    title="Önceki Sıraya Taşı (Sola)"
                  >
                    <ChevronLeft className="w-4 h-4 text-emerald-400" />
                  </button>

                  <button
                    onClick={() => handleMovePage(selectedPageIndex, 'right')}
                    disabled={selectedPageIndex === pages.length - 1}
                    className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition disabled:opacity-30"
                    title="Sonraki Sıraya Taşı (Sağa)"
                  >
                    <ChevronRight className="w-4 h-4 text-emerald-400" />
                  </button>

                  <div className="w-[1px] h-5 bg-slate-800 mx-1" />

                  <button
                    onClick={() => handleRotatePage(selectedPageIndex)}
                    className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
                    title="90° Döndür"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      if (activePage) {
                        setCropTarget({
                          pageIndex: selectedPageIndex,
                          imageDataUrl: activePage.originalImageDataUrl,
                          isNew: false,
                        });
                      }
                    }}
                    className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
                    title="Köşeleri Yeniden Kırp & Düzelt"
                  >
                    <Crop className="w-4 h-4 text-emerald-400" />
                  </button>

                  <button
                    onClick={() => {
                      if (activePage?.processedImageDataUrl) {
                        setFilterTarget({
                          pageIndex: selectedPageIndex,
                          warpedDataUrl: activePage.processedImageDataUrl,
                          isNew: false,
                        });
                      }
                    }}
                    className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
                    title="Filtre Değiştir (Sihirli Renk / Siyah Beyaz)"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </button>

                  <button
                    onClick={() => handleDeletePage(selectedPageIndex)}
                    className="p-2 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition"
                    title="Sayfayı Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Document Display Canvas/Image */}
              <div className="flex-1 flex items-center justify-center p-6 bg-slate-950/70 overflow-hidden relative min-h-[400px]">
                {activePage?.processedImageDataUrl ? (
                  <img
                    src={activePage.processedImageDataUrl}
                    alt={`Sayfa ${selectedPageIndex + 1}`}
                    className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-2xl border border-slate-800"
                  />
                ) : (
                  <div className="text-slate-500">Sayfa yükleniyor...</div>
                )}
              </div>

              {/* Navigation & Position controls */}
              <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <button
                  disabled={selectedPageIndex === 0}
                  onClick={() => setSelectedPageIndex((p) => Math.max(0, p - 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 transition font-medium text-slate-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Önceki Sayfa
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Sıralama:</span>
                  <button
                    onClick={() => handleMovePage(selectedPageIndex, 'left')}
                    disabled={selectedPageIndex === 0}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-25 text-xs text-slate-200 transition flex items-center gap-1"
                  >
                    <ArrowLeftRight className="w-3 h-3 text-emerald-400" />
                    Sola Taşı
                  </button>
                  <button
                    onClick={() => handleMovePage(selectedPageIndex, 'right')}
                    disabled={selectedPageIndex === pages.length - 1}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-25 text-xs text-slate-200 transition flex items-center gap-1"
                  >
                    Sağa Taşı
                    <ArrowLeftRight className="w-3 h-3 text-emerald-400" />
                  </button>
                </div>

                <button
                  disabled={selectedPageIndex === pages.length - 1}
                  onClick={() => setSelectedPageIndex((p) => Math.min(pages.length - 1, p + 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 transition font-medium text-slate-300"
                >
                  Sonraki Sayfa
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sidebar / Page Thumbnail Strip */}
            <div className="w-full lg:w-80 flex flex-col gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <GripVertical className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">Sayfaları Sırala</h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium bg-slate-800 px-2 py-0.5 rounded-full">
                    Sürükleyip Bırakın
                  </span>
                </div>

                {/* Thumbnails grid with Drag & Drop */}
                <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                  {pages.map((p, idx) => {
                    const isSelected = idx === selectedPageIndex;
                    const isDragging = idx === draggedIdx;
                    const isOver = idx === dragOverIdx;

                    return (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={() => handleDrop(idx)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedPageIndex(idx)}
                        className={`relative group rounded-xl overflow-hidden cursor-move border-2 transition-all aspect-[3/4] bg-slate-950 flex flex-col items-center justify-between p-1.5 ${
                          isSelected
                            ? 'border-emerald-500 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500/30'
                            : isOver
                            ? 'border-sky-400 scale-105 bg-sky-950/30'
                            : 'border-slate-800 hover:border-slate-700'
                        } ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'}`}
                      >
                        {/* Top Badge: Page number & Grip */}
                        <div className="w-full flex items-center justify-between z-10 pointer-events-none">
                          <span className="bg-black/75 backdrop-blur-sm text-[10px] font-bold text-white px-2 py-0.5 rounded-md">
                            #{idx + 1}
                          </span>
                          <span className="bg-black/75 backdrop-blur-sm p-1 rounded text-slate-300">
                            <GripVertical className="w-3 h-3" />
                          </span>
                        </div>

                        {/* Page thumbnail image */}
                        {p.processedImageDataUrl && (
                          <img
                            src={p.processedImageDataUrl}
                            alt={`Sayfa ${idx + 1}`}
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                          />
                        )}

                        {/* Reorder Buttons Overlay */}
                        <div className="w-full flex items-center justify-between z-10 opacity-90 group-hover:opacity-100 transition mt-auto">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMovePage(idx, 'left');
                            }}
                            className="p-1.5 rounded-lg bg-black/80 hover:bg-emerald-600 text-white disabled:opacity-20 transition shadow text-xs"
                            title="Önceki sıraya al"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={idx === pages.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMovePage(idx, 'right');
                            }}
                            className="p-1.5 rounded-lg bg-black/80 hover:bg-emerald-600 text-white disabled:opacity-20 transition shadow text-xs"
                            title="Sonraki sıraya al"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add New Single Page Button Card */}
                  <button
                    onClick={() => setIsCameraOpen(true)}
                    className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl aspect-[3/4] flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-emerald-400 transition bg-slate-900/40 hover:bg-slate-900"
                  >
                    <Plus className="w-6 h-6" />
                    <span className="text-xs font-medium">+ Sayfa Ekle</span>
                  </button>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col gap-2.5">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Hızlı İşlemler
                </h4>

                <button
                  onClick={() => setIsCameraOpen(true)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                >
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>Kameradan Yeni Sayfa Tara</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                >
                  <Upload className="w-4 h-4 text-sky-400" />
                  <span>Fotoğraf Yükle</span>
                </button>

                {/* Kupon & Pro Upgrade button */}
                <button
                  onClick={() => setIsUpgradeOpen(true)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition"
                >
                  <Tag className="w-4 h-4 text-amber-400" />
                  <span>Tek Kullanımlık Kupon Kullan</span>
                </button>

                {pages.length > 0 && (
                  <>
                    <button
                      onClick={handleExportPdf}
                      disabled={isExportingPdf}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition"
                    >
                      <FileDown className="w-4 h-4 text-emerald-400" />
                      <span>Tüm Belgeyi PDF Olarak İndir</span>
                    </button>

                    <button
                      onClick={() => setShowHomeConfirm(true)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-slate-700/60 hover:border-rose-900/40 text-xs font-medium transition mt-1"
                    >
                      <Home className="w-4 h-4 text-amber-400" />
                      <span>Ana Sayfaya Dön & Yeni Belge</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Hidden File Input for Single Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          handleFileSelect(file);
          e.target.value = '';
        }}
      />

      {/* Modals */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
        onSelectFromGallery={handleFileSelect}
      />

      {cropTarget && (
        <CropModal
          isOpen={Boolean(cropTarget)}
          imageDataUrl={cropTarget.imageDataUrl}
          onClose={() => setCropTarget(null)}
          onSave={handleCropComplete}
        />
      )}

      {filterTarget && (
        <FilterModal
          isOpen={Boolean(filterTarget)}
          warpedImageDataUrl={filterTarget.warpedDataUrl}
          onClose={() => setFilterTarget(null)}
          onSave={handleFilterComplete}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          notify(`Hoş geldiniz, ${user.name}! 7 günlük ücretsiz PRO denemeniz aktif edildi.`);
        }}
      />

      {/* Upgrade & Coupon Redemption Modal */}
      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        currentUser={currentUser}
        onUserUpdated={(updated) => {
          setCurrentUser(updated);
          notify('Tebrikler! PRO aboneliğiniz başarıyla yenilendi.');
        }}
        onOpenAuth={() => {
          setIsUpgradeOpen(false);
          setIsAuthOpen(true);
        }}
      />

      {/* Admin Panel (Accessible only when currentUser is Admin) */}
      {currentUser && (
        <AdminPanel
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default App;
