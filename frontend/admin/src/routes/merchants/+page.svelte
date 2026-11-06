<script lang="ts">
	import { apiFetch, session, toQuery } from '#lib/session.svelte';
	import { formatDate } from '#lib/format';
	import { toast } from '#lib/toast.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import type { MerchantProfile, PageMeta } from '#lib/types';

	let merchants = $state<MerchantProfile[]>([]);
	let meta = $state<PageMeta>({ page: 1, per_page: 20, total: 0 });
	let loading = $state(false);
	let busy = $state(false);

	let activeFilter = $state('');
	let searchQ = $state('');

	let detail = $state<{
		merchant: MerchantProfile;
		owner: { ID: number; name: string; email: string; phone: string; is_active: boolean };
	} | null>(null);

	let canApprove = $derived(session.has('merchants.approve'));
	let canSuspend = $derived(session.has('merchants.suspend'));

	async function loadMerchants(page = 1) {
		loading = true;
		try {
			const res = await apiFetch<{ merchants: MerchantProfile[]; meta: PageMeta }>(
				`/api/admin/merchants${toQuery({ page, per_page: meta.per_page, is_active: activeFilter, q: searchQ.trim() })}`
			);
			merchants = res.merchants ?? [];
			meta = res.meta;
		} catch (err) {
			toast.error(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (session.ready && session.has('merchants.view')) loadMerchants(1);
	});

	async function openDetail(id: number) {
		try {
			detail = await apiFetch(`/api/admin/merchants/${id}`);
		} catch (err) {
			toast.error(err);
		}
	}

	async function approve(m: MerchantProfile) {
		busy = true;
		try {
			await apiFetch(`/api/admin/merchants/${m.id}/approve`, { method: 'PUT' });
			toast.success(`${m.business_name} disetujui dan kini tampil ke pembeli.`);
			await loadMerchants(meta.page);
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}

	async function suspend(m: MerchantProfile) {
		const reason = prompt(`Alasan suspend ${m.business_name}? (opsional)`);
		if (reason === null) return;
		busy = true;
		try {
			await apiFetch(`/api/admin/merchants/${m.id}/suspend`, {
				method: 'PUT',
				json: { reason }
			});
			toast.success(`${m.business_name} disuspend.`);
			await loadMerchants(meta.page);
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}
</script>

<PageHeader
	title="Manajemen Merchant"
	description="Setujui pendaftaran merchant baru atau suspend merchant bermasalah."
>
	{#snippet actions()}
		<button
			type="button"
			onclick={() => {
				activeFilter = 'false';
				loadMerchants(1);
			}}
			class="rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-medium text-white"
		>
			Menunggu Persetujuan
		</button>
	{/snippet}
</PageHeader>

<div
	class="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs"
>
	<div class="flex-1 min-w-[200px]">
		<label for="m-q" class="block font-medium text-slate-600 dark:text-slate-400 mb-1">Nama Usaha</label>
		<input
			id="m-q"
			type="search"
			bind:value={searchQ}
			onkeydown={(e) => e.key === 'Enter' && loadMerchants(1)}
			placeholder="Cari nama usaha..."
			class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5"
		/>
	</div>
	<div>
		<label for="m-act" class="block font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
		<select
			id="m-act"
			bind:value={activeFilter}
			class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
		>
			<option value="">Semua</option>
			<option value="true">Aktif / Disetujui</option>
			<option value="false">Belum Disetujui / Disuspend</option>
		</select>
	</div>
	<button
		type="button"
		onclick={() => loadMerchants(1)}
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
					<th class="px-4 py-3 font-medium">Usaha</th>
					<th class="px-4 py-3 font-medium">Kategori</th>
					<th class="px-4 py-3 font-medium">Status</th>
					<th class="px-4 py-3 font-medium">Terdaftar</th>
					<th class="px-4 py-3 font-medium text-right">Tindakan</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
				{#if loading && merchants.length === 0}
					<tr><td colspan="5" class="px-4 py-10 text-center text-slate-400">Memuat merchant...</td></tr>
				{:else if merchants.length === 0}
					<tr><td colspan="5" class="px-4 py-10 text-center text-slate-400">Tidak ada merchant.</td></tr>
				{:else}
					{#each merchants as m (m.id)}
						<tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
							<td class="px-4 py-3">
								<div class="font-semibold text-slate-900 dark:text-slate-100">
									{m.business_name} <span class="font-normal text-slate-400">#{m.id}</span>
								</div>
								<div class="text-slate-500 truncate max-w-xs" title={m.business_address}>
									{m.business_address || '—'}
								</div>
							</td>
							<td class="px-4 py-3">{m.category || '—'}</td>
							<td class="px-4 py-3 space-x-1">
								{#if m.is_active}
									<Badge variant="success" label="Disetujui" />
								{:else}
									<Badge variant="warning" label="Belum Aktif" />
								{/if}
								{#if m.is_open}
									<Badge variant="info" label="Buka" />
								{:else}
									<Badge variant="neutral" label="Tutup" />
								{/if}
							</td>
							<td class="px-4 py-3 text-slate-500">{formatDate(m.created_at)}</td>
							<td class="px-4 py-3 text-right space-x-1 whitespace-nowrap">
								<button
									type="button"
									onclick={() => openDetail(m.id)}
									class="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
								>
									Rincian
								</button>
								{#if canApprove && !m.is_active}
									<button
										type="button"
										disabled={busy}
										onclick={() => approve(m)}
										class="rounded-md bg-emerald-600 hover:bg-emerald-700 px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
									>
										Setujui
									</button>
								{/if}
								{#if canSuspend && m.is_active}
									<button
										type="button"
										disabled={busy}
										onclick={() => suspend(m)}
										class="rounded-md bg-rose-600 hover:bg-rose-700 px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
									>
										Suspend
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
	<Pagination page={meta.page} perPage={meta.per_page} total={meta.total} onChange={(p) => loadMerchants(p)} />
</div>

<Modal
	open={Boolean(detail)}
	title={detail?.merchant.business_name ?? ''}
	subtitle="Profil usaha & pemilik akun"
	onClose={() => (detail = null)}
>
	{#if detail}
		<div class="space-y-3 text-xs">
			<div class="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1">
				<div class="font-semibold mb-1">Usaha</div>
				<div>Alamat: {detail.merchant.business_address || '—'}</div>
				<div>Kategori: {detail.merchant.category || '—'}</div>
				<div>Disetujui: <strong>{detail.merchant.is_active ? 'Ya' : 'Belum'}</strong></div>
				<div>Sedang buka: <strong>{detail.merchant.is_open ? 'Ya' : 'Tidak'}</strong></div>
			</div>
			<div class="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1">
				<div class="font-semibold mb-1">Pemilik</div>
				<div>Nama: <strong>{detail.owner.name}</strong> (#{detail.owner.ID})</div>
				<div>Email: {detail.owner.email}</div>
				<div>HP: {detail.owner.phone}</div>
				<div>Akun aktif: <strong>{detail.owner.is_active ? 'Ya' : 'Tidak'}</strong></div>
			</div>
		</div>
	{/if}
</Modal>
