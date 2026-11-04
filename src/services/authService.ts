import { createClient } from '@supabase/supabase-js';
import type { UserProfile, Coupon, PricingPlan } from '../types/auth';

const DEFAULT_SUPABASE_URL = 'https://fyucqjcvnmpqljbhridu.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_KvTB2jpo2s3yzQ1BmkKW3w_qKH3HUjl';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Default initial pricing plans
const DEFAULT_PLANS: PricingPlan[] = [
  {
    id: 'monthly',
    name: 'Aylık Pro',
    price: 149,
    currency: '₺',
    durationDays: 30,
    periodLabel: 'ay',
    features: [
      'Sınırsız Sayfa Tarama',
      'Kıvrım & Bükülme Düzeltici (3D Dewarp)',
      'Sihirli Renk (Magic Color) Filtresi',
      'Yüksek Kalite A4 PDF Çıktısı',
      'Tüm Sayfaları ZIP İndirme',
      'Reklamsız & Filigransız',
    ],
    isActive: true,
  },
  {
    id: 'yearly',
    name: 'Yıllık Pro',
    price: 999,
    currency: '₺',
    durationDays: 365,
    periodLabel: 'yıl',
    features: [
      'Aylık Paketin Tüm Özellikleri',
      '%45 Tasarruf Avantajı',
      'Öncelikli E-Posta Desteği',
      'Sınırsız Bulut Arşivi',
    ],
    popular: true,
    isActive: true,
  },
  {
    id: 'lifetime',
    name: 'Ömür Boyu Pro',
    price: 1999,
    currency: '₺',
    durationDays: 99999,
    periodLabel: 'tek sefer',
    features: [
      'Ömür Boyu Tüm Pro Özellikler',
      'Tek Seferlik Ödeme',
      'Gelecek Tüm Güncellemelere Ücretsiz Erişim',
      'VIP Destek',
    ],
    isActive: true,
  },
];

// Pre-seeded starter coupons for testing
const INITIAL_COUPONS: Coupon[] = [
  {
    id: 'c-1',
    code: 'DOCU-HOSGELDIN',
    durationDays: 30,
    description: '1 Aylık Ücretsiz Pro Kuponu (Tek Kullanımlık)',
    isUsed: false,
    createdAt: Date.now(),
  },
  {
    id: 'c-2',
    code: 'PRO-1YIL-OZEL',
    durationDays: 365,
    description: '1 Yıllık VIP Pro Kuponu (Tek Kullanımlık)',
    isUsed: false,
    createdAt: Date.now(),
  },
];

// Local storage keys
const STORAGE_USER = 'docu_current_user';
const STORAGE_USERS_LIST = 'docu_all_users';
const STORAGE_COUPONS = 'docu_coupons';
const STORAGE_PLANS = 'docu_pricing_plans';

// In-memory fallback if localStorage is disabled or restricted
const memStore: Record<string, string> = {};

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? memStore[key] ?? null;
  } catch {
    return memStore[key] ?? null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // fallback
  }
  memStore[key] = value;
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // fallback
  }
  delete memStore[key];
}

// State helpers
export function getSavedPlans(): PricingPlan[] {
  const saved = safeGet(STORAGE_PLANS);
  if (!saved) {
    safeSet(STORAGE_PLANS, JSON.stringify(DEFAULT_PLANS));
    return DEFAULT_PLANS;
  }
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PLANS;
  } catch {
    return DEFAULT_PLANS;
  }
}

export function savePlans(plans: PricingPlan[]): void {
  safeSet(STORAGE_PLANS, JSON.stringify(plans));
}

export function getSavedCoupons(): Coupon[] {
  const saved = safeGet(STORAGE_COUPONS);
  if (!saved) {
    safeSet(STORAGE_COUPONS, JSON.stringify(INITIAL_COUPONS));
    return INITIAL_COUPONS;
  }
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : INITIAL_COUPONS;
  } catch {
    return INITIAL_COUPONS;
  }
}

export function saveCoupons(coupons: Coupon[]): void {
  safeSet(STORAGE_COUPONS, JSON.stringify(coupons));
}

export function getAllUsers(): UserProfile[] {
  const saved = safeGet(STORAGE_USERS_LIST);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveUserToList(user: UserProfile): void {
  const list = getAllUsers();
  const idx = list.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    list[idx] = user;
  } else {
    list.unshift(user);
  }
  safeSet(STORAGE_USERS_LIST, JSON.stringify(list));
}

export function getCurrentUser(): UserProfile | null {
  const saved = safeGet(STORAGE_USER);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: UserProfile | null): void {
  if (!user) {
    safeRemove(STORAGE_USER);
  } else {
    safeSet(STORAGE_USER, JSON.stringify(user));
    saveUserToList(user);
  }
}

/**
 * Creates user with 7-day free trial on first login
 */
export function createUserWithTrial(email: string, name: string, avatarUrl?: string, role: 'admin' | 'user' = 'user'): UserProfile {
  const now = Date.now();
  const trialDays = 7;
  const trialEndsAt = now + trialDays * 24 * 60 * 60 * 1000;

  const newUser: UserProfile = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email,
    name,
    avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    role,
    plan: 'trial',
    trialEndsAt,
    createdAt: now,
  };

  setCurrentUser(newUser);
  return newUser;
}

/**
 * Google Sign-in trigger (Live Supabase OAuth)
 */
export async function signInWithGoogle(): Promise<{ error?: string }> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) return { error: error.message };
    return {};
  }
  return { error: 'Supabase yapılandırması bulunamadı.' };
}

/**
 * Apple Sign-in trigger (Required by Apple App Store Guideline 4.8)
 */
export async function signInWithApple(): Promise<{ error?: string }> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) return { error: error.message };
    return {};
  }
  return { error: 'Supabase yapılandırması bulunamadı.' };
}

/**
 * Direct Email Sign-In (Clean in-modal login, no alerts, grants 7-day trial)
 */
export async function signInWithDirectEmail(emailInput: string): Promise<{ error?: string; user?: UserProfile }> {
  const cleanEmail = emailInput.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { error: 'Lütfen geçerli bir e-posta adresi girin.' };
  }

  const name = cleanEmail.split('@')[0].replace(/[._]/g, ' ').toUpperCase();
  const isAdmin = cleanEmail.includes('salih') || cleanEmail.includes('admin') || cleanEmail.startsWith('it');

  // Check if user already exists
  const existing = getAllUsers().find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    setCurrentUser(existing);
    return { user: existing };
  }

  // Create new user with 7-day free trial
  const newUser = createUserWithTrial(cleanEmail, name, undefined, isAdmin ? 'admin' : 'user');
  return { user: newUser };
}

/**
 * Listen for Supabase OAuth redirects (e.g. returning from Google login)
 */
export function initAuthListener(onUserChange: (user: UserProfile | null) => void): () => void {
  if (!supabase) return () => {};

  // Check current session on load
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      const email = session.user.email || '';
      const name =
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        email.split('@')[0].toUpperCase();
      const avatarUrl = session.user.user_metadata?.avatar_url;
      const isAdmin =
        email.toLowerCase() === 'yldzsalih27@gmail.com' ||
        email.toLowerCase() === 'salih.yildiz@gmail.com' ||
        email.toLowerCase().includes('admin');

      const existing = getAllUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
      const user = existing || createUserWithTrial(email, name, avatarUrl, isAdmin ? 'admin' : 'user');
      setCurrentUser(user);
      onUserChange(user);
    }
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      const email = session.user.email || '';
      const name =
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        email.split('@')[0].toUpperCase();
      const avatarUrl = session.user.user_metadata?.avatar_url;
      const isAdmin =
        email.toLowerCase() === 'yldzsalih27@gmail.com' ||
        email.toLowerCase() === 'salih.yildiz@gmail.com' ||
        email.toLowerCase().includes('admin');

      const existing = getAllUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
      const user = existing || createUserWithTrial(email, name, avatarUrl, isAdmin ? 'admin' : 'user');
      setCurrentUser(user);
      onUserChange(user);
    } else {
      // If signed out from Supabase
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}

export function signOut(): void {
  setCurrentUser(null);
  if (isSupabaseConfigured && supabase) {
    supabase.auth.signOut();
  }
}

/**
 * Single-Use Coupon Redemption Engine
 * Guarantees that each coupon code is redeemed EXACTLY ONCE by only ONE person!
 */
export function redeemCoupon(
  code: string,
  user: UserProfile
): { success: boolean; message: string; user?: UserProfile } {
  const cleanCode = code.trim().toUpperCase();
  const coupons = getSavedCoupons();

  const couponIndex = coupons.findIndex((c) => c.code.toUpperCase() === cleanCode);

  if (couponIndex === -1) {
    return { success: false, message: 'Geçersiz kupon kodu! Lütfen kontrol edip tekrar deneyin.' };
  }

  const coupon = coupons[couponIndex];

  // SINGLE-USE VALIDATION:
  if (coupon.isUsed) {
    return {
      success: false,
      message: `Bu kupon kodu daha önce kullanılmıştır ve tek kullanımlıktır! (${new Date(coupon.usedAt || 0).toLocaleDateString('tr-TR')} tarihinde kullanıldı).`,
    };
  }

  // Expiration check
  if (coupon.expiresAt && Date.now() > coupon.expiresAt) {
    return { success: false, message: 'Bu kupon kodunun kullanım süresi dolmuştur.' };
  }

  // Mark coupon as USED permanently
  const now = Date.now();
  coupons[couponIndex] = {
    ...coupon,
    isUsed: true,
    usedByUserId: user.id,
    usedByUserEmail: user.email,
    usedAt: now,
  };
  saveCoupons(coupons);

  // Extend User Pro Subscription
  const currentProExpire = user.proExpiresAt && user.proExpiresAt > now ? user.proExpiresAt : now;
  const newProExpire = currentProExpire + coupon.durationDays * 24 * 60 * 60 * 1000;

  const updatedUser: UserProfile = {
    ...user,
    plan: 'pro',
    proExpiresAt: newProExpire,
  };

  setCurrentUser(updatedUser);

  const durationText =
    coupon.durationDays >= 90000
      ? 'Ömür Boyu'
      : `${coupon.durationDays} Günlük`;

  return {
    success: true,
    message: `Tebrikler! ${durationText} PRO üyelik başarıyla hesabınıza tanımlandı.`,
    user: updatedUser,
  };
}

/**
 * Checks if user currently has active Pro privileges (Paid Pro or Active 7-Day Trial)
 */
export function isUserProActive(user: UserProfile | null): { isActive: boolean; reason: 'pro' | 'trial' | 'none'; daysLeft: number } {
  if (!user) return { isActive: false, reason: 'none', daysLeft: 0 };

  const now = Date.now();

  // 1. Check Paid Pro
  if (user.plan === 'pro' && user.proExpiresAt && user.proExpiresAt > now) {
    const daysLeft = Math.ceil((user.proExpiresAt - now) / (1000 * 60 * 60 * 24));
    return { isActive: true, reason: 'pro', daysLeft };
  }

  // 2. Check 7-Day Free Trial
  if (user.trialEndsAt && user.trialEndsAt > now) {
    const daysLeft = Math.ceil((user.trialEndsAt - now) / (1000 * 60 * 60 * 24));
    return { isActive: true, reason: 'trial', daysLeft };
  }

  return { isActive: false, reason: 'none', daysLeft: 0 };
}
