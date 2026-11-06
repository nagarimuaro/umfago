import { ENV } from '@/constants/env';

export const BACKEND_URL = ENV.API_URL;

export interface WalletBalanceResponse {
  balance: number;
  currency: string;
}

export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'PAYMENT'
  | 'REFUND'
  | 'EARNING'
  | 'FEE'
  | 'BONUS'
  | 'DISBURSED'
  | 'TRANSFER'
  | string;

export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | string;

export interface WalletTransactionItem {
  id: number;
  user_id: number;
  amount: number;
  balance_before?: number;
  balance_after?: number;
  type: TransactionType;
  status: TransactionStatus;
  order_id?: number | null;
  midtrans_order_id?: string | null;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  note: string;
  created_at: string;
}

export interface WalletHistoryResponse {
  transactions: WalletTransactionItem[];
  meta?: {
    page: number;
    per_page: number;
    total: number;
  };
}

export interface DepositResponse {
  message: string;
  new_balance?: number;
  midtrans_order_id?: string;
  snap_token?: string;
  redirect_url?: string;
  transaction?: WalletTransactionItem;
}

export interface WithdrawResponse {
  message: string;
  transaction?: WalletTransactionItem;
}

export interface TransferResponse {
  message: string;
  new_balance: number;
  recipient: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
  };
  transaction?: WalletTransactionItem;
}

export async function fetchWalletBalance(token: string): Promise<WalletBalanceResponse> {
  const res = await fetch(`${BACKEND_URL}/api/wallet`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal memuat saldo dompet');
  }
  return res.json();
}

export async function fetchWalletHistory(
  token: string,
  params?: { type?: string; status?: string; page?: number; per_page?: number }
): Promise<WalletHistoryResponse> {
  const q = new URLSearchParams();
  if (params?.type && params.type !== 'ALL') q.append('type', params.type);
  if (params?.status) q.append('status', params.status);
  if (params?.page) q.append('page', String(params.page));
  if (params?.per_page) q.append('per_page', String(params.per_page));

  const qs = q.toString() ? `?${q.toString()}` : '';
  const res = await fetch(`${BACKEND_URL}/api/wallet/history${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal memuat riwayat transaksi');
  }
  return res.json();
}

export async function requestDeposit(token: string, amount: number): Promise<DepositResponse> {
  const res = await fetch(`${BACKEND_URL}/api/wallet/deposit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ amount }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Gagal mengajukan top up saldo');
  }
  return data;
}

export async function requestWithdraw(
  token: string,
  payload: { amount: number; bank_name: string; account_number: string; account_name: string }
): Promise<WithdrawResponse> {
  const res = await fetch(`${BACKEND_URL}/api/wallet/withdraw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Gagal mengajukan penarikan');
  }
  return data;
}

export async function requestTransfer(
  token: string,
  payload: { recipient: string; amount: number; note?: string }
): Promise<TransferResponse> {
  const res = await fetch(`${BACKEND_URL}/api/wallet/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Gagal melakukan transfer saldo');
  }
  return data;
}

export interface PPOBPayPayload {
  service: string;
  customer_no: string;
  amount: number;
  product_name: string;
}

export interface PPOBPayResponse {
  message: string;
  new_balance: number;
  transaction: WalletTransactionItem;
}

export async function requestPayPPOB(
  token: string,
  payload: PPOBPayPayload
): Promise<PPOBPayResponse> {
  const res = await fetch(`${BACKEND_URL}/api/wallet/ppob`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Gagal memproses pembayaran PPOB');
  }
  return data;
}

export function formatTransactionDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

