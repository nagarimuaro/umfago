<script lang="ts">
	import { goto } from '$app/navigation';
	import { login, session } from '#lib/session.svelte';
	import { NAV_ITEMS, ROLE_LABELS, isAdminRole } from '#lib/permissions';
	import { toast } from '#lib/toast.svelte';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let errorMsg = $state('');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		errorMsg = '';
		loading = true;
		try {
			const user = await login(email.trim(), password);
			if (!isAdminRole(user.active_role)) {
				errorMsg = `Akun berhasil masuk, namun peran aktif (${user.active_role}) bukan peran back-office.`;
				return;
			}
			toast.success(
				`Selamat datang, ${user.name} (${ROLE_LABELS[user.active_role] ?? user.active_role})`
			);
			const firstAllowed =
				NAV_ITEMS.find((n) => session.hasAny(n.requiredAny))?.href ?? '/orders';
			goto(firstAllowed);
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Gagal masuk';
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
	<div
		class="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm"
	>
		<div class="flex items-center gap-3">
			<span
				class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white"
				>OJ</span
			>
			<div>
				<h1 class="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
					OpenJek Back-Office
				</h1>
				<p class="text-xs text-slate-500 dark:text-slate-400">
					Pusat Kendali Operasional & Administrasi
				</p>
			</div>
		</div>

		{#if errorMsg}
			<div
				class="mt-4 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300"
			>
				{errorMsg}
			</div>
		{/if}

		<form onsubmit={handleSubmit} class="mt-5 space-y-4">
			<div>
				<label
					for="email"
					class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
				>
					Email Staf / Admin
				</label>
				<input
					id="email"
					type="email"
					required
					autocomplete="username"
					bind:value={email}
					placeholder="admin@openjek.id"
					class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
				/>
			</div>

			<div>
				<label
					for="password"
					class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
				>
					Kata Sandi
				</label>
				<input
					id="password"
					type="password"
					required
					autocomplete="current-password"
					bind:value={password}
					placeholder="••••••••"
					class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
				/>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
			>
				{loading ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
			</button>
		</form>

		<div
			class="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4 text-[11px] text-slate-400 dark:text-slate-500"
		>
			Otorisasi dihitung dari peran aktif (RBAC). Menu dan tindakan menyesuaikan izin peran Anda
			secara otomatis.
		</div>
	</div>
</div>
