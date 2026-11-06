<script lang="ts">
	interface Props {
		page: number;
		perPage: number;
		total: number;
		onChange: (nextPage: number) => void;
	}

	let { page, perPage, total, onChange }: Props = $props();

	let totalPages = $derived(Math.max(1, Math.ceil(total / Math.max(1, perPage))));
	let startRow = $derived(total === 0 ? 0 : (page - 1) * perPage + 1);
	let endRow = $derived(Math.min(total, page * perPage));
</script>

<div
	class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 px-4 py-3 text-xs text-slate-600 dark:text-slate-400"
>
	<div>
		Menampilkan <span class="font-semibold text-slate-900 dark:text-slate-100">{startRow}–{endRow}</span>
		dari <span class="font-semibold text-slate-900 dark:text-slate-100">{total}</span> baris
	</div>
	<div class="flex items-center gap-2">
		<button
			type="button"
			disabled={page <= 1}
			onclick={() => onChange(page - 1)}
			class="rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none"
		>
			Sebelumnya
		</button>
		<span class="px-1">
			Halaman <strong class="text-slate-900 dark:text-slate-100">{page}</strong> / {totalPages}
		</span>
		<button
			type="button"
			disabled={page >= totalPages}
			onclick={() => onChange(page + 1)}
			class="rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none"
		>
			Berikutnya
		</button>
	</div>
</div>
