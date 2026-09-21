import { describe, it, expect } from 'vitest';
import { buildProvisioningManifest, FIXED_IDS } from '../../scripts/lib/provision-manifest.mjs';

describe('buildProvisioningManifest', () => {
  it('defines 7 canonical SEO entries with exact titles and assets', () => {
    const manifest = buildProvisioningManifest();
    expect(manifest.seoEntries).toHaveLength(7);
    const routes = manifest.seoEntries.map((s: { route_path: string }) => s.route_path);
    expect(routes).toEqual([
      '/',
      '/about',
      '/projects',
      '/projects/integrum',
      '/projects/iot-temp-monitor',
      '/skills',
      '/experience',
    ]);

    const intSeo = manifest.seoEntries.find((s: { route_path: string }) => s.route_path === '/projects/integrum');
    expect(intSeo?.og_image_asset_id).toBe(FIXED_IDS.INTEGRUM_ASSET);

    const iotSeo = manifest.seoEntries.find((s: { route_path: string }) => s.route_path === '/projects/iot-temp-monitor');
    expect(iotSeo?.og_image_asset_id).toBe(FIXED_IDS.IOT_ASSET);

    const homeSeo = manifest.seoEntries.find((s: { route_path: string }) => s.route_path === '/');
    expect(homeSeo?.og_image_asset_id).toBe(FIXED_IDS.AVATAR_ASSET);
  });

  it('provisions education with NULL start_date and end_date and NO display_order', () => {
    const manifest = buildProvisioningManifest();
    expect(manifest.education).toHaveLength(1);
    const edu = manifest.education[0];
    expect(edu.institution).toBe('R.K. Talreja College of Arts, Science and Commerce');
    expect(edu.degree).toBe('Bachelor of Science');
    expect(edu.field_of_study).toBe('Computer Science');
    expect(edu.start_date).toBeNull();
    expect(edu.end_date).toBeNull();
    expect(edu.description).toContain('Affiliated with the University of Mumbai');
    expect('display_order' in edu).toBe(false);
  });

  it('provisions exact verified skill categories and 5 skills', () => {
    const manifest = buildProvisioningManifest();
    expect(manifest.skillCategories).toHaveLength(2);
    expect(manifest.skills).toHaveLength(5);
    const skillNames = manifest.skills.map((s: { name: string }) => s.name);
    expect(skillNames).toEqual(['TypeScript', 'Python', 'C++', 'React', 'Node.js']);
  });

  it('preserves existing media and uploads ONLY the new IoT SVG', () => {
    const manifest = buildProvisioningManifest();
    expect(manifest.svgAssetsToUpload).toHaveLength(1);
    expect(manifest.svgAssetsToUpload[0].storagePath).toBe('projects/iot-temp-monitor.svg');

    expect(manifest.existingMediaDependencies).toContain('portraits/avatar.svg');
    expect(manifest.existingMediaDependencies).toContain('projects/integrum.svg');

    const avatarAsset = manifest.mediaAssets.find((m: { id: string }) => m.id === FIXED_IDS.AVATAR_ASSET);
    expect(avatarAsset?.alt_text).toContain('existing geometric profile visualization');
    expect(avatarAsset?.alt_text).not.toContain('placeholder');
  });

  it('provisions trusted static SVG for IoT project passing media validator', () => {
    const manifest = buildProvisioningManifest();
    const iotSvg = manifest.svgAssetsToUpload[0];
    expect(iotSvg.content).toContain('<svg');
    expect(iotSvg.content).not.toContain('<script');
    expect(iotSvg.content).not.toContain('javascript:');
    // Ensure no external URLs in href or src or styles
    expect(iotSvg.content).not.toMatch(/(href|src|url)\s*=\s*['"]https?:\/\//i);
  });

  it('verifies IoT project tier matches seed.sql (featured)', () => {
    const manifest = buildProvisioningManifest();
    const iotProj = manifest.projects.find((p: { slug: string }) => p.slug === 'iot-temp-monitor');
    expect(iotProj).toBeDefined();
    expect(iotProj?.tier).toBe('featured');
    expect(iotProj?.category).toBe('IoT/Embedded');
    expect(iotProj?.state).toBe('live');
  });

  it('uses deterministic UUIDs across all entities', () => {
    const manifest = buildProvisioningManifest();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(manifest.profile.id).toMatch(uuidRegex);
    manifest.projects.forEach((p: { id: string }) => expect(p.id).toMatch(uuidRegex));
    manifest.projectSections.forEach((s: { id: string }) => expect(s.id).toMatch(uuidRegex));
    manifest.projectSectionMedia.forEach((m: { id: string }) => expect(m.id).toMatch(uuidRegex));
    manifest.skillCategories.forEach((c: { id: string }) => expect(c.id).toMatch(uuidRegex));
    manifest.skills.forEach((s: { id: string }) => expect(s.id).toMatch(uuidRegex));
    manifest.education.forEach((e: { id: string }) => expect(e.id).toMatch(uuidRegex));
    manifest.seoEntries.forEach((s: { id: string }) => expect(s.id).toMatch(uuidRegex));
  });
});
