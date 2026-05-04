# Glitch Resurrection — Project Progress

## 🌌 Concept: "Dimensional Datastream Interceptor"
**Theme:** You're tapping into corrupted datastreams from parallel dimensions. The photos are fragments from other worlds, and you're the operator trying to stabilize the connection and decode what's coming through.

**Narrative Frame:**
- The glitch effects aren't just decoration — they're signal corruption
- The audio isn't just ambient — it's the raw transmission noise
- Clicking/interacting is "tuning the signal" to stabilize the connection
- Transitions are "dimensional handshakes" — establishing a new link

---

## 🛠 Implementation Phases

### Phase 1: Terminal UI + Signal Tuning (IN PROGRESS)
- [x] Base project exists (p5.js + Web Audio + 4 dimensions)
- [ ] **HTML/CSS Terminal Overlay**
  - Monospace terminal UI with scanlines
  - Signal strength meter (fluctuating)
  - Dimension identifier
  - Connection status text
  - CSS flicker animations
- [ ] **Signal Tuning Mechanic**
  - Draggable frequency knob/slider
  - Adjusts glitch intensity, audio detuning, image clarity
  - Signal overload on hold (image distorts, audio peaks)
- [ ] **Connection Stability System**
  - `SIGNAL INTEGRITY` meter
  - Drops during transitions
  - Recovers when mouse is still
  - Affects corruption level

### Phase 2: Dimension Fingerprints
- [ ] Gateway (Skatepark): Cyan/magenta RGB split, data-mosh aesthetic
- [ ] Void (Skull): Monochrome, particle decay, scanline tearing
- [ ] Inferno (Fire): Thermal red/orange noise, chromatic aberration, film grain
- [ ] Threshold (Tunnel): Analog TV static, vertical hold drift, VHS tracking

### Phase 3: Intercepted Fragments (Lore)
- [ ] Random "data packets" spawn in glitch fields
- [ ] Click to decrypt → reveals lore snippet
- [ ] Lore stored in JS array
- [ ] Examples:
  - `> PACKET DECRYPTED [DIM-7G]`
  - `> AUDIO TRACE: 3.2kHz // BIO-SIGNATURE: UNKNOWN`
  - `> WARNING: TEMPORAL FRACTURE DETECTED`

### Phase 4: Transition Handshake
- [ ] Visual: Signal lock sequence (static → sweep → clear tone)
- [ ] Audio: Frequency sweep + stability tone
- [ ] Sync with dimension-specific color palette shift

### Phase 5: Procedural Databending
- [ ] Canvas-based pixel displacement
- [ ] RGB channel shifting based on signal strength
- [ ] Data-bleed effects
- [ ] Random block corruption

---

## 📁 Project Structure
```
hackathon-portal/
├── index.html          # Main page (needs terminal overlay)
├── sketch.js           # p5.js sketch (working, needs UI integration)
├── style.css           # Styles (needs terminal/overlay styles)
├── progress.md         # This file
├── assets/
│   ├── gateway.wav     # Dimension 1 music
│   ├── inferno.wav     # Dimension 2 music
│   ├── threshold.wav   # Dimension 3 music
│   └── void.wav        # Dimension 4 music
└── src/
    ├── fire.jpg        # Inferno dimension photo
    ├── skull.jpg       # Void dimension photo
    ├── skatepark.jpg   # Gateway dimension photo
    └── tunnel.jpg      # Threshold dimension photo
```

---

## ⏰ Timeline (Hackathon Deadline: May 3rd)
- **Now:** Phase 1 (Terminal UI + Signal Tuning) ✅ COMPLETE
- **Next:** Phase 2 (Dimension Fingerprints)
- **Then:** Phase 3 (Lore/Fragments)
- **Final:** Phase 4-5 (Transitions + Databending)
- **Buffer:** Testing, polish, video demo

---

## 🎯 Current Status
**Last Updated:** May 3, 2026 ~7:00 PM
- ✅ Base project is functional with 4 dimensions
- ✅ Audio engine works (sub bass, glitch oscillators, noise layers, electronic layer)
- ✅ Glitch effects working (horizontal tears, wide rects, particles)
- ✅ Portal transitions working (glitch storm → fade → reveal)
- ✅ **Phase 1 COMPLETE:** Terminal UI overlay with scanlines/vignette
- ✅ **Signal tuning knob** — drag to adjust frequency
- ✅ **Signal integrity meter** — fluctuates based on tuning
- ✅ **Corruption system** — low signal = more glitch artifacts
- ✅ **Lore fragments** — randomly spawn intercepted data packets
- ✅ **Audio responds to signal** — detunes when signal is weak
- ✅ **Visual corruption responds to signal** — more glitches when unstable
- **IN PROGRESS:** Scratch Card Reveal + Databending System
  - Plan written: `plan.md`
  - ✅ **Phase 1 COMPLETE:** Scratch card mechanic with mask canvas
  - ✅ **Phase 2 COMPLETE:** Databending effects (RGB swap, displacement, noise, thermal, VHS tracking, static)
  - ✅ **Phase 3 COMPLETE:** AI co-creativity layer (unique corruption per dimension)
  - ✅ **Phase 4 COMPLETE:** Aspect ratio preservation + dimension lore text
  - **Testing:** Images now maintain aspect ratio, positioned left/right with meta text in deadspace
  - ✅ **Phase 5 COMPLETE:** 10 dimensions total (4 original + 6 new)
    - New images loaded: dim4_abyss.jpg, dim5_nexus.jpg, dim6_echo.jpg, dim7_fracture.jpg, dim8_resonance.jpg, dim9_shard.jpg
    - New corruption styles: block corruption, pixel sort, data mosh, color quantize, repeating artifacts, ghosting, geometric distort, color bleed, wave distort, frequency noise, fragmentation, edge enhance
    - New lore for dimensions 4-9 (Abyss, Nexus, Echo, Fracture, Resonance, Shard)
