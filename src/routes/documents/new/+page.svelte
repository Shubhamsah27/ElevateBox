<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Create Draft - Controlled Document Approval System</title>
</svelte:head>

<div class="form-container">
	<div class="form-header">
		<a href="/documents" class="back-link">← Back to Workspace</a>
		<h1>Create Controlled Document</h1>
		<p class="subtitle">Draft a new document to enter the controlled workflow</p>
	</div>

	{#if form?.message}
		<div class="alert alert-error">
			<span class="alert-icon">⚠️</span>
			<div>
				<strong>Validation Failed</strong>
				<p>{form.message}</p>
			</div>
		</div>
	{/if}

	<form method="POST" use:enhance class="glass-panel document-form">
		<div class="form-group">
			<label for="title">Document Title</label>
			<input
				type="text"
				id="title"
				name="title"
				class="form-input"
				placeholder="Enter a descriptive title..."
				value={form?.title ?? ''}
				required
			/>
		</div>

		<div class="form-group">
			<label for="body">Document Body / Content</label>
			<textarea
				id="body"
				name="body"
				class="form-textarea"
				rows="12"
				placeholder="Write the document content here..."
				value={form?.body ?? ''}
				required
			></textarea>
		</div>

		<div class="form-actions">
			<a href="/documents" class="btn btn-secondary">
				Cancel
			</a>
			<button type="submit" class="btn btn-primary">
				Save Draft
			</button>
		</div>
	</form>
</div>

<style>
	.form-container {
		max-width: 800px;
		margin: 20px auto 0 auto;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	.form-header { padding:28px 6px 8px; }
	.form-header h1 { background:linear-gradient(100deg,#fff,#c4b5fd); background-clip:text; -webkit-background-clip:text; color:transparent; }

	.back-link {
		color: var(--text-secondary);
		text-decoration: none;
		font-size: 0.9rem;
		display: inline-block;
		margin-bottom: 8px;
		transition: color 0.2s ease;
	}

	.back-link:hover {
		color: #ffffff;
	}

	.subtitle {
		color: var(--text-secondary);
		margin-top: 4px;
	}

	.document-form {
		padding: clamp(24px,5vw,46px);
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	.document-form::before { content:'DRAFT COMPOSER'; color:var(--text-muted); font-size:.68rem; font-weight:750; letter-spacing:.16em; padding-bottom:16px; border-bottom:1px solid rgba(255,255,255,.07); }
	.form-input { font-size:1.05rem; font-weight:600; }
	.form-textarea { min-height:340px; line-height:1.8; }

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
		font-weight: 500;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		padding-top: 24px;
		margin-top: 12px;
	}
	@media(max-width:600px){.form-actions{flex-direction:column-reverse}.form-actions .btn{width:100%}}
</style>
