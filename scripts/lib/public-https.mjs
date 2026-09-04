import { request as httpsRequest } from 'node:https';
import { Readable, pipeline } from 'node:stream';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';

// Connect only to the records already checked by the caller. Keep the original
// hostname for Host, SNI and certificate verification; never resolve it again.
export function pinnedHttpsRequest(url, { headers, addresses, signal }, requestImpl = httpsRequest) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const request = requestImpl(target, {
      method: 'GET',
      headers: { 'Accept-Encoding': 'identity', ...headers },
      servername: target.hostname,
      agent: false,
      signal,
      lookup: (_hostname, options, callback) => {
        const records = options.family ? addresses.filter((entry) => entry.family === options.family) : addresses;
        if (!records.length) return callback(new Error('No validated address for requested family'));
        if (options.all) return callback(null, records);
        callback(null, records[0].address, records[0].family);
      },
    }, (incoming) => {
      const responseHeaders = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) {
        if (value !== undefined) responseHeaders.set(name, Array.isArray(value) ? value.join(', ') : value);
      }
      const status = incoming.statusCode;
      if (status < 200 || status > 599) {
        incoming.destroy();
        reject(new Error('Invalid response status'));
        return;
      }
      if ([204, 205, 304].includes(status)) {
        incoming.resume();
        resolve(new Response(null, { status, headers: responseHeaders }));
        return;
      }
      let body = incoming;
      const encoding = responseHeaders.get('content-encoding')?.toLowerCase();
      if (encoding && encoding !== 'identity') {
        const decoder = { gzip: createGunzip, deflate: createInflate, br: createBrotliDecompress }[encoding];
        if (!decoder) {
          incoming.destroy();
          reject(new Error('Unsupported response encoding'));
          return;
        }
        body = decoder();
        pipeline(incoming, body, () => {});
        responseHeaders.delete('content-encoding');
        responseHeaders.delete('content-length');
      }
      resolve(new Response(Readable.toWeb(body), { status, headers: responseHeaders, statusText: incoming.statusMessage }));
    });
    request.once('error', reject);
    request.end();
  });
}
