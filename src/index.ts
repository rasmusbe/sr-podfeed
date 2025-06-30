/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { fetchProgramInfo, fetchSRData, generatePodcastRSS, type SREpisode } from './feed-generator';

interface Env {
	// Add any environment variables here if needed
}

function getProgramsHTML(): string {
	return `<!DOCTYPE html>
<html lang="sv">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Sveriges Radio Podcast Feeds</title>
		<style>
			body {
				font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
				max-width: 1200px;
				margin: 0 auto;
				padding: 20px;
				background-color: #f5f5f5;
			}
			h1 {
				color: #333;
				text-align: center;
				margin-bottom: 30px;
			}
			.loading {
				text-align: center;
				padding: 40px;
				color: #666;
			}
			.spinner {
				border: 4px solid #f3f3f3;
				border-top: 4px solid #007bff;
				border-radius: 50%;
				width: 40px;
				height: 40px;
				animation: spin 1s linear infinite;
				margin: 0 auto 20px;
			}
			@keyframes spin {
				0% { transform: rotate(0deg); }
				100% { transform: rotate(360deg); }
			}
			.error {
				background: #f8d7da;
				color: #721c24;
				padding: 15px;
				border-radius: 4px;
				margin: 20px 0;
				text-align: center;
			}
			.filter-bar {
				background: white;
				border-radius: 8px;
				box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
				padding: 20px;
				margin-bottom: 20px;
			}
			.search-box {
				width: 100%;
				padding: 12px 16px;
				border: 1px solid #ddd;
				border-radius: 6px;
				font-size: 16px;
				margin-bottom: 10px;
				box-sizing: border-box;
			}
			.filter-row {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-top: 10px;
			}
			.checkbox-label {
				display: flex;
				align-items: center;
				gap: 8px;
				font-size: 14px;
				color: #666;
				cursor: pointer;
			}
			.checkbox-label input[type="checkbox"] {
				margin: 0;
				cursor: pointer;
			}
			.stats {
				color: #666;
				font-size: 14px;
			}
			.table-container {
				background: white;
				border-radius: 8px;
				box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
				overflow: hidden;
			}
			table {
				width: 100%;
				border-collapse: collapse;
			}
			th, td {
				padding: 12px 15px;
				text-align: left;
				border-bottom: 1px solid #eee;
			}
			th {
				background-color: #f8f9fa;
				font-weight: 600;
				color: #495057;
			}
			tr:hover { background-color: #f8f9fa; }
			tr.hidden { display: none; }
			a {
				color: #007bff;
				text-decoration: none;
			}
			a:hover { text-decoration: underline; }
			.pod-link, .broadcast-link {
				display: inline-block;
				padding: 4px 8px;
				border-radius: 4px;
				font-size: 12px;
				font-weight: 500;
				white-space: nowrap;
			}
			.pod-link {
				background-color: #28a745;
				color: white;
			}
			.broadcast-link {
				background-color: #17a2b8;
				color: white;
			}
			.pod-link:hover, .broadcast-link:hover {
				text-decoration: none;
				opacity: 0.8;
			}
			.description {
				color: #666;
				font-size: 14px;
				max-width: 300px;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			/* Responsive design */
			@media (max-width: 768px) {
				body {
					padding: 10px;
				}

				.filter-bar {
					padding: 15px;
				}

				table {
					font-size: 14px;
				}

				th, td {
					padding: 8px 10px;
				}

				/* Hide description column on mobile */
				th:nth-child(2), td:nth-child(2) {
					display: none;
				}

				/* Make RSS links more touch-friendly */
				.pod-link, .broadcast-link {
					padding: 6px 10px;
					font-size: 11px;
				}
			}

			@media (max-width: 480px) {
				body {
					padding: 5px;
				}

				h1 {
					font-size: 24px;
					margin-bottom: 20px;
				}

				.filter-bar {
					padding: 10px;
				}

				table {
					font-size: 13px;
				}

				th, td {
					padding: 6px 8px;
				}

				.pod-link, .broadcast-link {
					padding: 8px 12px;
					font-size: 12px;
				}
			}
		</style>
	</head>
	<body>
		<h1>Sveriges Radio Podcast Feeds</h1>

		<div style="background: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
			<h3 style="margin: 0 0 10px 0; color: #0056b3;">Om RSS-flödena</h3>
			<p style="margin: 0 0 8px 0; color: #333;">
				<strong>Pod Feed:</strong> Innehåller klippta podd-versioner som ofta finns tillgängliga längre och är optimerade för nedladdning.
			</p>
			<p style="margin: 0; color: #333;">
				<strong>Broadcast Feed:</strong> Innehåller radioutsändningen i de fall det finns (inklusive musik och andra element från den ursprungliga sändningen).
			</p>
		</div>

		<div id="loading" class="loading">
			<div class="spinner"></div>
			<p>Laddar program...</p>
		</div>

		<div id="error" class="error" style="display: none">
			<p>Ett fel uppstod vid laddning av program. Försök igen senare.</p>
			<p id="errorDetails" style="font-size: 12px; margin-top: 10px"></p>
		</div>

		<div id="content" style="display: none">
			<div class="filter-bar">
				<input type="text" class="search-box" placeholder="Sök program..." id="searchBox" />
				<div class="filter-row">
					<label class="checkbox-label">
						<input type="checkbox" id="includeArchived" />
						<span>Inkludera arkiverade program</span>
					</label>
					<div class="stats" id="stats">Visar alla program</div>
				</div>
			</div>

			<div class="table-container">
				<table>
					<thead>
						<tr>
							<th>Program</th>
							<th>Beskrivning</th>
							<th>Pod Feed</th>
							<th>Broadcast Feed</th>
						</tr>
					</thead>
					<tbody id="programsTable"></tbody>
				</table>
			</div>
		</div>

		<script>
			const baseUrl = window.location.href.split('?')[0];
			let currentSearch = '';
			let includeArchived = false;
			let programs = [];

			function renderProgramsTable() {
				const tbody = document.getElementById('programsTable');
				tbody.innerHTML = programs
					.map(
						(program, index) => \`
                <tr data-name="\${program.name.toLowerCase()}" data-index="\${index}" data-archived="\${program.archived || false}">
                    <td><strong>\${program.name}</strong></td>
                    <td class="description">\${program.description || ''}</td>
                    <td>\${program.haspod ? \`<a href="\${baseUrl}?programid=\${program.id}&filetype=download" class="pod-link" onclick="copyToClipboard(event, '\${baseUrl}?programid=\${program.id}&filetype=download')">Pod RSS</a>\` : '-'}</td>
                    <td>\${program.hasondemand ? \`<a href="\${baseUrl}?programid=\${program.id}&filetype=broadcast" class="broadcast-link" onclick="copyToClipboard(event, '\${baseUrl}?programid=\${program.id}&filetype=broadcast')">Broadcast RSS</a>\` : '-'}</td>
                </tr>
            \`
					)
					.join('');
			}

			function copyToClipboard(event, url) {
				// Prevent default link behavior on left click
				event.preventDefault();

				// Copy URL to clipboard
				navigator.clipboard.writeText(url).then(() => {
					// Show temporary feedback
					const link = event.target;
					const originalText = link.textContent;
					link.textContent = 'Kopierat!';
					link.style.backgroundColor = '#28a745';

					setTimeout(() => {
						link.textContent = originalText;
						link.style.backgroundColor = '';
					}, 1000);
				}).catch(err => {
					console.error('Failed to copy: ', err);
					// Fallback: open in new tab if clipboard fails
					window.open(url, '_blank');
				});
			}

			function filterPrograms() {
				const rows = document.querySelectorAll('tbody tr');
				let visibleCount = 0;

				rows.forEach((row) => {
					const name = row.querySelector('td:first-child strong').textContent;
					const description = row.querySelector('td:nth-child(2)').textContent;
					const isArchived = row.dataset.archived === 'true';

					let shouldShow = true;

					// Filter by archived status
					if (!includeArchived && isArchived) {
						shouldShow = false;
					}

					// Filter by search term
					if (shouldShow && currentSearch) {
						const searchLower = currentSearch.toLowerCase();
						const nameLower = name.toLowerCase();
						const descriptionLower = description.toLowerCase();
						shouldShow = nameLower.includes(searchLower) || descriptionLower.includes(searchLower);
					}

					if (shouldShow) {
						row.classList.remove('hidden');
						visibleCount++;
					} else {
						row.classList.add('hidden');
					}
				});

				document.getElementById('stats').textContent = \`Visar \${visibleCount} av \${programs.length} program\`;
			}

			async function fetchPrograms() {
				try {
					const apiUrl = 'https://api.sr.se/api/v2/programs/index?format=json&pagination=false';

					// Use JSONP to work around CORS issues
					const callbackName = 'srProgramsCallback_' + Date.now();
					const jsonpUrl = \`\${apiUrl}&callback=\${callbackName}\`;

					// Create a promise-based JSONP implementation
					const data = await new Promise((resolve, reject) => {
						// Create a unique callback function
						window[callbackName] = (data) => {
							resolve(data);
							// Clean up
							delete window[callbackName];
							document.head.removeChild(script);
						};

						// Create script tag
						const script = document.createElement('script');
						script.src = jsonpUrl;
						script.onerror = () => {
							reject(new Error('Failed to load programs data'));
							delete window[callbackName];
							document.head.removeChild(script);
						};

						// Set timeout
						const timeout = setTimeout(() => {
							reject(new Error('Request timed out'));
							delete window[callbackName];
							if (document.head.contains(script)) {
								document.head.removeChild(script);
							}
						}, 10000); // 10 second timeout

						// Override the callback to also clear timeout
						const originalCallback = window[callbackName];
						window[callbackName] = (data) => {
							clearTimeout(timeout);
							originalCallback(data);
						};

						// Add script to page
						document.head.appendChild(script);
					});

					if (!data?.programs) throw new Error('No programs data received');

					const programsData = Array.isArray(data.programs) ? data.programs : [data.programs];

					programs = programsData
						.map((program) => ({
							id: String(program.id),
							name: program.name || '',
							description: program.description || '',
							programimage: program.programimage || '',
							programurl: program.programurl || '',
							haspod: program.haspod || false,
							hasondemand: program.hasondemand || false,
							archived: program.archived || false,
							category: program.programcategory
								? {
										id: program.programcategory.id,
										name: program.programcategory.name,
								  }
								: undefined,
						}))
						.filter(program => program.haspod || program.hasondemand) // Only keep programs that have either pod or ondemand content
						.sort((a, b) => {
							return a.name.localeCompare(b.name, 'sv');
						});

					document.getElementById('loading').style.display = 'none';
					document.getElementById('content').style.display = 'block';

					renderProgramsTable();
					filterPrograms();
				} catch (error) {
					console.error('Failed to fetch programs:', error);
					document.getElementById('loading').style.display = 'none';
					document.getElementById('error').style.display = 'block';
					document.getElementById('errorDetails').textContent = error.message;
				}
			}

			document.addEventListener('DOMContentLoaded', () => {
				document.getElementById('searchBox').addEventListener('input', (e) => {
					currentSearch = e.target.value;
					filterPrograms();
				});

				document.getElementById('includeArchived').addEventListener('change', (e) => {
					includeArchived = e.target.checked;
					filterPrograms();
				});

				fetchPrograms();
			});
		</script>
	</body>
</html>`;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			const url = new URL(request.url);
			const programId = url.searchParams.get('programid');
			const fileType = url.searchParams.get('filetype');

			// If no programid is provided, serve the programs listing page
			if (!programId) {
				const htmlContent = getProgramsHTML();
				return new Response(htmlContent, {
					status: 200,
					headers: {
						'Content-Type': 'text/html; charset=utf-8',
						'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
					},
				});
			}

			// Validate programId is numeric
			if (!/^\d+$/.test(programId)) {
				return new Response('Invalid programid: must be numeric', {
					status: 400,
					headers: { 'Content-Type': 'text/plain' },
				});
			}

			// Validate fileType parameter if provided
			let validatedFileType: 'download' | 'broadcast' = 'download';
			if (fileType) {
				if (fileType !== 'download' && fileType !== 'broadcast') {
					return new Response('Invalid filetype: must be "download" or "broadcast"', {
						status: 400,
						headers: { 'Content-Type': 'text/plain' },
					});
				}
				validatedFileType = fileType;
			}

			// Fetch episodes and program info in parallel
			const episodesUrl = `https://api.sr.se/api/v2/episodes/index?programid=${programId}&format=json&size=100`;
			const [episodesResponse, program] = await Promise.all([fetchSRData(episodesUrl), fetchProgramInfo(programId)]);

			let episodes: SREpisode[] = [];
			if (episodesResponse.episodes) {
				episodes = Array.isArray(episodesResponse.episodes) ? episodesResponse.episodes : [episodesResponse.episodes];
			}

			if (episodes.length === 0) {
				return new Response(`No episodes found for program ID: ${programId}`, {
					status: 404,
					headers: { 'Content-Type': 'text/plain' },
				});
			}

			// Generate RSS feed
			const feedUrl = request.url;
			const rssContent = generatePodcastRSS(episodes, program, feedUrl, validatedFileType);

			return new Response(rssContent, {
				status: 200,
				headers: {
					'Content-Type': 'application/rss+xml; charset=utf-8',
					'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
					'Access-Control-Allow-Origin': '*',
					'X-Content-Type-Options': 'nosniff',
					'X-Frame-Options': 'DENY',
					'Content-Disposition': 'inline; filename="podcast.xml"',
					Vary: 'Accept-Encoding',
				},
			});
		} catch (error) {
			console.error('Error generating podcast feed:', error);
			return new Response(`Internal Server Error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
				status: 500,
				headers: { 'Content-Type': 'text/plain' },
			});
		}
	},
} satisfies ExportedHandler<Env>;
