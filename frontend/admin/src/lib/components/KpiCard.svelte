<script lang="ts">
	interface Props {
		label: string;
		value: string;
		subtext?: string;
		accent?: 'default' | 'emerald' | 'amber' | 'rose' | 'sky';
	}

	let { label, value, subtext = '', accent = 'default' }: Props = $props();

	const borderMap: Record<NonNullable<Props['accent']>, string> = {
		default: 'border-l-slate-400 dark:border-l-slate-600',
		emerald: 'border-l-emerald-500',
		amber: 'border-l-amber-500',
		rose: 'border-l-rose-500',
		sky: 'border-l-sky-500'
	};
</script>

<div
	class="rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 {borderMap[
		accent
	]} bg-white dark:bg-slate-900 p-4 shadow-xs"
>
	<div class="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
		{label}
	</div>
	<div class="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
		{value}
	</div>
	{#if subtext}
		<div class="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtext}</div>
	{/if}
</div>
