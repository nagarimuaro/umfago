<script lang="ts">
	import { apiFetch, session, toQuery } from '#lib/session.svelte';
	import { formatDateTime } from '#lib/format';
	import { toast } from '#lib/toast.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import type { PageMeta, RiskCaseEntity } from '#lib/types';

	let cases = $state<RiskCaseEntity[]>([]);
	let meta = $state<PageMeta>({ page: 1, per_page: 20, total: 0 });
	let loading = $state(false);
	let busy = $state(false);
	let statusFilter = $state('');

	let activeCase = $state<RiskCaseEntity | null>(null);
	let targetStatus = $state<RiskCaseEntity['status']>('confirmed');
	let actionTaken = $state('');

	async function loadCases(page = 1) {
		loading = true;
		try {
			const res = await apiFetch<{ cases: RiskCaseEntity[]; meta: PageMeta }>(
				`/api/admin/risk/cases${toQuery({ page, per_page: meta.per_page, status: statusFilter })}`
			);
			cases = res.cases ?? [];
			meta = res.meta;
		} catch (err) {
			toast.error(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (session.ready && session.has('orders.view')) loadCases(1);
	});

	async function submitCaseUpdate(e: SubmitEvent) {
		e.preventDefault();
		if (!activeCase) return;
		busy = true;
		try {
			await apiFetch(`/api/admin/risk/cases/${activeCase.id}`, {
				method: 'PUT',
				json: {
					status: targetStatus,
					action_taken: actionTaken.trim()
				}
			});
			toast.success('Hasil investigasi kecurangan disimpan.');
			activeCase = null;
			await loadCases(meta.page);
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}

	const severityBadge: Record<RiskCaseEntity['severity'], { label: string; variant: 'neutral' | 'info' | 'warning' | 'danger' }> = {
		low: { label: 'Rendah', variant: 'neutral' },
		medium: { label: 'Sedang', variant: 'info' },
		high: { label: 'Tinggi', variant: 'warning' },
		critical: { label: 'Kritis', variant: 'danger' }
	};
</script>

<PageHeader
	title="Risk & Fraud Management"
	description="Pusat deteksi kecurangan sistem: pemalsuan GPS (fake GPS), penyalahgunaan promo, pesanan fiktif, dan rute abnormal (§15)."
/>

<div class="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs">
	<div>
		<label for="rc-st" class="block font-medium text-slate-600 dark:text-slate-400 mb-1">Status Investigasi</label>
		<select id="rc-st" bind:value={statusFilter} class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5">
			<option value="">Semua Kasus</option>
			<option value="open">Terbuka / Baru (open)</option>
			<option value="investigating">Sedang Diinvestigasi</option>
			<option value="confirmed">Kecurangan Terkonfirmasi</option>
			<option value="dismissed">Ditolak / Lolos</option>
		</select>
	</div>
	<button type="button" onclick={() => loadCases(1)} class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 font-medium text-white">
		Filter
	</button>
</div>

<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
	<div class="overflow-x-auto">
		<table class="w-full text-left text-xs">
			<thead>
				<tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
					<th class="px-4 py-3 font-medium">Kasus & Jenis Kecurangan</th>
					<th class="px-4 py-3 font-medium">Skor Risiko</th>
					<th class="px-4 py-3 font-medium">Tingkat Keparahan</th>
					<th class="px-4 py-3 font-medium">Entitas Terkait</th>
					<th class="px-4 py-3 font-medium">Status & Tindakan</th>
					<th class="px-4 py-3 font-medium text-right">Tindakan</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
				{#if loading && cases.length === 0}
					<tr><td colspan="6" class="px-4 py-10 text-center text-slate-400">Memuat berkas kecurangan...</td></tr>
				{:else if cases.length === 0}
					<tr><td colspan="6" class="px-4 py-10 text-center text-slate-400">Tidak ada kasus kecurangan terdeteksi.</td></tr>
				{:else}
					{#each cases as c (c.id)}
						{@const sev = severityBadge[c.severity] ?? { label: c.severity, variant: 'neutral' }}
						<tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
							<td class="px-4 py-3">
								<div class="font-semibold text-slate-900 dark:text-slate-100">#{c.id} · {c.risk_type.replace('_', ' ')}</div>
								<div class="text-[11px] text-slate-500 mt-0.5">{c.summary || 'Deteksi anomali otomatis sistem'}</div>
								<div class="text-[10px] text-slate-400 mt-0.5">{formatDateTime(c.created_at)}</div>
							</td>
							<td class="px-4 py-3">
								<span class="inline-flex items-center rounded px-2 py-0.5 font-mono font-bold {c.risk_score >= 75 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}">
									{c.risk_score} / 100
								</span>
							</td>
							<td class="px-4 py-3"><Badge variant={sev.variant} label={sev.label} /></td>
							<td class="px-4 py-3">
								<div>User #{c.user_id}</div>
								{#if c.order_uuid}
									<div class="font-mono text-[11px] text-slate-400">{c.order_uuid.slice(0, 8)}…</div>
								{/if}
							</td>
							<td class="px-4 py-3">
								<div class="font-medium capitalize">{c.status}</div>
								{#if c.action_taken}
									<div class="text-[11px] text-rose-600 dark:text-rose-400">{c.action_taken}</div>
								{/if}
							</td>
							<td class="px-4 py-3 text-right">
								<button
									type="button"
									onclick={() => {
										activeCase = c;
										targetStatus = c.status === 'open' ? 'investigating' : 'confirmed';
										actionTaken = c.action_taken || '';
									}}
									class="rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
								>
									Investigasi
								</button>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
	<Pagination page={meta.page} perPage={meta.per_page} total={meta.total} onChange={(p) => loadCases(p)} />
</div>

<Modal
	open={Boolean(activeCase)}
	title={`Investigasi Kasus Kecurangan #${activeCase?.id ?? ''}`}
	subtitle={activeCase?.risk_type ?? ''}
	onClose={() => (activeCase = null)}
>
	{#if activeCase}
		<form onsubmit={submitCaseUpdate} class="space-y-3 text-xs">
			<div class="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 space-y-1">
				<div>Skor Anomali: <strong class="text-rose-600">{activeCase.risk_score}/100</strong></div>
				<div>Ringkasan Deteksi: {activeCase.summary || 'Deteksi algoritma pola pesanan tidak wajar.'}</div>
			</div>
			<div>
				<label for="c-st" class="block font-medium mb-1">Keputusan Status</label>
				<select id="c-st" bind:value={targetStatus} class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
					<option value="investigating">Sedang Diinvestigasi</option>
					<option value="confirmed">Kecurangan Terkonfirmasi (Confirmed Fraud)</option>
					<option value="dismissed">Tolak / False Positive (Dismissed)</option>
				</select>
			</div>
			<div>
				<label for="c-act" class="block font-medium mb-1">Tindakan Eksekusi (Action Taken)</label>
				<input id="c-act" type="text" required bind:value={actionTaken} placeholder="Misal: Suspend akun driver permanen, blokir nomor rekening, batalkan bonus" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
			</div>
			<div class="flex justify-end gap-2 pt-1">
				<button type="button" onclick={() => (activeCase = null)} class="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 font-medium">Batal</button>
				<button type="submit" disabled={busy} class="rounded-lg bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 font-semibold text-white disabled:opacity-50">
					{busy ? 'Menyimpan...' : 'Simpan Keputusan'}
				</button>
			</div>
		</form>
	{/if}
</Modal>
