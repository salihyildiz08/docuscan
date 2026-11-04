import React, { useState } from 'react';
import {
  X,
  Tag,
  DollarSign,
  Users,
  Copy,
  Check,
  Plus,
  Trash2,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import type { Coupon, PricingPlan, UserProfile } from '../types/auth';
import {
  getSavedCoupons,
  saveCoupons,
  getSavedPlans,
  savePlans,
  getAllUsers,
  saveUserToList,
} from '../services/authService';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'coupons' | 'pricing' | 'users'>('coupons');
  const [coupons, setCoupons] = useState<Coupon[]>(() => getSavedCoupons());
  const [plans, setPlans] = useState<PricingPlan[]>(() => getSavedPlans());
  const [users, setUsers] = useState<UserProfile[]>(() => getAllUsers());

  // New Coupon Form State
  const [newCode, setNewCode] = useState<string>('');
  const [newDuration, setNewDuration] = useState<number>(30);
  const [newDesc, setNewDesc] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'DOCU-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += '-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewCode(code);
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const codeToUse = (newCode.trim() || `DOCU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`).toUpperCase();

    if (coupons.some((c) => c.code === codeToUse)) {
      alert('Bu kupon kodu zaten mevcut!');
      return;
    }

    const createdCoupon: Coupon = {
      id: `cpn_${Date.now()}`,
      code: codeToUse,
      durationDays: newDuration,
      description: newDesc.trim() || 'Özel Tek Kullanımlık Kupon',
      isUsed: false,
      createdAt: Date.now(),
    };

    const updated = [createdCoupon, ...coupons];
    setCoupons(updated);
    saveCoupons(updated);

    setNewCode('');
    setNewDesc('');
    notify(`Kupon başarıyla oluşturuldu: ${codeToUse}`);
  };

  const handleDeleteCoupon = (id: string) => {
    const updated = coupons.filter((c) => c.id !== id);
    setCoupons(updated);
    saveCoupons(updated);
    notify('Kupon silindi.');
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Pricing Plan Updates
  const handlePriceChange = (planId: string, newPrice: number) => {
    const updated = plans.map((p) => (p.id === planId ? { ...p, price: newPrice } : p));
    setPlans(updated);
    savePlans(updated);
    notify('Fiyat başarıyla güncellendi.');
  };

  // User Pro Grant / Revoke
  const handleToggleUserPro = (userId: string) => {
    const updated = users.map((u) => {
      if (u.id === userId) {
        const isPro = u.plan === 'pro';
        const updatedUser: UserProfile = {
          ...u,
          plan: isPro ? 'free' : 'pro',
          proExpiresAt: isPro ? undefined : Date.now() + 365 * 24 * 60 * 60 * 1000,
        };
        saveUserToList(updatedUser);
        return updatedUser;
      }
      return u;
    });
    setUsers(updated);
    notify('Kullanıcı aboneliği güncellendi.');
  };

  if (!isOpen) return null;

  // Stats
  const totalUsers = users.length;
  const activeTrials = users.filter((u) => u.trialEndsAt && u.trialEndsAt > Date.now()).length;
  const activePro = users.filter((u) => u.plan === 'pro' && (u.proExpiresAt || 0) > Date.now()).length;
  const totalCoupons = coupons.length;
  const usedCoupons = coupons.filter((c) => c.isUsed).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Toast Notification */}
        {notification && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-xl flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4" />
            <span>{notification}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Yönetim Paneli (Admin Dashboard)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                  ADMİN
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Giriş Yapan: <span className="text-slate-300 font-medium">{currentUser.email}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/60 border-b border-slate-800">
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Toplam Kayıtlı</span>
            <div className="text-xl font-bold text-white mt-0.5">{totalUsers} Kullanıcı</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
            <span className="text-[11px] text-emerald-400 font-medium">7 Günlük Denemede</span>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">{activeTrials} Kişi</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
            <span className="text-[11px] text-sky-400 font-medium">Aktif PRO Üye</span>
            <div className="text-xl font-bold text-sky-400 mt-0.5">{activePro} Kişi</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
            <span className="text-[11px] text-amber-400 font-medium">Tek Kullanımlık Kupon</span>
            <div className="text-xl font-bold text-amber-400 mt-0.5">
              {usedCoupons} / {totalCoupons} Kullanıldı
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-800 bg-slate-900/60">
          <button
            onClick={() => setActiveTab('coupons')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeTab === 'coupons'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Tek Kullanımlık Kuponlar</span>
          </button>

          <button
            onClick={() => setActiveTab('pricing')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeTab === 'pricing'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Fiyatlandırma & Paketler</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeTab === 'users'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Kullanıcılar & Denemeler</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-5 overflow-y-auto">
          {activeTab === 'coupons' && (
            <div className="flex flex-col gap-6">
              {/* Create Coupon Card */}
              <form
                onSubmit={handleCreateCoupon}
                className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-amber-400" />
                    Yeni Tek Kullanımlık Kupon Kodu Oluştur
                  </h4>
                  <span className="text-[11px] text-amber-400/90 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                    Sadece 1 Kişi Kullanabilir
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Kupon Kodu
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                        placeholder="Örn: PRO-VIP-2026"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white uppercase focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={generateRandomCode}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                        title="Rastgele Kod Üret"
                      >
                        <RefreshCw className="w-4 h-4 text-amber-400" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Geçerlilik Süresi
                    </label>
                    <select
                      value={newDuration}
                      onChange={(e) => setNewDuration(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value={30}>1 Ay (30 Gün)</option>
                      <option value={90}>3 Ay (90 Gün)</option>
                      <option value={180}>6 Ay (180 Gün)</option>
                      <option value={365}>1 Yıl (365 Gün)</option>
                      <option value={99999}>Ömür Boyu (Sınırsız)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Kupon Açıklaması / Kime Verilecek?
                    </label>
                    <input
                      type="text"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Örn: Satış yapılan müşteri Ahmet Bey"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="self-end px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 transition active:scale-95 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Kuponu Sisteme Kaydet</span>
                </button>
              </form>

              {/* Coupons Table */}
              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/50">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                      <th className="p-3.5 font-semibold">Kupon Kodu</th>
                      <th className="p-3.5 font-semibold">Süre</th>
                      <th className="p-3.5 font-semibold">Açıklama</th>
                      <th className="p-3.5 font-semibold">Durum</th>
                      <th className="p-3.5 font-semibold text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {coupons.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-900/40 transition">
                        <td className="p-3.5 font-mono font-bold text-amber-400">{c.code}</td>
                        <td className="p-3.5 text-slate-300 font-medium">
                          {c.durationDays >= 90000 ? 'Ömür Boyu' : `${c.durationDays} Gün`}
                        </td>
                        <td className="p-3.5 text-slate-400 max-w-xs truncate">{c.description}</td>
                        <td className="p-3.5">
                          {c.isUsed ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20 w-fit">
                                KULLANILDI
                              </span>
                              <span className="text-[10px] text-slate-400 mt-1">
                                {c.usedByUserEmail} ({new Date(c.usedAt || 0).toLocaleDateString('tr-TR')})
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                              KULLANILABİLİR (Boşta)
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleCopyCode(c.code)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              title="Kodu Kopyala"
                            >
                              {copiedCode === c.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(c.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition"
                              title="Kuponu Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="flex flex-col gap-6">
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs text-slate-300 flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white mb-0.5">Dinamik Fiyatlandırma Yönetimi</h4>
                  <p className="text-slate-400">
                    Burada belirlediğiniz fiyatlar kullanıcıların satın alma ekranında anında canlı olarak güncellenir.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {plans.map((p) => (
                  <div
                    key={p.id}
                    className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-white text-base">{p.name}</h4>
                        {p.popular && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                            En Çok Satan
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mb-4">{(p.features?.length || 0)} özellik dahil</p>

                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        Paket Fiyatı ({p.currency})
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-400">{p.currency}</span>
                        <input
                          type="number"
                          value={p.price}
                          onChange={(e) => handlePriceChange(p.id, Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-base font-bold text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-3">
                      Dönem: <span className="text-slate-200 font-semibold">{p.periodLabel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Kullanıcılar & Abonelik Durumları</h4>
                  <p className="text-xs text-slate-400">
                    Yeni kayıt olan herkes otomatik 7 gün ücretsiz deneme hakkına sahiptir.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/50">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                      <th className="p-3.5 font-semibold">Kullanıcı</th>
                      <th className="p-3.5 font-semibold">Rol</th>
                      <th className="p-3.5 font-semibold">7 Günlük Deneme</th>
                      <th className="p-3.5 font-semibold">Pro Bitiş</th>
                      <th className="p-3.5 font-semibold text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {users.map((u) => {
                      const isTrialActive = u.trialEndsAt && u.trialEndsAt > Date.now();
                      const trialDaysLeft = isTrialActive
                        ? Math.ceil((u.trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24))
                        : 0;

                      return (
                        <tr key={u.id} className="hover:bg-slate-900/40 transition">
                          <td className="p-3.5">
                            <div className="font-semibold text-white">{u.name}</div>
                            <div className="text-[11px] text-slate-400">{u.email}</div>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                u.role === 'admin'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3.5">
                            {isTrialActive ? (
                              <span className="text-emerald-400 font-medium">
                                Aktif ({trialDaysLeft} gün kaldı)
                              </span>
                            ) : (
                              <span className="text-slate-500">Süresi Doldu</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            {u.proExpiresAt && u.proExpiresAt > Date.now() ? (
                              <span className="text-sky-400 font-semibold">
                                {new Date(u.proExpiresAt).toLocaleDateString('tr-TR')}
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => handleToggleUserPro(u.id)}
                              className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition ${
                                u.plan === 'pro'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
                              }`}
                            >
                              {u.plan === 'pro' ? 'Pro İptal Et' : 'Pro Tanımla (1 Yıl)'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
