<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>System Archive - Controlled Document Approval System</title>
</svelte:head>

<div class="archive-container">
	<div class="archive-header">
		<h1>System Archive</h1>
		<p class="subtitle">Access archived documents and their historical records</p>
	</div>

	{#if data.documents.length === 0}
		<div class="empty-state glass-panel">
			<h2>No Archived Documents</h2>
			<p>There are no archived records in the database.</p>
		</div>
	{:else}
		<div class="docs-table-wrapper glass-panel">
			<table class="docs-table">
				<thead>
					<tr>
						<th>Title</th>
						<th>Status</th>
						<th>Author</th>
						<th>Version</th>
						<th>Archived At</th>
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
								<span class="badge badge-archived">{doc.status}</span>
							</td>
							<td class="text-secondary">{doc.authorName}</td>
							<td>v{doc.version}</td>
							<td class="text-secondary">
								{new Date(doc.updatedAt).toLocaleString()}
							</td>
							<td class="text-right">
								<a href="/documents/{doc.id}" class="btn btn-secondary btn-sm">
									View History
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.archive-container {
		display: flex;
		flex-direction: column;
		gap: 32px;
		margin-top: 16px;
	}
	.archive-header { padding:44px clamp(24px,5vw,56px); border:1px solid var(--panel-border); border-radius:24px; background:linear-gradient(120deg,rgba(46,30,24,.38),rgba(12,16,31,.86)); position:relative; overflow:hidden; box-shadow:0 24px 70px rgba(0,0,0,.24); }
	.archive-header::after { content:'ARCHIVE'; position:absolute; right:24px; top:4px; font:800 clamp(4rem,12vw,9rem) var(--font-title); letter-spacing:-.06em; color:rgba(245,158,11,.035); pointer-events:none; }
	.archive-header h1,.archive-header p { position:relative; z-index:1; }

	.subtitle {
		color: var(--text-secondary);
		margin-top: 4px;
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

	.docs-table-wrapper {
		overflow-x: auto;
		border-radius: var(--radius-md);
		box-shadow:0 24px 70px rgba(0,0,0,.25);
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
	@media(max-width:700px){.docs-table th:nth-child(3),.docs-table td:nth-child(3),.docs-table th:nth-child(5),.docs-table td:nth-child(5){display:none}.docs-table th,.docs-table td{padding:14px 12px}.archive-header{padding:34px 24px}}
</style>
