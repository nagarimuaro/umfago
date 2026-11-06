import { isAdminRole, resolvePermissions } from '#lib/permissions';
import type { CurrentUser, LoginResponse, PermissionCode, RoleCode } from '#lib/types';
import { toQuery } from '#lib/format';

const REFRESH_STORAGE_KEY = 'openjek_admin_refresh_token';
const THEME_STORAGE_KEY = 'openjek_admin_theme';

export class ApiError extends Error {
	status: number;
	payload: Record<string, unknown>;

	constructor(status: number, message: string, payload: Record<string, unknown> = {}) {
		super(message);
		this.status = status;
		this.payload = payload;
	}
}

class SessionState {
	accessToken = $state<string | null>(null);
	user = $state<CurrentUser | null>(null);
	ready = $state(false);
	dark = $state(false);

	permissions = $derived<Set<PermissionCode>>(
		resolvePermissions(this.user?.active_role, this.user?.permissions)
	);

	isAdmin = $derived<boolean>(isAdminRole(this.user?.active_role));

	has(perm: PermissionCode): boolean {
		return this.permissions.has(perm);
	}

	hasAny(perms: PermissionCode[]): boolean {
		return perms.some((p) => this.permissions.has(p));
	}

	initTheme() {
		if (typeof window === 'undefined') return;
		const saved = localStorage.getItem(THEME_STORAGE_KEY);
		this.dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
		document.documentElement.classList.toggle('dark', this.dark);
	}

	toggleTheme() {
		this.dark = !this.dark;
		if (typeof window !== 'undefined') {
			localStorage.setItem(THEME_STORAGE_KEY, this.dark ? 'dark' : 'light');
			document.documentElement.classList.toggle('dark', this.dark);
		}
	}
}

export const session = new SessionState();

// Kunci single-flight untuk rotasi refresh token (CLAUDE.md §10.4):
// permintaan paralel yang kena 401 wajib menunggu satu proses refresh yang sama,
// sebab pemakaian ulang token lama dianggap kebocoran dan mencabut semua sesi.
let refreshInFlight: Promise<boolean> | null = null;

function getStoredRefresh(): string | null {
	if (typeof window === 'undefined') return null;
	return sessionStorage.getItem(REFRESH_STORAGE_KEY);
}

function setStoredRefresh(token: string | null) {
	if (typeof window === 'undefined') return;
	if (token) {
		sessionStorage.setItem(REFRESH_STORAGE_KEY, token);
	} else {
		sessionStorage.removeItem(REFRESH_STORAGE_KEY);
	}
}

const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '';

async function refreshSession(): Promise<boolean> {
	if (refreshInFlight) return refreshInFlight;

	const rt = getStoredRefresh();
	if (!rt) return false;

	refreshInFlight = (async () => {
		try {
			const res = await fetch(`${apiBase}/api/refresh`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refresh_token: rt })
			});
			if (!res.ok) {
				clearAuth();
				return false;
			}
			const data = (await res.json()) as {
				access_token: string;
				refresh_token: string;
			};
			session.accessToken = data.access_token;
			setStoredRefresh(data.refresh_token);
			return true;
		} catch {
			clearAuth();
			return false;
		} finally {
			refreshInFlight = null;
		}
	})();

	return refreshInFlight;
}

export function clearAuth() {
	session.accessToken = null;
	session.user = null;
	setStoredRefresh(null);
}

export async function apiFetch<T = unknown>(
	path: string,
	init: RequestInit & { json?: unknown; skipAuth?: boolean } = {}
): Promise<T> {
	const url = path.startsWith('http://') || path.startsWith('https://') ? path : `${apiBase}${path}`;

	const doRequest = async (): Promise<Response> => {
		const headers = new Headers(init.headers);
		if (init.json !== undefined) {
			headers.set('Content-Type', 'application/json');
		}
		if (!init.skipAuth && session.accessToken) {
			headers.set('Authorization', `Bearer ${session.accessToken}`);
		}
		return fetch(url, {
			...init,
			headers,
			body: init.json !== undefined ? JSON.stringify(init.json) : init.body
		});
	};

	let res = await doRequest();

	if (res.status === 401 && !init.skipAuth && path !== '/api/login' && path !== '/api/refresh') {
		const ok = await refreshSession();
		if (ok) {
			res = await doRequest();
		}
	}

	const text = await res.text();
	let payload: Record<string, unknown> = {};
	if (text) {
		try {
			payload = JSON.parse(text) as Record<string, unknown>;
		} catch {
			payload = { error: text };
		}
	}

	if (!res.ok) {
		const msg =
			(typeof payload.message === 'string' && payload.message) ||
			(typeof payload.error === 'string' && payload.error) ||
			`HTTP ${res.status}`;
		throw new ApiError(res.status, msg, payload);
	}

	return payload as T;
}

export async function bootstrapSession(): Promise<void> {
	session.initTheme();
	try {
		if (!session.accessToken && getStoredRefresh()) {
			const refreshed = await refreshSession();
			if (refreshed) {
				session.user = await apiFetch<CurrentUser>('/api/user');
			}
		}
	} catch {
		clearAuth();
	} finally {
		session.ready = true;
	}
}

export async function login(email: string, password: string): Promise<CurrentUser> {
	const data = await apiFetch<LoginResponse>('/api/login', {
		method: 'POST',
		json: { email, password },
		skipAuth: true
	});
	session.accessToken = data.access_token;
	setStoredRefresh(data.refresh_token);

	const me = await apiFetch<CurrentUser>('/api/user');
	// Bila akun punya role admin tapi sedang aktif di mode penumpang/driver,
	// otomatis pindah ke role admin pertamanya agar bisa masuk dashboard.
	if (!isAdminRole(me.active_role)) {
		const adminRole = me.available_roles.find((r) => isAdminRole(r.code));
		if (adminRole) {
			return switchActiveRole(adminRole.code);
		}
	}
	session.user = me;
	return me;
}

export async function switchActiveRole(role: RoleCode): Promise<CurrentUser> {
	const switched = await apiFetch<{
		access_token: string;
		active_role: RoleCode;
	}>('/api/users/active-role', {
		method: 'PUT',
		json: { role }
	});
	session.accessToken = switched.access_token;
	const me = await apiFetch<CurrentUser>('/api/user');
	session.user = me;
	return me;
}

export async function logout(): Promise<void> {
	const rt = getStoredRefresh();
	try {
		if (session.accessToken) {
			await apiFetch('/api/logout', {
				method: 'POST',
				json: { refresh_token: rt || '' }
			});
		}
	} catch {
		// abaikan kegagalan jaringan saat keluar
	} finally {
		clearAuth();
	}
}

export { toQuery };
