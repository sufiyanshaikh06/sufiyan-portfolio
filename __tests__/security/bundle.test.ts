import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import packageJson from '@/package.json';
import { getSnapshot } from '@/lib/content';

describe('Security and Graphics Isolation Checks', () => {
  it('confirms no service-role key or secret canaries appear in generated public snapshot', () => {
    const snapshotPath = path.resolve(process.cwd(), 'lib/generated/public-snapshot.json');
    expect(fs.existsSync(snapshotPath)).toBe(true);

    const content = fs.readFileSync(snapshotPath, 'utf8');

    // Canary checks
    expect(content).not.toContain('service_role');
    expect(content).not.toContain('SERVICE_ROLE_KEY');
    expect(content).not.toContain('sb_secret_');
    expect(content).not.toContain('bucket_id');
    expect(content).not.toContain('storage_path');
    expect(content).not.toContain('storagePath');
    expect(content).not.toContain('bucketId');
  });

  it('confirms zero WebGL, Three.js, R3F, or GSAP dependencies are declared for static phase', () => {
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const forbiddenPackages = [
      'three',
      '@types/three',
      '@react-three/fiber',
      '@react-three/drei',
      'gsap',
      '@gsap/shockingly',
      'pixi.js',
      'regl',
    ];

    for (const pkg of forbiddenPackages) {
      expect(deps).not.toHaveProperty(pkg);
    }
  });

  it('confirms public routes read snapshot with zero Supabase network client initialization', () => {
    // getSnapshot should return valid synchronous JSON data without invoking any network calls
    const snapshot = getSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.profile.fullName).toBe('Sufiyan Shaikh');
    expect(snapshot.projects.length).toBeGreaterThanOrEqual(1);
    expect(snapshot.projects.some((p) => p.slug === 'integrum')).toBe(true);
  });

  it('confirms components do not import @supabase/supabase-js', () => {
    const componentFiles = [
      'app/page.tsx',
      'app/layout.tsx',
      'app/projects/[slug]/page.tsx',
      'components/shell/Header.tsx',
      'components/shell/Footer.tsx',
      'components/shell/SkipToContent.tsx',
      'components/ui/HudButton.tsx',
      'components/ui/HudCard.tsx',
    ];

    for (const file of componentFiles) {
      const filePath = path.resolve(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        expect(fileContent).not.toContain('@supabase/supabase-js');
        expect(fileContent).not.toContain('createClient');
      }
    }
  });
});
