<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		actions?: Snippet;
	}

	let { title, description = '', actions }: Props = $props();
</script>

<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
	<div>
		<h1 class="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
		{#if description}
			<p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
		{/if}
	</div>
	{#if actions}
		<div class="flex flex-wrap items-center gap-2">
			{@render actions()}
		</div>
	{/if}
</div>
