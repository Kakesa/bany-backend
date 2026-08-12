import { Router } from 'express';

const router = Router();

async function proxyYoutubeRss(
  res: import('express').Response,
  youtubeUrl: string,
  errorLabel: string
) {
  try {
    const rssRes = await fetch(youtubeUrl, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    if (!rssRes.ok) {
      return res.status(rssRes.status).send(`Failed to fetch ${errorLabel}`);
    }
    const xml = await rssRes.text();
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.send(xml);
  } catch (error) {
    console.error(`${errorLabel} proxy error:`, error);
    res.status(502).send(`Failed to fetch ${errorLabel}`);
  }
}

router.get('/playlist', async (req, res) => {
  const playlistId = req.query.playlist_id;
  if (!playlistId || typeof playlistId !== 'string') {
    return res.status(400).send('Missing playlist_id');
  }
  await proxyYoutubeRss(
    res,
    `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistId)}`,
    'YouTube RSS'
  );
});

router.get('/channel', async (req, res) => {
  const channelId = req.query.channel_id;
  if (!channelId || typeof channelId !== 'string') {
    return res.status(400).send('Missing channel_id');
  }

  const cleanId = channelId.trim().replace(/^["']|["']$/g, '');
  // UC… → UU… (playlist Uploads) — plus fiable que channel_id en prod
  const uploadsPlaylistId = cleanId.startsWith('UC')
    ? `UU${cleanId.slice(2)}`
    : cleanId;

  await proxyYoutubeRss(
    res,
    `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(uploadsPlaylistId)}`,
    'YouTube channel RSS'
  );
});

export default router;
