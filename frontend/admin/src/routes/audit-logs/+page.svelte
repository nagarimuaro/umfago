<script lang="ts">
	import { apiFetch, session, toQuery } from '#lib/session.svelte';
	import { formatDateTime } from '#lib/format';
	import { toast } from '#lib/toast.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import type { AuditLogEntity, PageMeta } from '#lib/types';

	let logs = $state<AuditLogEntity[]>([]);
	let meta = $state<PageMeta>({ page: 1, per_page: 20, total: 0 });
	let loading = $state(false);
	let moduleFilter = $state('');

	async function loadLogs(page = 1) {
		loading = true;
		try {
			const res = await apiFetch<{ logs: AuditLogEntity[]; meta: PageMeta }>(
				`/api/admin/audit-logs${toQuery({ page, per_page: meta.per_page, module: moduleFilter })}`
			);
			logs = res.logs ?? [];
			meta = res.meta;
		} catch (err) {
			toast.error(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (session.ready && session.has('settings.manage')) loadLogs(1);
	});
</script>

<PageHeader
	title="Audit Logs"
	description="Catatan abadi seluruh aktivitas operasional back-office, perubahan status akun, modifikasi tarif, dan alur persetujuan (§21)."
/>

<div class="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs">
	<div>
		<label for="al-mod" class="block font-medium text-slate-600 dark:text-slate-400 mb-1">Filter Modul</label>
		<select id="al-mod" bind:value={moduleFilter} class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5">
			<option value="">Semua Modul</option>
			<option value="cities">Kota / Cabang</option>
			<option value="zones">Geofence / Zona</option>
			<option value="services">Layanan & Tarif</option>
			<option value="feature_flags">Feature Flags</option>
			<option value="support">Customer Support</option>
			<option value="risk">Risk & Fraud</option>
			<option value="approvals">Alur Persetujuan</option>
		</select>
	</div>
	<button type="button" onclick={() => loadLogs(1)} class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 font-medium text-white">
		Filter
	</button>
</div>

<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
	<div class="overflow-x-auto">
		<table class="w-full text-left text-xs">
			<thead>
				<tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
					<th class="px-4 py-3 font-medium">Waktu</th>
					<th class="px-4 py-3 font-medium">Pelaku (Admin)</th>
					<th class="px-4 py-3 font-medium">Modul & Aksi</th>
					<th class="px-4 py-3 font-medium">Target</th>
					<th class="px-4 py-3 font-medium">Keterangan</th>
					<th class="px-4 py-3 font-medium text-right">IP Address</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
				{#if loading && logs.length === 0}
					<tr><td colspan="6" class="px-4 py-10 text-center text-slate-400">Memuat log audit...</td></tr>
				{:else if logs.length === 0}
					<tr><td colspan="6" class="px-4 py-10 text-center text-slate-400">Belum ada jejak audit tercatat.</td></tr>
				{:else}
					{#each logs as l (l.id)}
						<tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
							<td class="px-4 py-3 whitespace-nowrap text-slate-500">{formatDateTime(l.created_at)}</td>
							<td class="px-4 py-3">
								<div class="font-semibold text-slate-900 dark:text-slate-100">{l.actor_email || `#${l.actor_id}`}</div>
								<div class="text-[11px] text-slate-400">{l.actor_role}</div>
							</td>
							<td class="px-4 py-3">
								<span class="font-mono text-emerald-600 dark:text-emerald-400 uppercase font-bold">{l.action}</span>
								<div class="text-slate-500 capitalize">{l.module}</div>
							</td>
							<td class="px-4 py-3 font-mono">{l.target_type}: {l.target_id}</td>
							<td class="px-4 py-3 max-w-sm truncate text-slate-700 dark:text-slate-300" title={l.summary}>{l.summary}</td>
							<td class="px-4 py-3 text-right font-mono text-slate-400">{l.ip_address}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
	<Pagination page={meta.page} perPage={meta.per_page} total={meta.total} onChange={(p) => loadLogs(p)} />
</div>
