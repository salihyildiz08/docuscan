import React, { useState } from 'react';
import { X, Sparkles, Check, Gift } from 'lucide-react';
import type { UserProfile } from '../types/auth';
import { signInWithGoogle, signInWithApple, getCurrentUser } from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = provider === 'google' ? await signInWithGoogle() : await signInWithApple();
      if (res.error) {
        setErrorMsg(res.error);
        setIsLoading(false);
        return;
      }

      // Check current user
      const user = getCurrentUser();
      if (user) {
        onSuccess(user);
        onClose();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Giriş hatası';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center gap-5 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-xl shadow-emerald-500/20 text-white">
          <Sparkles className="w-8 h-8" />
        </div>

        {/* Title */}
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-1.5">
            DocuScan'e Hoş Geldiniz
          </h3>
          <p className="text-xs sm:text-sm text-slate-400">
            Google hesabınızla tek tıkla giriş yapın veya kayıt olun
          </p>
        </div>

        {/* 7-Day Free Trial Banner */}
        <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/30 text-left flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white mb-0.5">
              🎁 İlk 1 Hafta Tamamen Ücretsiz!
            </h4>
            <p className="text-[11px] text-emerald-300/90 leading-relaxed">
              Kayıt olan herkese 7 gün boyunca tüm PRO özellikler (kıvrım düzeltme, sınırsız tarama ve HD PDF) hediye edilir. Kredi kartı gerekmez.
            </p>
          </div>
        </div>

        {/* Login Buttons */}
        <div className="flex flex-col gap-3 w-full">
          {/* Google Login Button */}
          <button
            onClick={() => handleLogin('google')}
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-xl flex items-center justify-center gap-3 transition active:scale-95 disabled:opacity-50"
          >
            {/* Google G Logo */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.67-5.17 3.67-9.15z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.25v3.15C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.25C.45 8.22 0 10.06 0 12s.45 3.78 1.25 5.39l4.02-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.61l4.02 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
              />
            </svg>
            <span>{isLoading ? 'Giriş Yapılıyor...' : 'Google ile Devam Et'}</span>
          </button>

          {/* Apple Login Button (App Store Compliance) */}
          <button
            onClick={() => handleLogin('apple')}
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-2xl bg-black hover:bg-slate-950 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-3 transition active:scale-95 disabled:opacity-50 border border-slate-700"
          >
            {/* Apple Logo */}
            <svg className="w-5 h-5 fill-current" viewBox="0 0 170 170">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.5-7.7-11.44-13.98-5.38-8.48-9.74-18.06-13.08-28.74-3.34-10.68-5.01-20.9-5.01-30.65 0-14.15 3.56-25.99 10.68-35.52 7.12-9.53 16.14-14.38 27.06-14.55 5.01 0 10.63 1.28 16.86 3.84 6.23 2.56 10.16 3.84 11.79 3.84 1.41 0 5.44-1.33 12.09-3.99 6.65-2.66 12.35-3.83 17.1-3.51 12.19.64 22.14 4.89 29.85 12.74-10.68 6.42-15.91 15.34-15.69 26.77.22 8.92 3.65 16.36 10.3 22.32 6.65 5.96 14.54 9.53 23.68 10.72-2.39 7.4-5.34 14.76-8.84 22.08zm-33.15-115.38c0 6.64-2.4 12.92-7.21 17.84-4.81 4.92-10.67 7.76-17.58 7.76-.22-.87-.33-1.85-.33-2.94 0-6.64 2.51-12.87 7.53-17.69 5.02-4.82 10.9-7.53 17.26-7.85.22.98.33 1.94.33 2.88z" />
            </svg>
            <span>{isLoading ? 'Giriş Yapılıyor...' : 'Apple ile Devam Et'}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/40 w-full">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-emerald-400" /> %100 Güvenli
          </span>
          <span className="flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-emerald-400" /> Tek Tıkla Giriş
          </span>
          <span className="flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-emerald-400" /> 7 Gün Ücretsiz
          </span>
        </div>
      </div>
    </div>
  );
};
