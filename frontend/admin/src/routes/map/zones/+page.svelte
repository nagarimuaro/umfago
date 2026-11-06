<script lang="ts">
	import { apiFetch, session } from '#lib/session.svelte';
	import { formatIDR, formatNumber } from '#lib/format';
	import { toast } from '#lib/toast.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import type { CityEntity, GeoZoneEntity } from '#lib/types';

	let zones = $state<GeoZoneEntity[]>([]);
	let cities = $state<CityEntity[]>([]);
	let loading = $state(false);
	let busy = $state(false);
	let modalOpen = $state(false);

	let form = $state({
		city_id: 1,
		name: '',
		zone_type: 'surge_zone' as GeoZoneEntity['zone_type'],
		center_lat: -0.9471,
		center_lon: 100.4172,
		radius_km: 3,
		surge_multiplier: 1.2,
		extra_fee_idr: 0,
		notes: '',
		is_active: true
	});

	async function loadAll() {
		loading = true;
		try {
			const [zRes, cRes] = await Promise.all([
				apiFetch<{ zones: GeoZoneEntity[] }>('/api/admin/zones'),
				apiFetch<{ cities: CityEntity[] }>('/api/admin/cities')
			]);
			zones = zRes.zones ?? [];
			cities = cRes.cities ?? [];
			if (cities.length > 0 && form.city_id === 1) {
				form.city_id = cities[0].id;
				form.center_lat = cities[0].center_lat;
				form.center_lon = cities[0].center_lon;
			}
		} catch (err) {
			toast.error(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (session.ready && session.has('settings.manage')) loadAll();
	});

	async function submitZone(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		try {
			await apiFetch('/api/admin/zones', {
				method: 'POST',
				json: form
			});
			toast.success('Zona geospasial berhasil ditambahkan.');
			modalOpen = false;
			await loadAll();
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}

	async function removeZone(z: GeoZoneEntity) {
		if (!confirm(`Hapus zona ${z.name}?`)) return;
		busy = true;
		try {
			await apiFetch(`/api/admin/zones/${z.id}`, { method: 'DELETE' });
			toast.success('Zona dihapus.');
			await loadAll();
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}

	const zoneTypeMeta: Record<GeoZoneEntity['zone_type'], { label: string; variant: 'info' | 'warning' | 'danger' | 'success' }> = {
		service_area: { label: 'Wilayah Layanan', variant: 'success' },
		surge_zone: { label: 'Zona Ramai / Surge', variant: 'warning' },
		restricted: { label: 'Geofence Terlarang', variant: 'danger' },
		pickup_point: { label: 'Titik Jemput Khusus', variant: 'info' }
	};
</script>

<PageHeader
	title="Service Areas & Geofencing"
	description="Konfigurasi batas wilayah operasional, zona pengali tarif (surge), dan titik jemput khusus (§8.3–8.5)."
>
	{#snippet actions()}
		<button
			type="button"
			onclick={() => (modalOpen = true)}
			class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
		>
			+ Tambah Zona Baru
		</button>
	{/snippet}
</PageHeader>

<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
	<div class="overflow-x-auto">
		<table class="w-full text-left text-xs">
			<thead>
				<tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
					<th class="px-4 py-3 font-medium">Nama Zona</th>
					<th class="px-4 py-3 font-medium">Jenis Zona</th>
					<th class="px-4 py-3 font-medium">Koordinat Pusat & Radius</th>
					<th class="px-4 py-3 font-medium text-right">Pengali / Biaya Tambahan</th>
					<th class="px-4 py-3 font-medium">Status</th>
					<th class="px-4 py-3 font-medium text-right">Tindakan</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
				{#if loading && zones.length === 0}
					<tr><td colspan="6" class="px-4 py-10 text-center text-slate-400">Memuat zona...</td></tr>
				{:else if zones.length === 0}
					<tr><td colspan="6" class="px-4 py-10 text-center text-slate-400">Belum ada zona geofence dikonfigurasi.</td></tr>
				{:else}
					{#each zones as z (z.id)}
						{@const meta = zoneTypeMeta[z.zone_type] ?? { label: z.zone_type, variant: 'info' }}
						<tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
							<td class="px-4 py-3">
								<div class="font-semibold text-slate-900 dark:text-slate-100">{z.name}</div>
								{#if z.notes}
									<div class="text-[11px] text-slate-500">{z.notes}</div>
								{/if}
							</td>
							<td class="px-4 py-3">
								<Badge variant={meta.variant} label={meta.label} />
							</td>
							<td class="px-4 py-3 font-mono">
								{z.center_lat.toFixed(4)}, {z.center_lon.toFixed(4)}
								<span class="text-slate-400 font-sans">({formatNumber(z.radius_km)} km)</span>
							</td>
							<td class="px-4 py-3 text-right">
								{#if z.surge_multiplier > 1}
									<div class="font-semibold text-amber-600">{z.surge_multiplier}x Surge</div>
								{/if}
								{#if z.extra_fee_idr > 0}
									<div class="text-[11px] text-slate-500">+{formatIDR(z.extra_fee_idr)}</div>
								{/if}
								{#if z.surge_multiplier <= 1 && z.extra_fee_idr <= 0}
									<span class="text-slate-400">—</span>
								{/if}
							</td>
							<td class="px-4 py-3">
								{#if z.is_active}
									<Badge variant="success" label="Aktif" />
								{:else}
									<Badge variant="neutral" label="Nonaktif" />
								{/if}
							</td>
							<td class="px-4 py-3 text-right">
								<button
									type="button"
									disabled={busy}
									onclick={() => removeZone(z)}
									class="rounded-md bg-rose-600 hover:bg-rose-700 px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-50"
								>
									Hapus
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
	open={modalOpen}
	title="Tambah Zona Geospasial Baru"
	subtitle="Mendukung penentuan batas layanan, surge otomatis, dan area larangan."
	onClose={() => (modalOpen = false)}
>
	<form onsubmit={submitZone} class="space-y-3 text-xs">
		<div>
			<label for="z-name" class="block font-medium mb-1">Nama Area / Geofence</label>
			<input id="z-name" type="text" required bind:value={form.name} placeholder="Misal: Bandara Internasional (Pickup Khusus)" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
		</div>
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="z-city" class="block font-medium mb-1">Kota Induk</label>
				<select id="z-city" bind:value={form.city_id} class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
					{#each cities as c}
						<option value={c.id}>{c.name} ({c.code})</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="z-type" class="block font-medium mb-1">Jenis Zona</label>
				<select id="z-type" bind:value={form.zone_type} class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
					<option value="surge_zone">Zona Ramai / Surge Pricing</option>
					<option value="service_area">Batas Wilayah Layanan</option>
					<option value="pickup_point">Titik Jemput Khusus</option>
					<option value="restricted">Zona Terlarang / Restricted</option>
				</select>
			</div>
		</div>
		<div class="grid grid-cols-3 gap-3">
			<div>
				<label for="z-lat" class="block font-medium mb-1">Lintang (Lat)</label>
				<input id="z-lat" type="number" step="any" required bind:value={form.center_lat} class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono" />
			</div>
			<div>
				<label for="z-lon" class="block font-medium mb-1">Bujur (Lon)</label>
				<input id="z-lon" type="number" step="any" required bind:value={form.center_lon} class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono" />
			</div>
			<div>
				<label for="z-rad" class="block font-medium mb-1">Radius (km)</label>
				<input id="z-rad" type="number" step="0.1" min="0.1" required bind:value={form.radius_km} class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
			</div>
		</div>
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="z-srg" class="block font-medium mb-1">Pengali Surge (mis. 1.2 = +20%)</label>
				<input id="z-srg" type="number" step="0.05" min="1" bind:value={form.surge_multiplier} class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
			</div>
			<div>
				<label for="z-fee" class="block font-medium mb-1">Biaya Tambahan IDR</label>
				<input id="z-fee" type="number" min="0" bind:value={form.extra_fee_idr} class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
			</div>
		</div>
		<div>
			<label for="z-note" class="block font-medium mb-1">Catatan</label>
			<input id="z-note" type="text" bind:value={form.notes} placeholder="Keterangan operasional..." class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
		</div>
		<div class="flex justify-end gap-2 pt-2">
			<button type="button" onclick={() => (modalOpen = false)} class="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 font-medium">Batal</button>
			<button type="submit" disabled={busy} class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 font-semibold text-white disabled:opacity-50">
				{busy ? 'Menyimpan...' : 'Simpan Zona'}
			</button>
		</div>
	</form>
</Modal>
