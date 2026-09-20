import { describe, it, expect } from 'vitest';
import {
  validateMediaBuffer,
  sanitizeSvgContent,
  generateSafeHashedFilename,
} from '../../scripts/lib/media-validator.mjs';

describe('Media Security Validator & SVG Sanitizer', () => {
  describe('validateMediaBuffer', () => {
    it('validates compliant JPEG buffer', () => {
      // JPEG starts with ffd8ff and ends with ffd9
      const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0xff, 0xd9]);
      const result = validateMediaBuffer(buffer, 'image/jpeg', buffer.length);
      expect(result.ext).toBe('jpg');
    });

    it('rejects JPEG with missing end marker or byte count mismatch', () => {
      const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x00, 0x00]);
      expect(() => validateMediaBuffer(buffer, 'image/jpeg', buffer.length)).toThrow(
        /Invalid JPEG/
      );

      const validBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xd9]);
      expect(() => validateMediaBuffer(validBuf, 'image/jpeg', validBuf.length + 5)).toThrow(
        /Byte count mismatch/
      );
    });

    it('validates compliant PNG buffer', () => {
      // PNG header: 89 50 4E 47 0D 0A 1A 0A
      const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
      const result = validateMediaBuffer(buffer, 'image/png', buffer.length);
      expect(result.ext).toBe('png');
    });

    it('validates compliant WebP buffer with exact RIFF length calculation', () => {
      // RIFF header (4 bytes) + 4 bytes payload size (little endian: 12) + WEBP (4 bytes) + 8 bytes payload
      const buffer = Buffer.alloc(20);
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(12, 4); // 20 - 8 = 12
      buffer.write('WEBP', 8);
      buffer.write('VP8 ', 12);

      const result = validateMediaBuffer(buffer, 'image/webp', buffer.length);
      expect(result.ext).toBe('webp');
    });

    it('rejects WebP buffer when RIFF payload size does not match buffer length', () => {
      const buffer = Buffer.alloc(20);
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(999, 4); // mismatch!
      buffer.write('WEBP', 8);

      expect(() => validateMediaBuffer(buffer, 'image/webp', buffer.length)).toThrow(
        /RIFF size header mismatch/
      );
    });

    it('rejects unapproved MIME types', () => {
      const buffer = Buffer.from('hello');
      expect(() => validateMediaBuffer(buffer, 'application/exe', buffer.length)).toThrow(
        /Unapproved MIME type/
      );
    });
  });

  describe('sanitizeSvgContent', () => {
    it('accepts compliant SVG with standard namespaces and internal fragment references', () => {
      const validSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="gradient-1">
              <stop offset="0%" stop-color="#00f0ff"/>
              <stop offset="100%" stop-color="#7000ff"/>
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="40" fill="url(#gradient-1)" />
          <use xlink:href="#gradient-1" />
        </svg>
      `;

      expect(() => sanitizeSvgContent(validSvg)).not.toThrow();
    });

    it('rejects SVG containing DOCTYPE or entity declarations', () => {
      const doctypeSvg = `
        <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
        <svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="5"/></svg>
      `;
      expect(() => sanitizeSvgContent(doctypeSvg)).toThrow(/DOCTYPE/);

      const entitySvg = `
        <!ENTITY xxe SYSTEM "file:///etc/passwd">
        <svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="5"/></svg>
      `;
      expect(() => sanitizeSvgContent(entitySvg)).toThrow(/ENTITY/);
    });

    it('rejects dangerous tags such as script, foreignObject, iframe', () => {
      const scriptSvg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`;
      expect(() => sanitizeSvgContent(scriptSvg)).toThrow(/Forbidden SVG tag: <script>/);

      const foreignSvg = `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body>hello</body></foreignObject></svg>`;
      expect(() => sanitizeSvgContent(foreignSvg)).toThrow(/Forbidden SVG tag: <foreignobject>/);
    });

    it('rejects inline event handlers on any element', () => {
      const eventSvg = `<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="5" onclick="alert(1)"/></svg>`;
      expect(() => sanitizeSvgContent(eventSvg)).toThrow(/Forbidden event handler attribute: onclick/);
    });

    it('rejects external url() in fill, filter, or style attributes', () => {
      const externalUrlSvg = `<svg xmlns="http://www.w3.org/2000/svg"><rect fill="url(https://malicious.example/file.svg#paint)"/></svg>`;
      expect(() => sanitizeSvgContent(externalUrlSvg)).toThrow(/External or unsafe url\(\)/);

      const externalFilterSvg = `<svg xmlns="http://www.w3.org/2000/svg"><g filter="url(http://evil.com/filter.svg)"/></svg>`;
      expect(() => sanitizeSvgContent(externalFilterSvg)).toThrow(/External or unsafe url\(\)/);
    });

    it('rejects javascript: and remote URLs in href or src attributes', () => {
      const jsHrefSvg = `<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><circle cx="5" cy="5" r="5"/></a></svg>`;
      expect(() => sanitizeSvgContent(jsHrefSvg)).toThrow(/Unsafe URI in href/);

      const remoteHrefSvg = `<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/tracking.png"/></svg>`;
      expect(() => sanitizeSvgContent(remoteHrefSvg)).toThrow(/Unsafe URI in href/);
    });
  });

  describe('generateSafeHashedFilename', () => {
    it('sanitizes non-alphanumerics into underscores and formats clean filename', () => {
      const filename = generateSafeHashedFilename('iot-temp-monitor.jpg', '0d3348f370413ed8', 'jpg');
      expect(filename).toBe('iot_temp_monitor-0d3348f370413ed8.jpg');
      expect(filename).toMatch(/^[a-z0-9_]+-[a-f0-9]{16}\.(jpg|png|webp|svg)$/);
    });

    it('handles special characters and path traversal attempts safely', () => {
      const filename = generateSafeHashedFilename('../../../etc/passwd.png', 'a1b2c3d4e5f60718', 'png');
      expect(filename).toBe('passwd-a1b2c3d4e5f60718.png');
      expect(filename).toMatch(/^[a-z0-9_]+-[a-f0-9]{16}\.(jpg|png|webp|svg)$/);
    });
  });
});
