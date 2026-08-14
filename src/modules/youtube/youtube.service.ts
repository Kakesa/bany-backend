const INNERTUBE_CLIENT = {
  clientName: 'WEB',
  clientVersion: '2.20240801.00.00',
  hl: 'fr',
  gl: 'FR',
};

type PlaylistItem = {
  videoId: string;
  title: string;
  duration: string;
  thumbnail: string;
  publishedLabel: string;
};

async function browseInnertube(payload: Record<string, unknown>) {
  const res = await fetch('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify({ context: { client: INNERTUBE_CLIENT }, ...payload }),
  });
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

export async function fetchYoutubePlaylistItems(playlistId: string): Promise<PlaylistItem[]> {
  const cleanId = String(playlistId || '').trim();
  if (!cleanId) throw new Error('Missing playlist_id');

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

  return items.filter((item) => {
    if (seen.has(item.videoId)) return false;
    seen.add(item.videoId);
    return true;
  });
}
