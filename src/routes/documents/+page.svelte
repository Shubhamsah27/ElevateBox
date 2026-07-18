<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Group documents by their status for cleaner dashboard layout
	let groupedDocs = $derived.by(() => {
		const groups: Record<string, typeof data.documents> = {
			draft: [],
			submitted: [],
			approved: [],
			published: []
		};
		
		for (const doc of data.documents) {
			if (doc.status in groups) {
				groups[doc.status].push(doc);
			} else if (doc.status === 'rejected') {
				// Put rejected under draft section or keep separate
				if (!groups['rejected']) groups['rejected'] = [];
				groups['rejected'].push(doc);
			}
		}
		return groups;
	});
</script>

<svelte:head>
	<title>Dashboard - Controlled Document Approval System</title>
</svelte:head>

<div class="dashboard-container">
	<div class="dashboard-header hero-panel">
		<div>
			<span class="eyebrow">{data.user?.role} workspace</span>
			<h1>Document control,<br /><span>beautifully clear.</span></h1>
			<p class="subtitle">One secure place to author, review, publish, and trace every controlled document.</p>
		</div>
		{#if data.user && data.user.role === 'author'}
			<a href="/documents/new" class="btn btn-primary">
				Create New Draft
			</a>
		{/if}
	</div>

	<!-- Stats summary grid -->
	<div class="stats-grid">
		<div class="stat-card glass-panel">
			<span class="stat-value">{data.documents.length}</span>
			<span class="stat-label">Total Accessible</span>
		</div>
		<div class="stat-card glass-panel">
			<span class="stat-value">
				{data.documents.filter(d => d.status === 'published').length}
			</span>
			<span class="stat-label">Published</span>
		</div>
		{#if data.user && data.user.role !== 'viewer'}
			<div class="stat-card glass-panel">
				<span class="stat-value">
					{data.documents.filter(d => d.status === 'submitted').length}
				</span>
				<span class="stat-label">Awaiting Review</span>
			</div>
		{/if}
	</div>

	{#if data.documents.length === 0}
		<div class="empty-state glass-panel">
			<h2>No Documents Available</h2>
			<p>There are no active documents viewable under your current role.</p>
		</div>
	{:else}
		<div class="documents-section">
			<h2>Active Documents</h2>
			<div class="docs-table-wrapper glass-panel">
				<table class="docs-table">
					<thead>
						<tr>
							<th>Title</th>
							<th>Status</th>
							<th>Author</th>
							<th>Version</th>
							<th>Last Updated</th>
							<th class="text-right">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.documents as doc}
							<tr class="doc-row">
								<td class="doc-title-cell">
									<a href="/documents/{doc.id}" class="doc-link">
										{doc.title}
									</a>
								</td>
								<td>
									<span class="badge badge-{doc.status}">{doc.status}</span>
								</td>
								<td class="text-secondary">{doc.authorName}</td>
								<td>v{doc.version}</td>
								<td class="text-secondary">
									{new Date(doc.updatedAt).toLocaleString()}
								</td>
								<td class="text-right">
									<a href="/documents/{doc.id}" class="btn btn-secondary btn-sm">
										View
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<style>
	.dashboard-container {
		display: flex;
		flex-direction: column;
		gap: 32px;
		margin-top: 10px;
	}

	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 20px;
	}
	.hero-panel { position:relative; overflow:hidden; padding:54px clamp(24px,5vw,66px); border:1px solid var(--panel-border); border-radius:26px; background:linear-gradient(115deg,rgba(19,25,51,.94),rgba(9,14,30,.82)); box-shadow:0 26px 80px rgba(0,0,0,.3); }
	.hero-panel::after { content:''; position:absolute; width:380px; height:380px; border-radius:50%; right:-90px; top:-210px; background:radial-gradient(circle,rgba(139,92,246,.34),transparent 66%); pointer-events:none; }
	.hero-panel h1 span { color:#b8a5ff; }
	.hero-panel .btn { position:relative; z-index:1; }
	.eyebrow { display:block; color:#9b8afb; font-size:.72rem; font-weight:750; letter-spacing:.16em; text-transform:uppercase; margin-bottom:12px; }

	.subtitle {
		color: var(--text-secondary);
		margin-top: 16px;
		max-width: 620px;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 20px;
	}

	.stat-card {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		border-radius: var(--radius-md);
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		font-family: var(--font-title);
		color: #ffffff;
		line-height: 1;
	}

	.stat-label {
		font-size: 0.85rem;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.empty-state {
		text-align: center;
		padding: 60px 40px;
		border-radius: var(--radius-md);
	}

	.empty-state h2 {
		margin-bottom: 12px;
	}

	.empty-state p {
		color: var(--text-secondary);
		max-width: 400px;
		margin: 0 auto;
	}

	.documents-section {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.docs-table-wrapper {
		overflow-x: auto;
		border-radius: var(--radius-md);
	}

	.docs-table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
		font-size: 0.95rem;
	}

	.docs-table th, .docs-table td {
		padding: 16px 24px;
	}

	.docs-table th {
		font-family: var(--font-title);
		font-weight: 600;
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.doc-row {
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		transition: background-color 0.2s ease;
	}

	.doc-row:hover {
		background-color: rgba(255, 255, 255, 0.02);
	}

	.doc-title-cell {
		font-weight: 600;
	}

	.doc-link {
		color: #ffffff;
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.doc-link:hover {
		color: var(--color-accent);
	}

	.text-secondary {
		color: var(--text-secondary);
	}

	.text-right {
		text-align: right;
	}

	.btn-sm {
		padding: 6px 12px;
		font-size: 0.85rem;
	}
	@media(max-width:700px){.dashboard-header{align-items:flex-start;flex-direction:column}.hero-panel{padding:36px 24px}.docs-table th:nth-child(3),.docs-table td:nth-child(3),.docs-table th:nth-child(5),.docs-table td:nth-child(5){display:none}.docs-table th,.docs-table td{padding:14px 12px}}
</style>
