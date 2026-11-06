<script lang="ts">
	import { apiFetch, session } from '#lib/session.svelte';
	import { formatIDR, formatNumber } from '#lib/format';
	import { toast } from '#lib/toast.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import type { ServiceCatalogEntity } from '#lib/types';

	let services = $state<ServiceCatalogEntity[]>([]);
	let loading = $state(false);
	let busy = $state(false);
	let editing = $state<ServiceCatalogEntity | null>(null);

	let form = $state({
		name: '',
		per_km_price_idr: 3000,
		min_distance_km: 3,
		platform_fee_percent: 20,
		customer_fee_percent: 0,
		is_active: true
	});

	async function loadServices() {
		loading = true;
		try {
			const res = await apiFetch<{ services: ServiceCatalogEntity[] }>('/api/admin/services');
			services = res.services ?? [];
		} catch (err) {
			toast.error(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (session.ready && session.has('settings.manage')) loadServices();
	});

	function openEdit(s: ServiceCatalogEntity) {
		editing = s;
		form = {
			name: s.name,
			per_km_price_idr: s.per_km_price_idr,
			min_distance_km: s.min_distance_km,
			platform_fee_percent: s.platform_fee_percent,
			customer_fee_percent: s.customer_fee_percent,
			is_active: s.is_active
		};
	}

	async function submitEdit(e: SubmitEvent) {
		e.preventDefault();
		if (!editing) return;
		busy = true;
		try {
			await apiFetch(`/api/admin/services/${editing.id}`, {
				method: 'PUT',
				json: form
			});
			toast.success(`Tarif ${editing.name} diperbarui.`);
			editing = null;
			await loadServices();
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}
</script>

<PageHeader
	title="Service & Tariff Management"
	description="Kelola seluruh lini produk layanan (Ride Motor, Mobil, Food Delivery, Kurir) dan struktur tarif per layanan (§9, §10.1)."
/>

<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
	<div class="overflow-x-auto">
		<table class="w-full text-left text-xs">
			<thead>
				<tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
					<th class="px-4 py-3 font-medium">Layanan</th>
					<th class="px-4 py-3 font-medium">Kategori & Moda</th>
					<th class="px-4 py-3 font-medium text-right">Tarif / km</th>
					<th class="px-4 py-3 font-medium text-right">Min. Jarak</th>
					<th class="px-4 py-3 font-medium text-right">Potongan Platform</th>
					<th class="px-4 py-3 font-medium text-right">Biaya Penumpang</th>
					<th class="px-4 py-3 font-medium">Status</th>
					<th class="px-4 py-3 font-medium text-right">Tindakan</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
				{#if loading && services.length === 0}
					<tr><td colspan="8" class="px-4 py-10 text-center text-slate-400">Memuat katalog layanan...</td></tr>
				{:else}
					{#each services as s (s.id)}
						<tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
							<td class="px-4 py-3">
								<div class="font-semibold text-slate-900 dark:text-slate-100">{s.name}</div>
								<div class="font-mono text-[11px] text-slate-400">{s.code}</div>
							</td>
							<td class="px-4 py-3 capitalize">
								<span class="font-medium">{s.category}</span> · {s.vehicle_type === 'car' ? 'Mobil' : 'Motor'}
							</td>
							<td class="px-4 py-3 text-right font-semibold">{formatIDR(s.per_km_price_idr)}</td>
							<td class="px-4 py-3 text-right">{formatNumber(s.min_distance_km)} km</td>
							<td class="px-4 py-3 text-right font-medium text-emerald-600">{s.platform_fee_percent}%</td>
							<td class="px-4 py-3 text-right font-medium">{s.customer_fee_percent}%</td>
							<td class="px-4 py-3">
								{#if s.is_active}
									<Badge variant="success" label="Aktif" />
								{:else}
									<Badge variant="neutral" label="Nonaktif" />
								{/if}
							</td>
							<td class="px-4 py-3 text-right">
								<button
									type="button"
									onclick={() => openEdit(s)}
									class="rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
								>
									Ubah Tarif
								</button>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

<Modal
	open={Boolean(editing)}
	title={`Ubah Tarif Layanan: ${editing?.name ?? ''}`}
	subtitle="Perubahan berlaku langsung untuk kalkulasi pesanan baru."
	onClose={() => (editing = null)}
>
	<form onsubmit={submitEdit} class="space-y-3 text-xs">
		<div>
			<label for="s-name" class="block font-medium mb-1">Nama Layanan</label>
			<input id="s-name" type="text" required bind:value={form.name} class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
		</div>
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="s-pkm" class="block font-medium mb-1">Tarif per km (IDR)</label>
				<input id="s-pkm" type="number" min="500" step="100" required bind:value={form.per_km_price_idr} class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-semibold" />
			</div>
			<div>
				<label for="s-mdist" class="block font-medium mb-1">Jarak Minimum (km)</label>
				<input id="s-mdist" type="number" min="0.5" step="0.5" required bind:value={form.min_distance_km} class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
			</div>
		</div>
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="s-plat" class="block font-medium mb-1">Komisi Platform (%)</label>
				<input id="s-plat" type="number" min="0" max="100" bind:value={form.platform_fee_percent} class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
			</div>
			<div>
				<label for="s-cust" class="block font-medium mb-1">Biaya Layanan Penumpang (%)</label>
				<input id="s-cust" type="number" min="0" max="100" bind:value={form.customer_fee_percent} class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
			</div>
		</div>
		<label class="flex items-center gap-2 pt-1">
			<input type="checkbox" bind:checked={form.is_active} />
			<span class="font-medium">Layanan Aktif</span>
		</label>
		<div class="flex justify-end gap-2 pt-2">
			<button type="button" onclick={() => (editing = null)} class="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 font-medium">Batal</button>
			<button type="submit" disabled={busy} class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 font-semibold text-white disabled:opacity-50">
				{busy ? 'Menyimpan...' : 'Simpan Perubahan'}
			</button>
		</div>
	</form>
</Modal>
