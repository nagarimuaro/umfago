<script lang="ts">
	import { apiFetch, session, toQuery } from '#lib/session.svelte';
	import { formatDate, formatDateTime, formatIDR, safeUrl } from '#lib/format';
	import { toast } from '#lib/toast.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import type { DriverProfile, KYCStatus, PageMeta, UserEntity } from '#lib/types';

	let drivers = $state<UserEntity[]>([]);
	let meta = $state<PageMeta>({ page: 1, per_page: 20, total: 0 });
	let loading = $state(false);

	let kycFilter = $state<string>('');
	let activeFilter = $state<string>('');
	let searchQ = $state('');

	// KYC review modal
	let kycOpen = $state(false);
	let kycLoading = $state(false);
	let kycDriver = $state<{
		id: number;
		name: string;
		email: string;
		phone: string;
		role_code: string;
		is_verified: boolean;
		is_active: boolean;
	} | null>(null);
	let kycProfile = $state<(DriverProfile & { status?: KYCStatus }) | null>(null);
	let kycMissing = $state<string[]>([]);
	let rejectReason = $state('');
	let busy = $state(false);

	// Bonus modal
	let bonusTarget = $state<UserEntity | null>(null);
	let bonusAmount = $state<number>(0);
	let bonusNote = $state('');

	let canVerify = $derived(session.has('drivers.verify'));
	let canSuspend = $derived(session.has('drivers.suspend'));
	let canBonus = $derived(session.has('drivers.bonus'));

	async function loadDrivers(page = 1) {
		loading = true;
		try {
			const q = toQuery({
				page,
				per_page: meta.per_page,
				kyc_status: kycFilter,
				is_active: activeFilter,
				q: searchQ.trim()
			});
			const res = await apiFetch<{ drivers: UserEntity[]; meta: PageMeta }>(
				`/api/admin/drivers${q}`
			);
			drivers = res.drivers ?? [];
			meta = res.meta ?? { page, per_page: 20, total: 0 };
		} catch (err) {
			toast.error(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (session.ready && session.has('drivers.view')) {
			loadDrivers(1);
		}
	});

	async function openKYC(driverId: number) {
		kycOpen = true;
		kycLoading = true;
		kycDriver = null;
		kycProfile = null;
		kycMissing = [];
		rejectReason = '';
		try {
			const res = await apiFetch<{
				driver: NonNullable<typeof kycDriver>;
				kyc: DriverProfile & { status?: KYCStatus; missing_fields?: string[] };
				missing_fields?: string[];
			}>(`/api/admin/drivers/${driverId}/kyc`);
			kycDriver = res.driver;
			kycProfile = res.kyc;
			kycMissing = res.missing_fields ?? res.kyc?.missing_fields ?? [];
		} catch (err) {
			toast.error(err);
			kycOpen = false;
		} finally {
			kycLoading = false;
		}
	}

	async function approveKYC() {
		if (!kycDriver) return;
		busy = true;
		try {
			await apiFetch(`/api/admin/drivers/${kycDriver.id}/verify`, { method: 'PUT' });
			toast.success(`KYC driver ${kycDriver.name} disetujui. Driver kini terverifikasi.`);
			kycOpen = false;
			await loadDrivers(meta.page);
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}

	async function rejectKYC(e: SubmitEvent) {
		e.preventDefault();
		if (!kycDriver || !rejectReason.trim()) return;
		busy = true;
		try {
			await apiFetch(`/api/admin/drivers/${kycDriver.id}/reject-kyc`, {
				method: 'PUT',
				json: { reason: rejectReason.trim() }
			});
			toast.success(`KYC driver ${kycDriver.name} ditolak.`);
			kycOpen = false;
			await loadDrivers(meta.page);
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}

	async function toggleSuspend(d: UserEntity) {
		const action = d.is_active ? 'suspend' : 'reactivate';
		const label = d.is_active ? 'Nonaktifkan (suspend)' : 'Aktifkan kembali';
		if (!confirm(`${label} driver ${d.name}?`)) return;
		busy = true;
		try {
			await apiFetch(`/api/admin/drivers/${d.ID}/${action}`, { method: 'PUT' });
			toast.success(d.is_active ? 'Driver disuspend.' : 'Driver diaktifkan kembali.');
			await loadDrivers(meta.page);
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}

	async function submitBonus(e: SubmitEvent) {
		e.preventDefault();
		if (!bonusTarget || bonusAmount <= 0) return;
		busy = true;
		try {
			await apiFetch(`/api/admin/drivers/${bonusTarget.ID}/bonus`, {
				method: 'POST',
				json: { amount: bonusAmount, note: bonusNote.trim() }
			});
			toast.success(`Bonus ${formatIDR(bonusAmount)} dikirim ke ${bonusTarget.name}.`);
			bonusTarget = null;
			await loadDrivers(meta.page);
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}

	const kycBadge: Record<
		string,
		{ label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }
	> = {
		not_submitted: { label: 'Belum Mengajukan', variant: 'neutral' },
		pending: { label: 'Menunggu Tinjauan', variant: 'warning' },
		approved: { label: 'Disetujui', variant: 'success' },
		rejected: { label: 'Ditolak', variant: 'danger' }
	};

	const docFields: Array<{ key: keyof DriverProfile; label: string }> = [
		{ key: 'identity_card_photo_url', label: 'Foto KTP' },
		{ key: 'license_photo_url', label: 'Foto SIM' },
		{ key: 'vehicle_registration_photo_url', label: 'Foto STNK' },
		{ key: 'selfie_photo_url', label: 'Swafoto + KTP' }
	];

	function kycStatusOf(d: UserEntity): string {
		return d.driver_profile?.kyc_status || 'not_submitted';
	}
</script>

<PageHeader
	title="Manajemen Driver & Verifikasi KYC"
	description="Tinjau berkas KYC, suspend akun bermasalah, dan berikan bonus insentif ke dompet driver."
>
	{#snippet actions()}
		<button
			type="button"
			onclick={() => {
				kycFilter = 'pending';
				loadDrivers(1);
			}}
			class="rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-medium text-white"
		>
			Antrean KYC Pending
		</button>
	{/snippet}
</PageHeader>

<div
	class="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs"
>
	<div class="flex-1 min-w-[200px]">
		<label for="d-q" class="block font-medium text-slate-600 dark:text-slate-400 mb-1"
			>Cari Driver</label
		>
		<input
			id="d-q"
			type="search"
			bind:value={searchQ}
			placeholder="Nama, email, atau nomor HP..."
			onkeydown={(e) => e.key === 'Enter' && loadDrivers(1)}
			class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5"
		/>
	</div>
	<div>
		<label for="d-kyc" class="block font-medium text-slate-600 dark:text-slate-400 mb-1"
			>Status KYC</label
		>
		<select
			id="d-kyc"
			bind:value={kycFilter}
			class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
		>
			<option value="">Semua Status KYC</option>
			<option value="pending">Menunggu Tinjauan (pending)</option>
			<option value="approved">Disetujui (approved)</option>
			<option value="rejected">Ditolak (rejected)</option>
			<option value="not_submitted">Belum Mengajukan</option>
		</select>
	</div>
	<div>
		<label for="d-active" class="block font-medium text-slate-600 dark:text-slate-400 mb-1"
			>Status Akun</label
		>
		<select
			id="d-active"
			bind:value={activeFilter}
			class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5"
		>
			<option value="">Semua</option>
			<option value="true">Aktif</option>
			<option value="false">Disuspend</option>
		</select>
	</div>
	<button
		type="button"
		onclick={() => loadDrivers(1)}
		class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 font-medium text-white"
	>
		Cari
	</button>
</div>

<div
	class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs"
>
	<div class="overflow-x-auto">
		<table class="w-full text-left text-xs">
			<thead>
				<tr
					class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500"
				>
					<th class="px-4 py-3 font-medium">Driver</th>
					<th class="px-4 py-3 font-medium">Peran Aktif & Kendaraan</th>
					<th class="px-4 py-3 font-medium">Status KYC</th>
					<th class="px-4 py-3 font-medium">Operasional</th>
					<th class="px-4 py-3 font-medium text-right">Saldo</th>
					<th class="px-4 py-3 font-medium text-right">Tindakan</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
				{#if loading && drivers.length === 0}
					<tr><td colspan="6" class="px-4 py-10 text-center text-slate-400">Memuat driver...</td></tr>
				{:else if drivers.length === 0}
					<tr>
						<td colspan="6" class="px-4 py-10 text-center text-slate-400">
							Tidak ada driver yang cocok dengan filter.
						</td>
					</tr>
				{:else}
					{#each drivers as d (d.ID)}
						{@const kb = kycBadge[kycStatusOf(d)] ?? kycBadge.not_submitted}
						<tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
							<td class="px-4 py-3">
								<div class="font-semibold text-slate-900 dark:text-slate-100">
									{d.name} <span class="font-normal text-slate-400">#{d.ID}</span>
								</div>
								<div class="text-slate-500">{d.email}</div>
								<div class="text-slate-400">{d.phone}</div>
							</td>
							<td class="px-4 py-3">
								<div class="font-medium">
									{d.active_role === 'driver_car' ? 'Driver Mobil' : 'Driver Motor'}
								</div>
								{#if d.vehicles && d.vehicles.length > 0}
									{#each d.vehicles as v}
										<div class="text-[11px] text-slate-500">
											{v.brand} {v.model_name ?? ''} · <span class="font-mono">{v.plate_number}</span>
										</div>
									{/each}
								{:else}
									<div class="text-[11px] text-slate-400 italic">Kendaraan belum didaftarkan</div>
								{/if}
							</td>
							<td class="px-4 py-3">
								<Badge variant={kb.variant} label={kb.label} />
								{#if d.driver_profile?.kyc_submitted_at}
									<div class="text-[11px] text-slate-400 mt-1">
										Diajukan: {formatDate(d.driver_profile.kyc_submitted_at)}
									</div>
								{/if}
							</td>
							<td class="px-4 py-3 space-y-1">
								<div>
									{#if d.is_active}
										<Badge variant="success" label="Akun Aktif" />
									{:else}
										<Badge variant="danger" label="Disuspend" />
									{/if}
								</div>
								<div>
									{#if d.is_online}
										<Badge variant="info" label="Online" />
									{:else}
										<Badge variant="neutral" label="Offline" />
									{/if}
									{#if d.is_verified}
										<Badge variant="success" label="Terverifikasi" />
									{/if}
								</div>
							</td>
							<td class="px-4 py-3 text-right font-semibold">
								<span class={d.balance < 0 ? 'text-rose-600' : ''}>{formatIDR(d.balance)}</span>
							</td>
							<td class="px-4 py-3 text-right space-x-1 whitespace-nowrap">
								<button
									type="button"
									onclick={() => openKYC(d.ID)}
									class="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
								>
									{kycStatusOf(d) === 'pending' && canVerify ? 'Tinjau KYC' : 'Lihat KYC'}
								</button>
								{#if canBonus}
									<button
										type="button"
										onclick={() => {
											bonusTarget = d;
											bonusAmount = 0;
											bonusNote = '';
										}}
										class="rounded-md bg-sky-600 hover:bg-sky-700 px-2 py-1 text-[11px] font-medium text-white"
									>
										Bonus
									</button>
								{/if}
								{#if canSuspend}
									<button
										type="button"
										disabled={busy}
										onclick={() => toggleSuspend(d)}
										class="rounded-md px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50 {d.is_active
											? 'bg-rose-600 hover:bg-rose-700'
											: 'bg-emerald-600 hover:bg-emerald-700'}"
									>
										{d.is_active ? 'Suspend' : 'Aktifkan'}
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
		onChange={(p) => loadDrivers(p)}
	/>
</div>

<!-- KYC Review Modal -->
<Modal
	open={kycOpen}
	title={`Tinjauan Berkas KYC${kycDriver ? ' — ' + kycDriver.name : ''}`}
	subtitle="Data lengkap & nomor rekening utuh. Perlakukan URL dokumen sebagai masukan tidak tepercaya."
	maxWidth="max-w-3xl"
	onClose={() => (kycOpen = false)}
>
	{#if kycLoading}
		<p class="py-8 text-center text-xs text-slate-400">Memuat berkas KYC...</p>
	{:else if kycDriver}
		{@const status = (kycProfile?.kyc_status || kycProfile?.status || 'not_submitted') as string}
		{@const kb = kycBadge[status] ?? kycBadge.not_submitted}
		<div class="space-y-4 text-xs">
			<div
				class="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3"
			>
				<div>
					<div class="font-semibold text-sm">{kycDriver.name}</div>
					<div class="text-slate-500">
						{kycDriver.email} · {kycDriver.phone} · {kycDriver.role_code}
					</div>
				</div>
				<Badge variant={kb.variant} label={kb.label} />
			</div>

			{#if status === 'not_submitted' || !kycProfile?.id}
				<div
					class="rounded-lg border border-slate-200 dark:border-slate-700 p-4 text-center text-slate-500"
				>
					Driver belum mengajukan berkas KYC.
				</div>
			{:else}
				{#if kycMissing.length > 0}
					<div
						class="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/50 p-3 text-amber-800 dark:text-amber-300"
					>
						<strong>Berkas belum lengkap:</strong>
						{kycMissing.join(', ')}. Persetujuan akan ditolak server (422) sampai lengkap.
					</div>
				{/if}

				{#if status === 'rejected' && kycProfile.kyc_rejection_reason}
					<div
						class="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 p-3 text-rose-700 dark:text-rose-300"
					>
						<strong>Alasan penolakan sebelumnya:</strong>
						{kycProfile.kyc_rejection_reason}
					</div>
				{/if}

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-1">
						<div class="font-semibold text-slate-700 dark:text-slate-300 mb-1">Identitas & SIM</div>
						<div>No. KTP: <span class="font-mono font-medium">{kycProfile.identity_card_number || '—'}</span></div>
						<div>No. SIM: <span class="font-mono font-medium">{kycProfile.license_number || '—'}</span></div>
						<div>
							Masa Berlaku SIM:
							<strong
								class={kycProfile.license_expiry && new Date(kycProfile.license_expiry) < new Date()
									? 'text-rose-600'
									: ''}>{formatDate(kycProfile.license_expiry)}</strong
							>
						</div>
						<div>No. STNK: <span class="font-mono font-medium">{kycProfile.vehicle_registration_number || '—'}</span></div>
					</div>
					<div class="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-1">
						<div class="font-semibold text-slate-700 dark:text-slate-300 mb-1">Rekening Pencairan</div>
						<div>Bank: <strong>{kycProfile.bank_name || '—'}</strong></div>
						<div>No. Rekening: <span class="font-mono font-semibold">{kycProfile.bank_account_number || '—'}</span></div>
						<div>Atas Nama: <strong>{kycProfile.bank_account_name || '—'}</strong></div>
						<div class="text-[11px] text-slate-400 pt-1">
							Diajukan: {formatDateTime(kycProfile.kyc_submitted_at)}
							{#if kycProfile.kyc_reviewed_at}
								<br />Ditinjau: {formatDateTime(kycProfile.kyc_reviewed_at)} (oleh #{kycProfile.kyc_reviewed_by})
							{/if}
						</div>
					</div>
				</div>

				<div>
					<div class="font-semibold text-slate-700 dark:text-slate-300 mb-2">Dokumen Foto</div>
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
						{#each docFields as doc}
							{@const url = safeUrl(kycProfile[doc.key] as string)}
							<div class="rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-center">
								<div class="text-[11px] font-medium mb-1.5">{doc.label}</div>
								{#if url}
									<a href={url} target="_blank" rel="noopener noreferrer nofollow" class="block">
										<img
											src={url}
											alt={doc.label}
											referrerpolicy="no-referrer"
											class="h-24 w-full rounded object-cover bg-slate-100 dark:bg-slate-800"
										/>
									</a>
								{:else}
									<div
										class="flex h-24 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-400"
									>
										Tidak ada
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				{#if canVerify && status === 'pending'}
					<div class="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
						<button
							type="button"
							disabled={busy || kycMissing.length > 0}
							onclick={approveKYC}
							class="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 py-2 text-sm font-semibold text-white disabled:opacity-50"
						>
							{busy ? 'Memproses...' : 'Setujui KYC & Verifikasi Driver'}
						</button>
						<form onsubmit={rejectKYC} class="flex gap-2">
							<input
								type="text"
								required
								bind:value={rejectReason}
								placeholder="Alasan penolakan (wajib, dikirim ke driver)..."
								class="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5"
							/>
							<button
								type="submit"
								disabled={busy || !rejectReason.trim()}
								class="rounded-lg bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 font-medium text-white disabled:opacity-50"
							>
								Tolak KYC
							</button>
						</form>
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</Modal>

<!-- Bonus Modal -->
<Modal
	open={Boolean(bonusTarget)}
	title={`Kirim Bonus ke ${bonusTarget?.name ?? ''}`}
	subtitle="Dana masuk ke dompet driver sebagai transaksi BONUS dan tercatat di buku besar."
	onClose={() => (bonusTarget = null)}
>
	<form onsubmit={submitBonus} class="space-y-4 text-xs">
		<div>
			<label for="b-amt" class="block font-medium mb-1">Nominal Bonus (IDR)</label>
			<input
				id="b-amt"
				type="number"
				min="1"
				step="1"
				required
				bind:value={bonusAmount}
				class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
			/>
		</div>
		<div>
			<label for="b-note" class="block font-medium mb-1">Catatan (opsional)</label>
			<input
				id="b-note"
				type="text"
				bind:value={bonusNote}
				placeholder="Misal: Insentif target 50 trip minggu ini"
				class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
			/>
		</div>
		<div class="flex justify-end gap-2">
			<button type="button" onclick={() => (bonusTarget = null)} class="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 font-medium">
				Batal
			</button>
			<button
				type="submit"
				disabled={busy || bonusAmount <= 0}
				class="rounded-lg bg-sky-600 hover:bg-sky-700 px-3.5 py-1.5 font-medium text-white disabled:opacity-50"
			>
				{busy ? 'Mengirim...' : `Kirim ${formatIDR(bonusAmount)}`}
			</button>
		</div>
	</form>
</Modal>
