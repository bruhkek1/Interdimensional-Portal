# Glitch Resurrection — Local Cleanup Plan

**Goal:** Mouse movement locally "cleans" glitch artifacts — like a flashlight revealing the clean image underneath. No global decay.

---

## 1. Current State Analysis

### What exists now
- **Global `corruptionLevel`** (0–1) — computed from signal integrity (line 1131)
- **`glitchLines[]` array** — stores artifact objects with: `type`, `y`, `height`, `offset`, `alpha`, `age`, `maxAge`, `colorIdx`
- **`drawGlitchTear()`** (line 705) — spawns new artifacts when mouse moves fast enough
- **`drawGlitchLinesOnCanvas()`** (line 570) — draws artifacts, fades them based on `age / maxAge`
- **Signal tuning** — knob adjusts frequency → affects `signalIntegrity` → affects `corruptionLevel`
- **Current decay:** artifacts fade purely by age. `corruptionLevel` only controls spawn rate (line 760).

### What needs to change
- Each artifact gets its own `corruptionLevel` (0–1)
- Mouse proximity + speed reduces corruption locally
- Rendering reads per-artifact corruption to determine glitch intensity
- Different glitch types decay at different speeds

---

## 2. Data Model

### Artifact object (extended)
Each entry in `glitchLines[]` gets a new property:

```js
{
  type: 'horizontal' | 'wide' | 'square',
  y: number,
  height: number,
  offset: number,
  alpha: number,
  age: number,
  maxAge: number,
  colorIdx: number,
  corruptionLevel: 1.0,  // NEW: 0 = clean, 1 = max corruption
  spawnX: number,        // NEW: where it spawned (for distance calc)
  spawnY: number         // NEW: where it spawned (for distance calc)
}
```

### New global variables
```js
const CLEANUP_RADIUS = 100;       // px radius around mouse that gets cleaned
const CLEANUP_RATE = 0.02;        // base rate per frame when mouse is moving
const BASE_DECAY_RATE = 0.0005;   // very slow natural decay (no mouse needed)
```

---

## 3. Cleanup Logic

### In `draw()` (after mouse position update)
```
1. Calculate mouse speed this frame
2. For each artifact in glitchLines:
   a. Calculate distance from mouse to artifact center
   b. If distance < CLEANUP_RADIUS:
      - cleanupFactor = map(speed, 0, 30, 0, 1)  // 0 when still, 1 when fast
      - corruptionLevel -= CLEANUP_RATE * cleanupFactor
      - corruptionLevel = max(0, corruptionLevel)
   c. Else:
      - corruptionLevel -= BASE_DECAY_RATE  // glacially slow
```

### Where to place this
New function `updateLocalCleanup()` called from `draw()` right after `updatePortal()` and before drawing.

---

## 4. Rendering Changes

### `drawGlitchLinesOnCanvas()` — modify to read per-artifact corruption

Each glitch technique uses `corruptionLevel` to scale its effect:

#### Horizontal tear (line 601)
```js
let intensity = g.corruptionLevel;
// offset scales with corruption (more corruption = more displacement)
let effectiveOffset = g.offset * intensity;
// RGB split alpha scales with corruption
let rgbAlpha = fade * intensity * 0.5;
// Draw with effectiveOffset and rgbAlpha
```

#### Wide rect (line 645)
```js
let intensity = g.corruptionLevel;
let effectiveOffset = g.offset * intensity;
let rgbAlpha = fade * intensity * 0.3;
```

#### Square block (line 623)
```js
let intensity = g.corruptionLevel;
let effectiveOffset = g.offset * intensity;
let rgbAlpha = fade * intensity * 0.4;
```

#### Key insight:
- When `corruptionLevel = 1.0`: full glitch effect (max offset, full RGB split)
- When `corruptionLevel = 0.0`: no glitch effect (offset = 0, RGB alpha = 0)
- The `fade` based on `age` still works normally (controls visibility of the glitch itself)
- We multiply `fade * corruptionLevel` to get the final intensity

### Spawn rate (line 760)
```js
// Change from:
if (corruptionLevel > 0.3 && random() < corruptionLevel * 0.3)
// To:
// Spawn rate now based on average corruption of remaining artifacts
// (global corruptionLevel still used for UI display)
let avgCorruption = glitchLines.reduce((sum, g) => sum + g.corruptionLevel, 0) / max(glitchLines.length, 1);
if (avgCorruption > 0.3 && random() < avgCorruption * 0.3)
```

---

## 5. Visual Feedback (Minor)

### Cursor scan pulse
A subtle ring around the cursor when actively cleaning:
```js
// In draw(), after cleanup updates:
if (mouseVel > 3) {
  stroke(0, 255, 255, 20 + mouseVel * 0.5);
  strokeWeight(1);
  noFill();
  ellipse(mouseX, mouseY, CLEANUP_RADIUS * 2, CLEANIP_RADIUS * 2);
}
```
This is optional but gives the user a clear "you're cleaning" signal.

---

## 6. File Changes Summary

| File | Changes |
|------|---------|
| `sketch.js` | Add CLEANUP_RADIUS, CLEANUP_RATE, BASE_DECAY_RATE globals. Extend artifact spawn to include corruptionLevel, spawnX, spawnY. New function `updateLocalCleanup()`. Modify `drawGlitchLinesOnCanvas()` to use per-artifact corruption. Update spawn rate logic. Optional: cursor scan pulse ring. |
| `index.html` | No changes needed (UI already shows corruption level) |
| `progress.md` | Update with new phase status |

---

## 7. Implementation Order (Step by Step)

### Step 1: Data model + spawn
- Add global constants (CLEANUP_RADIUS, CLEANUP_RATE, BASE_DECAY_RATE)
- Modify all places that push to `glitchLines[]` to include `corruptionLevel: 1.0`, `spawnX`, `spawnY`
- Verify: artifacts spawn with corruptionLevel = 1.0

### Step 2: Cleanup logic
- Write `updateLocalCleanup()` function
- Call it from `draw()`
- Test: mouse movement reduces corruption in nearby artifacts

### Step 3: Rendering integration
- Modify `drawGlitchLinesOnCanvas()` to read `g.corruptionLevel`
- Scale offset, RGB split alpha by corruptionLevel
- Verify: cleaned areas show no glitch, dirty areas show full glitch

### Step 4: Spawn rate + polish
- Update spawn rate to use average corruption
- Add optional cursor scan pulse ring
- Test full flow: load → max corruption → move mouse → local cleanup → clean areas

---

## 8. Edge Cases & Considerations

- **What if mouse never moves?** Artifacts decay very slowly (BASE_DECAY_RATE). User will eventually see the full image, but it takes ~15-20s. This is fine — it's the "idle" behavior.
- **What about new artifacts spawned while cleaning?** They spawn at corruptionLevel = 1.0, so they look glitchy until the mouse reaches them. This is the desired behavior — they're "fresh corruption."
- **What about portal transitions?** During transition, glitchLines is cleared anyway, so no corruption tracking needed.
- **Performance?** Distance calculation per artifact per frame. Max ~30 artifacts. Negligible cost.
- **p5.js 1.9.0 compatibility:** All changes use standard p5.js 1.9.0 features (ellipse, stroke, noFill, map, dist, lerp). No new API needed.

---

## 9. Success Criteria

- [ ] Image loads with heavy glitch everywhere
- [ ] Moving mouse over a glitched area cleans it locally
- [ ] Areas far from cursor stay glitched
- [ ] Clean areas stay clean when mouse moves away (no re-glitching)
- [ ] If mouse stops, cleanup stops (no global decay that overwrites local cleanup)
- [ ] New artifacts spawn glitchy and stay that way until mouse reaches them
- [ ] Visual feedback is clear (user understands "move your cursor to clean")
- [ ] No p5.js 1.9.0 compatibility issues
