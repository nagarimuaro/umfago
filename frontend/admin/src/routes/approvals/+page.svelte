<script lang="ts">
	import { apiFetch, session, toQuery } from '#lib/session.svelte';
	import { formatDateTime } from '#lib/format';
	import { toast } from '#lib/toast.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import type { ApprovalRequestEntity, PageMeta } from '#lib/types';

	let approvals = $state<ApprovalRequestEntity[]>([]);
	let meta = $state<PageMeta>({ page: 1, per_page: 20, total: 0 });
	let loading = $state(false);
	let busy = $state(false);
	let statusFilter = $state('');

	let activeReq = $state<ApprovalRequestEntity | null>(null);
	let reviewNote = $state('');

	async function loadApprovals(page = 1) {
		loading = true;
		try {
			const res = await apiFetch<{ approvals: ApprovalRequestEntity[]; meta: PageMeta }>(
				`/api/admin/approvals${toQuery({ page, per_page: meta.per_page, status: statusFilter })}`
			);
			approvals = res.approvals ?? [];
			meta = res.meta;
		} catch (err) {
			toast.error(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (session.ready && session.has('settings.manage')) loadApprovals(1);
	});

	async function decide(status: 'approved' | 'rejected') {
		if (!activeReq) return;
		busy = true;
		try {
			await apiFetch(`/api/admin/approvals/${activeReq.id}`, {
				method: 'PUT',
				json: { status, review_note: reviewNote.trim() }
			});
			toast.success(status === 'approved' ? 'Permintaan disetujui.' : 'Permintaan ditolak.');
			activeReq = null;
			await loadApprovals(meta.page);
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}

	const statusMeta: Record<ApprovalRequestEntity['status'], { label: string; variant: 'warning' | 'success' | 'danger' }> = {
		pending: { label: 'Menunggu Persetujuan', variant: 'warning' },
		approved: { label: 'Disetujui', variant: 'success' },
		rejected: { label: 'Ditolak', variant: 'danger' }
	};
</script>

<PageHeader
	title="Approval Workflows (Maker-Checker)"
	description="Mekanisme persetujuan ganda untuk perubahan sensitif: tarif, refund bernilai tinggi, disbursement besar, dan alokasi peran admin (§17.3)."
/>

<div class="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs">
	<div>
		<label for="ap-st" class="block font-medium text-slate-600 dark:text-slate-400 mb-1">Status Persetujuan</label>
		<select id="ap-st" bind:value={statusFilter} class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5">
			<option value="">Semua Permintaan</option>
			<option value="pending">Menunggu Keputusan (pending)</option>
			<option value="approved">Telah Disetujui (approved)</option>
			<option value="rejected">Telah Ditolak (rejected)</option>
		</select>
	</div>
	<button type="button" onclick={() => loadApprovals(1)} class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 font-medium text-white">
		Filter
	</button>
</div>

<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
	<div class="overflow-x-auto">
		<table class="w-full text-left text-xs">
			<thead>
				<tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
					<th class="px-4 py-3 font-medium">Modul & Tindakan</th>
					<th class="px-4 py-3 font-medium">Pemohon</th>
					<th class="px-4 py-3 font-medium">Alasan / Catatan</th>
					<th class="px-4 py-3 font-medium">Status</th>
					<th class="px-4 py-3 font-medium text-right">Tindakan</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
				{#if loading && approvals.length === 0}
					<tr><td colspan="5" class="px-4 py-10 text-center text-slate-400">Memuat berkas persetujuan...</td></tr>
				{:else if approvals.length === 0}
					<tr><td colspan="5" class="px-4 py-10 text-center text-slate-400">Tidak ada alur persetujuan pending.</td></tr>
				{:else}
					{#each approvals as a (a.id)}
						{@const st = statusMeta[a.status] ?? { label: a.status, variant: 'warning' }}
						<tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
							<td class="px-4 py-3">
								<div class="font-semibold text-slate-900 dark:text-slate-100">{a.action}</div>
								<div class="font-mono text-[11px] text-slate-400 capitalize">{a.module} · Target #{a.target_id}</div>
								<div class="text-[10px] text-slate-400 mt-0.5">{formatDateTime(a.created_at)}</div>
							</td>
							<td class="px-4 py-3">User #{a.requested_by}</td>
							<td class="px-4 py-3 max-w-xs truncate text-slate-500" title={a.reason}>{a.reason || '—'}</td>
							<td class="px-4 py-3"><Badge variant={st.variant} label={st.label} /></td>
							<td class="px-4 py-3 text-right">
								{#if a.status === 'pending'}
									<button
										type="button"
										onclick={() => {
											activeReq = a;
											reviewNote = '';
										}}
										class="rounded-md bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white"
									>
										Tinjau & Putuskan
									</button>
								{:else}
									<span class="text-slate-400 italic">Selesai #{a.reviewed_by}</span>
								{/if}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
	<Pagination page={meta.page} perPage={meta.per_page} total={meta.total} onChange={(p) => loadApprovals(p)} />
</div>

<Modal
	open={Boolean(activeReq)}
	title={`Keputusan Alur Persetujuan #${activeReq?.id ?? ''}`}
	subtitle={activeReq?.action ?? ''}
	onClose={() => (activeReq = null)}
>
	{#if activeReq}
		<div class="space-y-3 text-xs">
			<div class="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 space-y-1">
				<div>Modul: <strong>{activeReq.module}</strong></div>
				<div>Target ID: <code class="font-mono">{activeReq.target_id}</code></div>
				<div>Alasan Pemohon: <em>{activeReq.reason || 'Tidak ada alasan dicantumkan.'}</em></div>
			</div>
			<div>
				<label for="ap-note" class="block font-medium mb-1">Catatan Keputusan</label>
				<input id="ap-note" type="text" bind:value={reviewNote} placeholder="Catatan persetujuan / penolakan..." class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
			</div>
			<div class="flex justify-end gap-2 pt-2">
				<button type="button" disabled={busy} onclick={() => decide('rejected')} class="rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1.5 font-semibold text-white disabled:opacity-50">
					Tolak
				</button>
				<button type="button" disabled={busy} onclick={() => decide('approved')} class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 font-semibold text-white disabled:opacity-50">
					Setujui
				</button>
			</div>
		</div>
	{/if}
</Modal>
