<script lang="ts">
	import { apiFetch, session } from '#lib/session.svelte';
	import { toast } from '#lib/toast.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import KpiCard from '#lib/components/KpiCard.svelte';
	import type { FeatureFlagEntity, SystemHealthData } from '#lib/types';

	let flags = $state<FeatureFlagEntity[]>([]);
	let health = $state<SystemHealthData | null>(null);
	let loading = $state(false);
	let busy = $state(false);

	async function loadAll() {
		loading = true;
		try {
			const [fRes, hRes] = await Promise.all([
				apiFetch<{ flags: FeatureFlagEntity[] }>('/api/admin/feature-flags'),
				apiFetch<SystemHealthData>('/api/admin/system/health')
			]);
			flags = fRes.flags ?? [];
			health = hRes;
		} catch (err) {
			toast.error(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (session.ready && session.has('settings.manage')) loadAll();
	});

	async function toggleFlag(f: FeatureFlagEntity) {
		busy = true;
		try {
			await apiFetch(`/api/admin/feature-flags/${encodeURIComponent(f.key)}`, {
				method: 'PUT',
				json: { enabled: !f.enabled }
			});
			toast.success(`Feature flag ${f.name} diperbarui.`);
			await loadAll();
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}
</script>

<PageHeader
	title="System & Infrastructure Monitoring"
	description="Metrik runtime Go, status pool koneksi database PostgreSQL, dan sakelar fitur sistem (Feature Flags) (§19.4, §20)."
>
	{#snippet actions()}
		<button
			type="button"
			disabled={loading}
			onclick={loadAll}
			class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
		>
			{loading ? 'Memuat...' : 'Segarkan Telemetri'}
		</button>
	{/snippet}
</PageHeader>

{#if health}
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
		<KpiCard label="Status Sistem" value={health.status.toUpperCase()} subtext={`Uptime: ${health.uptime}`} accent="emerald" />
		<KpiCard label="Goroutine Aktif" value={String(health.runtime.goroutines)} subtext={`Go ${health.runtime.go_version}`} accent="sky" />
		<KpiCard label="Penggunaan Memori" value={`${health.runtime.alloc_mb} MB`} subtext={`Sys: ${health.runtime.sys_mb} MB · GC: ${health.runtime.num_gc}x`} accent="default" />
		<KpiCard
			label="Database Pool"
			value={`${health.database.open_conns} Koneksi`}
			subtext={`In-use: ${health.database.in_use} · Idle: ${health.database.idle}`}
			accent={health.database.status ? 'emerald' : 'rose'}
		/>
	</div>
{/if}

<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
	<div class="border-b border-slate-200 dark:border-slate-800 px-5 py-3">
		<h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Feature Flags & Integrasi API</h2>
		<p class="text-xs text-slate-500">Sakelar fitur produksi tanpa perlu redeploy backend (§19.4).</p>
	</div>
	<div class="divide-y divide-slate-100 dark:divide-slate-800">
		{#if flags.length === 0}
			<div class="p-6 text-center text-xs text-slate-400">Memuat konfigurasi feature flags...</div>
		{:else}
			{#each flags as f (f.id)}
				<div class="flex items-center justify-between p-5 text-xs">
					<div>
						<div class="flex items-center gap-2">
							<span class="font-semibold text-sm text-slate-900 dark:text-slate-100">{f.name}</span>
							<Badge variant={f.enabled ? 'success' : 'neutral'} label={f.enabled ? 'Aktif (100%)' : 'Nonaktif'} />
						</div>
						<div class="font-mono text-slate-400 mt-0.5">{f.key}</div>
						<div class="text-slate-500 mt-1">{f.description}</div>
					</div>
					<button
						type="button"
						disabled={busy}
						onclick={() => toggleFlag(f)}
						class="rounded-lg px-3 py-1.5 font-semibold text-white disabled:opacity-50 {f.enabled ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}"
					>
						{f.enabled ? 'Matikan Fitur' : 'Aktifkan Fitur'}
					</button>
				</div>
			{/each}
		{/if}
	</div>
</div>
