<script lang="ts">
	import { apiFetch, session, toQuery } from '#lib/session.svelte';
	import { formatDate } from '#lib/format';
	import { toast } from '#lib/toast.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import type { PageMeta, Vehicle } from '#lib/types';

	let vehicles = $state<Vehicle[]>([]);
	let meta = $state<PageMeta>({ page: 1, per_page: 20, total: 0 });
	let loading = $state(false);
	let typeFilter = $state('');
	let searchQ = $state('');

	async function loadFleet(page = 1) {
		loading = true;
		try {
			const res = await apiFetch<{ vehicles: Vehicle[]; meta: PageMeta }>(
				`/api/admin/fleet${toQuery({ page, per_page: meta.per_page, type: typeFilter, q: searchQ.trim() })}`
			);
			vehicles = res.vehicles ?? [];
			meta = res.meta;
		} catch (err) {
			toast.error(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (session.ready && session.has('drivers.view')) loadFleet(1);
	});
</script>

<PageHeader
	title="Fleet Management"
	description="Direktori seluruh armada kendaraan terdaftar (motor & mobil) beserta pemilik dan status operasional."
/>

<div class="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs">
	<div class="flex-1 min-w-[200px]">
		<label for="f-q" class="block font-medium text-slate-600 dark:text-slate-400 mb-1">Cari Armada</label>
		<input
			id="f-q"
			type="search"
			bind:value={searchQ}
			onkeydown={(e) => e.key === 'Enter' && loadFleet(1)}
			placeholder="Nomor pelat, merek, atau model..."
			class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5"
		/>
	</div>
	<div>
		<label for="f-type" class="block font-medium text-slate-600 dark:text-slate-400 mb-1">Jenis Kendaraan</label>
		<select
			id="f-type"
			bind:value={typeFilter}
			class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
		>
			<option value="">Semua Jenis</option>
			<option value="motorcycle">Motor</option>
			<option value="car">Mobil</option>
		</select>
	</div>
	<button
		type="button"
		onclick={() => loadFleet(1)}
		class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 font-medium text-white"
	>
		Cari
	</button>
</div>

<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
	<div class="overflow-x-auto">
		<table class="w-full text-left text-xs">
			<thead>
				<tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
					<th class="px-4 py-3 font-medium">Pelat Nomor</th>
					<th class="px-4 py-3 font-medium">Merek & Model</th>
					<th class="px-4 py-3 font-medium">Kategori</th>
					<th class="px-4 py-3 font-medium">Driver Pemilik</th>
					<th class="px-4 py-3 font-medium">Status Armada</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
				{#if loading && vehicles.length === 0}
					<tr><td colspan="5" class="px-4 py-10 text-center text-slate-400">Memuat armada...</td></tr>
				{:else if vehicles.length === 0}
					<tr><td colspan="5" class="px-4 py-10 text-center text-slate-400">Belum ada armada terdaftar.</td></tr>
				{:else}
					{#each vehicles as v (v.ID)}
						<tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
							<td class="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-slate-100">{v.plate_number}</td>
							<td class="px-4 py-3 font-medium">{v.brand} {v.model_name ?? ''}</td>
							<td class="px-4 py-3 capitalize">{v.type === 'car' ? 'Mobil' : 'Motor'}</td>
							<td class="px-4 py-3">Driver #{v.user_id}</td>
							<td class="px-4 py-3">
								<Badge variant="success" label="Terdaftar Aktif" />
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
	<Pagination page={meta.page} perPage={meta.per_page} total={meta.total} onChange={(p) => loadFleet(p)} />
</div>
