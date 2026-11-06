<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { bootstrapSession, logout, session, switchActiveRole } from '#lib/session.svelte';
	import { NAV_ITEMS, ROLE_LABELS, isAdminRole } from '#lib/permissions';
	import { toast } from '#lib/toast.svelte';
	import type { RoleCode } from '#lib/types';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	let sidebarCollapsed = $state(false);
	let switchingRole = $state(false);

	onMount(() => {
		bootstrapSession();
	});

	let visibleNav = $derived(NAV_ITEMS.filter((item) => session.hasAny(item.requiredAny)));

	let groupedNav = $derived.by(() => {
		const groups = new Map<string, typeof visibleNav>();
		for (const item of visibleNav) {
			const list = groups.get(item.group) ?? [];
			list.push(item);
			groups.set(item.group, list);
		}
		return Array.from(groups.entries());
	});

	let adminRoles = $derived(
		(session.user?.available_roles ?? []).filter((r) => isAdminRole(r.code))
	);

	// Redirect otomatis berdasarkan status autentikasi
	$effect(() => {
		if (!session.ready) return;
		const path = page.url.pathname;
		if (!session.user && path !== '/login') {
			goto('/login');
		} else if (session.user && session.isAdmin && path === '/login') {
			const firstAllowed = visibleNav[0]?.href ?? '/orders';
			goto(firstAllowed);
		}
	});

	async function handleRoleSwitch(e: Event) {
		const target = (e.currentTarget as HTMLSelectElement).value as RoleCode;
		if (!target || target === session.user?.active_role) return;
		switchingRole = true;
		try {
			await switchActiveRole(target);
			toast.success(`Peran aktif diubah ke ${ROLE_LABELS[target] ?? target}`);
			const firstAllowed = visibleNav[0]?.href ?? '/';
			if (!visibleNav.some((n) => n.href === page.url.pathname)) {
				goto(firstAllowed);
			}
		} catch (err) {
			toast.error(err);
		} finally {
			switchingRole = false;
		}
	}

	async function handleLogout() {
		await logout();
		goto('/login');
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Toast container -->
<div class="fixed right-4 bottom-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
	{#each toast.items as item (item.id)}
		<div
			class="pointer-events-auto flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg {item.kind ===
			'error'
				? 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100'
				: item.kind === 'success'
					? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100'
					: 'border-slate-300 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'}"
		>
			<span class="leading-snug">{item.text}</span>
			<button
				type="button"
				onclick={() => toast.dismiss(item.id)}
				class="text-xs opacity-60 hover:opacity-100"
			>
				✕
			</button>
		</div>
	{/each}
</div>

{#if !session.ready}
	<div class="flex min-h-screen items-center justify-center text-sm text-slate-500">
		Memuat sesi...
	</div>
{:else if page.url.pathname === '/login' || !session.user}
	{@render children()}
{:else if !session.isAdmin}
	<div class="flex min-h-screen items-center justify-center p-6">
		<div
			class="max-w-md rounded-xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-6 text-center shadow-xs"
		>
			<h2 class="text-lg font-semibold text-rose-600 dark:text-rose-400">
				Akses Back-Office Ditolak
			</h2>
			<p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
				Akun <strong>{session.user.email}</strong> sedang aktif sebagai
				<code class="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs"
					>{session.user.active_role}</code
				> dan tidak memegang peran grup admin.
			</p>
			<button
				type="button"
				onclick={handleLogout}
				class="mt-4 rounded-lg bg-slate-900 dark:bg-slate-100 px-4 py-2 text-xs font-medium text-white dark:text-slate-900"
			>
				Keluar & Ganti Akun
			</button>
		</div>
	</div>
{:else}
	<div class="flex min-h-screen bg-slate-50 dark:bg-slate-950">
		<!-- Sidebar -->
		<aside
			class="flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all {sidebarCollapsed
				? 'w-16'
				: 'w-64'} shrink-0"
		>
			<div
				class="flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4"
			>
				{#if !sidebarCollapsed}
					<div class="flex items-center gap-2">
						<span
							class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white"
							>OJ</span
						>
						<div>
							<div class="text-sm font-bold tracking-tight">OpenJek</div>
							<div class="text-[10px] uppercase tracking-wider text-slate-400">
								Enterprise Admin
							</div>
						</div>
					</div>
				{/if}
				<button
					type="button"
					onclick={() => (sidebarCollapsed = !sidebarCollapsed)}
					class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
					title={sidebarCollapsed ? 'Perluas menu' : 'Ciutkan menu'}
				>
					{sidebarCollapsed ? '»' : '«'}
				</button>
			</div>

			<nav class="flex-1 overflow-y-auto p-3 space-y-4">
				{#each groupedNav as [groupName, items]}
					<div>
						{#if !sidebarCollapsed}
							<div
								class="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
							>
								{groupName}
							</div>
						{/if}
						<div class="space-y-0.5">
							{#each items as item}
								{@const active =
									item.href === '/'
										? page.url.pathname === '/'
										: page.url.pathname.startsWith(item.href)}
								<a
									href={item.href}
									class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors {active
										? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
										: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'}"
									title={item.label}
								>
									<span
										class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-semibold {active
											? 'bg-emerald-600 text-white'
											: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}"
									>
										{item.label.slice(0, 1)}
									</span>
									{#if !sidebarCollapsed}
										<span class="truncate">{item.label}</span>
									{/if}
								</a>
							{/each}
						</div>
					</div>
				{/each}
			</nav>

			{#if !sidebarCollapsed}
				<div class="border-t border-slate-200 dark:border-slate-800 p-3 text-[11px] text-slate-500">
					<div class="font-medium text-slate-700 dark:text-slate-300">
						{session.permissions.size} izin aktif
					</div>
					<div class="truncate">
						Peran: {ROLE_LABELS[session.user.active_role] ?? session.user.active_role}
					</div>
				</div>
			{/if}
		</aside>

		<!-- Main content -->
		<div class="flex flex-1 flex-col min-w-0">
			<header
				class="flex h-14 items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6"
			>
				<div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
					<span>Back-Office</span>
					<span>/</span>
					<span class="font-medium text-slate-900 dark:text-slate-100">
						{NAV_ITEMS.find((n) =>
							n.href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(n.href)
						)?.label ?? 'Dashboard'}
					</span>
				</div>

				<div class="flex items-center gap-3">
					{#if adminRoles.length > 1}
						<label class="flex items-center gap-1.5 text-xs text-slate-500">
							<span>Mode:</span>
							<select
								value={session.user.active_role}
								disabled={switchingRole}
								onchange={handleRoleSwitch}
								class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-slate-100"
							>
								{#each adminRoles as r}
									<option value={r.code}>{ROLE_LABELS[r.code] ?? r.name}</option>
								{/each}
							</select>
						</label>
					{:else}
						<span
							class="rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300"
						>
							{ROLE_LABELS[session.user.active_role] ?? session.user.active_role}
						</span>
					{/if}

					<button
						type="button"
						onclick={() => session.toggleTheme()}
						class="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
						title="Ubah tema terang/gelap"
					>
						{session.dark ? 'Terang' : 'Gelap'}
					</button>

					<div
						class="hidden sm:flex flex-col items-end text-xs leading-tight border-l border-slate-200 dark:border-slate-800 pl-3"
					>
						<span class="font-medium text-slate-800 dark:text-slate-100">{session.user.name}</span>
						<span class="text-slate-400">{session.user.email}</span>
					</div>

					<button
						type="button"
						onclick={handleLogout}
						class="rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/50 px-3 py-1 text-xs font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50"
					>
						Keluar
					</button>
				</div>
			</header>

			<main class="flex-1 p-6 max-w-7xl w-full mx-auto">
				{@render children()}
			</main>
		</div>
	</div>
{/if}

