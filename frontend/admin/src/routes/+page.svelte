<script lang="ts">
	import { goto } from '$app/navigation';
	import { apiFetch, session, toQuery } from '#lib/session.svelte';
	import { NAV_ITEMS } from '#lib/permissions';
	import { defaultDateRange, formatIDR, formatNumber } from '#lib/format';
	import { toast } from '#lib/toast.svelte';
	import KpiCard from '#lib/components/KpiCard.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import type { DashboardReport, SalesReport, TopDriversReport } from '#lib/types';

	const initial = defaultDateRange(30);
	let from = $state(initial.from);
	let to = $state(initial.to);
	let loading = $state(false);

	let dashboard = $state<DashboardReport | null>(null);
	let sales = $state<SalesReport | null>(null);
	let topDrivers = $state<TopDriversReport | null>(null);

	let canViewDashboard = $derived(session.has('reports.view'));
	let canViewSales = $derived(session.has('reports.sales'));

	// Bila peran login tidak memegang reports.view maupun reports.sales (mis. CS atau Driver Manager),
	// arahkan langsung ke modul pertama yang diizinkan.
	$effect(() => {
		if (!session.ready || !session.user) return;
		if (!canViewDashboard && !canViewSales) {
			const target = NAV_ITEMS.find((n) => n.href !== '/' && session.hasAny(n.requiredAny));
			if (target) goto(target.href);
		}
	});

	async function loadAll() {
		loading = true;
		try {
			const q = toQuery({ from, to });
			const tasks: Promise<void>[] = [];

			if (canViewDashboard) {
				tasks.push(
					apiFetch<DashboardReport>(`/api/admin/reports/dashboard${q}`).then((r) => {
						dashboard = r;
					})
				);
				tasks.push(
					apiFetch<TopDriversReport>(
						`/api/admin/reports/top-drivers${toQuery({ from, to, per_page: 10 })}`
					).then((r) => {
						topDrivers = r;
					})
				);
			}
			if (canViewSales) {
				tasks.push(
					apiFetch<SalesReport>(`/api/admin/reports/sales${q}`).then((r) => {
						sales = r;
					})
				);
			}
			await Promise.all(tasks);
		} catch (err) {
			toast.error(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (session.ready && session.user && (canViewDashboard || canViewSales)) {
			loadAll();
		}
	});

	const statusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
		searching: { label: 'Mencari Driver', variant: 'warning' },
		accepted: { label: 'Diterima', variant: 'info' },
		arrived: { label: 'Tiba di Jemput', variant: 'info' },
		in_progress: { label: 'Dalam Perjalanan', variant: 'info' },
		completed: { label: 'Selesai', variant: 'success' },
		cancelled: { label: 'Dibatalkan', variant: 'danger' }
	};

	let maxDailyGross = $derived(
		Math.max(1, ...(sales?.daily ?? []).map((d) => d.gross))
	);
</script>

<PageHeader
	title="Ringkasan & Analitik Operasional"
	description="Metrik langsung dari database produksi berdasarkan rentang tanggal."
>
	{#snippet actions()}
		<div class="flex flex-wrap items-center gap-2 text-xs">
			<label class="flex items-center gap-1.5">
				<span class="text-slate-500">Dari:</span>
				<input
					type="date"
					bind:value={from}
					class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5"
				/>
			</label>
			<label class="flex items-center gap-1.5">
				<span class="text-slate-500">Sampai:</span>
				<input
					type="date"
					bind:value={to}
					class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5"
				/>
			</label>
			<button
				type="button"
				onclick={loadAll}
				disabled={loading}
				class="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 py-1.5 font-medium text-white"
			>
				{loading ? 'Memuat...' : 'Terapkan'}
			</button>
		</div>
	{/snippet}
</PageHeader>

{#if canViewDashboard && dashboard}
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
		<KpiCard
			label="Order Selesai"
			value={formatNumber(dashboard.completed.total)}
			subtext="Dalam rentang terpilih"
			accent="emerald"
		/>
		<KpiCard
			label="Pendapatan Kotor (GTV)"
			value={formatIDR(dashboard.completed.gross_revenue)}
			subtext="Order berstatus completed"
			accent="emerald"
		/>
		<KpiCard
			label="Rata-rata Tarif"
			value={formatIDR(dashboard.completed.avg_fare)}
			subtext="Per perjalanan selesai"
			accent="sky"
		/>
		<KpiCard
			label="Rata-rata Jarak"
			value={`${formatNumber(dashboard.completed.avg_distance)} km`}
			subtext="Jarak perjalanan selesai"
			accent="sky"
		/>
		<KpiCard
			label="Driver Aktif & Terverifikasi"
			value={formatNumber(dashboard.active_drivers)}
			subtext="Siap beroperasi (KYC approved)"
			accent="amber"
		/>
		<KpiCard
			label="Total Penumpang"
			value={formatNumber(dashboard.total_customers)}
			subtext="Akun role customer"
			accent="default"
		/>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
		<!-- Distribusi Status Order -->
		<div
			class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
		>
			<div class="flex items-center justify-between mb-4">
				<div>
					<h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100">
						Distribusi Status Order
					</h2>
					<p class="text-xs text-slate-500">Order dibuat pada periode {from} s/d {to}</p>
				</div>
				{#if session.has('orders.view')}
					<a
						href="/orders"
						class="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
					>
						Buka Manajemen Order →
					</a>
				{/if}
			</div>

			{#if !dashboard.orders_by_status || dashboard.orders_by_status.length === 0}
				<p class="py-8 text-center text-xs text-slate-400">
					Belum ada order pada rentang tanggal ini.
				</p>
			{:else}
				{@const totalAll = dashboard.orders_by_status.reduce((s, r) => s + r.count, 0)}
				<div class="space-y-3">
					{#each dashboard.orders_by_status as row}
						{@const meta = statusLabels[row.status] ?? { label: row.status, variant: 'neutral' }}
						{@const pct = totalAll > 0 ? Math.round((row.count / totalAll) * 100) : 0}
						<div>
							<div class="flex items-center justify-between text-xs mb-1">
								<Badge variant={meta.variant} label={meta.label} />
								<span class="font-medium text-slate-700 dark:text-slate-300">
									{formatNumber(row.count)} ({pct}%)
								</span>
							</div>
							<div class="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
								<div
									class="h-full rounded-full bg-emerald-500"
									style={`width: ${Math.max(2, pct)}%`}
								></div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Top Drivers -->
		<div
			class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
		>
			<div class="flex items-center justify-between mb-4">
				<div>
					<h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100">
						Performa Driver Teratas
					</h2>
					<p class="text-xs text-slate-500">Berdasarkan jumlah perjalanan selesai</p>
				</div>
				{#if session.has('drivers.view')}
					<a
						href="/drivers"
						class="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
					>
						Kelola Driver →
					</a>
				{/if}
			</div>

			{#if !topDrivers?.drivers || topDrivers.drivers.length === 0}
				<p class="py-8 text-center text-xs text-slate-400">
					Belum ada perjalanan selesai pada rentang ini.
				</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead>
							<tr class="border-b border-slate-200 dark:border-slate-800 text-slate-500">
								<th class="pb-2 font-medium">#</th>
								<th class="pb-2 font-medium">Driver</th>
								<th class="pb-2 font-medium text-right">Perjalanan</th>
								<th class="pb-2 font-medium text-right">Pendapatan Bersih</th>
								<th class="pb-2 font-medium text-right">Rating</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100 dark:divide-slate-800/70">
							{#each topDrivers.drivers as d, i}
								<tr>
									<td class="py-2 text-slate-400">{i + 1}</td>
									<td class="py-2 font-medium text-slate-900 dark:text-slate-100">
										{d.name}
										<span class="text-slate-400 font-normal">#{d.driver_id}</span>
									</td>
									<td class="py-2 text-right font-semibold">{formatNumber(d.trips)}</td>
									<td class="py-2 text-right">{formatIDR(d.earning)}</td>
									<td class="py-2 text-right">
										{d.rating > 0 ? `★ ${d.rating.toFixed(2)}` : '—'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
{/if}

{#if canViewSales && sales}
	<div
		class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
	>
		<div class="mb-4">
			<h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100">
				Tren Penjualan & Komisi Harian (Sales Report)
			</h2>
			<p class="text-xs text-slate-500">
				Rekap harian order selesai (`GET /api/admin/reports/sales`)
			</p>
		</div>

		{#if !sales.daily || sales.daily.length === 0}
			<p class="py-8 text-center text-xs text-slate-400">
				Tidak ada data penjualan pada rentang tanggal ini.
			</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead>
						<tr class="border-b border-slate-200 dark:border-slate-800 text-slate-500">
							<th class="pb-2 font-medium">Tanggal</th>
							<th class="pb-2 font-medium text-right">Order Selesai</th>
							<th class="pb-2 font-medium text-right">Pendapatan Kotor</th>
							<th class="pb-2 font-medium text-right">Komisi Platform</th>
							<th class="pb-2 pl-4 font-medium w-48">Volume</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-800/70">
						{#each sales.daily as row}
							<tr>
								<td class="py-2 font-mono">{row.day}</td>
								<td class="py-2 text-right font-medium">{formatNumber(row.orders)}</td>
								<td class="py-2 text-right font-medium text-slate-900 dark:text-slate-100">
									{formatIDR(row.gross)}
								</td>
								<td class="py-2 text-right text-emerald-600 dark:text-emerald-400 font-medium">
									{formatIDR(row.platform_fee)}
								</td>
								<td class="py-2 pl-4">
									<div class="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
										<div
											class="h-2 rounded-full bg-emerald-500"
											style={`width: ${Math.max(3, Math.round((row.gross / maxDailyGross) * 100))}%`}
										></div>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
{/if}

