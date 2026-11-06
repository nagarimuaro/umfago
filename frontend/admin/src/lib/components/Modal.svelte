<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		title: string;
		subtitle?: string;
		maxWidth?: string;
		onClose: () => void;
		children: Snippet;
	}

	let {
		open,
		title,
		subtitle = '',
		maxWidth = 'max-w-lg',
		onClose,
		children
	}: Props = $props();
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="w-full {maxWidth} max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl"
		>
			<div
				class="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-5 py-4"
			>
				<div>
					<h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
					{#if subtitle}
						<p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
					{/if}
				</div>
				<button
					type="button"
					onclick={onClose}
					class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
					aria-label="Tutup"
				>
					✕
				</button>
			</div>
			<div class="p-5">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
