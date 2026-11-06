<script lang="ts">
	import { apiFetch, session, toQuery } from '#lib/session.svelte';
	import { formatDate, formatIDR } from '#lib/format';
	import { ALL_ROLE_CODES, ROLE_LABELS, isAdminRole } from '#lib/permissions';
	import { toast } from '#lib/toast.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import type { PageMeta, RoleCode, UserEntity } from '#lib/types';

	let users = $state<UserEntity[]>([]);
	let meta = $state<PageMeta>({ page: 1, per_page: 20, total: 0 });
	let loading = $state(false);
	let busy = $state(false);

	let roleFilter = $state('');
	let activeFilter = $state('');
	let searchQ = $state('');

	let detail = $state<UserEntity | null>(null);
	let roleToAssign = $state<RoleCode | ''>('');

	let canManage = $derived(session.has('users.manage'));

	async function loadUsers(page = 1) {
		loading = true;
		try {
			const res = await apiFetch<{ users: UserEntity[]; meta: PageMeta }>(
				`/api/admin/users${toQuery({ page, per_page: meta.per_page, role: roleFilter, is_active: activeFilter, q: searchQ.trim() })}`
			);
			users = res.users ?? [];
			meta = res.meta;
		} catch (err) {
			toast.error(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (session.ready && session.has('users.view')) loadUsers(1);
	});

	async function openDetail(id: number) {
		try {
			const res = await apiFetch<{ user: UserEntity }>(`/api/admin/users/${id}`);
			detail = res.user;
			roleToAssign = '';
		} catch (err) {
			toast.error(err);
		}
	}

	async function toggleActive(u: UserEntity) {
		const next = !u.is_active;
		const msg = next
			? `Aktifkan kembali akun ${u.name}?`
			: `Nonaktifkan akun ${u.name}? Seluruh sesi login-nya ikut dicabut.`;
		if (!confirm(msg)) return;
		busy = true;
		try {
			await apiFetch(`/api/admin/users/${u.ID}/active`, {
				method: 'PUT',
				json: { is_active: next }
			});
			toast.success(next ? 'Akun diaktifkan.' : 'Akun dinonaktifkan & sesi dicabut.');
			await loadUsers(meta.page);
			if (detail?.ID === u.ID) await openDetail(u.ID);
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}

	async function assignRole(e: SubmitEvent) {
		e.preventDefault();
		if (!detail || !roleToAssign) return;
		if (isAdminRole(roleToAssign) && !confirm(`Berikan peran back-office ${ROLE_LABELS[roleToAssign]} ke ${detail.name}?`))
			return;
		busy = true;
		try {
			const res = await apiFetch<{ user: UserEntity }>(`/api/admin/users/${detail.ID}/roles`, {
				method: 'POST',
				json: { role: roleToAssign }
			});
			detail = res.user;
			roleToAssign = '';
			toast.success('Peran ditambahkan.');
			await loadUsers(meta.page);
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}

	async function revokeRole(code: RoleCode) {
		if (!detail) return;
		if (!confirm(`Cabut peran ${ROLE_LABELS[code] ?? code} dari ${detail.name}?`)) return;
		busy = true;
		try {
			const res = await apiFetch<{ user: UserEntity }>(
				`/api/admin/users/${detail.ID}/roles/${encodeURIComponent(code)}`,
				{ method: 'DELETE' }
			);
			detail = res.user;
			toast.success('Peran dicabut.');
			await loadUsers(meta.page);
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}

	let assignableRoles = $derived(
		ALL_ROLE_CODES.filter((c) => !(detail?.roles ?? []).some((r) => r.code === c))
	);
</script>

<PageHeader
	title="Pengguna & Peran"
	description="Cari akun, kelola status aktif, dan atur peran (multi-role) termasuk peran back-office."
/>

<div
	class="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs"
>
	<div class="flex-1 min-w-[200px]">
		<label for="u-q" class="block font-medium text-slate-600 dark:text-slate-400 mb-1">Cari</label>
		<input
			id="u-q"
			type="search"
			bind:value={searchQ}
			onkeydown={(e) => e.key === 'Enter' && loadUsers(1)}
			placeholder="Nama, email, atau HP..."
			class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5"
		/>
	</div>
	<div>
		<label for="u-role" class="block font-medium text-slate-600 dark:text-slate-400 mb-1">Peran Aktif</label>
		<select
			id="u-role"
			bind:value={roleFilter}
			class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
		>
			<option value="">Semua Peran</option>
			{#each ALL_ROLE_CODES as c}
				<option value={c}>{ROLE_LABELS[c] ?? c}</option>
			{/each}
		</select>
	</div>
	<div>
		<label for="u-act" class="block font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
		<select
			id="u-act"
			bind:value={activeFilter}
			class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
		>
			<option value="">Semua</option>
			<option value="true">Aktif</option>
			<option value="false">Nonaktif</option>
		</select>
	</div>
	<button
		type="button"
		onclick={() => loadUsers(1)}
		class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 font-medium text-white"
	>
		Cari
	</button>
</div>

<div
	class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs"
>
	<div class="overflow-x-auto">
		<table class="w-full text-left text-xs">
			<thead>
				<tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
					<th class="px-4 py-3 font-medium">Pengguna</th>
					<th class="px-4 py-3 font-medium">Peran Aktif</th>
					<th class="px-4 py-3 font-medium">Status</th>
					<th class="px-4 py-3 font-medium text-right">Saldo</th>
					<th class="px-4 py-3 font-medium">Terdaftar</th>
					<th class="px-4 py-3 font-medium text-right">Tindakan</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
				{#if loading && users.length === 0}
					<tr><td colspan="6" class="px-4 py-10 text-center text-slate-400">Memuat pengguna...</td></tr>
				{:else if users.length === 0}
					<tr><td colspan="6" class="px-4 py-10 text-center text-slate-400">Tidak ada pengguna.</td></tr>
				{:else}
					{#each users as u (u.ID)}
						<tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
							<td class="px-4 py-3">
								<div class="font-semibold text-slate-900 dark:text-slate-100">
									{u.name} <span class="font-normal text-slate-400">#{u.ID}</span>
								</div>
								<div class="text-slate-500">{u.email} · {u.phone}</div>
							</td>
							<td class="px-4 py-3">
								<Badge
									variant={isAdminRole(u.active_role) ? 'info' : 'neutral'}
									label={ROLE_LABELS[u.active_role] ?? u.active_role}
								/>
							</td>
							<td class="px-4 py-3">
								{#if u.is_active}
									<Badge variant="success" label="Aktif" />
								{:else}
									<Badge variant="danger" label="Nonaktif" />
								{/if}
							</td>
							<td class="px-4 py-3 text-right font-medium">{formatIDR(u.balance)}</td>
							<td class="px-4 py-3 text-slate-500">{formatDate(u.CreatedAt)}</td>
							<td class="px-4 py-3 text-right space-x-1 whitespace-nowrap">
								<button
									type="button"
									onclick={() => openDetail(u.ID)}
									class="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
								>
									{canManage ? 'Kelola' : 'Rincian'}
								</button>
								{#if canManage && u.ID !== session.user?.id}
									<button
										type="button"
										disabled={busy}
										onclick={() => toggleActive(u)}
										class="rounded-md px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50 {u.is_active
											? 'bg-rose-600 hover:bg-rose-700'
											: 'bg-emerald-600 hover:bg-emerald-700'}"
									>
										{u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
	<Pagination page={meta.page} perPage={meta.per_page} total={meta.total} onChange={(p) => loadUsers(p)} />
</div>

<Modal
	open={Boolean(detail)}
	title={detail ? `${detail.name} (#${detail.ID})` : ''}
	subtitle={detail ? `${detail.email} · ${detail.phone}` : ''}
	onClose={() => (detail = null)}
>
	{#if detail}
		<div class="space-y-4 text-xs">
			<div class="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
				<div>Peran aktif: <strong>{ROLE_LABELS[detail.active_role] ?? detail.active_role}</strong></div>
				<div>Saldo: <strong>{formatIDR(detail.balance)}</strong></div>
				<div>Akun aktif: <strong>{detail.is_active ? 'Ya' : 'Tidak'}</strong></div>
				<div>Terverifikasi: <strong>{detail.is_verified ? 'Ya' : 'Tidak'}</strong></div>
			</div>

			<div>
				<div class="font-semibold mb-2">Peran yang dimiliki</div>
				<div class="flex flex-wrap gap-2">
					{#each detail.roles ?? [] as r}
						<span
							class="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1"
						>
							<span class={r.code === detail.active_role ? 'font-semibold text-emerald-600' : ''}>
								{ROLE_LABELS[r.code] ?? r.name}
							</span>
							{#if canManage && r.code !== detail.active_role}
								<button
									type="button"
									disabled={busy}
									onclick={() => revokeRole(r.code)}
									class="text-rose-500 hover:text-rose-700"
									title="Cabut peran"
								>
									✕
								</button>
							{/if}
						</span>
					{/each}
				</div>
				<p class="mt-1.5 text-[11px] text-slate-400">
					Peran aktif tidak bisa dicabut; pengguna harus berpindah peran dulu.
				</p>
			</div>

			{#if canManage && assignableRoles.length > 0}
				<form onsubmit={assignRole} class="flex gap-2 border-t border-slate-200 dark:border-slate-700 pt-3">
					<select
						bind:value={roleToAssign}
						required
						class="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
					>
						<option value="">Pilih peran untuk ditambahkan...</option>
						{#each assignableRoles as c}
							<option value={c}>{ROLE_LABELS[c] ?? c}{isAdminRole(c) ? ' (back-office)' : ''}</option>
						{/each}
					</select>
					<button
						type="submit"
						disabled={busy || !roleToAssign}
						class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 font-medium text-white disabled:opacity-50"
					>
						Tambah Peran
					</button>
				</form>
			{/if}
		</div>
	{/if}
</Modal>
