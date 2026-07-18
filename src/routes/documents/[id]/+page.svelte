<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isEditing = $state(false);
	let rejectionComment = $state('');

	// Automatically reset edit mode and comment on successful load
	$effect(() => {
		if (data.document) {
			isEditing = false;
			rejectionComment = '';
		}
	});

	let isAuthor = $derived(data.user && data.user.id === data.document.authorId);
	let isReviewer = $derived(data.user && data.user.role === 'reviewer');
	let isAdmin = $derived(data.user && data.user.role === 'admin');

	// Determine available actions
	let canAuthorEdit = $derived(isAuthor && (data.document.status === 'draft' || data.document.status === 'rejected'));
	let canAuthorSubmit = $derived(isAuthor && data.document.status === 'draft');
	let canAuthorReopen = $derived(isAuthor && data.document.status === 'rejected');
	let canReviewerApprove = $derived(isReviewer && data.document.status === 'submitted' && !isAuthor);
	let canReviewerReject = $derived(isReviewer && data.document.status === 'submitted');
	let canPublish = $derived((isReviewer || isAdmin) && data.document.status === 'approved');
	let canArchive = $derived(isAdmin && ['draft', 'submitted', 'approved', 'published'].includes(data.document.status));
</script>

<svelte:head>
	<title>{data.document.title} - CDAS</title>
</svelte:head>

<div class="detail-container">
	<div class="detail-header">
		<a href="/documents" class="back-link">← Back to Workspace</a>
		<div class="header-main">
			<div class="title-section">
				<div class="status-badge-row">
					<span class="badge badge-{data.document.status}">{data.document.status}</span>
					<span class="version-tag">Version {data.document.version}</span>
				</div>
				<h1>{data.document.title}</h1>
				<p class="meta-info">
					Authored by <strong>{data.document.authorName}</strong> • Created {new Date(data.document.createdAt).toLocaleString()}
				</p>
			</div>
		</div>
	</div>

	<!-- Error Alert / Stale Conflict warning -->
	{#if form?.message}
		<div class="alert alert-error">
			<span class="alert-icon">⚠️</span>
			<div class="alert-content">
				<strong>Operation Failed / Conflict Warning</strong>
				<p>{form.message}</p>
				<button onclick={() => window.location.reload()} class="btn btn-secondary btn-sm refresh-btn">
					Refresh Page
				</button>
			</div>
		</div>
	{/if}

	<div class="workspace-grid">
		<!-- Main Content Area -->
		<div class="content-area">
			{#if isEditing}
				<!-- Inline Editing Form -->
				<form method="POST" action="?/edit" use:enhance class="glass-panel edit-form">
					<input type="hidden" name="version" value={data.document.version} />
					
					<div class="form-group">
						<label for="title">Title</label>
						<input
							type="text"
							id="title"
							name="title"
							class="form-input"
							value={data.document.title}
							required
						/>
					</div>

					<div class="form-group">
						<label for="body">Content</label>
						<textarea
							id="body"
							name="body"
							class="form-textarea"
							rows="14"
							required
						>{data.document.body}</textarea>
					</div>

					<div class="edit-actions">
						<button type="button" onclick={() => isEditing = false} class="btn btn-secondary">
							Cancel
						</button>
						<button type="submit" class="btn btn-primary">
							Save Changes
						</button>
					</div>
				</form>
			{:else}
				<!-- Static View Area -->
				<div class="glass-panel document-view">
					<div class="document-body">
						{data.document.body}
					</div>
				</div>
			{/if}
		</div>

		<!-- Action Sidebar & Timeline -->
		<div class="sidebar-area">
			<!-- Workflow Actions Panel -->
			<div class="glass-panel action-panel">
				<h2>Workflow Control</h2>
				
				<div class="action-buttons">
					{#if canAuthorEdit && !isEditing}
						<button onclick={() => isEditing = true} class="btn btn-secondary w-full">
							Edit Content
						</button>
					{/if}

					<!-- Submit for Review -->
					{#if canAuthorSubmit && !isEditing}
						<form method="POST" action="?/submit" use:enhance class="w-full">
							<input type="hidden" name="version" value={data.document.version} />
							<button type="submit" class="btn btn-primary w-full">
								Submit for Review
							</button>
						</form>
					{/if}

					<!-- Reopen Draft -->
					{#if canAuthorReopen && !isEditing}
						<form method="POST" action="?/reopen" use:enhance class="w-full">
							<input type="hidden" name="version" value={data.document.version} />
							<button type="submit" class="btn btn-secondary w-full">
								Reopen as Draft
							</button>
						</form>
					{/if}

					<!-- Reviewer Approval / Rejection -->
					{#if canReviewerApprove}
						<form method="POST" action="?/approve" use:enhance class="w-full">
							<input type="hidden" name="version" value={data.document.version} />
							<button type="submit" class="btn btn-success w-full">
								Approve Document
							</button>
						</form>
					{/if}

					{#if canReviewerReject}
						<div class="rejection-form w-full">
							<form method="POST" action="?/reject" use:enhance class="w-full">
								<input type="hidden" name="version" value={data.document.version} />
								<div class="form-group mb-12">
									<label for="comment">Rejection Comment</label>
									<textarea
										id="comment"
										name="comment"
										rows="3"
										class="form-textarea"
										placeholder="Reason for rejection (mandatory)..."
										bind:value={rejectionComment}
										required
									></textarea>
								</div>
								<button type="submit" class="btn btn-danger w-full" disabled={!rejectionComment.trim()}>
									Reject Document
								</button>
							</form>
						</div>
					{/if}

					<!-- Publish Approved Document -->
					{#if canPublish}
						<form method="POST" action="?/publish" use:enhance class="w-full">
							<input type="hidden" name="version" value={data.document.version} />
							<button type="submit" class="btn btn-primary w-full">
								Publish Document
							</button>
						</form>
					{/if}

					<!-- Admin Archive Document -->
					{#if canArchive}
						<form method="POST" action="?/archive" use:enhance class="w-full">
							<input type="hidden" name="version" value={data.document.version} />
							<button type="submit" class="btn btn-danger w-full">
								Archive Document
							</button>
						</form>
					{/if}

					{#if !canAuthorEdit && !canAuthorSubmit && !canAuthorReopen && !canReviewerApprove && !canReviewerReject && !canPublish && !canArchive}
						<p class="no-actions-msg">No actions available under your current role.</p>
					{/if}
				</div>
			</div>

			<!-- Audit History Timeline -->
			<div class="glass-panel timeline-panel">
				<h2>Audit Timeline</h2>
				<div class="timeline">
					{#each data.auditHistory as event}
						<div class="timeline-item">
							<div class="timeline-marker marker-{event.action}"></div>
							<div class="timeline-content">
								<div class="timeline-meta">
									<span class="timeline-actor">{event.actorName}</span>
									<span class="timeline-time">
										{new Date(event.timestamp).toLocaleTimeString()}
									</span>
								</div>
								<div class="timeline-title">
									Transitioned version <strong>v{event.version}</strong> via <strong>{event.action}</strong>
								</div>
								{#if event.comment}
									<div class="timeline-comment">
										"{event.comment}"
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.detail-container {
		display: flex;
		flex-direction: column;
		gap: 24px;
		margin-top: 16px;
	}
	.detail-header { position:relative; padding:28px 6px 4px; }
	.detail-header::after { content:''; position:absolute; right:4%; top:10%; width:180px; height:180px; border-radius:50%; background:radial-gradient(circle,rgba(139,92,246,.16),transparent 68%); pointer-events:none; }

	.back-link {
		color: var(--text-secondary);
		text-decoration: none;
		font-size: 0.9rem;
		display: inline-block;
		margin-bottom: 12px;
		transition: color 0.2s ease;
	}

	.back-link:hover {
		color: #ffffff;
	}

	.header-main {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		padding-bottom: 20px;
	}

	.title-section h1 {
		font-size: 2.2rem;
		margin-top: 8px;
	}
	.title-section { position:relative; z-index:1; }

	.status-badge-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.version-tag {
		font-size: 0.85rem;
		color: var(--text-secondary);
		font-weight: 500;
	}

	.meta-info {
		color: var(--text-secondary);
		font-size: 0.9rem;
		margin-top: 8px;
	}

	.workspace-grid {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 24px;
	}

	@media (max-width: 968px) {
		.workspace-grid {
			grid-template-columns: 1fr;
		}
	}

	.document-view {
		padding: clamp(30px,5vw,58px);
		min-height: 400px;
		white-space: pre-wrap;
		font-size: 1.05rem;
		color: var(--text-primary);
		line-height: 1.85;
		background:linear-gradient(145deg,rgba(22,28,50,.92),rgba(10,15,29,.8));
		box-shadow:0 26px 80px rgba(0,0,0,.28);
	}
	.document-view::before { content:'CONTROLLED COPY'; display:block; color:#8f7fe7; font-size:.65rem; font-weight:750; letter-spacing:.18em; margin-bottom:30px; padding-bottom:14px; border-bottom:1px solid rgba(255,255,255,.07); }

	.edit-form {
		padding: 32px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.mb-12 {
		margin-bottom: 12px;
	}

	label {
		font-family: var(--font-title);
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
	}

	.edit-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
	}

	.sidebar-area {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.action-panel, .timeline-panel {
		padding: 24px;
	}
	.action-panel { position:sticky; top:20px; background:linear-gradient(145deg,rgba(24,30,55,.92),rgba(10,15,29,.85)); }

	.action-panel h2, .timeline-panel h2 {
		font-size: 1.1rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		margin-bottom: 20px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		padding-bottom: 8px;
	}

	.action-buttons {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.w-full {
		width: 100%;
	}

	.no-actions-msg {
		color: var(--text-muted);
		font-size: 0.9rem;
		text-align: center;
		padding: 12px 0;
	}

	.alert-content {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.refresh-btn {
		width: max-content;
		margin-top: 4px;
	}

	/* Timeline designs */
	.timeline {
		display: flex;
		flex-direction: column;
		gap: 20px;
		position: relative;
		padding-left: 20px;
		border-left: 2px solid rgba(255, 255, 255, 0.06);
	}

	.timeline-item {
		position: relative;
		padding:2px 0 2px 4px;
	}

	.timeline-marker {
		position: absolute;
		left: -27px;
		top: 4px;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #9ca3af;
		border: 2px solid var(--bg-main);
	}

	.marker-create { background: var(--color-accent); }
	.marker-submit { background: var(--color-info); }
	.marker-approve { background: var(--color-success); }
	.marker-reject { background: var(--color-error); }
	.marker-publish { background: #8b5cf6; }
	.marker-archive { background: var(--color-warning); }

	.timeline-content {
		font-size: 0.85rem;
	}

	.timeline-meta {
		display: flex;
		justify-content: space-between;
		color: var(--text-muted);
		margin-bottom: 4px;
	}

	.timeline-actor {
		font-weight: 600;
		color: var(--text-secondary);
	}

	.timeline-title {
		color: #ffffff;
	}

	.timeline-comment {
		margin-top: 6px;
		padding: 8px 12px;
		background: rgba(255, 255, 255, 0.03);
		border-radius: var(--radius-sm);
		border-left: 3px solid var(--color-accent);
		font-style: italic;
		color: var(--text-secondary);
	}
	@media(max-width:600px){.title-section h1{font-size:1.8rem}.document-view{padding:26px 22px}.header-main{padding-bottom:16px}.action-panel{position:static}}
</style>
