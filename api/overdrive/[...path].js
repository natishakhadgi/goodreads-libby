const mediaPathPattern =
  /^\/libraries\/[a-zA-Z0-9._~-]+\/media(?:\/bulk)?$/;

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).send('Method not allowed');
    return;
  }

  const pathParts = request.query.path;
  const overDrivePath =
    '/' + (Array.isArray(pathParts) ? pathParts.join('/') : String(pathParts || ''));

  if (!mediaPathPattern.test(overDrivePath)) {
    response.status(404).send('Not found');
    return;
  }

  const query = new URLSearchParams();
  Object.entries(request.query).forEach(([key, value]) => {
    if (key === 'path') return;
    (Array.isArray(value) ? value : [value]).forEach((item) => {
      if (item != null) query.append(key, String(item));
    });
  });
  const upstreamUrl =
    `https://thunder.api.overdrive.com/v2${overDrivePath}` +
    (query.size > 0 ? `?${query}` : '');

  try {
    const upstream = await fetch(upstreamUrl);
    const body = await upstream.arrayBuffer();

    response.setHeader('Cache-Control', 'no-store');
    response.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') ?? 'application/json; charset=utf-8'
    );
    response.status(upstream.status).send(Buffer.from(body));
  } catch (error) {
    console.error('OverDrive proxy request failed:', error);
    response.status(502).send('OverDrive service is unavailable');
  }
}
