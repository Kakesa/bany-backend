const INNERTUBE_CLIENT = {
  clientName: 'WEB',
  clientVersion: '2.20240801.00.00',
  hl: 'fr',
  gl: 'FR',
};

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.privacyredirect.com',
  'https://yewtu.be',
];

type PlaylistItem = {
  videoId: string;
  title: string;
  duration: string;
  thumbnail: string;
  publishedLabel: string;
};

async function browseInnertube(payload: Record<string, unknown>) {
  const res = await fetch(
    'https://www.youtube.com/youtubei/v1/browse?prettyPrint=false&key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Origin: 'https://www.youtube.com',
        Referer: 'https://www.youtube.com/',
      },
      body: JSON.stringify({ context: { client: INNERTUBE_CLIENT }, ...payload }),
      signal: AbortSignal.timeout(12000),
    }
  );
  if (!res.ok) {
    throw new Error(`YouTube innertube ${res.status}`);
  }
  return res.json();
}

function collectPlaylistItems(node: unknown, videos: PlaylistItem[], tokens: string[]) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((item) => collectPlaylistItems(item, videos, tokens));
    return;
  }

  const record = node as Record<string, any>;

  if (record.lockupViewModel) {
    const view = record.lockupViewModel;
    const videoId =
      view.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.videoId ||
      view.contentId;
    const title = view.metadata?.lockupMetadataViewModel?.title?.content || '';
    if (videoId && title && !/private video|deleted video/i.test(title)) {
      const metaParts =
        view.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows
          ?.flatMap((row: any) => row.metadataParts || [])
          ?.map((part: any) => part.text?.content)
          ?.filter(Boolean) || [];
      const duration =
        view.contentImage?.thumbnailViewModel?.overlays
          ?.flatMap((overlay: any) => overlay.thumbnailBottomOverlayViewModel?.badges || [])
          ?.map((badge: any) => badge.thumbnailBadgeViewModel?.text)
          ?.find(Boolean) || '';
      videos.push({
        videoId,
        title,
        duration,
        thumbnail:
          view.contentImage?.thumbnailViewModel?.image?.sources?.[0]?.url ||
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        publishedLabel: metaParts.find((text: string) => /il y a|ago|stream/i.test(text)) || '',
      });
    }
  }

  if (record.playlistVideoRenderer) {
    const view = record.playlistVideoRenderer;
    const videoId = view.videoId;
    const title = view.title?.runs?.map((run: any) => run.text).join('') || view.title?.simpleText || '';
    if (videoId && title && !/private video|deleted video/i.test(title)) {
      videos.push({
        videoId,
        title,
        duration: view.lengthText?.simpleText || '',
        thumbnail:
          view.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        publishedLabel: view.videoInfo?.runs?.map((run: any) => run.text).join(' ') || '',
      });
    }
  }

  const token =
    record.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token ||
    record.continuationItemRenderer?.continuationEndpoint?.command?.token;
  if (token) tokens.push(token);

  for (const key of Object.keys(record)) {
    if (key === 'lockupViewModel' || key === 'playlistVideoRenderer') continue;
    collectPlaylistItems(record[key], videos, tokens);
  }
}

function formatLengthSeconds(total: number): string {
  if (!Number.isFinite(total) || total <= 0) return '';
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

async function fetchFromInvidious(playlistId: string): Promise<PlaylistItem[]> {
  let lastError: unknown;
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${instance}/api/v1/playlists/${encodeURIComponent(playlistId)}`, {
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) throw new Error(`Invidious ${res.status}`);
      const data = await res.json();
      const videos = Array.isArray(data?.videos) ? data.videos : [];
      const items = videos
        .filter((video: any) => video?.videoId && video?.title)
        .map((video: any) => ({
          videoId: video.videoId as string,
          title: video.title as string,
          duration: formatLengthSeconds(video.lengthSeconds || 0),
          thumbnail: `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
          publishedLabel: '',
        }));
      if (items.length > 0) return items;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Invidious playlist empty');
}

export async function fetchYoutubePlaylistItems(playlistId: string): Promise<PlaylistItem[]> {
  const cleanId = String(playlistId || '').trim();
  if (!cleanId) throw new Error('Missing playlist_id');

  try {
    const seen = new Set<string>();
    const items: PlaylistItem[] = [];
    let tokens: string[] = [];
    const first = await browseInnertube({ browseId: `VL${cleanId}` });
    collectPlaylistItems(first, items, tokens);

    let guard = 0;
    while (tokens.length && guard++ < 20) {
      const token = tokens.shift();
      if (!token) break;
      const page = await browseInnertube({ continuation: token });
      const extra: PlaylistItem[] = [];
      const nextTokens: string[] = [];
      collectPlaylistItems(page, extra, nextTokens);
      items.push(...extra);
      tokens.push(...nextTokens);
    }

    const unique = items.filter((item) => {
      if (seen.has(item.videoId)) return false;
      seen.add(item.videoId);
      return true;
    });
    if (unique.length > 0) return unique;
  } catch (error) {
    console.warn('Innertube playlist failed, fallback Invidious', error);
  }

  return fetchFromInvidious(cleanId);
}
