export async function onRequestGet({ request }) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const sci = searchParams.get('sci');
  const emote = searchParams.get('emote') || '1';
  const size = searchParams.get('size') || '1';

  let url;
  if (name === null) {
    url = `http://pets.neopets.com/cp/${sci}/${emote}/${size}.png`;
  } else {
    url = `http://pets.neopets.com/cpn/${name}/${emote}/${size}.png`;
  }

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:84.0) Gecko/20100101 Firefox/84.0',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    Connection: 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    TE: 'Trailers',
  };

  try {
    const upstream = await fetch(url, { headers });

    if (upstream.status === 404) {
      return new Response('Not found', { status: 404 });
    }

    if (!upstream.ok) {
      return new Response(await upstream.text(), { status: upstream.status });
    }

    const responseHeaders = {
      'content-type': upstream.headers.get('content-type'),
    };

    // Only cache aggressively for sci-based requests (when name is not provided)
    if (name === null) {
      responseHeaders['Cache-Control'] = 's-maxage=43200';
    }

    // Determine final resolved path after redirects
    const finalPath = new URL(upstream.url).pathname;
    if (finalPath.startsWith('/cp/')) {
      responseHeaders['sci'] = finalPath.split('/')[2];
    }

    return new Response(upstream.body, {
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}

export const onRequestHead = onRequestGet;
