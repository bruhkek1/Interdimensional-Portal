# Next Chat Take-Off Prompt

## Context
We're working on "Glitch Resurrection" — a p5.js hackathon project at `/home/bruhkek/.hermes/projects/hackathon-portal-backup-20260503-161409/`. The project uses p5.js 1.9.0 and has a fully working base with 4 dimensions, audio engine, glitch effects, portal transitions, and a terminal UI overlay.

## What We Just Planned
We planned a **Local Cleanup System** — instead of global corruption decay, mouse movement locally "cleans" glitch artifacts where the cursor is, like a flashlight revealing the clean image underneath. The full plan is in `plan.md`.

## Current State
- `sketch.js` has global `corruptionLevel` (0–1) computed from signal integrity
- Artifacts in `glitchLines[]` only track: `type`, `y`, `height`, `offset`, `alpha`, `age`, `maxAge`, `colorIdx`
- Artifacts fade purely by `age / maxAge` — no corruption tracking per artifact
- `drawGlitchTear()` (line 705) spawns artifacts based on mouse speed
- `drawGlitchLinesOnCanvas()` (line 570) draws artifacts with RGB split + offset
- Signal tuning knob adjusts frequency → affects signal integrity → affects corruption

## What to Do Next (Step 1: Data Model + Spawn)
Implement Step 1 from `plan.md`:

1. **Add global constants** after the existing globals (~line 50):
   ```js
   const CLEANUP_RADIUS = 100;       // px radius around mouse
   const CLEANUP_RATE = 0.02;        // base cleanup rate per frame
   const BASE_DECAY_RATE = 0.0005;   // glacial natural decay
   ```

2. **Extend artifact spawn** in `drawGlitchTear()` (around line 722) — every push to `glitchLines[]` needs 3 new properties:
   ```js
   corruptionLevel: 1.0,  // starts fully corrupted
   spawnX: mouseX,        // where it spawned (for distance calc)
   spawnY: mouseY         // where it spawned (for distance calc)
   ```
   There are 3 places that push to glitchLines in drawGlitchTear() (horizontal tear, wide rect, and signal-based corruption). Also check `updatePortal()` (line 423) where charge adds glitch lines.

3. **Verify:** All artifact spawns include the 3 new properties. No other changes needed yet.

## Files to Edit
- `sketch.js` only — add globals and modify spawn sites

## Verification
After implementing, the artifacts should spawn with `corruptionLevel: 1.0`, `spawnX`, `spawnY` but nothing should visually change yet (Step 2 adds the cleanup logic, Step 3 adds rendering). The goal is just to get the data model in place.

## Key Files
- `sketch.js` — main sketch (1229 lines)
- `index.html` — terminal UI overlay (not changing this step)
- `plan.md` — full plan with all 4 steps
- `progress.md` — project progress tracker
