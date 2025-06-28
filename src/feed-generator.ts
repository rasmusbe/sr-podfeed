import { XMLBuilder } from 'fast-xml-parser';

export interface SREpisode {
	id: string;
	title: string;
	description: string;
	publishdateutc: string;
	url: string;
	imageurl?: string;
	listenpodfile?: {
		url: string;
		duration: number;
		filesizeinbytes: number;
		title?: string;
		description?: string;
	};
	downloadpodfile?: {
		url: string;
		duration: number;
		filesizeinbytes: number;
		title?: string;
		description?: string;
	};
	broadcast?: {
		availablestoputc?: string;
		playlist?: {
			id: string;
			url: string;
			statkey: string;
			duration: number;
			publishdateutc: string;
		};
		broadcastfiles?: Array<{
			id: string;
			url: string;
			statkey: string;
			duration: number;
			publishdateutc: string;
		}>;
	};
	program: {
		id: string;
		name: string;
	};
}

export interface SRProgram {
	id: string;
	name: string;
	description?: string;
	programimage?: string;
	programurl?: string;
	category?: {
		id: number;
		name: string;
	};
	channel?: {
		name: string;
	};
}

// Mapping from Swedish Radio categories to iTunes categories
function mapSRCategoryToiTunes(srCategoryId?: number): { category: string; subcategory?: string } {
	if (!srCategoryId) {
		return { category: 'Society & Culture' };
	}

	const categoryMap: Record<number, { category: string; subcategory?: string }> = {
		// Children's programs
		2: { category: 'Kids & Family', subcategory: 'Stories for Kids' }, // Barn 3 - 8 år
		132: { category: 'Kids & Family', subcategory: 'Education for Kids' }, // Barn 9 - 13 år

		// Content types
		82: { category: 'Society & Culture', subcategory: 'Documentary' }, // Dokumentär
		134: { category: 'Fiction', subcategory: 'Drama' }, // Drama
		133: { category: 'Comedy' }, // Humor

		// Subject areas
		135: { category: 'Business' }, // Ekonomi
		136: { category: 'History' }, // Historia
		3: { category: 'Arts' }, // Kultur/Nöje
		14: { category: 'Health & Fitness' }, // Livsstil
		4: { category: 'Religion & Spirituality', subcategory: 'Philosophy' }, // Livsåskådning
		5: { category: 'Music' }, // Musik
		12: { category: 'Science', subcategory: 'Nature' }, // Vetenskap/Miljö

		// News and society
		11: { category: 'News' }, // News in other languages
		68: { category: 'News', subcategory: 'Daily News' }, // Nyheter
		7: { category: 'Society & Culture' }, // Samhälle

		// Sports
		10: { category: 'Sports' }, // Sport
	};

	return categoryMap[srCategoryId] || { category: 'Society & Culture' };
}

function formatRFC2822Date(dateString: string): string {
	let date: Date;

	// Handle .NET JSON date format: "/Date(1746158460000)/"
	const dotNetDateMatch = dateString.match(/\/Date\((\d+)\)\//);
	if (dotNetDateMatch) {
		const timestamp = parseInt(dotNetDateMatch[1], 10);
		date = new Date(timestamp);
	} else {
		// Handle SR API date format: "2012-09-15 18:03:00Z"
		// Convert to ISO format if needed by replacing space with 'T'
		let isoDateString = dateString;
		if (dateString.includes(' ') && dateString.endsWith('Z')) {
			isoDateString = dateString.replace(' ', 'T');
		}

		date = new Date(isoDateString);
	}

	// Check if date is valid
	if (isNaN(date.getTime())) {
		console.error(`Invalid date string: ${dateString}`);
		return ''; // Return empty string for invalid dates
	}

	return date.toUTCString();
}

export async function fetchSRData(url: string): Promise<any> {
	const response = await fetch(url, {
		headers: {
			'User-Agent': 'Play/3435 CFNetwork/3826.500.131 Darwin/24.5.0',
		},
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	return await response.json();
}

export async function fetchProgramInfo(programId: string): Promise<SRProgram | null> {
	try {
		const url = `https://api.sr.se/api/v2/programs/${programId}?format=json`;
		const data = await fetchSRData(url);

		if (data?.program) {
			const program = data.program;
			return {
				id: String(program.id || programId),
				name: program.name || '',
				description: program.description || '',
				programimage: program.programimage || '',
				programurl: program.programurl || '',
				category: program.programcategory
					? {
							id: program.programcategory.id,
							name: program.programcategory.name,
					  }
					: undefined,
			};
		}

		return null;
	} catch (error) {
		console.error('Failed to fetch program info:', error);
		return null;
	}
}

export function generatePodcastRSS(
	episodes: SREpisode[],
	program?: SRProgram | null,
	feedUrl?: string,
	fileType: 'download' | 'broadcast' = 'download'
): string {
	const firstEpisode = episodes[0];
	const programName = program?.name || firstEpisode?.program?.name || 'Unknown Program';
	const programDescription = program?.description || `Episodes from ${programName}`;
	const programImage = program?.programimage || firstEpisode?.imageurl || '';
	const programUrl = program?.programurl || firstEpisode?.url || '';

	// Map SR category to iTunes category
	const itunesCategory = mapSRCategoryToiTunes(program?.category?.id);

	// Build RSS structure as JavaScript object
	const rssObj: any = {
		'?xml': {
			'@_version': '1.0',
			'@_encoding': 'UTF-8',
		},
		rss: {
			'@_version': '2.0',
			'@_xmlns:itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd',
			'@_xmlns:content': 'http://purl.org/rss/1.0/modules/content/',
			'@_xmlns:atom': 'http://www.w3.org/2005/Atom',
			'@_xmlns:podcast': 'https://podcastindex.org/namespace/1.0',
			channel: {
				title: programName,
				link: programUrl,
				description: programDescription,
				language: 'sv-se',
				copyright: '© Sveriges Radio',
				'itunes:author': 'Sveriges Radio',
				'itunes:explicit': 'false',
				'podcast:locked': 'false',
				item: [],
			},
		},
	};

	// Add iTunes category
	if (itunesCategory.subcategory) {
		rssObj.rss.channel['itunes:category'] = {
			'@_text': itunesCategory.category,
			'itunes:category': {
				'@_text': itunesCategory.subcategory,
			},
		};
	} else {
		rssObj.rss.channel['itunes:category'] = {
			'@_text': itunesCategory.category,
		};
	}

	// Add optional channel elements
	if (programImage) {
		rssObj.rss.channel['itunes:image'] = {
			'@_href': programImage,
		};
	}

	if (feedUrl) {
		rssObj.rss.channel['atom:link'] = {
			'@_href': feedUrl,
			'@_rel': 'self',
			'@_type': 'application/rss+xml',
		};
	}

	// Add episodes
	for (const episode of episodes) {
		// Select pod file based on fileType parameter
		let podFile;
		if (fileType === 'broadcast') {
			// For broadcast, get the first broadcast file from the array
			const broadcastFiles = episode.broadcast?.broadcastfiles;

			if (broadcastFiles && broadcastFiles.length > 0) {
				const broadcastFile = broadcastFiles[0];
				// Create a compatible interface for broadcast files
				podFile = {
					url: broadcastFile.url,
					duration: broadcastFile.duration,
					filesizeinbytes: 0, // Broadcast files don't have filesize
					title: episode.title, // Use episode title since broadcast files don't have title
					description: episode.description, // Use episode description since broadcast files don't have description
				};
			} else {
				// Skip episodes without broadcast files when filetype=broadcast
				console.log(`Skipping episode ${episode.id}: no broadcast file available`);
				continue;
			}
		} else {
			podFile = episode.downloadpodfile || episode.listenpodfile;
		}

		if (!podFile || !podFile.url) {
			console.log(`Skipping episode ${episode.id}: no audio file available`);
			continue;
		}

		const episodeTitle = episode.title || podFile.title || `Episode ${episode.id}`;
		const episodeDescription = episode.description || podFile.description || '';
		const pubDate = episode.publishdateutc ? formatRFC2822Date(episode.publishdateutc) : '';
		const duration = podFile.duration || 0;
		const fileSize = podFile.filesizeinbytes || 0;

		// Determine MIME type based on URL extension
		let mimeType = 'audio/mpeg';
		if (podFile.url.includes('.m4a') || podFile.url.includes('.mp4')) {
			mimeType = 'audio/mp4';
		}

		const itemObj: any = {
			title: episodeTitle,
			description: episodeDescription,
			enclosure: {
				'@_url': podFile.url,
				'@_length': String(fileSize),
				'@_type': mimeType,
			},
			guid: {
				'@_isPermaLink': 'false',
				'#text': episode.id,
			},
			'itunes:explicit': 'false',
		};

		if (pubDate) {
			itemObj.pubDate = pubDate;
		}

		if (duration > 0) {
			itemObj['itunes:duration'] = String(duration);
		}

		if (episode.url) {
			itemObj.link = episode.url;
		}

		if (episode.imageurl) {
			itemObj['itunes:image'] = {
				'@_href': episode.imageurl,
			};
		}

		rssObj.rss.channel.item.push(itemObj);
	}

	// Build XML using fast-xml-parser
	const builder = new XMLBuilder({
		attributeNamePrefix: '@_',
		ignoreAttributes: false,
		format: true,
		indentBy: '  ',
		suppressEmptyNode: true,
	});

	return builder.build(rssObj);
}
