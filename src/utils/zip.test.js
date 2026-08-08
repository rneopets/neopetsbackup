const { TextEncoder, TextDecoder } = require('node:util');
const { Blob } = require('buffer');
const zlib = require('node:zlib');
const { Duplex } = require('node:stream');

// react-app-polyfill/jsdom (loaded by react-scripts before setupTests.js)
// overrides global.Response with a whatwg-fetch polyfill that can't handle
// streaming bodies, which @zip.js/zip.js relies on internally. It also has
// no CompressionStream/DecompressionStream, so it falls back to a bundled
// WASM codec that throws in this environment. @zip.js/zip.js reads these
// globals off `globalThis` the moment it's required, so the replacements
// must be installed via plain `require()` calls (not hoisted ES `import`s)
// before requiring the package.
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.Blob = Blob;

class ShimHeaders {
  constructor(init) {
    this._map = new Map(
      (init || []).map(([key, value]) => [String(key).toLowerCase(), value])
    );
  }
  get(name) {
    return this._map.get(String(name).toLowerCase()) || null;
  }
}

class ShimResponse {
  constructor(body, options = {}) {
    this._body = body;
    this._headers = new ShimHeaders(options.headers);
  }
  get headers() {
    return this._headers;
  }
  async blob() {
    const reader = this._body.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const type = this._headers.get('content-type');
    return new Blob(chunks, type ? { type } : undefined);
  }
}

global.Response = ShimResponse;

class NodeCompressionStream {
  constructor(format) {
    const zlibStream =
      format === 'gzip'
        ? zlib.createGzip()
        : format === 'deflate'
          ? zlib.createDeflate()
          : zlib.createDeflateRaw();
    const web = Duplex.toWeb(zlibStream);
    this.readable = web.readable;
    this.writable = web.writable;
  }
}

class NodeDecompressionStream {
  constructor(format) {
    const zlibStream =
      format === 'gzip'
        ? zlib.createGunzip()
        : format === 'deflate'
          ? zlib.createInflate()
          : zlib.createInflateRaw();
    const web = Duplex.toWeb(zlibStream);
    this.readable = web.readable;
    this.writable = web.writable;
  }
}

global.CompressionStream = NodeCompressionStream;
global.DecompressionStream = NodeDecompressionStream;

const zip = require('@zip.js/zip.js');
const fs = require('fs');
const path = require('path');

const fileBuffer = fs.readFileSync(
  path.join(__dirname, '../../public/alex.png')
);
const blob = new Blob([fileBuffer], { type: 'image/png' });

test('creates a zip file containing the fixture image', async () => {
  const zipWriter = new zip.ZipWriter(new zip.BlobWriter('application/zip'));
  await zipWriter.add('images/alex.png', new zip.BlobReader(blob));
  const zipBlob = await zipWriter.close();
  expect(zipBlob.type).toBe('application/zip');
  expect(zipBlob.size).toBeGreaterThan(0);
});

test('round-trips the fixture image through a zip file', async () => {
  const zipWriter = new zip.ZipWriter(new zip.BlobWriter('application/zip'));
  await zipWriter.add('images/alex.png', new zip.BlobReader(blob));
  const zipBlob = await zipWriter.close();

  const zipReader = new zip.ZipReader(new zip.BlobReader(zipBlob));
  const entries = await zipReader.getEntries();
  expect(entries.length).toBe(1);
  expect(entries[0].filename).toBe('images/alex.png');
  expect(entries[0].directory).toBeFalsy();

  const extractedBlob = await entries[0].getData(
    new zip.BlobWriter('image/png')
  );
  expect(extractedBlob.size).toBe(fileBuffer.length);

  await zipReader.close();
});
