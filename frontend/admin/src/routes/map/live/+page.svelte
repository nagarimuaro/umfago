<script lang="ts">
	import { apiFetch, session } from '#lib/session.svelte';
	import { formatDateTime } from '#lib/format';
	import { toast } from '#lib/toast.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import type { LiveDriverLocation } from '#lib/types';

	let drivers = $state<LiveDriverLocation[]>([]);
	let loading = $state(false);
	let autoRefresh = $state(true);
	let selectedDriver = $state<LiveDriverLocation | null>(null);

	async function loadLive() {
		loading = true;
		try {
			const res = await apiFetch<{ drivers: LiveDriverLocation[]; count: number }>(
				'/api/admin/map/live-drivers'
			);
			drivers = res.drivers ?? [];
		} catch (err) {
			toast.error(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (!session.ready || !session.has('drivers.view')) return;
		loadLive();
		const timer = setInterval(() => {
			if (autoRefresh) loadLive();
		}, 10000);
		return () => clearInterval(timer);
	});
</script>

<PageHeader
	title="Live Map & Realtime Driver Tracking"
	description="Snapshot driver yang sedang online dan koordinat geospasial real-time dari Redis GEO."
>
	{#snippet actions()}
		<label class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
			<input type="checkbox" bind:checked={autoRefresh} />
			<span>Auto-refresh (10s)</span>
		</label>
		<button
			type="button"
			disabled={loading}
			onclick={loadLive}
			class="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white"
		>
			{loading ? 'Memperbarui...' : 'Segarkan Posisi'}
		</button>
	{/snippet}
</PageHeader>

<div class="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
	<!-- Area Visualisasi Peta Grid Geospasial -->
	<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-xs">
		<div class="flex items-center justify-between text-xs">
			<span class="font-semibold text-slate-900 dark:text-slate-100">
				Driver Online Terdeteksi: <strong class="text-emerald-600">{drivers.length}</strong>
			</span>
			<span class="text-slate-400">Peta interaktif MapLibre / OpenStreetMap (§8.1)</span>
		</div>

		<!-- Container Representasi Peta Vektor -->
		<div class="relative h-[480px] w-full rounded-xl bg-slate-950 overflow-hidden border border-slate-800 flex flex-col justify-between p-4">
			<!-- Peta latar & indikator koordinat -->
			<div class="absolute inset-0 opacity-20 pointer-events-none" style="background-image: radial-gradient(#10b981 1px, transparent 1px); background-size: 24px 24px;"></div>

			<div class="relative z-10 flex justify-between items-start text-xs text-slate-400">
				<div class="rounded-lg bg-slate-900/90 backdrop-blur px-3 py-2 border border-slate-800">
					<div>Indeks Geospasial: <strong class="text-emerald-400">Redis GEOADD / GEOSEARCH</strong></div>
					<div class="text-[11px] text-slate-500">Kunci: <code>active_drivers</code></div>
				</div>
				<div class="rounded-lg bg-slate-900/90 backdrop-blur px-3 py-2 border border-slate-800 text-right">
					<div>Routing Engine: <strong class="text-sky-400">Valhalla Active</strong></div>
					<div class="text-[11px] text-slate-500">Peta: OpenStreetMap</div>
				</div>
			</div>

			<!-- Plot Titik-titik Driver Terdeteksi -->
			<div class="relative z-10 flex-1 flex flex-wrap items-center justify-center gap-3 p-4 overflow-auto">
				{#if drivers.length === 0}
					<div class="text-center text-slate-500 text-xs">
						Belum ada driver yang menyalakan status online saat ini.
					</div>
				{:else}
					{#each drivers as d}
						<button
							type="button"
							onclick={() => (selectedDriver = d)}
							class="group flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all {selectedDriver?.driver_id === d.driver_id ? 'border-emerald-500 bg-emerald-950/80 text-white' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700'}"
						>
							<span class="h-2.5 w-2.5 rounded-full {d.has_location ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}"></span>
							<div class="text-left">
								<div class="font-semibold leading-tight">{d.name}</div>
								<div class="text-[10px] text-slate-400">{d.vehicle_type === 'car' ? 'Mobil' : 'Motor'} · {d.plate_number || `#${d.driver_id}`}</div>
							</div>
						</button>
					{/each}
				{/if}
			</div>

			<div class="relative z-10 flex justify-between items-end text-[11px] text-slate-500">
				<div>Titik hijau: driver mengirim koordinat via WS <code>location_update</code>.</div>
				<a href="/map/zones" class="text-emerald-400 hover:underline">Kelola Zona Layanan & Geofence →</a>
			</div>
		</div>
	</div>

	<!-- Panel Informasi Driver Terpilih -->
	<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-xs">
		<h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Rincian Posisi Driver</h2>
		{#if selectedDriver}
			{@const d = selectedDriver}
			<div class="space-y-3 text-xs">
				<div class="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 space-y-1.5">
					<div class="font-semibold text-sm text-slate-900 dark:text-slate-100">{d.name}</div>
					<div class="text-slate-500">ID Driver: #{d.driver_id} · {d.role_code}</div>
					<div>Jenis: <span class="capitalize font-medium">{d.vehicle_type}</span></div>
					<div>Pelat Nomor: <span class="font-mono font-semibold">{d.plate_number || '—'}</span></div>
				</div>

				<div class="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-1.5">
					<div class="font-semibold text-slate-700 dark:text-slate-300">Koordinat Saat Ini</div>
					{#if d.has_location}
						<div>Lintang (Lat): <code class="font-mono">{d.lat.toFixed(6)}</code></div>
						<div>Bujur (Lon): <code class="font-mono">{d.lon.toFixed(6)}</code></div>
						<a
							href={`https://www.openstreetmap.org/?mlat=${d.lat}&mlon=${d.lon}#map=16/${d.lat}/${d.lon}`}
							target="_blank"
							rel="noreferrer"
							class="inline-block mt-1 text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
						>
							Buka di OpenStreetMap ↗
						</a>
					{:else}
						<div class="text-amber-600 dark:text-amber-400">Driver belum memancarkan koordinat WebSocket.</div>
					{/if}
				</div>

				<div class="text-[11px] text-slate-500">
					Online sejak: {formatDateTime(d.online_since)}
				</div>
			</div>
		{:else}
			<p class="py-12 text-center text-xs text-slate-400">
				Klik salah satu driver pada peta untuk melihat koordinat presisi.
			</p>
		{/if}
	</div>
</div>
