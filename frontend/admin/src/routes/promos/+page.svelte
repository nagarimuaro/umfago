<script lang="ts">
	import { apiFetch, session, toQuery } from '#lib/session.svelte';
	import { formatDate, formatDateTime, formatIDR, formatNumber } from '#lib/format';
	import { toast } from '#lib/toast.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import type { PageMeta, PromoEntity, PromoUsage } from '#lib/types';

	let promos = $state<PromoEntity[]>([]);
	let meta = $state<PageMeta>({ page: 1, per_page: 20, total: 0 });
	let loading = $state(false);
	let busy = $state(false);
	let searchQ = $state('');
	let activeFilter = $state('');

	// Form create/edit
	let formOpen = $state(false);
	let editing = $state<PromoEntity | null>(null);
	let form = $state(emptyForm());

	// Usage
	let usageFor = $state<PromoEntity | null>(null);
	let usages = $state<PromoUsage[]>([]);
	let usageMeta = $state<PageMeta>({ page: 1, per_page: 20, total: 0 });
	let usageTotalDiscount = $state(0);

	function emptyForm() {
		return {
			code: '',
			name: '',
			description: '',
			discount_type: 'fixed' as 'fixed' | 'percent',
			discount_value: 0,
			max_discount: 0,
			min_fare: 0,
			quota: 0,
			per_user_limit: 1,
			starts_at: '',
			ends_at: '',
			is_active: true
		};
	}

	// datetime-local <-> RFC3339
	function toLocalInput(iso: string): string {
		if (!iso) return '';
		const d = new Date(iso);
		if (Number.isNaN(d.getTime()) || d.getFullYear() <= 1) return '';
		const off = d.getTimezoneOffset() * 60000;
		return new Date(d.getTime() - off).toISOString().slice(0, 16);
	}
	function toRFC3339(local: string): string {
		return local ? new Date(local).toISOString() : '';
	}

	async function loadPromos(page = 1) {
		loading = true;
		try {
			const res = await apiFetch<{ promos: PromoEntity[]; meta: PageMeta }>(
				`/api/admin/promos${toQuery({ page, per_page: meta.per_page, q: searchQ.trim(), is_active: activeFilter })}`
			);
			promos = res.promos ?? [];
			meta = res.meta;
		} catch (err) {
			toast.error(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (session.ready && session.has('promo.manage')) loadPromos(1);
	});

	function openCreate() {
		editing = null;
		form = emptyForm();
		formOpen = true;
	}

	function openEdit(p: PromoEntity) {
		editing = p;
		form = {
			code: p.code,
			name: p.name,
			description: p.description,
			discount_type: p.discount_type,
			discount_value: p.discount_value,
			max_discount: p.max_discount,
			min_fare: p.min_fare,
			quota: p.quota,
			per_user_limit: p.per_user_limit,
			starts_at: toLocalInput(p.starts_at),
			ends_at: toLocalInput(p.ends_at),
			is_active: p.is_active
		};
		formOpen = true;
	}

	async function submitForm(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		try {
			if (editing) {
				// Kode, tipe diskon, dan starts_at tidak bisa diubah (promo_handler.go Update)
				await apiFetch(`/api/admin/promos/${editing.ID}`, {
					method: 'PUT',
					json: {
						name: form.name,
						description: form.description,
						discount_value: form.discount_value,
						max_discount: form.max_discount,
						min_fare: form.min_fare,
						quota: form.quota,
						per_user_limit: form.per_user_limit,
						ends_at: toRFC3339(form.ends_at),
						is_active: form.is_active
					}
				});
				toast.success('Promo diperbarui.');
			} else {
				await apiFetch('/api/admin/promos', {
					method: 'POST',
					json: { ...form, starts_at: toRFC3339(form.starts_at), ends_at: toRFC3339(form.ends_at) }
				});
				toast.success('Promo dibuat.');
			}
			formOpen = false;
			await loadPromos(meta.page);
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}

	async function toggleActive(p: PromoEntity) {
		busy = true;
		try {
			await apiFetch(`/api/admin/promos/${p.ID}`, { method: 'PUT', json: { is_active: !p.is_active } });
			toast.success(p.is_active ? 'Promo dinonaktifkan.' : 'Promo diaktifkan.');
			await loadPromos(meta.page);
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}

	async function remove(p: PromoEntity) {
		if (!confirm(`Hapus promo ${p.code}? Riwayat pemakaian tetap tersimpan.`)) return;
		busy = true;
		try {
			await apiFetch(`/api/admin/promos/${p.ID}`, { method: 'DELETE' });
			toast.success('Promo dihapus.');
			await loadPromos(meta.page);
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}

	async function openUsage(p: PromoEntity, page = 1) {
		usageFor = p;
		try {
			const res = await apiFetch<{ usages: PromoUsage[]; total_discount: number; meta: PageMeta }>(
				`/api/admin/promos/${p.ID}/usage${toQuery({ page, per_page: 20 })}`
			);
			usages = res.usages ?? [];
			usageMeta = res.meta;
			usageTotalDiscount = res.total_discount;
		} catch (err) {
			toast.error(err);
		}
	}

	function promoState(p: PromoEntity): { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' } {
		if (!p.is_active) return { label: 'Nonaktif', variant: 'neutral' };
		const now = Date.now();
		const start = new Date(p.starts_at).getTime();
		const end = new Date(p.ends_at).getTime();
		if (new Date(p.starts_at).getFullYear() > 1 && start > now) return { label: 'Terjadwal', variant: 'warning' };
		if (new Date(p.ends_at).getFullYear() > 1 && end < now) return { label: 'Kedaluwarsa', variant: 'danger' };
		if (p.quota > 0 && p.used_count >= p.quota) return { label: 'Kuota Habis', variant: 'danger' };
		return { label: 'Berjalan', variant: 'success' };
	}

	const inputCls =
		'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 disabled:opacity-50';
</script>

<PageHeader title="Promosi & Voucher" description="Kelola kode promo, kuota, dan pantau pemakaiannya.">
	{#snippet actions()}
		<button
			type="button"
			onclick={openCreate}
			class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white"
		>
			+ Promo Baru
		</button>
	{/snippet}
</PageHeader>

<div class="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs">
	<div class="flex-1 min-w-[200px]">
		<label for="p-q" class="block font-medium text-slate-600 dark:text-slate-400 mb-1">Cari</label>
		<input id="p-q" type="search" bind:value={searchQ} onkeydown={(e) => e.key === 'Enter' && loadPromos(1)} placeholder="Kode atau nama..." class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5" />
	</div>
	<div>
		<label for="p-act" class="block font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
		<select id="p-act" bind:value={activeFilter} class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5">
			<option value="">Semua</option>
			<option value="true">Aktif</option>
			<option value="false">Nonaktif</option>
		</select>
	</div>
	<button type="button" onclick={() => loadPromos(1)} class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 font-medium text-white">Cari</button>
</div>

<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
	<div class="overflow-x-auto">
		<table class="w-full text-left text-xs">
			<thead>
				<tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
					<th class="px-4 py-3 font-medium">Kode</th>
					<th class="px-4 py-3 font-medium">Potongan</th>
					<th class="px-4 py-3 font-medium">Pemakaian</th>
					<th class="px-4 py-3 font-medium">Masa Berlaku</th>
					<th class="px-4 py-3 font-medium">Status</th>
					<th class="px-4 py-3 font-medium text-right">Tindakan</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
				{#if loading && promos.length === 0}
					<tr><td colspan="6" class="px-4 py-10 text-center text-slate-400">Memuat promo...</td></tr>
				{:else if promos.length === 0}
					<tr><td colspan="6" class="px-4 py-10 text-center text-slate-400">Belum ada promo.</td></tr>
				{:else}
					{#each promos as p (p.ID)}
						{@const st = promoState(p)}
						<tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
							<td class="px-4 py-3">
								<div class="font-mono font-semibold text-slate-900 dark:text-slate-100">{p.code}</div>
								<div class="text-slate-500">{p.name || '—'}</div>
							</td>
							<td class="px-4 py-3">
								<div class="font-semibold">
									{p.discount_type === 'percent' ? `${p.discount_value}%` : formatIDR(p.discount_value)}
								</div>
								<div class="text-[11px] text-slate-400">
									{#if p.max_discount > 0}Maks {formatIDR(p.max_discount)} · {/if}
									{#if p.min_fare > 0}Min. tarif {formatIDR(p.min_fare)}{:else}Tanpa min. tarif{/if}
								</div>
							</td>
							<td class="px-4 py-3">
								<div class="font-medium">
									{formatNumber(p.used_count)} / {p.quota > 0 ? formatNumber(p.quota) : '∞'}
								</div>
								<div class="text-[11px] text-slate-400">
									{p.per_user_limit > 0 ? `${p.per_user_limit}× per user` : 'Tanpa batas per user'}
								</div>
							</td>
							<td class="px-4 py-3 text-slate-500">
								{formatDate(p.starts_at)} – {formatDate(p.ends_at)}
							</td>
							<td class="px-4 py-3"><Badge variant={st.variant} label={st.label} /></td>
							<td class="px-4 py-3 text-right space-x-1 whitespace-nowrap">
								<button type="button" onclick={() => openUsage(p)} class="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Pemakaian</button>
								<button type="button" onclick={() => openEdit(p)} class="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Ubah</button>
								<button type="button" disabled={busy} onclick={() => toggleActive(p)} class="rounded-md px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50 {p.is_active ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}">
									{p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
								</button>
								<button type="button" disabled={busy} onclick={() => remove(p)} class="rounded-md bg-rose-600 hover:bg-rose-700 px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50">Hapus</button>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
	<Pagination page={meta.page} perPage={meta.per_page} total={meta.total} onChange={(p) => loadPromos(p)} />
</div>

<Modal
	open={formOpen}
	title={editing ? `Ubah Promo ${editing.code}` : 'Promo Baru'}
	subtitle={editing ? 'Kode, tipe potongan, dan tanggal mulai tidak bisa diubah setelah dibuat.' : 'Nilai 0 pada kuota, batas per user, plafon, dan min. tarif berarti tanpa batas.'}
	maxWidth="max-w-2xl"
	onClose={() => (formOpen = false)}
>
	<form onsubmit={submitForm} class="space-y-3 text-xs">
		<div class="grid grid-cols-2 gap-3">
			<label class="flex flex-col gap-1">
				<span class="font-medium">Kode</span>
				<input type="text" required disabled={Boolean(editing)} bind:value={form.code} class="{inputCls} font-mono uppercase" />
			</label>
			<label class="flex flex-col gap-1">
				<span class="font-medium">Nama</span>
				<input type="text" bind:value={form.name} class={inputCls} />
			</label>
		</div>
		<label class="flex flex-col gap-1">
			<span class="font-medium">Deskripsi</span>
			<input type="text" bind:value={form.description} class={inputCls} />
		</label>
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
			<label class="flex flex-col gap-1">
				<span class="font-medium">Tipe</span>
				<select disabled={Boolean(editing)} bind:value={form.discount_type} class={inputCls}>
					<option value="fixed">Nominal (IDR)</option>
					<option value="percent">Persen (%)</option>
				</select>
			</label>
			<label class="flex flex-col gap-1">
				<span class="font-medium">Nilai</span>
				<input type="number" required min="0.01" step="any" max={form.discount_type === 'percent' ? 100 : undefined} bind:value={form.discount_value} class={inputCls} />
			</label>
			<label class="flex flex-col gap-1">
				<span class="font-medium">Plafon Potongan</span>
				<input type="number" min="0" bind:value={form.max_discount} class={inputCls} />
			</label>
			<label class="flex flex-col gap-1">
				<span class="font-medium">Min. Tarif</span>
				<input type="number" min="0" bind:value={form.min_fare} class={inputCls} />
			</label>
		</div>
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
			<label class="flex flex-col gap-1">
				<span class="font-medium">Kuota Total</span>
				<input type="number" min="0" step="1" bind:value={form.quota} class={inputCls} />
			</label>
			<label class="flex flex-col gap-1">
				<span class="font-medium">Batas per User</span>
				<input type="number" min="0" step="1" bind:value={form.per_user_limit} class={inputCls} />
			</label>
			<label class="flex flex-col gap-1">
				<span class="font-medium">Mulai</span>
				<input type="datetime-local" disabled={Boolean(editing)} bind:value={form.starts_at} class={inputCls} />
			</label>
			<label class="flex flex-col gap-1">
				<span class="font-medium">Berakhir</span>
				<input type="datetime-local" bind:value={form.ends_at} class={inputCls} />
			</label>
		</div>
		<label class="flex items-center gap-2">
			<input type="checkbox" bind:checked={form.is_active} />
			<span class="font-medium">Aktif</span>
		</label>
		<div class="flex justify-end gap-2 pt-1">
			<button type="button" onclick={() => (formOpen = false)} class="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 font-medium">Batal</button>
			<button type="submit" disabled={busy} class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 font-medium text-white disabled:opacity-50">
				{busy ? 'Menyimpan...' : 'Simpan'}
			</button>
		</div>
	</form>
</Modal>

<Modal
	open={Boolean(usageFor)}
	title={`Pemakaian ${usageFor?.code ?? ''}`}
	subtitle={`Total potongan diberikan: ${formatIDR(usageTotalDiscount)}`}
	maxWidth="max-w-2xl"
	onClose={() => (usageFor = null)}
>
	{#if usages.length === 0}
		<p class="py-6 text-center text-xs text-slate-400">Belum pernah dipakai.</p>
	{:else}
		<table class="w-full text-left text-xs">
			<thead>
				<tr class="border-b border-slate-200 dark:border-slate-800 text-slate-500">
					<th class="pb-2 font-medium">Waktu</th>
					<th class="pb-2 font-medium">User</th>
					<th class="pb-2 font-medium">Order</th>
					<th class="pb-2 font-medium text-right">Potongan</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
				{#each usages as u (u.id)}
					<tr>
						<td class="py-2">{formatDateTime(u.created_at)}</td>
						<td class="py-2">#{u.user_id}</td>
						<td class="py-2 font-mono">{u.order_uuid.slice(0, 8)}…</td>
						<td class="py-2 text-right font-medium">{formatIDR(u.discount)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if usageFor}
			{@const p = usageFor}
			<Pagination page={usageMeta.page} perPage={usageMeta.per_page} total={usageMeta.total} onChange={(pg) => openUsage(p, pg)} />
		{/if}
	{/if}
</Modal>
