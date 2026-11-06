<script lang="ts">
	import { apiFetch, session } from '#lib/session.svelte';
	import { formatNumber } from '#lib/format';
	import { toast } from '#lib/toast.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import type { BranchEntity, CityEntity } from '#lib/types';

	let cities = $state<CityEntity[]>([]);
	let branches = $state<BranchEntity[]>([]);
	let loading = $state(false);
	let busy = $state(false);

	let cityModal = $state(false);
	let branchModal = $state(false);

	let cityForm = $state({
		code: '',
		name: '',
		province: '',
		timezone: 'Asia/Jakarta',
		currency: 'IDR',
		center_lat: -0.9471,
		center_lon: 100.4172,
		radius_km: 25,
		is_active: true
	});

	let branchForm = $state({
		city_id: 1,
		code: '',
		name: '',
		address: '',
		phone: '',
		manager_name: '',
		is_active: true
	});

	async function loadAll() {
		loading = true;
		try {
			const [cRes, bRes] = await Promise.all([
				apiFetch<{ cities: CityEntity[] }>('/api/admin/cities'),
				apiFetch<{ branches: BranchEntity[] }>('/api/admin/branches')
			]);
			cities = cRes.cities ?? [];
			branches = bRes.branches ?? [];
			if (cities.length > 0) branchForm.city_id = cities[0].id;
		} catch (err) {
			toast.error(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (session.ready && session.has('settings.manage')) loadAll();
	});

	async function submitCity(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		try {
			await apiFetch('/api/admin/cities', { method: 'POST', json: cityForm });
			toast.success('Kota berhasil ditambahkan.');
			cityModal = false;
			await loadAll();
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}

	async function submitBranch(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		try {
			await apiFetch('/api/admin/branches', { method: 'POST', json: branchForm });
			toast.success('Cabang berhasil ditambahkan.');
			branchModal = false;
			await loadAll();
		} catch (err) {
			toast.error(err);
		} finally {
			busy = false;
		}
	}
</script>

<PageHeader
	title="Multi-City & Branch Management"
	description="Hierarki organisasi operasional multi-kota dan cabang kantor perwakilan (§16)."
>
	{#snippet actions()}
		<button
			type="button"
			onclick={() => (cityModal = true)}
			class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
		>
			+ Tambah Kota
		</button>
		<button
			type="button"
			onclick={() => (branchModal = true)}
			class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium"
		>
			+ Tambah Cabang
		</button>
	{/snippet}
</PageHeader>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
	<!-- Daftar Kota -->
	<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
		<h2 class="text-sm font-semibold mb-3">Wilayah Kota Terdaftar</h2>
		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs">
				<thead>
					<tr class="border-b border-slate-200 dark:border-slate-800 text-slate-500">
						<th class="pb-2 font-medium">Kota</th>
						<th class="pb-2 font-medium">Provinsi</th>
						<th class="pb-2 font-medium">Radius</th>
						<th class="pb-2 font-medium">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
					{#each cities as c (c.id)}
						<tr>
							<td class="py-2.5">
								<div class="font-semibold text-slate-900 dark:text-slate-100">{c.name}</div>
								<div class="font-mono text-[11px] text-slate-400">{c.code} · {c.timezone}</div>
							</td>
							<td class="py-2.5">{c.province || '—'}</td>
							<td class="py-2.5">{formatNumber(c.radius_km)} km</td>
							<td class="py-2.5">
								{#if c.is_active}
									<Badge variant="success" label="Aktif" />
								{:else}
									<Badge variant="neutral" label="Nonaktif" />
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Daftar Cabang -->
	<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
		<h2 class="text-sm font-semibold mb-3">Kantor Cabang Operasional</h2>
		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs">
				<thead>
					<tr class="border-b border-slate-200 dark:border-slate-800 text-slate-500">
						<th class="pb-2 font-medium">Cabang</th>
						<th class="pb-2 font-medium">Pimpinan</th>
						<th class="pb-2 font-medium">Kontak</th>
						<th class="pb-2 font-medium">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
					{#if branches.length === 0}
						<tr><td colspan="4" class="py-6 text-center text-slate-400">Belum ada kantor cabang.</td></tr>
					{:else}
						{#each branches as b (b.id)}
							<tr>
								<td class="py-2.5">
									<div class="font-semibold text-slate-900 dark:text-slate-100">{b.name}</div>
									<div class="text-[11px] text-slate-400 truncate max-w-xs">{b.address || b.code}</div>
								</td>
								<td class="py-2.5">{b.manager_name || '—'}</td>
								<td class="py-2.5 font-mono">{b.phone || '—'}</td>
								<td class="py-2.5">
									{#if b.is_active}
										<Badge variant="success" label="Buka" />
									{:else}
										<Badge variant="neutral" label="Tutup" />
									{/if}
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<Modal open={cityModal} title="Tambah Kota Baru" onClose={() => (cityModal = false)}>
	<form onsubmit={submitCity} class="space-y-3 text-xs">
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="c-code" class="block font-medium mb-1">Kode Kota (3 huruf)</label>
				<input id="c-code" type="text" required bind:value={cityForm.code} placeholder="BDG" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono uppercase" />
			</div>
			<div>
				<label for="c-name" class="block font-medium mb-1">Nama Kota</label>
				<input id="c-name" type="text" required bind:value={cityForm.name} placeholder="Bandung" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
			</div>
		</div>
		<div>
			<label for="c-prov" class="block font-medium mb-1">Provinsi</label>
			<input id="c-prov" type="text" required bind:value={cityForm.province} placeholder="Jawa Barat" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
		</div>
		<div class="grid grid-cols-3 gap-3">
			<div>
				<label for="c-lat" class="block font-medium mb-1">Titik Lintang</label>
				<input id="c-lat" type="number" step="any" required bind:value={cityForm.center_lat} class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono" />
			</div>
			<div>
				<label for="c-lon" class="block font-medium mb-1">Titik Bujur</label>
				<input id="c-lon" type="number" step="any" required bind:value={cityForm.center_lon} class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono" />
			</div>
			<div>
				<label for="c-rad" class="block font-medium mb-1">Radius (km)</label>
				<input id="c-rad" type="number" min="5" required bind:value={cityForm.radius_km} class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
			</div>
		</div>
		<div class="flex justify-end gap-2 pt-2">
			<button type="button" onclick={() => (cityModal = false)} class="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 font-medium">Batal</button>
			<button type="submit" disabled={busy} class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 font-semibold text-white disabled:opacity-50">Simpan Kota</button>
		</div>
	</form>
</Modal>

<Modal open={branchModal} title="Tambah Kantor Cabang" onClose={() => (branchModal = false)}>
	<form onsubmit={submitBranch} class="space-y-3 text-xs">
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="b-city" class="block font-medium mb-1">Kota</label>
				<select id="b-city" bind:value={branchForm.city_id} class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
					{#each cities as c}
						<option value={c.id}>{c.name}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="b-code" class="block font-medium mb-1">Kode Cabang</label>
				<input id="b-code" type="text" required bind:value={branchForm.code} placeholder="PDG-01" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono uppercase" />
			</div>
		</div>
		<div>
			<label for="b-name" class="block font-medium mb-1">Nama Kantor Cabang</label>
			<input id="b-name" type="text" required bind:value={branchForm.name} placeholder="Kantor Operasional Padang Barat" class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
		</div>
		<div>
			<label for="b-addr" class="block font-medium mb-1">Alamat Lengkap</label>
			<textarea id="b-addr" rows="2" bind:value={branchForm.address} class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"></textarea>
		</div>
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="b-mgr" class="block font-medium mb-1">Pimpinan / Manager Cabang</label>
				<input id="b-mgr" type="text" bind:value={branchForm.manager_name} class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
			</div>
			<div>
				<label for="b-ph" class="block font-medium mb-1">Nomor Telepon</label>
				<input id="b-ph" type="text" bind:value={branchForm.phone} class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" />
			</div>
		</div>
		<div class="flex justify-end gap-2 pt-2">
			<button type="button" onclick={() => (branchModal = false)} class="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 font-medium">Batal</button>
			<button type="submit" disabled={busy} class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 font-semibold text-white disabled:opacity-50">Simpan Cabang</button>
		</div>
	</form>
</Modal>
