import path from 'node:path';
import { JSDOM } from 'jsdom';

const APPROVED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]);

const FORBIDDEN_TAGS = new Set([
  'script',
  'foreignobject',
  'iframe',
  'embed',
  'object',
  'style',
  'animate',
  'set',
]);

/**
 * Validates binary media buffers by magic byte inspection, byte count, and format checks.
 */
export function validateMediaBuffer(buffer, fileType, expectedSize) {
  if (!APPROVED_MIME_TYPES.has(fileType)) {
    throw new Error(`Unapproved MIME type: ${fileType}. Only JPEG, PNG, WebP, and SVG are permitted.`);
  }

  if (buffer.length !== expectedSize) {
    throw new Error(
      `Byte count mismatch: buffer is ${buffer.length} bytes, expected ${expectedSize} bytes.`
    );
  }

  if (fileType === 'image/jpeg') {
    if (buffer.length < 4) {
      throw new Error('Invalid JPEG buffer: file too short.');
    }
    const startsWithSoi = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const endsWithEoi = buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9;
    if (!startsWithSoi || !endsWithEoi) {
      throw new Error('Invalid JPEG structure: missing start-of-image or end-of-image marker.');
    }
    return { ext: 'jpg' };
  }

  if (fileType === 'image/png') {
    if (buffer.length < 8) {
      throw new Error('Invalid PNG buffer: file too short.');
    }
    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a;
    if (!isPng) {
      throw new Error('Invalid PNG structure: magic header does not match PNG signature.');
    }
    return { ext: 'png' };
  }

  if (fileType === 'image/webp') {
    if (buffer.length < 12) {
      throw new Error('Invalid WebP buffer: file too short.');
    }
    const isRiff = buffer.subarray(0, 4).toString('ascii') === 'RIFF';
    const isWebp = buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    if (!isRiff || !isWebp) {
      throw new Error('Invalid WebP structure: missing RIFF/WEBP header signature.');
    }
    const riffSize = buffer.readUInt32LE(4);
    if (riffSize + 8 !== buffer.length) {
      throw new Error(
        `Invalid WebP structure: RIFF size header mismatch (header says ${riffSize}, actual payload length is ${buffer.length - 8}).`
      );
    }
    return { ext: 'webp' };
  }

  if (fileType === 'image/svg+xml') {
    sanitizeSvgContent(buffer.toString('utf8'));
    return { ext: 'svg' };
  }

  throw new Error(`Unhandled approved MIME type: ${fileType}`);
}

/**
 * Hardened SVG security inspection using JSDOM XML DOMParser.
 */
export function sanitizeSvgContent(svgText) {
  if (typeof svgText !== 'string' || !svgText.trim()) {
    throw new Error('SVG content is empty or invalid string.');
  }

  // Reject DOCTYPE or ENTITY declarations upfront
  if (/<!DOCTYPE/i.test(svgText)) {
    throw new Error('Forbidden SVG: DOCTYPE declarations are prohibited.');
  }
  if (/<!ENTITY/i.test(svgText)) {
    throw new Error('Forbidden SVG: ENTITY declarations are prohibited.');
  }

  const dom = new JSDOM(svgText, { contentType: 'image/svg+xml' });
  const doc = dom.window.document;

  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error(`Malformed XML in SVG: ${parserError.textContent}`);
  }

  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== 'svg') {
    throw new Error('Root element of SVG must be <svg>.');
  }

  // Recursively inspect all elements and attributes
  const allElements = [root, ...Array.from(root.querySelectorAll('*'))];
  for (const el of allElements) {
    const tagName = el.tagName.toLowerCase();
    if (FORBIDDEN_TAGS.has(tagName)) {
      throw new Error(`Forbidden SVG tag: <${tagName}>`);
    }

    const attrs = Array.from(el.attributes || []);
    for (const attr of attrs) {
      const attrName = attr.name.toLowerCase();
      const attrValue = attr.value;

      // 1. Reject any attribute starting with 'on'
      if (attrName.startsWith('on')) {
        throw new Error(`Forbidden event handler attribute: ${attrName}`);
      }

      // 2. Exempt standard approved XML namespaces
      if (attrName === 'xmlns' || attrName.startsWith('xmlns:')) {
        continue;
      }

      // 3. Inspect attribute values for url()
      if (/url\s*\(/i.test(attrValue)) {
        // Permit only internal fragment references, e.g. url(#gradient-1)
        if (!/^url\s*\(\s*#[-a-zA-Z0-9_]+\s*\)$/i.test(attrValue.trim())) {
          throw new Error(`External or unsafe url() reference in attribute ${attrName}: "${attrValue}"`);
        }
      }

      // 4. Inspect URI references (href, xlink:href, src)
      if (attrName === 'href' || attrName === 'xlink:href' || attrName === 'src') {
        // Permit only internal fragments: e.g. #gradient-1
        if (!/^#[-a-zA-Z0-9_]+$/.test(attrValue.trim())) {
          throw new Error(`Unsafe URI in href/src attribute ${attrName}: "${attrValue}"`);
        }
      }

      // 5. Check for CSS @import, javascript:, or data:
      if (/@import/i.test(attrValue)) {
        throw new Error(`Forbidden CSS @import in attribute ${attrName}`);
      }
      if (/javascript:/i.test(attrValue)) {
        throw new Error(`Forbidden javascript: protocol in attribute ${attrName}`);
      }
      if (/data:/i.test(attrValue)) {
        throw new Error(`Forbidden data: URI in attribute ${attrName}`);
      }
    }
  }
}

/**
 * Generates an immutable, sanitized, content-hashed filename conforming strictly to:
 * ^[a-z0-9_]+-[a-f0-9]{16}\.(jpg|png|webp|svg)$
 */
export function generateSafeHashedFilename(originalName, hash16, ext) {
  const cleanBase =
    path
      .parse(path.basename(originalName))
      .name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'asset';

  const cleanExt = ext.toLowerCase().replace(/^\./, '');
  return `${cleanBase}-${hash16}.${cleanExt}`;
}
