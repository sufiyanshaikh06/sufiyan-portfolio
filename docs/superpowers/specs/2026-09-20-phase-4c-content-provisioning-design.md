# Phase 4C — Verified Production Content Provisioning & Publication Design Specification

**Date:** 2026-09-20  
**Status:** Approved for implementation. Remote production mutation is still not authorized.  
**Precondition:** Phase 4B accepted and locked at commits `ad46ddf` and `95120a1`. Working tree clean.

---

## 1. Objective

Provision and publish verified portfolio content to the remote production Supabase instance (`zxauhsigpwresusmvkbu`) so that all statically generated Phase 4A and Phase 4B pages prerender genuine, complete, verified records upon next build—while strictly maintaining:

- **Idempotent, dependency-ordered, and safely rerunnable operations** (no false transactional assumptions over REST).
- **Zero fabricated claims**: No invented dates, employment, certifications, or planned AI capabilities.
- **Trusted static media only**: No arbitrary test-fixture JPEGs; only approved static vector SVG visualizations containing zero scripts or external URIs.
- **Zero secret leakage**: Exclusively modern `sb_secret_...` keys used server-side; zero secret keys in client bundles, chat, or logs.
- **Strict Public RLS verification**: Content verified through anonymous public reads (`sb_publishable_...`) before build completion.
- **Mandatory Dry-Run Gate**: Remote inspection and dry-run reporting must precede any production write.

---

## 2. Content Provenance Matrix

| Entity | Primary Key / Conflict Target | Values / Attributes | Authority & Source | Disposition |
|---|---|---|---|---|
| **Storage Asset** | `public_assets/portraits/avatar.svg` | Existing geometric profile visualization (800x800) | Retained from Phase 3 production | **Preserve / No Change** |
| **Storage Asset** | `public_assets/projects/integrum.svg` | Verified SVG vector interface visualization (1920x1080) | Retained from Phase 3 production | **Preserve / No Change** |
| **Storage Asset** | `public_assets/projects/iot-temp-monitor.svg` | Trusted SVG hardware architecture visualization (1920x1080) | Verified hardware schematic & component inventory | **Upload (New)** |
| **Media Asset** | `10000000-0000-0000-0000-000000000010` | `portraits/avatar.svg`, `image/svg+xml`, alt: "Sufiyan Shaikh verified profile visualization" | Phase 3 production record | **Upsert / Unchanged** |
| **Media Asset** | `10000000-0000-0000-0000-000000000011` | `projects/integrum.svg`, `image/svg+xml`, alt: "Integrum Student Success Platform interface visualization" | Phase 3 production record | **Upsert / Unchanged** |
| **Media Asset** | `10000000-0000-0000-0000-000000000012` | `projects/iot-temp-monitor.svg`, `image/svg+xml`, alt: "IoT Body Temperature Monitoring System hardware visualization" | Phase 4C verified asset | **Upsert (New)** |
| **Profile** | `10000000-0000-0000-0000-000000000020` | Full name: `Sufiyan Shaikh`, Headline: `Computer Science Student \| Building Intelligent Software`, Bio, GitHub URL, `is_published = true`, `avatar_asset_id = ...0010` | Verified profile baseline | **Upsert (Idempotent)** |
| **Project 1** | `slug: integrum` | `title: Integrum`, `subtitle: Student Success Platform`, `category: Full-Stack`, `tier: featured`, `state: live`, `featured_asset_id: ...0011` | Phase 3 verified baseline | **Upsert (Idempotent)** |
| **Project 1 Section** | `10000000-0000-0000-0000-000000000060` | `title: Overview`, `content: Integrum brings together course tracking...`, `display_order: 1` | Phase 3 verified baseline | **Upsert (Idempotent)** |
| **Project 1 Media** | `(section_id, media_asset_id)` | `section_id: ...0060`, `media_asset_id: ...0011`, `display_order: 1` | Phase 3 verified baseline | **Upsert (Idempotent)** |
| **Project 2** | `slug: iot-temp-monitor` | `title: IoT Body Temperature Monitoring System`, `subtitle: Embedded Health Monitoring Device`, `category: IoT/Embedded`, `tier: featured`, `state: live`, `featured_asset_id: ...0012` | Verified hardware design | **Upsert (New)** |
| **Project 2 Section** | `10000000-0000-0000-0000-000000000061` | `title: Hardware Architecture`, `content: The system utilizes an ESP32 microcontroller paired with a waterproof DS18B20 digital temperature sensor, I2C LCD, status LEDs, buzzer alerts, and ThingSpeak cloud telemetry for real-time logging.`, `display_order: 1` | Verified hardware architecture | **Upsert (New)** |
| **Project 2 Media** | `(section_id, media_asset_id)` | `section_id: ...0061`, `media_asset_id: ...0012`, `display_order: 1` | Verified hardware mapping | **Upsert (New)** |
| **Skill Category 1** | `name: Languages & Fundamentals` | `display_order: 1`, `is_published: true`, `is_archived: false` | Verified local seed | **Upsert (New)** |
| **Skill Category 2** | `name: Frameworks & Systems` | `display_order: 2`, `is_published: true`, `is_archived: false` | Verified local seed | **Upsert (New)** |
| **Skills** | `(category_id, name)` | Category 1: `TypeScript`, `Python`, `C++` (Proficiency: `Working Knowledge`, orders 1–3)<br>Category 2: `React`, `Node.js` (Proficiency: `Working Knowledge`, orders 1–2) | Verified local seed | **Upsert (5 New)** |
| **Education** | `10000000-0000-0000-0000-000000000090` | `institution: R.K. Talreja College of Arts, Science and Commerce`, `degree: Bachelor of Science`, `field_of_study: Computer Science`, `start_date: NULL`, `end_date: NULL`, `description: Affiliated with the University of Mumbai. Expected graduation in 2027.`, `is_published: true`, `is_archived: false` | User verified educational status; dates nullable in schema | **Upsert (1 New)** |
| **SEO Entries** | `route_path` | 7 Routes (`/`, `/about`, `/projects`, `/projects/integrum`, `/projects/iot-temp-monitor`, `/skills`, `/experience`), with titles, descriptions, and `og_image_asset_id = ...0010` | Phase 4B route matrix | **Upsert (7 Routes)** |
| **Experience** | N/A | Empty collection (`[]`) | No verified corporate employment | **Omit (Empty)** |
| **Certifications** | N/A | Empty collection (`[]`) | No verified external certifications | **Omit (Empty)** |
| **Achievements** | N/A | Empty collection (`[]`) | No verified competition achievements | **Omit (Empty)** |

---

## 3. Schema & Database Integrity Analysis

### 3.1 `public.education` Constraints
- Schema verification of `public.education` table:
  - `start_date`: `DATE` (Nullable). **Action: Store `NULL`** (no dates invented).
  - `end_date`: `DATE` (Nullable). **Action: Store `NULL`** (no dates invented).
  - `display_order`: **Does NOT exist** in the `public.education` table. Ordering in queries is governed by `start_date DESC NULLS LAST, institution ASC`. No `display_order` column will be sent in upsert payloads.

### 3.2 Dependency Order of Upserts
To preserve foreign key constraints:
1. `storage.objects` (`public_assets` bucket)
2. `public.media_assets`
3. `public.profiles`
4. `public.projects`
5. `public.project_sections`
6. `public.project_section_media`
7. `public.skill_categories`
8. `public.skills`
9. `public.education`
10. `public.seo_entries`

---

## 4. Dry-Run & Provisioning Tool Architecture

File: `scripts/provision-remote.mjs`

### 4.1 CLI Arguments & Environment Flags
- `--dry-run`: Reads the current remote database state, compares it with the target manifest, and prints a record-by-record delta report without issuing any write or upload operations.
- `ALLOW_REMOTE_PROVISION=1`: Required safety guard to execute live mutations when `--dry-run` is absent.
- `PROD_SUPABASE_URL`: Target remote project endpoint (must be non-localhost).
- `PROD_SUPABASE_SECRET_KEY`: Modern Supabase secret service key (`sb_secret_...`).
- `PROD_SUPABASE_PUBLISHABLE_KEY`: Modern publishable key (`sb_publishable_...`).

### 4.2 Differential State Engine
For each entity, the script queries existing remote rows and categorizes every record as:
- **`INSERT`**: Natural key does not exist remotely.
- **`UPDATE`**: Natural key exists but attributes differ.
- **`UNCHANGED`**: Record matches manifest exactly.
- **`ARCHIVAL CANDIDATE`**: Always `0` (manifest does not delete or auto-archive remote records).

---

## 5. Verification Gate Alignment

Once Phase 4C remote provisioning succeeds:
1. `scripts/verify-exit-gate.mjs`:
   Update dynamic project probe: `/projects/iot-temp-monitor` will be in `public-snapshot.json`, expecting **HTTP 200** locally and in production.
2. Production Route Matrix:
   - `/projects` lists **both** Integrum and IoT Body Temperature Monitoring System.
   - `/projects/iot-temp-monitor` returns **HTTP 200**.
   - `/skills` renders **Languages & Fundamentals** (TypeScript, Python, C++) and **Frameworks & Systems** (React, Node.js).
   - `/about` renders **Education** (R.K. Talreja College, B.Sc. Computer Science).
   - `/experience` remains clean and empty.
   - Production Playwright passes with zero browser-time Supabase network calls.
