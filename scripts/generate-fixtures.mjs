import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export async function generateFixtures() {
  const fixturesDir = path.resolve(process.cwd(), 'fixtures/storage');
  fs.mkdirSync(path.join(fixturesDir, 'portraits'), { recursive: true });
  fs.mkdirSync(path.join(fixturesDir, 'projects'), { recursive: true });
  fs.mkdirSync(path.join(fixturesDir, 'docs'), { recursive: true });

  // 1. Avatar (1:1 aspect ratio, 800x800)
  const avatar = await sharp({
    create: { width: 800, height: 800, channels: 3, background: { r: 15, g: 23, b: 42 } },
  }).jpeg({ quality: 85 }).toBuffer();
  fs.writeFileSync(path.join(fixturesDir, 'portraits/avatar.jpg'), avatar);

  // 2. Integrum (16:9 aspect ratio, 1920x1080)
  const integrum = await sharp({
    create: { width: 1920, height: 1080, channels: 3, background: { r: 14, g: 30, b: 60 } },
  }).jpeg({ quality: 85 }).toBuffer();
  fs.writeFileSync(path.join(fixturesDir, 'projects/integrum.jpg'), integrum);

  // 3. IoT Temp Monitor (16:9 aspect ratio, 1920x1080)
  const iot = await sharp({
    create: { width: 1920, height: 1080, channels: 3, background: { r: 6, g: 44, b: 36 } },
  }).jpeg({ quality: 85 }).toBuffer();
  fs.writeFileSync(path.join(fixturesDir, 'projects/iot-temp-monitor.jpg'), iot);

  // 4. Resume PDF (starts with %PDF-1.4, ends with %%EOF, labeled as development fixture)
  const pdfLines = [
    '%PDF-1.4',
    '1 0 obj',
    '<< /Type /Catalog /Pages 2 0 R >>',
    'endobj',
    '2 0 obj',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    'endobj',
    '3 0 obj',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents 4 0 R >>',
    'endobj',
    '4 0 obj',
    '<< /Length 130 >>',
    'stream',
    'BT',
    '/F1 18 Tf',
    '50 720 Td',
    '(Sufiyan Shaikh - Development Fixture Resume) Tj',
    '0 -30 Td',
    '/F1 12 Tf',
    '(Non-production placeholder for Phase 2 integration testing) Tj',
    'ET',
    'endstream',
    'endobj',
    'xref',
    '0 5',
    '0000000000 65535 f ',
    '0000000009 00000 n ',
    '0000000058 00000 n ',
    '0000000115 00000 n ',
    '0000000287 00000 n ',
    'trailer',
    '<< /Size 5 /Root 1 0 R >>',
    'startxref',
    '468',
    '%%EOF',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(fixturesDir, 'docs/sufiyan_shaikh_resume.pdf'), pdfLines);

  return {
    avatar: { size: avatar.length, width: 800, height: 800 },
    integrum: { size: integrum.length, width: 1920, height: 1080 },
    iot: { size: iot.length, width: 1920, height: 1080 },
    resume: { size: Buffer.byteLength(pdfLines, 'utf8') },
  };
}

if (process.argv[1] && import.meta.url.includes(path.basename(process.argv[1]))) {
  generateFixtures()
    .then((res) => {
      console.log('Fixtures generated successfully:', res);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
