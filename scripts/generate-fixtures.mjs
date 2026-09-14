import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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

  // 4. Resume PDF generated using pdf-lib (valid structure, 1 page, proper xrefs & trailers)
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle('Sufiyan Shaikh - Development Fixture Resume');
  pdfDoc.setAuthor('Sufiyan Shaikh');
  pdfDoc.setSubject('Phase 2 Local Test Fixture');
  pdfDoc.setCreator('pdf-lib');
  pdfDoc.setProducer('pdf-lib');

  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText('Sufiyan Shaikh - Development Fixture Resume', {
    x: 50,
    y: 720,
    size: 18,
    font,
    color: rgb(0.1, 0.15, 0.25),
  });

  page.drawText('Non-production placeholder for Phase 2 integration testing', {
    x: 50,
    y: 695,
    size: 12,
    font: regularFont,
    color: rgb(0.3, 0.35, 0.45),
  });

  page.drawText('This document is a structurally valid PDF fixture used for local storage tests.', {
    x: 50,
    y: 670,
    size: 10,
    font: regularFont,
    color: rgb(0.4, 0.45, 0.55),
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(path.join(fixturesDir, 'docs/sufiyan_shaikh_resume.pdf'), Buffer.from(pdfBytes));

  return {
    avatar: { size: avatar.length, width: 800, height: 800 },
    integrum: { size: integrum.length, width: 1920, height: 1080 },
    iot: { size: iot.length, width: 1920, height: 1080 },
    resume: { size: pdfBytes.length },
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
