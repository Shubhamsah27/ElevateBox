<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Login - Controlled Document Approval System</title>
</svelte:head>

<div class="login-container">
	<div class="orb orb-one"></div>
	<div class="orb orb-two"></div>
	<div class="glass-panel login-card">
		<div class="card-header">
			<div class="logo">
				<span class="logo-icon">CDAS</span>
			</div>
			<span class="eyebrow">ElevateBox control center</span>
			<h1>Every document.<br /><span>Perfectly governed.</span></h1>
			<p>Enter the secure workspace for controlled authoring, review, and publication.</p>
		</div>

		<form method="POST" action="?/login" use:enhance class="login-form">
			<div class="form-group">
				<label for="userId">Select User Role</label>
				<select id="userId" name="userId" class="form-input select-role">
					{#each data.allUsers as user}
						<option value={user.id}>
							{user.name} ({user.role.toUpperCase()})
						</option>
					{/each}
				</select>
			</div>

			<button type="submit" class="btn btn-primary btn-block">
				Enter System
			</button>
		</form>

		<div class="seeded-details">
			<h3>Authorization Matrix Info</h3>
			<ul>
				<li><strong>Author (Alice):</strong> Can create, edit, submit, reopen own docs.</li>
				<li><strong>Reviewer (Bob):</strong> Can approve/reject submitted docs (not own), publish.</li>
				<li><strong>Admin (Admin):</strong> Can publish approved docs, archive active docs.</li>
				<li><strong>Viewer (Viewer):</strong> Can only view published documents.</li>
			</ul>
		</div>
	</div>
</div>

<style>
	.login-container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: 24px;
		position: relative;
		overflow: hidden;
	}
	.orb { position:absolute; border-radius:50%; filter:blur(12px); pointer-events:none; }
	.orb-one { width:420px;height:420px;left:-170px;top:-150px;background:radial-gradient(circle,rgba(124,58,237,.26),transparent 68%); }
	.orb-two { width:480px;height:480px;right:-190px;bottom:-210px;background:radial-gradient(circle,rgba(8,145,178,.18),transparent 68%); }

	.login-card {
		width: 100%;
		max-width: 500px;
		padding: clamp(28px,5vw,48px);
		position: relative;
		z-index: 1;
		border-radius: 26px;
		box-shadow: 0 30px 100px rgba(0,0,0,.45), 0 0 80px rgba(99,102,241,.08);
	}

	.card-header {
		text-align: center;
		margin-bottom: 32px;
	}

	.logo {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 68px;
		height: 68px;
		background: linear-gradient(135deg, var(--color-accent) 0%, #4f46e5 100%);
		border-radius: 20px;
		margin-bottom: 16px;
		box-shadow: var(--shadow-glow);
	}
	.eyebrow { display:block; color:#9b8afb; font-size:.68rem; font-weight:750; letter-spacing:.16em; text-transform:uppercase; margin:18px 0 10px; }
	.card-header h1 span { color:#b8a5ff; }

	.logo-icon {
		font-family: var(--font-title);
		font-weight: 700;
		font-size: 1.1rem;
		color: #ffffff;
		letter-spacing: -0.05em;
	}

	h1 {
		font-size: clamp(2rem,6vw,2.8rem);
		margin-bottom: 8px;
	}

	p {
		color: var(--text-secondary);
		font-size: 0.95rem;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	label {
		font-family: var(--font-title);
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
	}

	.select-role {
		appearance: none;
		cursor: pointer;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23f3f4f6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 16px center;
		background-size: 16px;
		padding-right: 40px;
	}

	.btn-block {
		width: 100%;
		padding: 14px;
		font-size: 1rem;
	}

	.seeded-details {
		margin-top: 32px;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		padding-top: 24px;
	}
	.seeded-details li { padding:8px 10px; border-radius:8px; background:rgba(255,255,255,.025); }

	.seeded-details h3 {
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		margin-bottom: 12px;
	}

	.seeded-details ul {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.seeded-details strong {
		color: #ffffff;
	}
</style>
