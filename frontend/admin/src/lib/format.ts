const idrFmt = new Intl.NumberFormat('id-ID', {
	style: 'currency',
	currency: 'IDR',
	maximumFractionDigits: 0
});

const numFmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

export function formatIDR(n: number | null | undefined): string {
	if (n === null || n === undefined || Number.isNaN(n)) return 'Rp 0';
	return idrFmt.format(n);
}

export function formatNumber(n: number | null | undefined): string {
	if (n === null || n === undefined || Number.isNaN(n)) return '0';
	return numFmt.format(n);
}

export function formatDateTime(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime()) || d.getFullYear() <= 1) return '—';
	return d.toLocaleString('id-ID', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function formatDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime()) || d.getFullYear() <= 1) return '—';
	return d.toLocaleDateString('id-ID', {
		day: '2-digit',
		month: 'short',
		year: 'numeric'
	});
}

export function defaultDateRange(days = 30): { from: string; to: string } {
	const to = new Date();
	const from = new Date(to.getTime() - days * 86400_000);
	const fmt = (d: Date) => d.toISOString().slice(0, 10);
	return { from: fmt(from), to: fmt(to) };
}

// URL KYC berasal dari input driver (CLAUDE.md §16) — hanya http(s) atau path
// relatif /uploads yang boleh dirender, supaya `javascript:` dan sejenisnya tertolak.
export function safeUrl(raw: string | null | undefined): string | null {
	if (!raw) return null;
	try {
		const u = new URL(raw, window.location.origin);
		return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
	} catch {
		return null;
	}
}

export function toQuery(params: Record<string, string | number | boolean | undefined | null>): string {
	const sp = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) {
		if (v !== undefined && v !== null && v !== '') {
			sp.set(k, String(v));
		}
	}
	const s = sp.toString();
	return s ? `?${s}` : '';
}
