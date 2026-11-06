<script lang="ts">
	interface Props {
		variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
		label: string;
	}

	let { variant = 'neutral', label }: Props = $props();

	const classes: Record<NonNullable<Props['variant']>, string> = {
		success:
			'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-500/30',
		warning:
			'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-500/30',
		danger:
			'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-500/30',
		info: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-500/30',
		neutral:
			'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600/40'
	};
</script>

<span
	class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset {classes[
		variant
	]}"
>
	{label}
</span>
