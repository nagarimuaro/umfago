<script lang="ts">
	import { apiFetch, session, toQuery } from '#lib/session.svelte';
	import { defaultDateRange, formatDateTime, formatIDR, formatNumber } from '#lib/format';
	import { toast } from '#lib/toast.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import KpiCard from '#lib/components/KpiCard.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import type { FinanceReport, PageMeta, TransactionStatus, WalletTransaction } from '#lib/types';

	const initial = defaultDateRange(30);
	let from = $state(initial.from);
	let to = $state(initial.to);

	let report = $state<FinanceReport | null>(null);
	let withdrawals = $state<WalletTransaction[]>([]);
	let wMeta = $state<PageMeta>({ page: 1, per_page: 20, total: 0 });
	let wStatus = $state<TransactionStatus>('PENDING');
	let loading = $state(false);
	let busy = $state(false);

	let rejectTarget = $state<WalletTransaction | null>(null);
	let rejectReason = $state('');

	let refundOpen = $state(false);
	let refundUserId = $state<number | null>(null);
	let refundAmount = $state<number>(0);
	let refundOrderUUID = $state('');
	let refundReason = $state('');

	let canReport = $derived(session.has('finance.view_report'));
	let canDisburse = $derived(session.has('finance.disbursement'));
	let canRefund = $derived(session.has('finance.refund'));

	async function loadReport() {
		if (!canReport) return;
		try {
			report = await apiFetch<FinanceReport>(`/api/admin/finance/report${toQuery({ from, to })}`);
		} catch (err) {
			toast.error(err);
		}
	}

	async function loadWithdrawals(page = 1) {
		if (!canReport) return;
		loading = true;
		try {
			const res = await apiFetch<{ withdrawals: WalletTransaction[]; meta: PageMeta }>(
				`/api/admin/finance/withdrawals${toQuery({ page, per_page: wMeta.per_page, status: wStatus })}`
			);
			withdrawals = res.withdrawals ?? [];
			wMeta = res.meta;
		} catch (err) {
			toast.error(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (session.ready && canReport) {
			loadReport();
			loadWithdrawals(1);
		}
	});

	async function disburse(w: WalletTransaction) {
		const note = prompt(
			`Konfirmasi pencairan ${formatIDR(w.amount)} ke ${w.bank_name ?? '?'} ${w.bank_account_number ?? ''} a.n. ${w.bank_account_name ?? '?'}.\n\nPastikan transfer bank SUDAH dilakukan. Catatan (opsional, mis. nomor referensi transfer):`
		);
		if (note === null) return;
		busy = true;
		try {
			await apiFetch(`/api/admin/finance/withdrawals/${w.id}/disburse`, {
				method: 'PUT',
				json: { note }
			});
			toast.success('Penarikan ditandai sudah dicairkan.');
			await Promise.all([loadWithdrawals(wMeta.page), loadReport()]);
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}

	async function submitReject(e: SubmitEvent) {
		e.preventDefault();
		if (!rejectTarget || !rejectReason.trim()) return;
		busy = true;
		try {
			await apiFetch(`/api/admin/finance/withdrawals/${rejectTarget.id}/reject`, {
				method: 'PUT',
				json: { reason: rejectReason.trim() }
			});
			toast.success('Penarikan ditolak, saldo dikembalikan ke pengguna.');
			rejectTarget = null;
			await Promise.all([loadWithdrawals(wMeta.page), loadReport()]);
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}

	async function submitRefund(e: SubmitEvent) {
		e.preventDefault();
		if (!refundUserId || refundAmount <= 0 || !refundReason.trim()) return;
		if (!confirm(`Kirim refund ${formatIDR(refundAmount)} ke user #${refundUserId}?`)) return;
		busy = true;
		try {
			await apiFetch('/api/admin/finance/refunds', {
				method: 'POST',
				json: {
					user_id: refundUserId,
					amount: refundAmount,
					order_uuid: refundOrderUUID.trim(),
					reason: refundReason.trim()
				}
			});
			toast.success(`Refund ${formatIDR(refundAmount)} berhasil dikreditkan.`);
			refundOpen = false;
			refundUserId = null;
			refundAmount = 0;
			refundOrderUUID = '';
			refundReason = '';
			await loadReport();
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}

	const txLabels: Record<string, string> = {
		DEPOSIT: 'Top Up',
		WITHDRAWAL: 'Penarikan (pending)',
		PAYMENT: 'Pembayaran Order',
		REFUND: 'Refund',
		EARNING: 'Pendapatan Driver',
		FEE: 'Potongan Platform',
		BONUS: 'Bonus',
		DISBURSED: 'Penarikan Dicairkan'
	};
</script>

<PageHeader
	title="Keuangan"
	description="Laporan arus dana, antrean pencairan penarikan, dan refund manual. Pencairan masih manual (transfer bank di luar sistem)."
>
	{#snippet actions()}
		{#if canRefund}
			<button
				type="button"
				onclick={() => (refundOpen = true)}
				class="rounded-lg bg-sky-600 hover:bg-sky-700 px-3 py-1.5 text-xs font-medium text-white"
			>
				Refund Manual
			</button>
		{/if}
	{/snippet}
</PageHeader>

{#if canReport}
	<div
		class="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs"
	>
		<label class="flex flex-col gap-1">
			<span class="font-medium text-slate-600 dark:text-slate-400">Dari</span>
			<input type="date" bind:value={from} class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5" />
		</label>
		<label class="flex flex-col gap-1">
			<span class="font-medium text-slate-600 dark:text-slate-400">Sampai</span>
			<input type="date" bind:value={to} class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5" />
		</label>
		<button type="button" onclick={loadReport} class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 font-medium text-white">
			Terapkan
		</button>
	</div>

	{#if report}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
			<KpiCard label="Order Selesai" value={formatNumber(report.orders.total)} accent="default" />
			<KpiCard label="Pendapatan Kotor" value={formatIDR(report.orders.gross_revenue)} accent="emerald" />
			<KpiCard label="Komisi Platform" value={formatIDR(report.orders.platform_fee)} accent="emerald" />
			<KpiCard label="Pendapatan Driver" value={formatIDR(report.orders.driver_earning)} accent="sky" />
			<KpiCard
				label="Penarikan Tertunda"
				value={formatIDR(report.pending_withdrawal)}
				subtext="Seluruh waktu, belum dicairkan"
				accent="amber"
			/>
		</div>

		<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 mb-6">
			<h2 class="text-sm font-semibold mb-3">Rekap Transaksi Dompet (status SUCCESS)</h2>
			{#if !report.wallet_by_type || report.wallet_by_type.length === 0}
				<p class="py-4 text-center text-xs text-slate-400">Tidak ada transaksi pada rentang ini.</p>
			{:else}
				<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
					{#each report.wallet_by_type as b}
						<div class="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
							<div class="text-slate-500">{txLabels[b.type] ?? b.type}</div>
							<div class="text-base font-semibold mt-0.5">{formatIDR(b.total)}</div>
							<div class="text-[11px] text-slate-400">{formatNumber(b.count)} transaksi</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
		<div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
			<h2 class="text-sm font-semibold">Antrean Penarikan</h2>
			<div class="flex gap-1 text-xs">
				{#each [['PENDING', 'Menunggu'], ['FAILED', 'Ditolak']] as [val, label]}
					<button
						type="button"
						onclick={() => {
							wStatus = val as TransactionStatus;
							loadWithdrawals(1);
						}}
						class="rounded-lg px-3 py-1 font-medium {wStatus === val
							? 'bg-emerald-600 text-white'
							: 'border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'}"
					>
						{label}
					</button>
				{/each}
			</div>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs">
				<thead>
					<tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
						<th class="px-4 py-3 font-medium">ID / Waktu</th>
						<th class="px-4 py-3 font-medium">User</th>
						<th class="px-4 py-3 font-medium">Rekening Tujuan</th>
						<th class="px-4 py-3 font-medium text-right">Nominal</th>
						<th class="px-4 py-3 font-medium">Catatan</th>
						<th class="px-4 py-3 font-medium text-right">Tindakan</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
					{#if loading && withdrawals.length === 0}
						<tr><td colspan="6" class="px-4 py-10 text-center text-slate-400">Memuat...</td></tr>
					{:else if withdrawals.length === 0}
						<tr><td colspan="6" class="px-4 py-10 text-center text-slate-400">Antrean kosong.</td></tr>
					{:else}
						{#each withdrawals as w (w.id)}
							<tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
								<td class="px-4 py-3">
									<div class="font-mono font-semibold">#{w.id}</div>
									<div class="text-[11px] text-slate-400">{formatDateTime(w.created_at)}</div>
								</td>
								<td class="px-4 py-3">User #{w.user_id}</td>
								<td class="px-4 py-3">
									<div class="font-medium">{w.bank_name || '—'}</div>
									<div class="font-mono">{w.bank_account_number || '—'}</div>
									<div class="text-slate-500">a.n. {w.bank_account_name || '—'}</div>
								</td>
								<td class="px-4 py-3 text-right font-semibold">{formatIDR(w.amount)}</td>
								<td class="px-4 py-3 text-slate-500 max-w-xs truncate" title={w.note}>{w.note || '—'}</td>
								<td class="px-4 py-3 text-right space-x-1 whitespace-nowrap">
									{#if w.status === 'PENDING' && canDisburse}
										<button
											type="button"
											disabled={busy}
											onclick={() => disburse(w)}
											class="rounded-md bg-emerald-600 hover:bg-emerald-700 px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
										>
											Cairkan
										</button>
										<button
											type="button"
											disabled={busy}
											onclick={() => {
												rejectTarget = w;
												rejectReason = '';
											}}
											class="rounded-md bg-rose-600 hover:bg-rose-700 px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
										>
											Tolak
										</button>
									{:else if w.status === 'PENDING'}
										<Badge variant="warning" label="Butuh Kepala Keuangan" />
									{:else}
										<Badge variant="danger" label="Ditolak" />
									{/if}
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
		<Pagination page={wMeta.page} perPage={wMeta.per_page} total={wMeta.total} onChange={(p) => loadWithdrawals(p)} />
	</div>
{:else}
	<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm text-slate-500">
		Peran Anda hanya memegang izin refund. Gunakan tombol <strong>Refund Manual</strong> di atas.
	</div>
{/if}

<Modal
	open={Boolean(rejectTarget)}
	title="Tolak Penarikan"
	subtitle={rejectTarget ? `#${rejectTarget.id} — ${formatIDR(rejectTarget.amount)} akan dikembalikan ke saldo user.` : ''}
	onClose={() => (rejectTarget = null)}
>
	<form onsubmit={submitReject} class="space-y-4 text-xs">
		<textarea
			rows="3"
			required
			bind:value={rejectReason}
			placeholder="Alasan penolakan (wajib, dikirim ke pengguna)"
			class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5"
		></textarea>
		<div class="flex justify-end gap-2">
			<button type="button" onclick={() => (rejectTarget = null)} class="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 font-medium">Batal</button>
			<button type="submit" disabled={busy || !rejectReason.trim()} class="rounded-lg bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 font-medium text-white disabled:opacity-50">
				Tolak & Kembalikan Dana
			</button>
		</div>
	</form>
</Modal>

<Modal
	open={refundOpen}
	title="Refund Manual"
	subtitle="Kredit saldo dompet pengguna sebagai transaksi REFUND. Tercatat dengan ID Anda sebagai pelaku."
	onClose={() => (refundOpen = false)}
>
	<form onsubmit={submitRefund} class="space-y-3 text-xs">
		<div class="grid grid-cols-2 gap-3">
			<label class="flex flex-col gap-1">
				<span class="font-medium">ID User</span>
				<input type="number" min="1" required bind:value={refundUserId} class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
			</label>
			<label class="flex flex-col gap-1">
				<span class="font-medium">Nominal (IDR)</span>
				<input type="number" min="1" required bind:value={refundAmount} class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
			</label>
		</div>
		<label class="flex flex-col gap-1">
			<span class="font-medium">UUID Order (opsional)</span>
			<input type="text" bind:value={refundOrderUUID} class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono" />
		</label>
		<label class="flex flex-col gap-1">
			<span class="font-medium">Alasan</span>
			<textarea rows="2" required bind:value={refundReason} class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5"></textarea>
		</label>
		<div class="flex justify-end gap-2 pt-1">
			<button type="button" onclick={() => (refundOpen = false)} class="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 font-medium">Batal</button>
			<button
				type="submit"
				disabled={busy || !refundUserId || refundAmount <= 0 || !refundReason.trim()}
				class="rounded-lg bg-sky-600 hover:bg-sky-700 px-3.5 py-1.5 font-medium text-white disabled:opacity-50"
			>
				Proses Refund
			</button>
		</div>
	</form>
</Modal>
