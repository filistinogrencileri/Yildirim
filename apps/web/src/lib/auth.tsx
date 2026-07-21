'use client';

// Client-side session: access token lives in memory only; the refresh token is
// an httpOnly cookie owned by the API. On load we try one silent refresh.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

let accessToken: string | null = null;

export interface SessionUser {
  id: string;
  email: string;
  fullNameAr: string;
  fullNameEn: string;
  phone: string;
  role: 'STUDENT' | 'SUPERVISOR' | 'ADMIN';
  emailVerified: boolean;
  locale: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
  }
}

async function rawFetch(path: string, init?: RequestInit): Promise<Response> {
  const isForm = init?.body instanceof FormData;
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
    credentials: 'include',
  });
}

async function tryRefresh(): Promise<boolean> {
  const res = await rawFetch('/auth/refresh', { method: 'POST' });
  if (!res.ok) return false;
  const data = (await res.json()) as { accessToken: string };
  accessToken = data.accessToken;
  return true;
}

/** Authenticated binary download: fetches a blob and triggers the save dialog. */
export async function downloadFile(path: string, filename: string): Promise<void> {
  let res = await rawFetch(path);
  if (res.status === 401 && (await tryRefresh())) {
    res = await rawFetch(path);
  }
  if (!res.ok) throw new ApiError(res.status, `HTTP_${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Fetch with bearer auth; retries once through a silent refresh on 401. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await rawFetch(path, init);
  if (res.status === 401 && (await tryRefresh())) {
    res = await rawFetch(path, init);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const code = Array.isArray(body?.message) ? body.message[0] : body?.message;
    throw new ApiError(res.status, code ?? `HTTP_${res.status}`);
  }
  return res.json() as Promise<T>;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  signIn: (result: { user: SessionUser; accessToken: string }) => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (await tryRefresh()) {
        const me = await api<SessionUser>('/auth/me').catch(() => null);
        if (!cancelled) setUser(me);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback((result: { user: SessionUser; accessToken: string }) => {
    accessToken = result.accessToken;
    setUser(result.user);
  }, []);

  const signOut = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    accessToken = null;
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await api<SessionUser>('/auth/me').catch(() => null);
    setUser(me);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut, refreshUser }),
    [user, loading, signIn, signOut, refreshUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Maps backend error codes to Arabic UI messages. */
export const AUTH_ERRORS: Record<string, string> = {
  EMAIL_TAKEN: 'هذا البريد الإلكتروني مسجّل مسبقًا.',
  INVALID_CREDENTIALS: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  ACCOUNT_SUSPENDED: 'تم إيقاف هذا الحساب. تواصل مع الدعم.',
  EMAIL_NOT_VERIFIED: 'يجب تأكيد بريدك الإلكتروني أولًا.',
  PASSWORD_CONFIRM_MISMATCH: 'كلمتا المرور غير متطابقتين.',
  INVALID_REFERRAL_SOURCE: 'خيار «كيف سمعت عنا» غير صالح.',
  CODE_EXPIRED: 'انتهت صلاحية الرمز. اطلب رمزًا جديدًا.',
  INVALID_CODE: 'الرمز غير صحيح.',
  TOO_MANY_ATTEMPTS: 'محاولات كثيرة خاطئة. اطلب رمزًا جديدًا.',
  INVALID_RESET_TOKEN: 'رابط الاستعادة غير صالح أو منتهي الصلاحية.',
  ALREADY_VERIFIED: 'بريدك الإلكتروني مؤكد بالفعل.',
};

export function authErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const mapped = AUTH_ERRORS[e.code];
    if (mapped) return mapped;
    if (e.status === 429) return 'محاولات كثيرة — انتظر دقيقة ثم أعد المحاولة.';
  }
  return 'حدث خطأ غير متوقع. أعد المحاولة.';
}
