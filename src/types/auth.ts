export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: 'admin' | 'user';
  plan: 'free' | 'trial' | 'pro';
  trialEndsAt: number; // Timestamp 7 days from registration
  proExpiresAt?: number; // Timestamp when Pro subscription ends
  createdAt: number;
}

export interface Coupon {
  id: string;
  code: string;
  durationDays: number; // 30, 90, 365, 99999 (lifetime)
  description: string;
  isUsed: boolean;
  usedByUserId?: string;
  usedByUserEmail?: string;
  usedAt?: number;
  createdAt: number;
  expiresAt?: number;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  durationDays: number;
  periodLabel: string; // 'ay', 'yıl', 'tek sefer'
  features: string[];
  popular?: boolean;
  isActive: boolean;
}
