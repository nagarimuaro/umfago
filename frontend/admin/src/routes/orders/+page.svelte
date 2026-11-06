<script lang="ts">
	import { apiFetch, session, toQuery } from '#lib/session.svelte';
	import { formatDateTime, formatIDR, formatNumber } from '#lib/format';
	import { toast } from '#lib/toast.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import type { OrderEntity, OrderStatus, PageMeta } from '#lib/types';

	let orders = $state<OrderEntity[]>([]);
	let meta = $state<PageMeta>({ page: 1, per_page: 20, total: 0 });
	let loading = $state(false);

	let statusFilter = $state<string>('');
	let fromDate = $state<string>('');
	let toDate = $state<string>('');

	// Detail & aksi modal
	let selectedOrder = $state<OrderEntity | null>(null);
	let cancelTarget = $state<OrderEntity | null>(null);
	let cancelReason = $state('');
	let actionBusy = $state(false);

	let canCancel = $derived(session.has('orders.cancel_any'));
	let canForceComplete = $derived(session.has('orders.force_complete'));

	async function loadOrders(page = 1) {
		loading = true;
		try {
			const q = toQuery({
				page,
				per_page: meta.per_page,
				status: statusFilter,
				from: fromDate,
				to: toDate ? `${toDate}T23:59:59Z` : ''
			});
			const res = await apiFetch<{ orders: OrderEntity[]; meta: PageMeta }>(
				`/api/admin/orders${q}`
			);
			orders = res.orders ?? [];
			meta = res.meta ?? { page, per_page: 20, total: 0 };
		} catch (err) {
			toast.error(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (session.ready && session.has('orders.view')) {
			loadOrders(1);
		}
	});

	async function submitCancel(e: SubmitEvent) {
		e.preventDefault();
		if (!cancelTarget) return;
		actionBusy = true;
		try {
			const res = await apiFetch<{ message: string; refunded: number }>(
				`/api/admin/orders/${cancelTarget.uuid}/cancel`,
				{
					method: 'PUT',
					json: { reason: cancelReason.trim() }
				}
			);
			toast.success(
				res.refunded > 0
					? `Order dibatalkan. Dana dompet dikembalikan ${formatIDR(res.refunded)}.`
					: 'Order berhasil dibatalkan.'
			);
			cancelTarget = null;
			cancelReason = '';
			await loadOrders(meta.page);
		} catch (err) {
			toast.error(err);
		} finally {
			actionBusy = false;
		}
	}

	async function handleForceComplete(order: OrderEntity) {
		if (!confirm(`Paksa selesaikan order ${order.uuid}? Pembagian pendapatan driver akan dijalankan.`))
			return;
		actionBusy = true;
		try {
			await apiFetch(`/api/admin/orders/${order.uuid}/force-complete`, { method: 'PUT' });
			toast.success('Order berhasil dipaksa selesai.');
			await loadOrders(meta.page);
		} catch (err) {
			toast.error(err);
		} finally {
			actionBusy = false;
		}
	}

	const statusBadge: Record<
		OrderStatus,
		{ label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }
	> = {
		searching: { label: 'Mencari Driver', variant: 'warning' },
		accepted: { label: 'Diterima', variant: 'info' },
		arrived: { label: 'Tiba Jemput', variant: 'info' },
		in_progress: { label: 'Dalam Perjalanan', variant: 'info' },
		completed: { label: 'Selesai', variant: 'success' },
		cancelled: { label: 'Dibatalkan', variant: 'danger' }
	};
</script>

<PageHeader
	title="Manajemen Order"
	description="Pantau perjalanan secara terpusat, batalkan order bermasalah, atau paksa selesai perjalanan menggantung."
>
	{#snippet actions()}
		<button
			type="button"
			onclick={() => loadOrders(meta.page)}
			disabled={loading}
			class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
		>
			{loading ? 'Memuat...' : 'Segarkan'}
		</button>
	{/snippet}
</PageHeader>

<!-- Filter bar -->
<div
	class="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs"
>
	<div>
		<label for="f-status" class="block font-medium text-slate-600 dark:text-slate-400 mb-1"
			>Status Order</label
		>
		<select
			id="f-status"
			bind:value={statusFilter}
			class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
		>
			<option value="">Semua Status</option>
			<option value="searching">Mencari Driver (searching)</option>
			<option value="accepted">Diterima (accepted)</option>
			<option value="arrived">Tiba di Jemput (arrived)</option>
			<option value="in_progress">Dalam Perjalanan (in_progress)</option>
			<option value="completed">Selesai (completed)</option>
			<option value="cancelled">Dibatalkan (cancelled)</option>
		</select>
	</div>

	<div>
		<label for="f-from" class="block font-medium text-slate-600 dark:text-slate-400 mb-1"
			>Dari Tanggal</label
		>
		<input
			id="f-from"
			type="date"
			bind:value={fromDate}
			class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
		/>
	</div>

	<div>
		<label for="f-to" class="block font-medium text-slate-600 dark:text-slate-400 mb-1"
			>Sampai Tanggal</label
		>
		<input
			id="f-to"
			type="date"
			bind:value={toDate}
			class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
		/>
	</div>

	<button
		type="button"
		onclick={() => loadOrders(1)}
		class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 font-medium text-white"
	>
		Terapkan Filter
	</button>

	{#if statusFilter || fromDate || toDate}
		<button
			type="button"
			onclick={() => {
				statusFilter = '';
				fromDate = '';
				toDate = '';
				loadOrders(1);
			}}
			class="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-slate-600 dark:text-slate-300"
		>
			Reset
		</button>
	{/if}
</div>

<!-- Data Table -->
<div
	class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs"
>
	<div class="overflow-x-auto">
		<table class="w-full text-left text-xs">
			<thead>
				<tr
					class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500"
				>
					<th class="px-4 py-3 font-medium">UUID & Waktu</th>
					<th class="px-4 py-3 font-medium">Penumpang / Driver</th>
					<th class="px-4 py-3 font-medium">Rute & Jarak</th>
					<th class="px-4 py-3 font-medium">Layanan / Bayar</th>
					<th class="px-4 py-3 font-medium text-right">Tarif & Bagi Hasil</th>
					<th class="px-4 py-3 font-medium">Status</th>
					<th class="px-4 py-3 font-medium text-right">Tindakan</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
				{#if loading && orders.length === 0}
					<tr>
						<td colspan="7" class="px-4 py-10 text-center text-slate-400">Memuat data order...</td>
					</tr>
				{:else if orders.length === 0}
					<tr>
						<td colspan="7" class="px-4 py-10 text-center text-slate-400">
							Tidak ada order yang cocok dengan filter.
						</td>
					</tr>
				{:else}
					{#each orders as o (o.uuid)}
						{@const b = statusBadge[o.status] ?? { label: o.status, variant: 'neutral' }}
						{@const isTerminal = o.status === 'completed' || o.status === 'cancelled'}
						<tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
							<td class="px-4 py-3 align-top">
								<button
									type="button"
									onclick={() => (selectedOrder = o)}
									class="font-mono font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
								>
									{o.uuid.slice(0, 8)}…
								</button>
								<div class="text-[11px] text-slate-400 mt-0.5">{formatDateTime(o.CreatedAt)}</div>
							</td>
							<td class="px-4 py-3 align-top">
								<div class="font-medium text-slate-900 dark:text-slate-100">
									Penumpang: {o.rider?.name ?? `#${o.rider_id}`}
								</div>
								<div class="text-slate-500 mt-0.5">
									Driver:
									{#if o.driver}
										{o.driver.name} (#{o.driver_id})
									{:else if o.driver_id}
										#{o.driver_id}
									{:else}
										<span class="italic text-slate-400">Belum ditugaskan</span>
									{/if}
								</div>
							</td>
							<td class="px-4 py-3 align-top max-w-xs">
								<div class="truncate" title={o.pickup_address}>
									<span class="text-emerald-600 font-semibold">A:</span>
									{o.pickup_address || `${o.pickup_lat.toFixed(4)}, ${o.pickup_lon.toFixed(4)}`}
								</div>
								<div class="truncate text-slate-500 mt-0.5" title={o.dropoff_address}>
									<span class="text-rose-600 font-semibold">B:</span>
									{o.dropoff_address || `${o.dropoff_lat.toFixed(4)}, ${o.dropoff_lon.toFixed(4)}`}
								</div>
								<div class="text-[11px] text-slate-400 mt-0.5">
									{formatNumber(o.distance_km)} km
								</div>
							</td>
							<td class="px-4 py-3 align-top">
								<div class="capitalize font-medium">
									{o.vehicle_type === 'car' ? 'Mobil' : 'Motor'}
								</div>
								<div class="uppercase text-[11px] text-slate-500">{o.payment_method}</div>
								{#if o.voucher_code}
									<div class="mt-0.5">
										<Badge variant="info" label={`Promo: ${o.voucher_code}`} />
									</div>
								{/if}
							</td>
							<td class="px-4 py-3 align-top text-right">
								<div class="font-semibold text-slate-900 dark:text-slate-100">
									{formatIDR(o.fare_amount + o.customer_fee)}
								</div>
								{#if o.promo_discount > 0}
									<div class="text-[11px] text-amber-600">
										Diskon -{formatIDR(o.promo_discount)}
									</div>
								{/if}
								{#if o.status === 'completed'}
									<div class="text-[11px] text-slate-400">
										Driver: {formatIDR(o.driver_earning)} | Fee: {formatIDR(o.platform_fee)}
									</div>
								{/if}
							</td>
							<td class="px-4 py-3 align-top">
								<Badge variant={b.variant} label={b.label} />
							</td>
							<td class="px-4 py-3 align-top text-right space-x-1 whitespace-nowrap">
								<button
									type="button"
									onclick={() => (selectedOrder = o)}
									class="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
								>
									Rincian
								</button>
								{#if canForceComplete && !isTerminal && o.driver_id}
									<button
										type="button"
										disabled={actionBusy}
										onclick={() => handleForceComplete(o)}
										class="rounded-md bg-emerald-600 hover:bg-emerald-700 px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
									>
										Paksa Selesai
									</button>
								{/if}
								{#if canCancel && !isTerminal}
									<button
										type="button"
										disabled={actionBusy}
										onclick={() => {
											cancelTarget = o;
											cancelReason = '';
										}}
										class="rounded-md bg-rose-600 hover:bg-rose-700 px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
									>
										Batalkan
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<Pagination
		page={meta.page}
		perPage={meta.per_page}
		total={meta.total}
		onChange={(p) => loadOrders(p)}
	/>
</div>

<!-- Modal Rincian Order -->
<Modal
	open={Boolean(selectedOrder)}
	title={`Rincian Order ${selectedOrder?.uuid ?? ''}`}
	subtitle="Informasi lengkap perjalanan, pembagian tarif, dan jejak waktu."
	maxWidth="max-w-2xl"
	onClose={() => (selectedOrder = null)}
>
	{#if selectedOrder}
		{@const o = selectedOrder}
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
			<div class="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1.5">
				<div class="font-semibold text-slate-700 dark:text-slate-300">Pihak Terkait</div>
				<div>Penumpang: <strong>{o.rider?.name ?? `#${o.rider_id}`}</strong> ({o.rider?.phone ?? '—'})</div>
				<div>
					Driver: <strong>{o.driver?.name ?? (o.driver_id ? `#${o.driver_id}` : 'Belum ada')}</strong>
				</div>
				<div>Kendaraan: <span class="capitalize">{o.vehicle_type}</span></div>
				<div>Metode Bayar: <span class="uppercase font-semibold">{o.payment_method}</span></div>
			</div>

			<div class="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1.5">
				<div class="font-semibold text-slate-700 dark:text-slate-300">Rincian Biaya</div>
				<div>Tarif Perjalanan (setelah promo): <strong>{formatIDR(o.fare_amount)}</strong></div>
				<div>Biaya Layanan Penumpang: <strong>{formatIDR(o.customer_fee)}</strong></div>
				<div>
					Total Dibayar Penumpang: <strong>{formatIDR(o.fare_amount + o.customer_fee)}</strong>
				</div>
				<div>Potongan Promo ({o.voucher_code || '—'}): <strong>{formatIDR(o.promo_discount)}</strong></div>
				<div>Komisi Platform: <strong>{formatIDR(o.platform_fee)}</strong></div>
				<div>Pendapatan Bersih Driver: <strong>{formatIDR(o.driver_earning)}</strong></div>
			</div>

			<div class="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1.5 sm:col-span-2">
				<div class="font-semibold text-slate-700 dark:text-slate-300">Rute & Koordinat</div>
				<div>
					Jemput: {o.pickup_address || '—'}
					<span class="font-mono text-slate-400">({o.pickup_lat}, {o.pickup_lon})</span>
				</div>
				<div>
					Tujuan: {o.dropoff_address || '—'}
					<span class="font-mono text-slate-400">({o.dropoff_lat}, {o.dropoff_lon})</span>
				</div>
				<div>Jarak: <strong>{formatNumber(o.distance_km)} km</strong></div>
			</div>

			<div class="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1.5 sm:col-span-2">
				<div class="font-semibold text-slate-700 dark:text-slate-300">Jejak Waktu (Timeline)</div>
				<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
					<div>Dibuat: <strong>{formatDateTime(o.CreatedAt)}</strong></div>
					<div>Diterima: <strong>{formatDateTime(o.accepted_at)}</strong></div>
					<div>Tiba: <strong>{formatDateTime(o.arrived_at)}</strong></div>
					<div>Dijemput: <strong>{formatDateTime(o.picked_up_at)}</strong></div>
					<div>Selesai: <strong>{formatDateTime(o.completed_at)}</strong></div>
					<div>Dibatalkan: <strong>{formatDateTime(o.cancelled_at)}</strong></div>
				</div>
				{#if o.review_note}
					<div class="pt-2 border-t border-slate-200 dark:border-slate-700">
						Catatan / Alasan: <strong>{o.review_note}</strong>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</Modal>

<!-- Modal Batalkan Order -->
<Modal
	open={Boolean(cancelTarget)}
	title="Batalkan Order oleh Admin"
	subtitle={`Order ${cancelTarget?.uuid ?? ''} — bila dibayar dengan dompet, dana otomatis dikembalikan ke penumpang.`}
	onClose={() => (cancelTarget = null)}
>
	<form onsubmit={submitCancel} class="space-y-4 text-xs">
		<div>
			<label for="cancel-reason" class="block font-medium text-slate-700 dark:text-slate-300 mb-1">
				Alasan Pembatalan
			</label>
			<textarea
				id="cancel-reason"
				rows="3"
				required
				bind:value={cancelReason}
				placeholder="Misal: Driver mengalami kendala kendaraan, permintaan penumpang lewat CS"
				class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5"
			></textarea>
		</div>
		<div class="flex justify-end gap-2">
			<button
				type="button"
				onclick={() => (cancelTarget = null)}
				class="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 font-medium"
			>
				Batal
			</button>
			<button
				type="submit"
				disabled={actionBusy}
				class="rounded-lg bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 font-medium text-white disabled:opacity-50"
			>
				{actionBusy ? 'Memproses...' : 'Konfirmasi Batalkan'}
			</button>
		</div>
	</form>
</Modal>
