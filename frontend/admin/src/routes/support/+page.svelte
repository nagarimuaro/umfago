<script lang="ts">
	import { apiFetch, session, toQuery } from '#lib/session.svelte';
	import { formatDateTime } from '#lib/format';
	import { toast } from '#lib/toast.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import type { PageMeta, SupportTicketEntity } from '#lib/types';

	let tickets = $state<SupportTicketEntity[]>([]);
	let meta = $state<PageMeta>({ page: 1, per_page: 20, total: 0 });
	let loading = $state(false);
	let busy = $state(false);
	let statusFilter = $state('');
	let priorityFilter = $state('');

	let activeTicket = $state<SupportTicketEntity | null>(null);
	let resolveNote = $state('');
	let targetStatus = $state<SupportTicketEntity['status']>('resolved');

	async function loadTickets(page = 1) {
		loading = true;
		try {
			const res = await apiFetch<{ tickets: SupportTicketEntity[]; meta: PageMeta }>(
				`/api/admin/support/tickets${toQuery({ page, per_page: meta.per_page, status: statusFilter, priority: priorityFilter })}`
			);
			tickets = res.tickets ?? [];
			meta = res.meta;
		} catch (err) {
			toast.error(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (session.ready && session.has('orders.view')) loadTickets(1);
	});

	async function submitUpdate(e: SubmitEvent) {
		e.preventDefault();
		if (!activeTicket) return;
		busy = true;
		try {
			await apiFetch(`/api/admin/support/tickets/${activeTicket.id}`, {
				method: 'PUT',
				json: {
					status: targetStatus,
					resolution_note: resolveNote.trim()
				}
			});
			toast.success('Tiket berhasil diperbarui.');
			activeTicket = null;
			await loadTickets(meta.page);
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}

	const priorityBadge: Record<SupportTicketEntity['priority'], { label: string; variant: 'neutral' | 'info' | 'warning' | 'danger' }> = {
		low: { label: 'Rendah', variant: 'neutral' },
		medium: { label: 'Sedang', variant: 'info' },
		high: { label: 'Tinggi', variant: 'warning' },
		critical: { label: 'Kritis', variant: 'danger' }
	};

	const statusBadge: Record<SupportTicketEntity['status'], { label: string; variant: 'neutral' | 'info' | 'success' | 'warning' }> = {
		open: { label: 'Terbuka', variant: 'warning' },
		in_progress: { label: 'Diproses', variant: 'info' },
		resolved: { label: 'Selesai', variant: 'success' },
		closed: { label: 'Ditutup', variant: 'neutral' }
	};
</script>

<PageHeader
	title="Customer Support & Dispute Management"
	description="Kelola komplain penumpang/driver, sengketa tarif/perjalanan, dan pantau penyelesaian SLA (§14)."
/>

<div class="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs">
	<div>
		<label for="t-st" class="block font-medium text-slate-600 dark:text-slate-400 mb-1">Status Tiket</label>
		<select id="t-st" bind:value={statusFilter} class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5">
			<option value="">Semua Status</option>
			<option value="open">Terbuka (open)</option>
			<option value="in_progress">Sedang Diproses</option>
			<option value="resolved">Selesai (resolved)</option>
			<option value="closed">Ditutup (closed)</option>
		</select>
	</div>
	<div>
		<label for="t-pr" class="block font-medium text-slate-600 dark:text-slate-400 mb-1">Prioritas</label>
		<select id="t-pr" bind:value={priorityFilter} class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5">
			<option value="">Semua Prioritas</option>
			<option value="critical">Kritis (critical)</option>
			<option value="high">Tinggi (high)</option>
			<option value="medium">Sedang (medium)</option>
			<option value="low">Rendah (low)</option>
		</select>
	</div>
	<button type="button" onclick={() => loadTickets(1)} class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 font-medium text-white">
		Filter
	</button>
</div>

<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
	<div class="overflow-x-auto">
		<table class="w-full text-left text-xs">
			<thead>
				<tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
					<th class="px-4 py-3 font-medium">Tiket & Subjek</th>
					<th class="px-4 py-3 font-medium">Pelapor / Order</th>
					<th class="px-4 py-3 font-medium">Kategori</th>
					<th class="px-4 py-3 font-medium">Prioritas</th>
					<th class="px-4 py-3 font-medium">Status</th>
					<th class="px-4 py-3 font-medium text-right">Tindakan</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
				{#if loading && tickets.length === 0}
					<tr><td colspan="6" class="px-4 py-10 text-center text-slate-400">Memuat tiket...</td></tr>
				{:else if tickets.length === 0}
					<tr><td colspan="6" class="px-4 py-10 text-center text-slate-400">Tidak ada tiket sengketa.</td></tr>
				{:else}
					{#each tickets as t (t.id)}
						{@const pb = priorityBadge[t.priority] ?? { label: t.priority, variant: 'neutral' }}
						{@const sb = statusBadge[t.status] ?? { label: t.status, variant: 'neutral' }}
						<tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
							<td class="px-4 py-3">
								<div class="font-semibold text-slate-900 dark:text-slate-100">#{t.id} · {t.subject}</div>
								<div class="text-[11px] text-slate-400 mt-0.5">{formatDateTime(t.created_at)}</div>
							</td>
							<td class="px-4 py-3">
								<div>User #{t.user_id}</div>
								{#if t.order_uuid}
									<div class="font-mono text-[11px] text-emerald-600">{t.order_uuid.slice(0, 8)}…</div>
								{/if}
							</td>
							<td class="px-4 py-3 capitalize">{t.category.replace('_', ' ')}</td>
							<td class="px-4 py-3"><Badge variant={pb.variant} label={pb.label} /></td>
							<td class="px-4 py-3"><Badge variant={sb.variant} label={sb.label} /></td>
							<td class="px-4 py-3 text-right">
								<button
									type="button"
									onclick={() => {
										activeTicket = t;
										targetStatus = t.status === 'open' ? 'in_progress' : 'resolved';
										resolveNote = t.resolution_note || '';
									}}
									class="rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
								>
									Tindak Lanjuti
								</button>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
	<Pagination page={meta.page} perPage={meta.per_page} total={meta.total} onChange={(p) => loadTickets(p)} />
</div>

<Modal
	open={Boolean(activeTicket)}
	title={`Tindak Lanjut Tiket #${activeTicket?.id ?? ''}`}
	subtitle={activeTicket?.subject ?? ''}
	onClose={() => (activeTicket = null)}
>
	{#if activeTicket}
		<form onsubmit={submitUpdate} class="space-y-3 text-xs">
			<div class="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 text-slate-600 dark:text-slate-300">
				<strong>Deskripsi Masalah:</strong>
				<p class="mt-1">{activeTicket.description || 'Tidak ada keterangan tambahan.'}</p>
			</div>
			<div>
				<label for="tk-stat" class="block font-medium mb-1">Ubah Status</label>
				<select id="tk-stat" bind:value={targetStatus} class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
					<option value="in_progress">Sedang Diproses (in_progress)</option>
					<option value="resolved">Selesai / Resolusi Diberikan (resolved)</option>
					<option value="closed">Tutup Tiket (closed)</option>
				</select>
			</div>
			<div>
				<label for="tk-note" class="block font-medium mb-1">Catatan Resolusi</label>
				<textarea id="tk-note" rows="3" required bind:value={resolveNote} placeholder="Keterangan tindakan yang telah diambil oleh CS..." class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5"></textarea>
			</div>
			<div class="flex justify-end gap-2 pt-1">
				<button type="button" onclick={() => (activeTicket = null)} class="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 font-medium">Batal</button>
				<button type="submit" disabled={busy} class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 font-semibold text-white disabled:opacity-50">
					{busy ? 'Menyimpan...' : 'Perbarui Tiket'}
				</button>
			</div>
		</form>
	{/if}
</Modal>
