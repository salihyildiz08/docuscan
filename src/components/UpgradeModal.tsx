import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Check,
  Tag,
  ShieldCheck,
  ArrowRight,
  Clock,
  CreditCard,
  MessageCircle,
  ArrowLeft,
} from 'lucide-react';
import type { UserProfile, PricingPlan } from '../types/auth';
import { getSavedPlans, redeemCoupon, isUserProActive } from '../services/authService';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUserUpdated: (user: UserProfile) => void;
  onOpenAuth: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  onOpenAuth,
}) => {
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponMsg, setCouponMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [checkoutPlan, setCheckoutPlan] = useState<PricingPlan | null>(null);
  const [shopierNotice, setShopierNotice] = useState<boolean>(false);

  const plans: PricingPlan[] = getSavedPlans().filter((p) => p.isActive);
  const userStatus = isUserProActive(currentUser);

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (!couponCode.trim()) return;

    setIsSubmitting(true);
    setCouponMsg(null);

    setTimeout(() => {
      const result = redeemCoupon(couponCode, currentUser);
      setIsSubmitting(false);

      if (result.success && result.user) {
        setCouponMsg({ success: true, text: result.message });
        setCouponCode('');
        onUserUpdated(result.user);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setCouponMsg({ success: false, text: result.message });
      }
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </span>
              <h3 className="text-xl font-bold text-white">
                {checkoutPlan ? `${checkoutPlan.name} Sipariş & Ödeme` : 'PRO Pakete Yükseltin'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {checkoutPlan
                ? 'Ödeme yönteminizi seçerek üyeliğinizi hemen başlatın'
                : 'Sınırsız tarama, 3D kıvrım ütüleme (Dewarping) ve yüksek kaliteli A4 PDF çıktısı'}
            </p>
          </div>

          <button
            onClick={() => {
              setCheckoutPlan(null);
              onClose();
            }}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trial Status Notice */}
        {userStatus.reason === 'trial' && !checkoutPlan && (
          <div className="px-6 py-3 bg-emerald-950/40 border-b border-emerald-800/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-300 font-medium">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>
                İlk 1 haftalık ücretsiz deneme süreniz aktif! (Kalan: <strong>{userStatus.daysLeft} gün</strong>)
              </span>
            </div>
            <span className="text-[11px] text-emerald-400/80">Tüm PRO özellikler açık</span>
          </div>
        )}

        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
          {checkoutPlan ? (
            /* CHECKOUT / PAYMENT VIEW */
            <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full py-2">
              <button
                onClick={() => setCheckoutPlan(null)}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition w-fit py-1 px-2 rounded-lg hover:bg-slate-800"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>← Tüm Paketlere Geri Dön</span>
              </button>

              {/* Selected Plan Summary Card */}
              <div className="p-6 rounded-2xl bg-slate-950 border-2 border-emerald-500 shadow-xl shadow-emerald-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Seçilen Paket
                  </span>
                  <h4 className="text-xl font-extrabold text-white mt-1.5">{checkoutPlan.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {checkoutPlan.durationDays >= 90000 ? 'Ömür Boyu Sınırsız Erişim' : `${checkoutPlan.durationDays} Günlük Tam Pro Üyelik`}
                  </p>
                </div>
                <div className="text-right sm:text-right">
                  <span className="text-3xl font-extrabold text-white">
                    {checkoutPlan.currency}
                    {checkoutPlan.price}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">/ {checkoutPlan.periodLabel}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option 1: WhatsApp Instant Buy */}
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Merhaba, DocuScan üzerinden ${checkoutPlan.name} (${checkoutPlan.currency}${checkoutPlan.price}) satın almak ve tek kullanımlık lisans kuponumu almak istiyorum.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-5 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-600/40 flex flex-col justify-between gap-4 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-white group-hover:text-emerald-300 transition">
                        Havale / EFT / WhatsApp
                      </h5>
                      <p className="text-[11px] text-slate-400">IBAN veya Havale ile anında kupon teslimi</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <span>WhatsApp ile Satın Al</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </a>

                {/* Option 2: Credit Card Online Checkout */}
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-white">Kredi Kartı / Shopier</h5>
                      <p className="text-[11px] text-slate-400">256-bit SSL korumalı online ödeme</p>
                    </div>
                  </div>
                  {shopierNotice ? (
                    <div className="text-[11px] text-amber-300 bg-amber-950/50 p-2.5 rounded-xl border border-amber-800/40">
                      Shopier / PayTR mağaza linkinizi bağlayana kadar sol taraftaki WhatsApp butonundan veya tek kullanımlık kuponunuzla anında aktivasyon sağlayabilirsiniz.
                    </div>
                  ) : (
                    <button
                      onClick={() => setShopierNotice(true)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Kartla Öde (Shopier / PayTR)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Coupon Redemption Option */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-2 mt-2">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Kupon Kodunuzu Aldınız mı?
                </span>
                <p className="text-[11px] text-slate-400">
                  Satın aldığınız veya size verilen tek kullanımlık kupon kodunu aşağıdaki kutuya girip tek tıkla hesabınızı Pro yapabilirsiniz:
                </p>
                <form onSubmit={handleRedeem} className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="KUPON KODUNUZU GİRİN"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white uppercase focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Kontrol Ediliyor...' : 'Aktif Et'}
                  </button>
                </form>

                {couponMsg && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 mt-1 ${
                      couponMsg.success
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                        : 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                    }`}
                  >
                    {couponMsg.success ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
                    <span>{couponMsg.text}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* STANDARD PRICING & COUPON LIST VIEW */
            <>
              {/* 1. Single-Use Coupon Redemption Box */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-400" />
                    <span>Tek Kullanımlık Kupon Kodunuz mu Var?</span>
                  </h4>
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-semibold border border-amber-500/20">
                    Anında PRO Aktivasyonu
                  </span>
                </div>

                <form onSubmit={handleRedeem} className="flex flex-col sm:flex-row items-center gap-2.5 mt-1">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Örn: DOCU-HOSGELDIN"
                    className="w-full sm:flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-white uppercase placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{isSubmitting ? 'Kontrol Ediliyor...' : 'Kuponu Kullan'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {couponMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                      couponMsg.success
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                        : 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                    }`}
                  >
                    {couponMsg.success ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
                    <span>{couponMsg.text}</span>
                  </div>
                )}
              </div>

              {/* 2. Dynamic Pricing Plans */}
              <div>
                <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
                  Üyelik Paketleri
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((p) => {
                    return (
                      <div
                        key={p.id}
                        className={`rounded-2xl p-5 flex flex-col justify-between border-2 transition ${
                          p.popular
                            ? 'border-emerald-500 bg-slate-950 shadow-xl shadow-emerald-500/10'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          {p.popular && (
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold mb-3">
                              EN ÇOK TERCİH EDİLEN
                            </span>
                          )}

                          <h5 className="font-bold text-white text-base">{p.name}</h5>
                          <div className="mt-2 mb-4">
                            <span className="text-3xl font-extrabold text-white">
                              {p.currency}
                              {p.price}
                            </span>
                            <span className="text-xs text-slate-400 font-medium ml-1">/ {p.periodLabel}</span>
                          </div>

                          <ul className="flex flex-col gap-2.5 mb-6">
                            {(p.features || []).map((feat, i) => (
                              <li key={i} className="flex items-center gap-2 text-xs text-slate-300">
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button
                          onClick={() => {
                            if (!currentUser) {
                              onOpenAuth();
                            } else {
                              setCheckoutPlan(p);
                            }
                          }}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer ${
                            p.popular
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25'
                              : 'bg-slate-800 hover:bg-slate-700 text-white'
                          }`}
                        >
                          {currentUser ? 'Satın Al / Geç' : 'Giriş Yaparak Başla'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-2 mt-auto pt-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>256-Bit SSL ile %100 Güvenli Ödeme & Cihaz Üstü Gizlilik</span>
          </div>
        </div>
      </div>
    </div>
  );
};
