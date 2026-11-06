<script lang="ts">
	import { apiFetch, session } from '#lib/session.svelte';
	import { toast } from '#lib/toast.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import type { DynamicSettingItem } from '#lib/types';

	const GROUPS: Record<string, string> = {
		fare: 'Tarif',
		wallet: 'Dompet',
		matching: 'Pencocokan Driver',
		ui: 'Tampilan Aplikasi (Server-Driven UI)',
		app: 'Aplikasi'
	};

	let items = $state<DynamicSettingItem[]>([]);
	let original = $state<Record<string, string>>({});
	let draft = $state<Record<string, string>>({});
	let loading = $state(false);
	let saving = $state<string | null>(null);
	let savingAll = $state(false);

	// Simulasi langsung rumus tarif berdasarkan nilai draft saat ini
	let simDistance = $state<number>(4);
	let simQuote = $derived.by(() => {
		const perKm = Number(draft['fare.per_km_price_idr'] || 3000);
		const minDist = Number(draft['fare.min_distance_km'] || 3);
		const custPct = Math.min(100, Math.max(0, Number(draft['fare.customer_fee_percent'] || 0)));
		const platPct = Math.min(100, Math.max(0, Number(draft['fare.platform_fee_percent'] || 20)));
		const chargedDist = Math.max(Math.max(0, simDistance), minDist);
		const total = Math.round(chargedDist * perKm);
		const custFee = Math.round((total * custPct) / 100);
		const platFee = Math.round((total * platPct) / 100);
		return {
			chargedDist,
			minFare: Math.round(minDist * perKm),
			total,
			custFee,
			totalCharged: total + custFee,
			platFee,
			driverNet: total - platFee
		};
	});

	async function load() {
		loading = true;
		try {
			const res = await apiFetch<{
				settings: Record<string, string>;
				items?: DynamicSettingItem[];
			}>('/api/admin/settings');
			original = { ...res.settings };
			draft = { ...res.settings };
			items =
				res.items ??
				Object.entries(res.settings).map(([key, value]) => ({
					key,
					value,
					type: 'string',
					description: '',
					group: key.split('.')[0]
				}));
		} catch (err) {
			toast.error(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (session.ready && session.has('settings.manage')) load();
	});

	let grouped = $derived.by(() => {
		const map = new Map<string, DynamicSettingItem[]>();
		for (const item of items) {
			const g = item.group || item.key.split('.')[0];
			const list = map.get(g) ?? [];
			list.push(item);
			map.set(g, list);
		}
		return Array.from(map.entries());
	});

	let dirtyKeys = $derived(Object.keys(draft).filter((k) => draft[k] !== original[k]));

	function isColorKey(key: string): boolean {
		return key.endsWith('_color');
	}

	function validate(item: DynamicSettingItem, value: string): string | null {
		if (item.type === 'float' || item.type === 'int') {
			if (value.trim() === '' || Number.isNaN(Number(value))) return 'Harus berupa angka';
			if (item.type === 'int' && !Number.isInteger(Number(value))) return 'Harus bilangan bulat';
			if (item.key.endsWith('_percent') && (Number(value) < 0 || Number(value) > 100))
				return 'Harus 0–100';
		}
		return null;
	}

	async function save(item: DynamicSettingItem) {
		const key = item.key;
		const value = draft[key] ?? '';
		const err = validate(item, value);
		if (err) {
			toast.error(`${key}: ${err}`);
			return;
		}
		if (
			key === 'app.maintenance_mode' &&
			value === 'true' &&
			!confirm('Aktifkan mode pemeliharaan? Aplikasi akan tertutup bagi semua pengguna.')
		)
			return;
		saving = key;
		try {
			await apiFetch(`/api/admin/settings/${encodeURIComponent(key)}`, {
				method: 'PUT',
				json: { value }
			});
			original = { ...original, [key]: value };
			toast.success(`${key} disimpan.`);
		} catch (e) {
			toast.error(e);
		} finally {
			saving = null;
		}
	}

	async function saveAllDirty() {
		if (dirtyKeys.length === 0) return;
		savingAll = true;
		try {
			for (const key of dirtyKeys) {
				const item = items.find((i) => i.key === key);
				if (item) await save(item);
			}
		} finally {
			savingAll = false;
		}
	}

	const inputCls =
		'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5';
</script>

<PageHeader
	title="Pengaturan Tarif & Sistem"
	description="Disinkronkan langsung dari tabel dynamic_settings di backend. Berlaku tanpa deploy ulang."
>
	{#snippet actions()}
		{#if dirtyKeys.length > 0}
			<button
				type="button"
				onclick={saveAllDirty}
				disabled={savingAll}
				class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
			>
				{savingAll ? 'Menyimpan...' : `Simpan Semua (${dirtyKeys.length})`}
			</button>
		{/if}
		<button
			type="button"
			onclick={load}
			disabled={loading}
			class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium"
		>
			{loading ? 'Memuat...' : 'Muat Ulang'}
		</button>
	{/snippet}
</PageHeader>

<!-- Kalkulator Simulasi Tarif Langsung -->
<div
	class="mb-6 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 p-4 text-xs"
>
	<div class="flex flex-wrap items-center justify-between gap-3 mb-2">
		<div class="font-semibold text-emerald-900 dark:text-emerald-200">
			Simulasi Rumus Tarif: <code>max(jarak, jarak_min) × tarif_per_km</code>
		</div>
		<label class="flex items-center gap-2">
			<span>Uji jarak (km):</span>
			<input
				type="number"
				min="0"
				step="0.5"
				bind:value={simDistance}
				class="w-20 rounded border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 px-2 py-1"
			/>
		</label>
	</div>
	<div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-slate-700 dark:text-slate-300">
		<div>Jarak ditagih: <strong>{simQuote.chargedDist} km</strong></div>
		<div>Tarif minimum: <strong>Rp {simQuote.minFare.toLocaleString('id-ID')}</strong></div>
		<div>Dibayar penumpang: <strong>Rp {simQuote.totalCharged.toLocaleString('id-ID')}</strong></div>
		<div>Potongan platform: <strong>Rp {simQuote.platFee.toLocaleString('id-ID')}</strong></div>
		<div>Bersih driver: <strong>Rp {simQuote.driverNet.toLocaleString('id-ID')}</strong></div>
	</div>
</div>

{#if loading && items.length === 0}
	<p class="py-10 text-center text-xs text-slate-400">Memuat pengaturan...</p>
{:else}
	<div class="space-y-6">
		{#each grouped as [group, groupItems]}
			<div
				class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
			>
				<div
					class="border-b border-slate-200 dark:border-slate-800 px-5 py-3 text-sm font-semibold"
				>
					{GROUPS[group] ?? group.toUpperCase()}
				</div>
				<div class="divide-y divide-slate-100 dark:divide-slate-800">
					{#each groupItems as item (item.key)}
						{@const key = item.key}
						{@const dirty = draft[key] !== original[key]}
						<div
							class="grid grid-cols-1 md:grid-cols-[1fr_280px_auto] items-center gap-3 px-5 py-3 text-xs"
						>
							<div>
								<div class="font-mono font-semibold text-slate-900 dark:text-slate-100">
									{key}
									<span
										class="ml-1.5 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-normal text-slate-500"
										>{item.type}</span
									>
								</div>
								{#if item.description}
									<div class="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
								{/if}
							</div>
							<div>
								{#if item.type === 'bool'}
									<select bind:value={draft[key]} class={inputCls}>
										<option value="true">Ya (true)</option>
										<option value="false">Tidak (false)</option>
									</select>
								{:else if isColorKey(key)}
									<div class="flex gap-2">
										<input
											type="color"
											bind:value={draft[key]}
											class="h-8 w-10 rounded border border-slate-300 dark:border-slate-700"
										/>
										<input type="text" bind:value={draft[key]} class="{inputCls} font-mono" />
									</div>
								{:else if item.type === 'float' || item.type === 'int'}
									<input
										type="number"
										step={item.type === 'int' ? '1' : 'any'}
										bind:value={() => draft[key], (v) => (draft[key] = String(v ?? ''))}
										class={inputCls}
									/>
								{:else}
									<input type="text" bind:value={draft[key]} class={inputCls} />
								{/if}
							</div>
							<div class="flex gap-1 justify-end">
								{#if dirty}
									<button
										type="button"
										onclick={() => (draft[key] = original[key])}
										class="rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 text-[11px] font-medium"
									>
										Batal
									</button>
								{/if}
								<button
									type="button"
									disabled={!dirty || saving === key}
									onclick={() => save(item)}
									class="rounded-md bg-emerald-600 hover:bg-emerald-700 px-3 py-1 text-[11px] font-medium text-white disabled:opacity-40"
								>
									{saving === key ? 'Menyimpan...' : 'Simpan'}
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/if}

