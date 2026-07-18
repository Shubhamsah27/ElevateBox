<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	let { data, children } = $props();

	// Quick helper to determine active tab class
	function isActive(path: string) {
		return page.url.pathname === path ? 'active' : '';
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Controlled Document Approval System</title>
</svelte:head>

<div class="app-layout">
	{#if data.user}
		<header class="top-header">
			<div class="header-left">
				<a href="/documents" class="app-logo">
					<span class="logo-mark">E</span>
					<span class="logo-copy"><strong>ElevateBox</strong><small>Document control</small></span>
				</a>
				<nav class="main-nav">
					<a href="/documents" class="nav-link {isActive('/documents')}">
						Dashboard
					</a>
					{#if data.user.role === 'admin'}
						<a href="/archive" class="nav-link {isActive('/archive')}">
							Archive
						</a>
					{/if}
				</nav>
			</div>

			<div class="header-right">
				<form method="POST" action="/login?/login" use:enhance class="switcher-form">
					<input type="hidden" name="redirectTo" value={page.url.pathname} />
					<span class="switcher-label">Viewing as</span>
					<select 
						name="userId" 
						class="form-input switcher-select"
						value={data.user.id}
						onchange={(e) => e.currentTarget.form?.requestSubmit()}
					>
						{#each data.allUsers as u}
							<option value={u.id}>{u.name} ({u.role.toUpperCase()})</option>
						{/each}
					</select>
				</form>

				<div class="user-badge-container">
					<span class="role-indicator badge badge-{data.user.role}">
						{data.user.role}
					</span>
					<span class="user-name">{data.user.name}</span>
				</div>

				<form method="POST" action="/login?/logout" use:enhance>
					<button type="submit" class="btn btn-secondary btn-sm">
						Logout
					</button>
				</form>
			</div>
		</header>
	{/if}

	<main class="main-content">
		{@render children()}
	</main>
</div>

<style>
	.app-layout {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.top-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 18px;
		margin: 18px auto 0;
		width: calc(100% - 40px);
		max-width: 1360px;
		border: 1px solid var(--panel-border);
		border-radius: 18px;
		background: rgba(9, 14, 28, 0.76);
		backdrop-filter: blur(24px);
		box-shadow: 0 14px 50px rgba(0,0,0,.28);
		gap: 24px;
	}

	.header-left, .header-right {
		display: flex;
		align-items: center;
		gap: 24px;
	}

	.app-logo {
		font-family: var(--font-title);
		font-weight: 700;
		display: flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: #ffffff;
		letter-spacing: -0.03em;
	}

	.logo-mark { display:grid; place-items:center; width:34px; height:34px; border-radius:10px; background:linear-gradient(145deg,#8b5cf6,#4f46e5); box-shadow:0 8px 24px rgba(99,102,241,.35); }
	.logo-copy { display:flex; flex-direction:column; line-height:1.05; }
	.logo-copy strong {
		background: linear-gradient(135deg, #fff 0%, #c4b5fd 100%);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}
	.logo-copy small { color:var(--text-muted); font-size:.61rem; letter-spacing:.12em; text-transform:uppercase; margin-top:4px; }

	.main-nav {
		display: flex;
		align-items: center;
		gap: 8px;
		border-left: 1px solid rgba(255, 255, 255, 0.08);
		padding-left: 24px;
	}

	.nav-link {
		color: var(--text-secondary);
		text-decoration: none;
		font-family: var(--font-title);
		font-size: 0.95rem;
		font-weight: 500;
		padding: 8px 16px;
		border-radius: var(--radius-sm);
		transition: all 0.2s ease;
	}

	.nav-link:hover, .nav-link.active {
		color: #ffffff;
		background: rgba(255, 255, 255, 0.05);
	}

	.switcher-form {
		display: flex;
		align-items: center;
		gap: 8px;
		border-right: 1px solid rgba(255, 255, 255, 0.08);
		padding-right: 24px;
	}

	.switcher-label {
		font-size: 0.8rem;
		color: var(--text-muted);
		text-transform: uppercase;
		font-family: var(--font-title);
		letter-spacing: 0.05em;
	}

	.switcher-select {
		padding: 6px 12px;
		font-size: 0.85rem;
		cursor: pointer;
		width: auto;
		background-color: rgba(255, 255, 255, 0.03);
	}

	.user-badge-container {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.user-name {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.btn-sm {
		padding: 6px 12px;
		font-size: 0.85rem;
	}

	.main-content {
		flex: 1;
		padding: 24px;
		max-width: 1400px;
		width: 100%;
		margin: 0 auto;
	}

	@media (max-width: 900px) {
		.top-header { align-items:flex-start; flex-direction:column; width:calc(100% - 24px); margin-top:12px; }
		.header-left,.header-right { width:100%; flex-wrap:wrap; gap:12px; }
		.header-right { justify-content:space-between; }
		.switcher-form { flex:1; border-right:0; padding-right:0; }
		.switcher-select { max-width:180px; }
		.user-badge-container { display:none; }
		.main-content { padding:18px 12px 32px; }
	}
</style>
