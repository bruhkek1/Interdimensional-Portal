// Glitch Resurrection — v12
// Subtle grid + glitch tearing driven by mouse position
// Procedural glitch/portal audio (Web Audio API)
// Portal transition system with 3 trigger methods

let img;
let mouseXHistory = [];
let mouseYHistory = [];
let mouseVel = 0;
let targetMouseVel = 0;
let time = 0;
let glitchLines = [];

// Portal transition state
let portalState = 'idle'; // 'idle', 'charging', 'transitioning', 'revealed'
let portalCharge = 0; // 0-1 charge level
let portalCenterX = 0;
let portalCenterY = 0;
let portalRadius = 100; // size of center zone
let lastMouseMoveTime = 0; // set to millis() in setup() to block initial auto-advance
let idleTimer = 0;
let transitionProgress = 0;
let lastTransitionTime = 0; // cooldown tracker
let currentImageIdx = 0;
let nextImage = null;
let images = []; // all loaded images

// Audio engine
let audioCtx;
let audioStarted = false;
let masterGain;

// Glitch oscillators (chaotic, atonal)
let glitchOsc1, glitchOsc2, glitchOsc3;
let glitchGain1, glitchGain2, glitchGain3;
let glitchFilter;

// Noise layers (static, wind, tears)
let noiseBuffer1, noiseSource1, noiseGain1;
let noiseBuffer2, noiseSource2, noiseGain2;
let noiseFilter1, noiseFilter2;

// Sub bass drone (constant low hum)
let subOsc, subGain;
let subFilter;

// Random frequency scheduler
let nextGlitchTime = 0;
let glitchInterval = 2; // seconds between random glitches

// Local cleanup system
const CLEANUP_RADIUS = 100;
const CLEANUP_RATE = 0.02;
const BASE_DECAY_RATE = 0.0005;

// === NEW: Electronic glitch layer ===
let maskCanvas; // Canvas to store the "scratch" mask
let corruptedImages = []; // Array of corrupted image versions
let scratchIntensity = 0; // How much of the image has been scratched (0-1)
let scratchRadius = 40; // Radius of the scratch brush
let isScratching = false; // Whether mouse is pressed and scratching

// === NEW: Electronic glitch layer ===
let fmOsc1, fmOsc2, fmMod, fmGain, fmFilter;
let bitCrushedNoise, bitCrushGain, bitCrushFilter;
let burstOsc, burstGain;
let nextBurstTime = 0;

// Retro color palette
const palette = [
  [0, 255, 255],    // cyan
  [255, 0, 255],    // magenta
  [0, 255, 128],    // green
  [255, 128, 0],    // orange
];

// === BACKGROUND MUSIC ===
let bgMusic1, bgMusic2;
let bgMusicPlaying = false;
let currentBgTrack = 0; // 0 = first track, 1 = second track

function preload() {
  // Load all images
  images[0] = loadImage('src/skatepark.jpg');
  images[1] = loadImage('src/skull.jpg');
  images[2] = loadImage('src/fire.jpg');
  images[3] = loadImage('src/dim4_abyss.jpg');
  images[4] = loadImage('src/dim5_nexus.jpg');
  images[5] = loadImage('src/dim6_echo.jpg');
  images[6] = loadImage('src/dim7_fracture.jpg');
  images[7] = loadImage('src/dim8_resonance.jpg');
  images[8] = loadImage('src/dim9_shard.jpg');
  images[9] = loadImage('src/tunnel.jpg');
  img = images[0];
  
  // Create corrupted versions of each image
  for (let i = 0; i < images.length; i++) {
    if (images[i] && images[i].width > 0) {
      corruptedImages[i] = createCorruptedImage(images[i], i);
    }
  }
  
  // Load background music
  bgMusic1 = loadSound('assets/1.opus');
  bgMusic1.loop();
  bgMusic1.volume(0); // Start silent, fade in on click
  bgMusic1.setLoop();
  
  bgMusic2 = loadSound('assets/2.opus');
  bgMusic2.loop();
  bgMusic2.volume(0);
  bgMusic2.setLoop();
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);

  // Start idle timer from page load so auto-advance doesn't fire immediately
  lastMouseMoveTime = millis();

  // Set willReadFrequently to suppress Canvas2D warnings
  if (drawingContext) {
    drawingContext.imageSmoothingEnabled = false;
  }
  if (canvas) {
    canvas.setAttribute('will-read-frequently', 'true');
  }

  // Create scratch mask canvas (starts fully opaque = fully corrupted)
  maskCanvas = createGraphics(width, height);
  maskCanvas.fill(255);
  maskCanvas.rect(0, 0, width, height);

  // Center of screen
  portalCenterX = width / 2;
  portalCenterY = height / 2;

  // Handle overlay click to start audio
  let overlay = document.getElementById('start-overlay');
  if (overlay) {
    overlay.addEventListener('click', startAudio, { once: true });
  }

  // Track last mouse move time
  lastMouseMoveTime = millis();
}

function createCorruptedImage(sourceImg, imgIdx) {
  let corruptImg = createGraphics(sourceImg.width, sourceImg.height);
  
  // Different corruption styles per dimension
  if (imgIdx === 0) {
    // Gateway: RGB channel swapping + displacement
    corruptImg = applyRGBSwap(sourceImg, 0.7);
    corruptImg = applyDisplacement(corruptImg, 15);
  } else if (imgIdx === 1) {
    // Void: Monochrome + heavy noise
    corruptImg = applyMonochrome(sourceImg, 0.3);
    corruptImg = applyNoise(corruptImg, 0.4);
  } else if (imgIdx === 2) {
    // Inferno: Thermal noise + color channel misalignment
    corruptImg = applyThermalNoise(sourceImg, 0.5);
    corruptImg = applyChannelMisalignment(corruptImg, 8);
  } else if (imgIdx === 3) {
    // Abyss: Block corruption + pixel sorting
    corruptImg = applyBlockCorruption(sourceImg, 0.4);
    corruptImg = applyPixelSort(sourceImg, 0.3);
  } else if (imgIdx === 4) {
    // Nexus: Data moshing + color quantization
    corruptImg = applyDataMosh(sourceImg, 0.5);
    corruptImg = applyColorQuantize(sourceImg, 32);
  } else if (imgIdx === 5) {
    // Echo: Repeating artifacts + ghosting
    corruptImg = applyRepeatingArtifacts(sourceImg, 0.4);
    corruptImg = applyGhosting(sourceImg, 0.3);
  } else if (imgIdx === 6) {
    // Fracture: Geometric distortion + color bleeding
    corruptImg = applyGeometricDistort(sourceImg, 0.5);
    corruptImg = applyColorBleed(sourceImg, 0.4);
  } else if (imgIdx === 7) {
    // Resonance: Wave distortion + frequency noise
    corruptImg = applyWaveDistort(sourceImg, 0.4);
    corruptImg = applyFrequencyNoise(sourceImg, 0.3);
  } else if (imgIdx === 8) {
    // Shard: Fragmentation + edge enhancement
    corruptImg = applyFragmentation(sourceImg, 0.5);
    corruptImg = applyEdgeEnhance(sourceImg, 0.3);
  } else if (imgIdx === 9) {
    // Threshold: VHS tracking + static
    corruptImg = applyVHSTracking(sourceImg, 0.6);
    corruptImg = applyStatic(corruptImg, 0.3);
  }
  
  return corruptImg;
}

function applyRGBSwap(img, intensity) {
  img.loadPixels();
  for (let i = 0; i < img.pixels.length; i += 4) {
    let r = img.pixels[i];
    let g = img.pixels[i + 1];
    let b = img.pixels[i + 2];
    
    // Swap channels based on intensity
    img.pixels[i] = lerp(r, b, intensity);
    img.pixels[i + 1] = lerp(g, r, intensity);
    img.pixels[i + 2] = lerp(b, g, intensity);
  }
  img.updatePixels();
  return img;
}

function applyDisplacement(img, amount) {
  let tempImg = img.get();
  tempImg.loadPixels();
  img.loadPixels();
  
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let dx = floor(random(-amount, amount));
      let dy = floor(random(-amount, amount));
      let sx = constrain(x + dx, 0, img.width - 1);
      let sy = constrain(y + dy, 0, img.height - 1);
      let si = (sy * img.width + sx) * 4;
      let di = (y * img.width + x) * 4;
      
      img.pixels[di] = tempImg.pixels[si];
      img.pixels[di + 1] = tempImg.pixels[si + 1];
      img.pixels[di + 2] = tempImg.pixels[si + 2];
    }
  }
  img.updatePixels();
  return img;
}

function applyMonochrome(img, darkness) {
  img.loadPixels();
  for (let i = 0; i < img.pixels.length; i += 4) {
    let r = img.pixels[i];
    let g = img.pixels[i + 1];
    let b = img.pixels[i + 2];
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;
    gray = lerp(gray, 0, darkness);
    
    img.pixels[i] = gray;
    img.pixels[i + 1] = gray;
    img.pixels[i + 2] = gray;
  }
  img.updatePixels();
  return img;
}

function applyNoise(img, intensity) {
  img.loadPixels();
  for (let i = 0; i < img.pixels.length; i += 4) {
    let noise = (random() - 0.5) * 255 * intensity;
    img.pixels[i] = constrain(img.pixels[i] + noise, 0, 255);
    img.pixels[i + 1] = constrain(img.pixels[i + 1] + noise, 0, 255);
    img.pixels[i + 2] = constrain(img.pixels[i + 2] + noise, 0, 255);
  }
  img.updatePixels();
  return img;
}

function applyThermalNoise(img, intensity) {
  img.loadPixels();
  for (let i = 0; i < img.pixels.length; i += 4) {
    let thermal = randomGaussian() * 100 * intensity;
    img.pixels[i] = constrain(img.pixels[i] + thermal, 0, 255);
    img.pixels[i + 1] = constrain(img.pixels[i + 1] + thermal * 0.5, 0, 255);
    img.pixels[i + 2] = constrain(img.pixels[i + 2] - thermal * 0.3, 0, 255);
  }
  img.updatePixels();
  return img;
}

function applyChannelMisalignment(img, offset) {
  let tempImg = img.get();
  tempImg.loadPixels();
  img.loadPixels();
  
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let di = (y * img.width + x) * 4;
      
      // Red channel gets offset
      let sxR = constrain(x + offset, 0, img.width - 1);
      let siR = (y * img.width + sxR) * 4;
      img.pixels[di] = tempImg.pixels[siR];
      
      // Blue channel gets opposite offset
      let sxB = constrain(x - offset, 0, img.width - 1);
      let siB = (y * img.width + sxB) * 4;
      img.pixels[di + 2] = tempImg.pixels[siB + 2];
    }
  }
  img.updatePixels();
  return img;
}

function applyVHSTracking(img, intensity) {
  let tempImg = img.get();
  tempImg.loadPixels();
  img.loadPixels();
  
  // Create horizontal tracking lines
  for (let y = 0; y < img.height; y += 3) {
    if (random() < intensity) {
      let offset = random(-20, 20);
      for (let x = 0; x < img.width; x++) {
        let di = (y * img.width + x) * 4;
        let sx = constrain(x + offset, 0, img.width - 1);
        let si = (y * img.width + sx) * 4;
        img.pixels[di] = tempImg.pixels[si];
        img.pixels[di + 1] = tempImg.pixels[si + 1];
        img.pixels[di + 2] = tempImg.pixels[si + 2];
      }
    }
  }
  img.updatePixels();
  return img;
}

function applyStatic(img, intensity) {
  img.loadPixels();
  for (let i = 0; i < img.pixels.length; i += 4) {
    if (random() < intensity) {
      img.pixels[i] = random(255);
      img.pixels[i + 1] = random(255);
      img.pixels[i + 2] = random(255);
    }
  }
  img.updatePixels();
  return img;
}

function applyBlockCorruption(img, intensity) {
  let blockSize = 10;
  let tempImg = img.get();
  tempImg.loadPixels();
  img.loadPixels();
  
  for (let y = 0; y < img.height; y += blockSize) {
    for (let x = 0; x < img.width; x += blockSize) {
      if (random() < intensity) {
        let ox = floor(random(-blockSize, blockSize));
        let oy = floor(random(-blockSize, blockSize));
        for (let by = 0; by < blockSize && (y + by) < img.height; by++) {
          for (let bx = 0; bx < blockSize && (x + bx) < img.width; bx++) {
            let sx = constrain(x + bx + ox, 0, img.width - 1);
            let sy = constrain(y + by + oy, 0, img.height - 1);
            let si = (sy * img.width + sx) * 4;
            let di = ((y + by) * img.width + (x + bx)) * 4;
            img.pixels[di] = tempImg.pixels[si];
            img.pixels[di + 1] = tempImg.pixels[si + 1];
            img.pixels[di + 2] = tempImg.pixels[si + 2];
          }
        }
      }
    }
  }
  img.updatePixels();
  return img;
}

function applyPixelSort(img, intensity) {
  img.loadPixels();
  for (let y = 0; y < img.height; y++) {
    if (random() < intensity) {
      for (let x = 0; x < img.width - 1; x++) {
        let i = (y * img.width + x) * 4;
        let j = (y * img.width + x + 1) * 4;
        let grayI = img.pixels[i] * 0.299 + img.pixels[i + 1] * 0.587 + img.pixels[i + 2] * 0.114;
        let grayJ = img.pixels[j] * 0.299 + img.pixels[j + 1] * 0.587 + img.pixels[j + 2] * 0.114;
        if (grayI > grayJ) {
          let tempR = img.pixels[i], tempG = img.pixels[i + 1], tempB = img.pixels[i + 2];
          img.pixels[i] = img.pixels[j];
          img.pixels[i + 1] = img.pixels[j + 1];
          img.pixels[i + 2] = img.pixels[j + 2];
          img.pixels[j] = tempR;
          img.pixels[j + 1] = tempG;
          img.pixels[j + 2] = tempB;
        }
      }
    }
  }
  img.updatePixels();
  return img;
}

function applyDataMosh(img, intensity) {
  let tempImg = img.get();
  tempImg.loadPixels();
  img.loadPixels();
  
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (random() < intensity) {
        let sx = constrain(x + floor(random(-20, 20)), 0, img.width - 1);
        let si = (y * img.width + sx) * 4;
        let di = (y * img.width + x) * 4;
        img.pixels[di] = tempImg.pixels[si];
        img.pixels[di + 1] = tempImg.pixels[si + 1];
        img.pixels[di + 2] = tempImg.pixels[si + 2];
      }
    }
  }
  img.updatePixels();
  return img;
}

function applyColorQuantize(img, levels) {
  img.loadPixels();
  for (let i = 0; i < img.pixels.length; i += 4) {
    img.pixels[i] = floor(img.pixels[i] / (256 / levels)) * (256 / levels);
    img.pixels[i + 1] = floor(img.pixels[i + 1] / (256 / levels)) * (256 / levels);
    img.pixels[i + 2] = floor(img.pixels[i + 2] / (256 / levels)) * (256 / levels);
  }
  img.updatePixels();
  return img;
}

function applyRepeatingArtifacts(img, intensity) {
  let tempImg = img.get();
  tempImg.loadPixels();
  img.loadPixels();
  
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (random() < intensity) {
        let repeat = floor(random(2, 5));
        let sx = constrain(x - repeat * 10, 0, img.width - 1);
        let si = (y * img.width + sx) * 4;
        let di = (y * img.width + x) * 4;
        img.pixels[di] = tempImg.pixels[si];
        img.pixels[di + 1] = tempImg.pixels[si + 1];
        img.pixels[di + 2] = tempImg.pixels[si + 2];
      }
    }
  }
  img.updatePixels();
  return img;
}

function applyGhosting(img, intensity) {
  let tempImg = img.get();
  tempImg.loadPixels();
  img.loadPixels();
  
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (random() < intensity) {
        let ghostX = constrain(x + floor(random(-30, 30)), 0, img.width - 1);
        let ghostY = constrain(y + floor(random(-30, 30)), 0, img.height - 1);
        let gi = (ghostY * img.width + ghostX) * 4;
        let di = (y * img.width + x) * 4;
        img.pixels[di] = lerp(img.pixels[di], tempImg.pixels[gi], 0.5);
        img.pixels[di + 1] = lerp(img.pixels[di + 1], tempImg.pixels[gi + 1], 0.5);
        img.pixels[di + 2] = lerp(img.pixels[di + 2], tempImg.pixels[gi + 2], 0.5);
      }
    }
  }
  img.updatePixels();
  return img;
}

function applyGeometricDistort(img, intensity) {
  let tempImg = img.get();
  tempImg.loadPixels();
  img.loadPixels();
  
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (random() < intensity) {
        let angle = random(TWO_PI);
        let radius = random(10, 50);
        let sx = constrain(x + floor(cos(angle) * radius), 0, img.width - 1);
        let sy = constrain(y + floor(sin(angle) * radius), 0, img.height - 1);
        let si = (sy * img.width + sx) * 4;
        let di = (y * img.width + x) * 4;
        img.pixels[di] = tempImg.pixels[si];
        img.pixels[di + 1] = tempImg.pixels[si + 1];
        img.pixels[di + 2] = tempImg.pixels[si + 2];
      }
    }
  }
  img.updatePixels();
  return img;
}

function applyColorBleed(img, intensity) {
  img.loadPixels();
  for (let i = 0; i < img.pixels.length; i += 4) {
    if (random() < intensity) {
      let bleed = random(-30, 30);
      img.pixels[i] = constrain(img.pixels[i] + bleed, 0, 255);
      img.pixels[i + 1] = constrain(img.pixels[i + 1] - bleed * 0.5, 0, 255);
      img.pixels[i + 2] = constrain(img.pixels[i + 2] + bleed * 0.3, 0, 255);
    }
  }
  img.updatePixels();
  return img;
}

function applyWaveDistort(img, intensity) {
  let tempImg = img.get();
  tempImg.loadPixels();
  img.loadPixels();
  
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let wave = sin(y * 0.05 + time) * 10 * intensity;
      let sx = constrain(x + floor(wave), 0, img.width - 1);
      let si = (y * img.width + sx) * 4;
      let di = (y * img.width + x) * 4;
      img.pixels[di] = tempImg.pixels[si];
      img.pixels[di + 1] = tempImg.pixels[si + 1];
      img.pixels[di + 2] = tempImg.pixels[si + 2];
    }
  }
  img.updatePixels();
  return img;
}

function applyFrequencyNoise(img, intensity) {
  img.loadPixels();
  for (let i = 0; i < img.pixels.length; i += 4) {
    let freqNoise = sin(i * 0.01) * 50 * intensity;
    img.pixels[i] = constrain(img.pixels[i] + freqNoise, 0, 255);
    img.pixels[i + 1] = constrain(img.pixels[i + 1] + freqNoise * 0.5, 0, 255);
    img.pixels[i + 2] = constrain(img.pixels[i + 2] - freqNoise * 0.3, 0, 255);
  }
  img.updatePixels();
  return img;
}

function applyFragmentation(img, intensity) {
  let tempImg = img.get();
  tempImg.loadPixels();
  img.loadPixels();
  
  let blockSize = 20;
  for (let y = 0; y < img.height; y += blockSize) {
    for (let x = 0; x < img.width; x += blockSize) {
      if (random() < intensity) {
        let ox = floor(random(-blockSize, blockSize));
        let oy = floor(random(-blockSize, blockSize));
        for (let by = 0; by < blockSize && (y + by) < img.height; by++) {
          for (let bx = 0; bx < blockSize && (x + bx) < img.width; bx++) {
            let sx = constrain(x + bx + ox, 0, img.width - 1);
            let sy = constrain(y + by + oy, 0, img.height - 1);
            let si = (sy * img.width + sx) * 4;
            let di = ((y + by) * img.width + (x + bx)) * 4;
            img.pixels[di] = tempImg.pixels[si];
            img.pixels[di + 1] = tempImg.pixels[si + 1];
            img.pixels[di + 2] = tempImg.pixels[si + 2];
          }
        }
      }
    }
  }
  img.updatePixels();
  return img;
}

function applyEdgeEnhance(img, intensity) {
  img.loadPixels();
  for (let y = 1; y < img.height - 1; y++) {
    for (let x = 1; x < img.width - 1; x++) {
      let i = (y * img.width + x) * 4;
      let top = (y - 1) * img.width + x;
      let bottom = (y + 1) * img.width + x;
      let left = y * img.width + (x - 1);
      let right = y * img.width + (x + 1);
      
      let edgeR = abs(img.pixels[top * 4] + img.pixels[bottom * 4] - 2 * img.pixels[i] +
                      img.pixels[left * 4] + img.pixels[right * 4] - 2 * img.pixels[i]);
      let edgeG = abs(img.pixels[top * 4 + 1] + img.pixels[bottom * 4 + 1] - 2 * img.pixels[i + 1] +
                      img.pixels[left * 4 + 1] + img.pixels[right * 4 + 1] - 2 * img.pixels[i + 1]);
      let edgeB = abs(img.pixels[top * 4 + 2] + img.pixels[bottom * 4 + 2] - 2 * img.pixels[i + 2] +
                      img.pixels[left * 4 + 2] + img.pixels[right * 4 + 2] - 2 * img.pixels[i + 2]);
      
      img.pixels[i] = constrain(img.pixels[i] + edgeR * intensity, 0, 255);
      img.pixels[i + 1] = constrain(img.pixels[i + 1] + edgeG * intensity, 0, 255);
      img.pixels[i + 2] = constrain(img.pixels[i + 2] + edgeB * intensity, 0, 255);
    }
  }
  img.updatePixels();
  return img;
}

function mouseMoved() {
  lastMouseMoveTime = millis();
}

function mousePressed() {
  // Left-click on center triangle → advance to next phase
  if (mouseButton === LEFT && isMouseInCenter() && portalState === 'idle') {
    triggerPortalTransition();
  }
  // Right-click in center → start charging (legacy mechanic)
  if (mouseButton === RIGHT && isMouseInCenter() && portalState === 'idle') {
    portalState = 'charging';
    portalCharge = 0;
  }
}

function mouseReleased() {
  if (mouseButton === RIGHT && portalState === 'charging') {
    if (portalCharge >= 1.0) {
      triggerPortalTransition();
    }
    portalState = 'idle';
    portalCharge = 0;
  }
}

function isMouseInCenter() {
  let dx = mouseX - portalCenterX;
  let dy = mouseY - portalCenterY;
  let distFromCenter = sqrt(dx * dx + dy * dy);
  return distFromCenter < portalRadius;
}

function triggerPortalTransition() {
  if (portalState === 'transitioning') return;
  
  // Cooldown: don't trigger if transition happened recently
  let now = millis();
  if (lastTransitionTime > 0 && (now - lastTransitionTime) < 2000) return;
  
  // Only trigger if we have at least 2 images loaded
  let loadedCount = 0;
  for (let i = 0; i < images.length; i++) {
    if (images[i] && images[i].width > 0) loadedCount++;
  }
  if (loadedCount < 2) {
    console.warn('Not enough images loaded for transition (' + loadedCount + '/' + images.length + ')');
    return;
  }
  
  portalState = 'transitioning';
  transitionProgress = 0;
  lastTransitionTime = now;
  
  // Load next image
  currentImageIdx = (currentImageIdx + 1) % images.length;
  nextImage = images[currentImageIdx];
  
  // Reset scratch mask for new image
  resetScratchMask();
  
  console.log('Portal opening to dimension #' + (currentImageIdx + 1) + ' (' + nextImage.width + 'x' + nextImage.height + ')');
  
  // Audio cue
  if (audioCtx) {
    let t = audioCtx.currentTime;
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 100;
    osc.frequency.exponentialRampToValueAtTime(2000, t + 1);
    gain.gain.value = 0.3;
    gain.gain.exponentialRampToValueAtTime(0.01, t + 2);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(t + 2);
  }
}

function startAudio() {
  if (audioStarted) return;
  audioStarted = true;
  console.log('Starting glitch portal audio engine');

  // Hide overlay
  let overlay = document.getElementById('start-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }

  // Create audio context
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  // Master gain
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(audioCtx.destination);

  // === SUB BASS DRONE (constant low hum) ===
  subOsc = audioCtx.createOscillator();
  subOsc.type = 'sine';
  subOsc.frequency.value = 40;
  subGain = audioCtx.createGain();
  subGain.gain.value = 0.2;
  subOsc.connect(subGain);
  subOsc.start();

  subFilter = audioCtx.createBiquadFilter();
  subFilter.type = 'lowpass';
  subFilter.frequency.value = 100;
  subGain.connect(subFilter);
  subFilter.connect(masterGain);

  // === GLITCH OSCILLATORS (chaotic, atonal) ===
  glitchOsc1 = audioCtx.createOscillator();
  glitchOsc1.type = 'square';
  glitchOsc1.frequency.value = 100;
  glitchGain1 = audioCtx.createGain();
  glitchGain1.gain.value = 0;
  glitchOsc1.connect(glitchGain1);
  glitchOsc1.start();

  glitchOsc2 = audioCtx.createOscillator();
  glitchOsc2.type = 'sawtooth';
  glitchOsc2.frequency.value = 200;
  glitchGain2 = audioCtx.createGain();
  glitchGain2.gain.value = 0;
  glitchOsc2.connect(glitchGain2);
  glitchOsc2.start();

  glitchOsc3 = audioCtx.createOscillator();
  glitchOsc3.type = 'triangle';
  glitchOsc3.frequency.value = 400;
  glitchGain3 = audioCtx.createGain();
  glitchGain3.gain.value = 0;
  glitchOsc3.connect(glitchGain3);
  glitchOsc3.start();

  glitchFilter = audioCtx.createBiquadFilter();
  glitchFilter.type = 'bandpass';
  glitchFilter.frequency.value = 500;
  glitchFilter.Q.value = 10;
  glitchGain1.connect(glitchFilter);
  glitchGain2.connect(glitchFilter);
  glitchGain3.connect(glitchFilter);
  glitchFilter.connect(masterGain);

  // === NOISE LAYER 1 (static/tears) ===
  let bufferSize = audioCtx.sampleRate * 2;
  let buf1 = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  let data1 = buf1.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data1[i] = Math.random() * 2 - 1;
  }

  noiseSource1 = audioCtx.createBufferSource();
  noiseSource1.buffer = buf1;
  noiseSource1.loop = true;
  noiseGain1 = audioCtx.createGain();
  noiseGain1.gain.value = 0.05;
  noiseSource1.connect(noiseGain1);
  noiseSource1.start();

  noiseFilter1 = audioCtx.createBiquadFilter();
  noiseFilter1.type = 'bandpass';
  noiseFilter1.frequency.value = 1000;
  noiseFilter1.Q.value = 5;
  noiseGain1.connect(noiseFilter1);
  noiseFilter1.connect(masterGain);

  // === NOISE LAYER 2 (wind/atmosphere) ===
  let buf2 = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  let data2 = buf2.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    let lastOut = i > 0 ? data2[i - 1] : 0;
    data2[i] = (lastOut + (Math.random() * 2 - 1)) * 0.02;
  }

  noiseSource2 = audioCtx.createBufferSource();
  noiseSource2.buffer = buf2;
  noiseSource2.loop = true;
  noiseGain2 = audioCtx.createGain();
  noiseGain2.gain.value = 0.1;
  noiseSource2.connect(noiseGain2);
  noiseSource2.start();

  let noiseFilter2 = audioCtx.createBiquadFilter();
  noiseFilter2.type = 'lowpass';
  noiseFilter2.frequency.value = 300;
  noiseGain2.connect(noiseFilter2);
  noiseFilter2.connect(masterGain);

  // === ELECTRONIC GLITCH LAYER (high-frequency digital sounds) ===

  // FM Synth — chirpy, metallic, sci-fi
  fmOsc1 = audioCtx.createOscillator();
  fmOsc1.type = 'sine';
  fmOsc1.frequency.value = 800;
  fmOsc2 = audioCtx.createOscillator();
  fmOsc2.type = 'sine';
  fmOsc2.frequency.value = 1200;
  fmMod = audioCtx.createOscillator();
  fmMod.type = 'square';
  fmMod.frequency.value = 50;
  fmGain = audioCtx.createGain();
  fmGain.gain.value = 0;
  fmFilter = audioCtx.createBiquadFilter();
  fmFilter.type = 'bandpass';
  fmFilter.frequency.value = 2000;
  fmFilter.Q.value = 8;
  fmOsc1.connect(fmGain);
  fmOsc2.connect(fmGain);
  fmMod.connect(fmGain.gain); // FM modulation
  fmOsc1.start();
  fmOsc2.start();
  fmMod.start();
  fmGain.connect(fmFilter);
  fmFilter.connect(masterGain);

  // Bit-crushed noise — digital grit, like a corrupted data stream
  let buf3 = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  let data3 = buf3.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data3[i] = Math.random() * 2 - 1;
  }
  bitCrushedNoise = audioCtx.createBufferSource();
  bitCrushedNoise.buffer = buf3;
  bitCrushedNoise.loop = true;
  bitCrushGain = audioCtx.createGain();
  bitCrushGain.gain.value = 0;
  bitCrushFilter = audioCtx.createBiquadFilter();
  bitCrushFilter.type = 'highpass';
  bitCrushFilter.frequency.value = 3000;
  bitCrushFilter.Q.value = 0;
  bitCrushedNoise.connect(bitCrushGain);
  bitCrushedNoise.start();
  bitCrushGain.connect(bitCrushFilter);
  bitCrushFilter.connect(masterGain);

  // Burst oscillator — sharp clicks/glitch pops
  burstOsc = audioCtx.createOscillator();
  burstOsc.type = 'sawtooth';
  burstOsc.frequency.value = 2000;
  burstGain = audioCtx.createGain();
  burstGain.gain.value = 0;
  burstOsc.connect(burstGain);
  burstOsc.start();
  burstGain.connect(masterGain);

  // Fade in master
  masterGain.gain.setTargetAtTime(0.65, audioCtx.currentTime, 2);

  // Fade in background music and set up track switching
  bgMusic1.volume(0.5);
  bgMusic1.loop();
  bgMusic1.play();
  bgMusic2.volume(0);
  bgMusic2.loop();
  bgMusicPlaying = true;
  currentBgTrack = 0;

  // Set up ended listeners for track switching
  bgMusic1.onEnded(() => {
    if (bgMusicPlaying) {
      bgMusic1.stop();
      bgMusic1.volume(0);
      bgMusic2.volume(0.5);
      bgMusic2.play();
      currentBgTrack = 1;
    }
  });
  
  bgMusic2.onEnded(() => {
    if (bgMusicPlaying) {
      bgMusic2.stop();
      bgMusic2.volume(0);
      bgMusic1.volume(0.5);
      bgMusic1.play();
      currentBgTrack = 0;
    }
  });

  // Initialize UI
  initUI();

  console.log('Glitch portal audio engine started');
}

function draw() {
  time += 0.01;

  let currentVel = dist(mouseX, mouseY, pmouseX, pmouseY);
  targetMouseVel = currentVel;
  mouseVel = lerp(mouseVel, targetMouseVel, 0.3);

  mouseXHistory.push(mouseX);
  mouseYHistory.push(mouseY);
  if (mouseXHistory.length > 100) mouseXHistory.shift();
  if (mouseYHistory.length > 100) mouseYHistory.shift();

  // Handle scratching
  if (mouseIsPressed && !mouseButton) {
    isScratching = true;
    scratchMask(mouseX, mouseY);
  } else {
    isScratching = false;
  }

  // Update portal charging logic
  updatePortal();

  // Handle transition animation
  if (portalState === 'transitioning') {
    drawTransition();
    return;
  }

  // Draw scratch card composite
  drawScratchCard();

  // Draw portal indicator if hovering center
  if (isMouseInCenter() && portalState === 'idle') {
    drawPortalIndicator();
  }

  // Subtle retro grid
  drawRetroGrid();

  // Glitch tear effect at mouse position
  drawGlitchTear();

  // Very light particles
  drawParticles();

  // Update procedural audio
  updateProceduralAudio();
}

function scratchMask(x, y) {
  // Erase from the mask canvas (make transparent where scratching)
  maskCanvas.noStroke();
  maskCanvas.fill(0); // Black = transparent in mask
  maskCanvas.ellipse(x, y, scratchRadius * 2, scratchRadius * 2);
  
  // Update scratch intensity
  scratchIntensity = min(1, scratchIntensity + 0.001);
}

function drawScratchCard() {
  // Get the current image and its corrupted version
  let currentImg = img;
  let corruptImg = corruptedImages[currentImageIdx];
  
  if (!currentImg || !corruptImg || currentImg.width <= 0 || corruptImg.width <= 0) {
    background(10, 10, 20);
    return;
  }
  
  // === ASPECT RATIO PRESERVATION ===
  // Calculate the display size maintaining aspect ratio
  let imgAspect = currentImg.width / currentImg.height;
  let displayWidth, displayHeight;
  let displayX, displayY;
  
  // Determine if image is "wide" (aspect ratio > 1.2)
  let isWide = imgAspect > 1.2;
  
  // Fit image to 80% of screen height (was 70%)
  displayHeight = height * 0.8;
  displayWidth = displayHeight * imgAspect;
  
  // Center vertically
  displayY = (height - displayHeight) / 2;
  
  // Position horizontally based on aspect ratio and dimension
  if (currentImageIdx === 4) {
    // Dimension 4 (Nexus): left-align to leave room for text on the right
    displayX = width * 0.02;
  } else if (currentImageIdx === 2) {
    // Dimension 3 (Inferno/Fire): left-align (need text on right)
    displayX = width * 0.02;
  } else if (currentImageIdx === 3) {
    // Dimension 4 (Abyss/Road): left-align (need text on right)
    displayX = width * 0.02;
  } else if (currentImageIdx === 6) {
    // Dimension 7 (Fracture / London): left-align (wide image, need text on right)
    displayX = width * 0.02;
  } else if (currentImageIdx === 7) {
    // Dimension 8 (Resonance / Horizon Line): left-align (tall image, need text on right)
    displayX = width * 0.02;
  } else if (isWide) {
    // Wide images: center them
    displayX = (width - displayWidth) / 2;
  } else {
    // Tall/narrow images: alternate left/right
    if (currentImageIdx % 2 === 0) {
      // Left-aligned with margin
      displayX = width * 0.15;
    } else {
      // Right-aligned with margin
      displayX = width - displayWidth - width * 0.15;
    }
  }
  
  // Ensure image fits in screen
  if (displayWidth > width * 0.85) {
    displayWidth = width * 0.85;
    displayHeight = displayWidth / imgAspect;
    displayY = (height - displayHeight) / 2;
    
    if (currentImageIdx === 4) {
      // Dimension 4 (Nexus): keep left-aligned
      displayX = width * 0.02;
    } else if (currentImageIdx === 2) {
      // Dimension 3 (Inferno/Fire): keep left-aligned
      displayX = width * 0.02;
    } else if (currentImageIdx === 3) {
      // Dimension 4 (Abyss/Road): keep left-aligned
      displayX = width * 0.02;
    } else if (currentImageIdx === 6) {
      // Dimension 7 (Fracture / London): keep left-aligned
      displayX = width * 0.02;
    } else if (currentImageIdx === 7) {
      // Dimension 8 (Resonance / Horizon Line): keep left-aligned
      displayX = width * 0.02;
    } else if (isWide) {
      // Wide images: center them
      displayX = (width - displayWidth) / 2;
    } else {
      // Tall/narrow images: alternate left/right
      if (currentImageIdx % 2 === 0) {
        displayX = width * 0.075;
      } else {
        displayX = width - displayWidth - width * 0.075;
      }
    }
  }
  
  // === DRAW BACKGROUND ===
  background(10, 10, 20);
  
  // Draw subtle grid pattern in background
  drawSubtleGrid();
  
  // === DRAW CORRUPTED IMAGE (masked) ===
  // Create a temporary canvas for compositing
  let tempCanvas = createGraphics(width, height);
  
  // Draw the mask (white = corrupted, black = clean)
  tempCanvas.image(maskCanvas, 0, 0);
  
  // Use the mask to composite: where mask is white, show corrupted; where black, show clean
  tempCanvas.drawingContext.save();
  tempCanvas.drawingContext.globalCompositeOperation = 'destination-in';
  tempCanvas.fill(255);
  tempCanvas.noStroke();
  tempCanvas.rect(0, 0, width, height);
  tempCanvas.drawingContext.restore();
  
  // Draw clean image on top where mask is black
  tempCanvas.drawingContext.save();
  tempCanvas.drawingContext.globalCompositeOperation = 'destination-out';
  tempCanvas.image(maskCanvas, 0, 0);
  tempCanvas.drawingContext.restore();
  
  // Draw clean image (maintaining aspect ratio)
  tempCanvas.drawingContext.save();
  tempCanvas.drawingContext.globalCompositeOperation = 'destination-over';
  tempCanvas.image(currentImg, displayX, displayY, displayWidth, displayHeight);
  tempCanvas.drawingContext.restore();
  
  // Draw the result
  image(tempCanvas, 0, 0);
  
  // === DRAW CORRUPTED IMAGE (outside mask area) ===
  // The corrupted image is already drawn behind, so we just need to ensure it's visible
  // where the mask is still white (not scratched)
  
  // === DRAW META TEXT IN DEADSPACE ===
  drawDimensionLore(displayX, displayY, displayWidth, displayHeight);
}

function drawSubtleGrid() {
  // Draw a subtle grid pattern in the background
  stroke(255, 255, 255, 10);
  strokeWeight(1);
  let gridSize = 50;
  
  for (let x = 0; x < width; x += gridSize) {
    line(x, 0, x, height);
  }
  for (let y = 0; y < height; y += gridSize) {
    line(0, y, width, y);
  }
}

function drawDimensionLore(imgX, imgY, imgW, imgH) {
  // Get the current dimension's lore
  let lore = dimensionLore[currentImageIdx % dimensionLore.length];
  if (!lore) return;
  
  // === TEXT ALWAYS PLACED ON DEAD SPACE (left or right of image) ===
  let textColWidth = 320; // Wider column since image is smaller
  let textGap = 100; // Breathing space between image and text
  
  // Determine which side to place text: check available space
  let imgAspect = imgW / imgH;
  let textOnRight;
  
  // Calculate available dead space on each side (including gap for text column)
  let spaceOnLeft = imgX - 20; // Space from left edge to image
  let spaceOnRight = width - (imgX + imgW) - 20; // Space from image to right edge
  
  // Decide side based on available space (need room for column + gap)
  if (spaceOnLeft >= textColWidth + textGap && spaceOnRight >= textColWidth + textGap) {
    // Both sides fit — prefer right for wide images, alternate for tall
    if (imgAspect > 1.2) {
      textOnRight = true;
    } else {
      textOnRight = (currentImageIdx % 2 === 0);
    }
  } else if (spaceOnLeft >= textColWidth + textGap) {
    textOnRight = false;
  } else if (spaceOnRight >= textColWidth + textGap) {
    textOnRight = true;
  } else {
    // Neither side fits well — default to side with more space
    textOnRight = (spaceOnRight >= spaceOnLeft);
  }
  
  // Position text column
  let textX, textMaxX;
  if (textOnRight) {
    textX = imgX + imgW + textGap;
    // Account for text column width so the full column stays on screen
    textMaxX = width - 20 - textColWidth;
  } else {
    textX = 20;
    textMaxX = imgX - textGap - textColWidth;
  }
  
  // Clamp to screen bounds
  textX = constrain(textX, 20, textMaxX);
  
  // Calculate actual available width (text may need to be narrower if space is tight)
  let availableTextWidth = textMaxX - textX;
  availableTextWidth = max(availableTextWidth, 200); // Minimum readable width
  
  // Determine text column Y: top-aligned with image
  let textY = imgY + 20;
  
  // Save current font settings
  let savedFont = drawingContext.font;
  let savedFill = drawingContext.fillStyle;
  let savedTextAlign = drawingContext.textAlign;
  
  // Set monospace font for terminal feel
  drawingContext.font = '12px monospace';
  drawingContext.textAlign = 'left';
  
  // Header
  drawingContext.fillStyle = 'rgba(0, 255, 255, 0.8)';
  drawingContext.fillText(lore.header, textX, textY);
  
  // Subtitle
  drawingContext.fillStyle = 'rgba(255, 0, 255, 0.6)';
  drawingContext.fillText(lore.subtitle, textX, textY + 20);
  
  // Body text (wrapped to available width)
  drawingContext.fillStyle = 'rgba(255, 255, 255, 0.5)';
  let bodyLines = lore.body.split('\n');
  let currentY = textY + 40;
  for (let i = 0; i < bodyLines.length; i++) {
    let line = bodyLines[i];
    if (line.trim() === '') {
      currentY += 10;
    } else {
      // Word-wrap to available width
      let words = line.split(' ');
      let wrappedLine = '';
      for (let w = 0; w < words.length; w++) {
        let testLine = wrappedLine === '' ? words[w] : wrappedLine + ' ' + words[w];
        if (drawingContext.measureText(testLine).width > availableTextWidth && wrappedLine !== '') {
          drawingContext.fillText(wrappedLine, textX, currentY);
          currentY += 16;
          wrappedLine = words[w];
        } else {
          wrappedLine = testLine;
        }
      }
      if (wrappedLine) {
        drawingContext.fillText(wrappedLine, textX, currentY);
        currentY += 16;
      }
    }
  }
  
  // Footer
  drawingContext.fillStyle = 'rgba(0, 255, 128, 0.7)';
  drawingContext.fillText(lore.footer, textX, currentY + 10);
  
  // Restore font settings
  drawingContext.font = savedFont;
  drawingContext.fillStyle = savedFill;
  drawingContext.textAlign = savedTextAlign;
}

function resetScratchMask() {
  // Reset mask to fully opaque (fully corrupted)
  maskCanvas.fill(255);
  maskCanvas.rect(0, 0, width, height);
  scratchIntensity = 0;
}

function updatePortal() {
  // Passive auto-advance removed — only clicking the triangle advances
  // (keeps the experience intentional and avoids accidental transitions)

  // Right-click charging mechanic (optional, adds visual flair)
  if (portalState === 'charging') {
    if (isMouseInCenter()) {
      portalCharge = min(1, portalCharge + 0.05);
      
      // Visual feedback - intensify glitch
      if (floor(portalCharge * 10) !== floor((portalCharge - 0.02) * 10)) {
        for (let i = 0; i < 5; i++) {
          glitchLines.push({
            type: 'horizontal',
            y: random(height),
            height: 2,
            offset: random(-20, 20),
            alpha: 200,
            age: 0,
            maxAge: 30,
            corruptionLevel: 1.0,
            spawnX: mouseX,
            spawnY: mouseY,
            colorIdx: 0
          });
        }
      }
    } else {
      portalState = 'idle';
      portalCharge = 0;
    }
  }
}

function updateLocalCleanup() {
  // Calculate mouse speed this frame
  let speed = dist(mouseX, mouseY, pmouseX, pmouseY);
  
  // Update each artifact's corruption level
  for (let i = 0; i < glitchLines.length; i++) {
    let g = glitchLines[i];
    
    // Calculate distance from mouse to artifact spawn point
    let d = dist(mouseX, mouseY, g.spawnX, g.spawnY);
    
    if (d < CLEANUP_RADIUS) {
      // Mouse is close — clean based on speed
      let cleanupFactor = map(speed, 0, 30, 0, 1);
      g.corruptionLevel -= CLEANUP_RATE * cleanupFactor;
      g.corruptionLevel = max(0, g.corruptionLevel);
    } else {
      // Mouse is far — very slow natural decay
      g.corruptionLevel -= BASE_DECAY_RATE;
      g.corruptionLevel = max(0, g.corruptionLevel);
    }
  }
}

function drawPortalIndicator() {
  let pulse = sin(time * 3) * 0.3 + 0.7;
  let indicatorAlpha = map(mouseVel, 0, 20, 50, 150) * pulse;

  let cx = portalCenterX;
  let cy = portalCenterY;
  let triSize = 30; // triangle height

  // Calculate triangle vertices (pointing up)
  let x1 = cx;
  let y1 = cy - triSize;
  let x2 = cx - triSize * 0.866; // sin(60°)
  let y2 = cy + triSize * 0.5;
  let x3 = cx + triSize * 0.866;
  let y3 = cy + triSize * 0.5;

  // Glitch offset based on mouse velocity
  let glitchX = map(mouseVel, 0, 30, -3, 3);
  let glitchY = map(mouseVel, 0, 30, -2, 2);

  // === GLITCHED TRIANGLE (drawn 3 times with color channel offsets) ===

  // Red channel - shifted left
  noFill();
  stroke(255, 0, 0, indicatorAlpha * 0.6);
  strokeWeight(1.5);
  beginShape();
  vertex(x1 + glitchX, y1);
  vertex(x2 + glitchX * 1.5, y2 + glitchY);
  vertex(x3 - glitchX, y3 - glitchY);
  endShape(CLOSE);

  // Blue channel - shifted right
  stroke(0, 0, 255, indicatorAlpha * 0.6);
  strokeWeight(1.5);
  beginShape();
  vertex(x1 - glitchX, y1 + glitchY);
  vertex(x2 - glitchX, y2 - glitchY);
  vertex(x3 + glitchX * 1.5, y3);
  endShape(CLOSE);

  // Green channel (center) - main triangle
  stroke(0, 255, 128, indicatorAlpha);
  strokeWeight(2);
  beginShape();
  vertex(x1, y1);
  vertex(x2, y2);
  vertex(x3, y3);
  endShape(CLOSE);

  // Fill with low opacity
  fill(0, 255, 128, indicatorAlpha * 0.15);
  noStroke();
  beginShape();
  vertex(x1, y1);
  vertex(x2, y2);
  vertex(x3, y3);
  endShape(CLOSE);

  // === SUBTLE PULSE RING (replaces old circle) ===
  noFill();
  stroke(0, 255, 255, indicatorAlpha * 0.3);
  strokeWeight(1);
  ellipse(cx, cy, triSize * 2.5 * pulse, triSize * 2.5 * pulse);

  // === HINT TEXT ===
  fill(0, 255, 255, indicatorAlpha * 0.5);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(10);
  text('CLICK', cx, cy + triSize + 15);
}

function drawTransition() {
  if (width <= 0 || height <= 0) return;
  transitionProgress += 0.06;

  // Phase 1: Intensify glitch (0-30%)
  if (transitionProgress < 0.3) {
    let intensity = transitionProgress / 0.3;
    
    // Massive horizontal tears
    for (let i = 0; i < 10 * intensity; i++) {
      glitchLines.push({
        type: 'horizontal',
        y: random(height),
        height: random(2, 10),
        offset: random(-50, 50) * intensity,
        alpha: 200,
        age: 0,
        maxAge: 20,
        corruptionLevel: 1.0,
        spawnX: mouseX,
        spawnY: mouseY,
        colorIdx: floor(random(palette.length))
      });
    }
    
    // Squared tears everywhere
    for (let i = 0; i < 5 * intensity; i++) {
      glitchLines.push({
        type: 'square',
        x: random(width - 100),
        y: random(height - 100),
        size: random(50, 200),
        offset: random(-30, 30) * intensity,
        alpha: 150,
        age: 0,
        maxAge: 30,
        corruptionLevel: 1.0,
        spawnX: mouseX,
        spawnY: mouseY,
        colorIdx: floor(random(palette.length))
      });
    }
    
    // Draw current image with heavy distortion
    if (img && img.width > 0) {
      image(img, 0, 0, width, height);
    }
  }
  
  // Phase 2: Fade to black (30-60%)
  else if (transitionProgress < 0.6) {
    let fadeProgress = (transitionProgress - 0.3) / 0.3;
    
    // Still add random glitches
    if (random() < 0.3) {
      glitchLines.push({
        type: 'horizontal',
        y: random(height),
        height: 2,
        offset: random(-30, 30),
        alpha: 100,
        age: 0,
        maxAge: 15,
        corruptionLevel: 1.0,
        spawnX: mouseX,
        spawnY: mouseY,
        colorIdx: 0
      });
    }
    
    // Draw current image fading out
    if (img && img.width > 0) {
      image(img, 0, 0, width, height);
    }
    
    // Overlay with black fade
    noStroke();
    fill(0, 0, 0, 255 * fadeProgress);
    rect(0, 0, width, height);
  }
  
  // Phase 3: Fade in new image (60-100%)
  else {
    let revealProgress = (transitionProgress - 0.6) / 0.4;
    
    // Draw current image fading out (behind the new one)
    if (img && img.width > 0) {
      image(img, 0, 0, width, height);
    }
    
    // Draw next image fading in
    if (nextImage && nextImage.width > 0) {
      image(nextImage, 0, 0, width, height);
    }
    
    // Overlay with black fade decreasing
    noStroke();
    fill(0, 0, 0, 255 * (1 - revealProgress));
    rect(0, 0, width, height);
    
    // End transition — only if nextImage is fully loaded
    if (revealProgress >= 1 && nextImage && nextImage.width > 0) {
      img = nextImage;
      portalState = 'idle';
      transitionProgress = 0;
      nextImage = null;
      console.log('Entered dimension #' + (currentImageIdx + 1));
    }
  }
  
  // Draw glitch lines on top
  drawGlitchLinesOnCanvas();
}

function drawGlitchLinesOnCanvas() {
  // Guard: skip if canvas isn't ready yet
  if (width <= 0 || height <= 0) return;

  for (let i = glitchLines.length - 1; i >= 0; i--) {
    let g = glitchLines[i];
    g.age += 1;

    let fade = map(g.age, 0, g.maxAge, g.alpha, 0);
    if (fade <= 0) {
      glitchLines.splice(i, 1);
      continue;
    }

    // Safety: skip if coordinates are invalid or out of bounds
    // Check only the properties that are actually defined for this glitch type
    if (g.type === 'horizontal') {
      if (isNaN(g.y) || g.y < 0 || g.y >= height || g.height <= 0) continue;
    } else if (g.type === 'square') {
      if (isNaN(g.x) || isNaN(g.y) || isNaN(g.size) || g.size <= 0) continue;
      if (g.y < 0 || g.y + g.size > height || g.x < 0 || g.x + g.size > width) continue;
    } else if (g.type === 'wide') {
      if (isNaN(g.x) || isNaN(g.y) || isNaN(g.width) || isNaN(g.height)) continue;
      if (g.width <= 0 || g.height <= 0) continue;
      if (g.y < 0 || g.y + g.height > height || g.x < 0 || g.x + g.width > width) continue;
    } else {
      continue; // unknown type
    }

    let col = palette[g.colorIdx];
    let intensity = g.corruptionLevel;
    let effectiveOffset = g.offset * intensity;

    if (g.type === 'horizontal') {
      push();
      tint(col[0], col[1], col[2], fade * intensity);
      imageMode(CORNER);
      try {
        let slice = get(0, g.y, width, g.height);
        image(slice, effectiveOffset, g.y, width, g.height);
      } catch(e) { /* skip corrupted slice */ }
      pop();

      push();
      tint(255, 0, 0, fade * intensity * 0.5);
      imageMode(CORNER);
      try {
        image(get(0, g.y, width, g.height), effectiveOffset - 2, g.y, width, g.height);
      } catch(e) {}
      tint(0, 0, 255, fade * intensity * 0.5);
      try {
        image(get(0, g.y, width, g.height), effectiveOffset + 2, g.y, width, g.height);
      } catch(e) {}
      pop();

    } else if (g.type === 'square') {
      push();
      tint(col[0], col[1], col[2], fade * intensity);
      imageMode(CORNER);
      try {
        let squareSlice = get(g.x, g.y, g.size, g.size);
        image(squareSlice, g.x + effectiveOffset, g.y + effectiveOffset, g.size, g.size);
      } catch(e) {}
      pop();

      push();
      tint(255, 0, 0, fade * intensity * 0.4);
      imageMode(CORNER);
      try {
        image(get(g.x, g.y, g.size, g.size), g.x + effectiveOffset - 2, g.y + effectiveOffset, g.size, g.size);
      } catch(e) {}
      tint(0, 0, 255, fade * intensity * 0.4);
      try {
        image(get(g.x, g.y, g.size, g.size), g.x + effectiveOffset + 2, g.y + effectiveOffset, g.size, g.size);
      } catch(e) {}
      pop();

    } else if (g.type === 'wide') {
      push();
      tint(col[0], col[1], col[2], fade * intensity);
      imageMode(CORNER);
      try {
        let wideSlice = get(g.x, g.y, g.width, g.height);
        image(wideSlice, g.x + effectiveOffset, g.y, g.width, g.height);
      } catch(e) {}
      pop();

      push();
      tint(255, 0, 0, fade * intensity * 0.3);
      imageMode(CORNER);
      try {
        image(get(g.x, g.y, g.width, g.height), g.x + effectiveOffset - 1, g.y, g.width, g.height);
      } catch(e) {}
      tint(0, 0, 255, fade * intensity * 0.3);
      try {
        image(get(g.x, g.y, g.width, g.height), g.x + effectiveOffset + 1, g.y, g.width, g.height);
      } catch(e) {}
      pop();
    }
  }
}

function drawRetroGrid() {
  let gridSize = 80;
  let gridLines = floor(width / gridSize);

  let mouseInfluenceX = map(mouseX, 0, width, -0.05, 0.05);
  let mouseInfluenceY = map(mouseY, 0, height, -0.05, 0.05);

  // Toned down: lower base alpha, gentler response to mouse, hard cap
  let gridAlpha = constrain(5 + mouseVel * 0.06, 5, 35);
  stroke(0, 180, 255, gridAlpha);
  strokeWeight(0.4);

  for (let i = 0; i <= gridLines; i++) {
    let x = i * gridSize;
    beginShape();
    for (let y = 0; y <= height; y += 20) {
      let distFromMouse = dist(x, y, mouseX, mouseY);
      let distortion = map(distFromMouse, 0, 400, 0, 2);
      let wave = sin(y * 0.005 + time) * distortion;
      vertex(x + wave + mouseInfluenceX * 5, y);
    }
    endShape();
  }

  for (let i = 0; i <= gridLines; i++) {
    let y = i * gridSize;
    beginShape();
    for (let x = 0; x <= width; x += 20) {
      let distFromMouse = dist(x, y, mouseX, mouseY);
      let distortion = map(distFromMouse, 0, 400, 0, 2);
      let wave = cos(x * 0.005 + time) * distortion;
      vertex(x, y + wave + mouseInfluenceY * 5);
    }
    endShape();
  }
}

function drawGlitchTear() {
  if (mouseXHistory.length < 2) return;
  if (width <= 0 || height <= 0) return;

  let last = mouseXHistory.length - 1;
  let prevX = mouseXHistory[last - 1];
  let prevY = mouseYHistory[last - 1];
  let speed = dist(mouseX, mouseY, prevX, prevY);

  // Only create tears when mouse moves
  if (speed > 2) {
    // === HORIZONTAL TEAR (thin wide line at mouse Y) ===
    let tearY = mouseY;
    let tearHeight = 1;
    let tearOffset = map(speed, 2, 30, -1, 8);
    let tearAlpha = map(speed, 2, 30, 40, 90);

    glitchLines.push({
      type: 'horizontal',
      y: tearY,
      height: tearHeight,
      offset: tearOffset,
      alpha: tearAlpha,
      age: 0,
      maxAge: random(15, 35),
      corruptionLevel: 1.0,
      spawnX: mouseX,
      spawnY: mouseY,
      colorIdx: floor(random(palette.length))
    });

    // === WIDE RECTANGULAR TEAR (wider than tall, around mouse) ===
    if (speed > 5) {
      let rectWidth = map(speed, 5, 30, 40, 120);
      let rectHeight = map(speed, 5, 30, 4, 12);
      let rectOffset = map(speed, 5, 30, 1, 6);

      glitchLines.push({
        type: 'wide',
        x: mouseX - rectWidth / 2,
        y: mouseY - rectHeight / 2,
        width: rectWidth,
        height: rectHeight,
        offset: rectOffset,
        alpha: map(speed, 5, 30, 30, 70),
        age: 0,
        maxAge: random(10, 30),
        corruptionLevel: 1.0,
        spawnX: mouseX,
        spawnY: mouseY,
        colorIdx: floor(random(palette.length))
      });
    }
  }

  // Limit stored tears
  if (glitchLines.length > 30) {
    glitchLines.splice(0, glitchLines.length - 30);
  }

  // Add signal-based corruption (more glitches when signal is weak)
  if (corruptionLevel > 0.3 && random() < corruptionLevel * 0.3) {
    glitchLines.push({
      type: random(['horizontal', 'wide', 'square']),
      y: random(height),
      height: random(1, 5),
      offset: random(-corruptionLevel * 50, corruptionLevel * 50),
      alpha: random(50, 150) * corruptionLevel,
      age: 0,
      maxAge: random(10, 40),
      corruptionLevel: 1.0,
      spawnX: mouseX,
      spawnY: mouseY,
      colorIdx: floor(random(palette.length))
    });
  }

  // Draw all active tears
  for (let i = glitchLines.length - 1; i >= 0; i--) {
    let g = glitchLines[i];
    g.age += 1;

    let fade = map(g.age, 0, g.maxAge, g.alpha, 0);
    if (fade <= 0) {
      glitchLines.splice(i, 1);
      continue;
    }

    // Safety: skip if coordinates are invalid or out of bounds
    // Check only the properties that are actually defined for this glitch type
    if (g.type === 'horizontal') {
      if (isNaN(g.y) || g.y < 0 || g.y >= height || g.height <= 0) continue;
    } else if (g.type === 'square') {
      if (isNaN(g.x) || isNaN(g.y) || isNaN(g.size) || g.size <= 0) continue;
      if (g.y < 0 || g.y + g.size > height || g.x < 0 || g.x + g.size > width) continue;
    } else if (g.type === 'wide') {
      if (isNaN(g.x) || isNaN(g.y) || isNaN(g.width) || isNaN(g.height)) continue;
      if (g.width <= 0 || g.height <= 0) continue;
      if (g.y < 0 || g.y + g.height > height || g.x < 0 || g.x + g.width > width) continue;
    } else {
      continue; // unknown type
    }

    let col = palette[g.colorIdx];

    if (g.type === 'horizontal') {
      push();
      tint(col[0], col[1], col[2], fade);
      imageMode(CORNER);
      try {
        let slice = get(0, g.y, width, g.height);
        image(slice, g.offset, g.y, width, g.height);
      } catch(e) {}
      pop();

      push();
      tint(255, 0, 0, fade * 0.5);
      imageMode(CORNER);
      try { image(get(0, g.y, width, g.height), g.offset - 2, g.y, width, g.height); } catch(e) {}
      tint(0, 0, 255, fade * 0.5);
      try { image(get(0, g.y, width, g.height), g.offset + 2, g.y, width, g.height); } catch(e) {}
      pop();

    } else if (g.type === 'square') {
      push();
      tint(col[0], col[1], col[2], fade);
      imageMode(CORNER);
      try {
        let squareSlice = get(g.x, g.y, g.size, g.size);
        image(squareSlice, g.x + g.offset, g.y + g.offset, g.size, g.size);
      } catch(e) {}
      pop();

      push();
      tint(255, 0, 0, fade * 0.4);
      imageMode(CORNER);
      try { image(get(g.x, g.y, g.size, g.size), g.x + g.offset - 2, g.y + g.offset, g.size, g.size); } catch(e) {}
      tint(0, 0, 255, fade * 0.4);
      try { image(get(g.x, g.y, g.size, g.size), g.x + g.offset + 2, g.y + g.offset, g.size, g.size); } catch(e) {}
      pop();

    } else if (g.type === 'wide') {
      push();
      tint(col[0], col[1], col[2], fade);
      imageMode(CORNER);
      try {
        let wideSlice = get(g.x, g.y, g.width, g.height);
        image(wideSlice, g.x + g.offset, g.y, g.width, g.height);
      } catch(e) {}
      pop();

      push();
      tint(255, 0, 0, fade * 0.3);
      imageMode(CORNER);
      try { image(get(g.x, g.y, g.width, g.height), g.x + g.offset - 1, g.y, g.width, g.height); } catch(e) {}
      tint(0, 0, 255, fade * 0.3);
      try { image(get(g.x, g.y, g.width, g.height), g.x + g.offset + 1, g.y, g.width, g.height); } catch(e) {}
      pop();
    }
  }
}

function drawParticles() {
  noStroke();

  if (mouseVel > 5) {
    let count = floor(mouseVel * 0.15);
    for (let i = 0; i < count; i++) {
      let x = mouseX + random(-15, 15);
      let y = mouseY + random(-15, 15);
      let size = random(1, 3);
      let alpha = random(20, 60);
      let colorIdx = floor(map(mouseVel, 0, 50, 0, palette.length));
      colorIdx = constrain(colorIdx, 0, palette.length - 1);

      fill(palette[colorIdx][0], palette[colorIdx][1], palette[colorIdx][2], alpha);
      ellipse(x, y, size, size);
    }
  }

  strokeWeight(0.3);
  for (let i = 0; i < mouseXHistory.length - 1; i++) {
    let x1 = mouseXHistory[i];
    let y1 = mouseYHistory[i];
    let x2 = mouseXHistory[i + 1];
    let y2 = mouseYHistory[i + 1];

    let lineLen = dist(x1, y1, x2, y2);
    if (lineLen < 30) {
      let alpha = map(lineLen, 0, 30, 30, 0);
      stroke(0, 200, 255, alpha);
      line(x1, y1, x2, y2);
    }
  }
}

function updateProceduralAudio() {
  if (!audioCtx || !audioStarted) return;

  let t = audioCtx.currentTime;

  // Smooth mouse values (0-1 range)
  let vel = map(mouseVel, 0, 50, 0, 1);

  // === SUB BASS (constant low hum, responds to intensity) ===
  let subVol = map(vel, 0, 1, 0.24, 0.8);
  subGain.gain.setTargetAtTime(subVol, t, 0.1);

  // === GLITCH OSCILLATORS (random bursts) ===
  if (t > nextGlitchTime) {
    let glitchChance = map(vel, 0, 1, 0.02, 0.5);
    if (Math.random() < glitchChance) {
      triggerGlitch();
      nextGlitchTime = t + map(vel, 0, 1, 0.5, 0.1);
    } else {
      nextGlitchTime = t + 0.5;
    }
  }

  // === NOISE LAYER 1 (static/tears) ===
  let noise1Vol = map(vel, 0, 1, 0.02, 0.15);
  noiseGain1.gain.setTargetAtTime(noise1Vol, t, 0.1);

  let noise1Freq = map(vel, 0, 1, 500, 5000);
  noiseFilter1.frequency.setTargetAtTime(noise1Freq + random(-200, 200), t, 0.05);

  // === NOISE LAYER 2 (wind/atmosphere) ===
  let noise2Vol = map(vel, 0, 1, 0.05, 0.2);
  noiseGain2.gain.setTargetAtTime(noise2Vol, t, 0.1);

  // === ELECTRONIC GLITCH LAYER ===

  // FM Synth — modulates based on mouse velocity AND signal integrity
  let signalPenalty = constrain(1 - (signalIntegrity / 100), 0, 1); // 0 when good, 1 when bad
  let fmVol = map(vel, 0, 1, 0, 0.03) + signalPenalty * 0.05;
  fmGain.gain.setTargetAtTime(fmVol, t, 0.1);
  fmFilter.frequency.setTargetAtTime(constrain(map(vel, 0, 1, 1000, 3000) + signalPenalty * 2000, 0, 24000), t, 0.05);
  fmMod.frequency.setTargetAtTime(map(vel, 0, 1, 10, 60) + signalPenalty * 100, t, 0.05);
  fmOsc1.frequency.setTargetAtTime(map(vel, 0, 1, 400, 1000) + signalPenalty * 500, t, 0.05);
  fmOsc2.frequency.setTargetAtTime(map(vel, 0, 1, 600, 1500) + signalPenalty * 800, t, 0.05);

  // Bit-crushed noise — high-frequency digital grit
  let bitVol = map(vel, 0, 1, 0, 0.02);
  bitCrushGain.gain.setTargetAtTime(bitVol, t, 0.1);
  bitCrushFilter.frequency.setTargetAtTime(map(vel, 0, 1, 3000, 8000), t, 0.05);

  // Burst clicks — sharp digital pops on mouse movement
  if (mouseVel > 3 && t > nextBurstTime) {
    let burstChance = map(mouseVel, 3, 30, 0.02, 0.1);
    if (Math.random() < burstChance) {
      triggerBurst();
      nextBurstTime = t + map(mouseVel, 3, 30, 0.4, 0.15);
    }
  }

  // === MASTER VOLUME (overall intensity, reduced by 40%) ===
  let masterVol = map(vel, 0, 1, 0.144, 0.48);
  masterGain.gain.setTargetAtTime(masterVol, t, 0.1);

  // === PORTAL TRANSITION AUDIO ===
  if (portalState === 'charging') {
    let chargeIntensity = portalCharge;
    // Build up tension sound
    glitchGain1.gain.setTargetAtTime(chargeIntensity * 0.3, t, 0.05);
    glitchGain2.gain.setTargetAtTime(chargeIntensity * 0.2, t, 0.05);
    noiseGain1.gain.setTargetAtTime(0.05 + chargeIntensity * 0.2, t, 0.05);
  } else if (portalState === 'transitioning') {
    // Intense glitch storm
    let transIntensity = sin(transitionProgress * 20) * 0.5 + 0.5;
    glitchGain1.gain.setTargetAtTime(transIntensity * 0.4, t, 0.01);
    glitchGain2.gain.setTargetAtTime(transIntensity * 0.3, t, 0.01);
    noiseGain1.gain.setTargetAtTime(0.1 + transIntensity * 0.3, t, 0.01);

    // Electronic layer adds texture during transition
    fmGain.gain.setTargetAtTime(transIntensity * 0.08, t, 0.01);
    fmFilter.frequency.setTargetAtTime(4000, t, 0.01);
    fmMod.frequency.setTargetAtTime(100, t, 0.01);
    bitCrushGain.gain.setTargetAtTime(transIntensity * 0.05, t, 0.01);
    burstGain.gain.setTargetAtTime(transIntensity * 0.08, t, 0.01);
  }
}

function triggerGlitch() {
  if (!audioCtx) return;
  let t = audioCtx.currentTime;

  let freq = random([
    50, 60, 75, 90, 110, 130, 160, 200, 250, 300,
    400, 500, 600, 800, 1000, 1200, 1500, 2000
  ]);

  let oscIdx = floor(random(3));
  let osc;
  let gain;

  if (oscIdx === 0) {
    osc = glitchOsc1;
    gain = glitchGain1;
  } else if (oscIdx === 1) {
    osc = glitchOsc2;
    gain = glitchGain2;
  } else {
    osc = glitchOsc3;
    gain = glitchGain3;
  }

  osc.frequency.setTargetAtTime(freq, t, 0.01);

  let duration = random(0.01, 0.1);
  let volume = map(mouseVel, 0, 50, 0.05, 0.3);
  gain.gain.setTargetAtTime(volume, t, 0.01);
  gain.gain.setTargetAtTime(0, t + duration, 0.01);

  glitchFilter.frequency.setTargetAtTime(random(100, 3000), t, 0.01);
  glitchFilter.frequency.setTargetAtTime(random(100, 3000), t + duration, 0.01);

  if (Math.random() < 0.3) {
    noiseFilter1.frequency.setTargetAtTime(random(200, 8000), t, 0.01);
    noiseFilter1.frequency.setTargetAtTime(random(200, 8000), t + duration, 0.01);
  }
}

function triggerBurst() {
  if (!audioCtx) return;
  let t = audioCtx.currentTime;

  // Sharp high-frequency burst — very quiet digital pop
  let freq = random([3000, 4000, 5000, 6000, 8000]);
  burstOsc.frequency.setTargetAtTime(freq, t, 0.001);

  let duration = random(0.005, 0.02);
  let volume = map(mouseVel, 3, 30, 0.01, 0.04);
  burstGain.gain.setTargetAtTime(volume, t, 0.001);
  burstGain.gain.setTargetAtTime(0, t + duration, 0.001);

  // Quick FM chirp alongside — also very quiet
  let chirpFreq = random([1500, 2000, 2500, 3000, 4000]);
  fmOsc1.frequency.setTargetAtTime(chirpFreq, t, 0.001);
  fmOsc1.frequency.setTargetAtTime(chirpFreq * random(0.8, 1.3), t + duration * 0.5, 0.001);
}

// === SIGNAL TUNING SYSTEM ===
let signalIntegrity = 85; // 0-100
let corruptionLevel = 0; // 0-1
let loreFragments = [];
let currentLoreIndex = 0;

// === DIMENSION LORE DATA ===
const dimensionLore = [
  { // Gateway (Skatepark)
    header: 'DIM-000 // SKATEPARK // GATEWAY SECTOR',
    subtitle: '(The Gateway)',
    body: 'Signal lock unstable. This dimension\'s last recorded state shows a concrete ramp at night \u2014 graffiti-tagged, abandoned. Someone was here. Someone left marks. The glitch isn\'t corrupting this image \u2014 it\'s what\'s happening to it in real time. A portal is opening. Is this the end or a beginning?',
    footer: 'STATUS: UNSTABLE // SIGNAL: 73.2kHz'
  },
  { // Void (Skull)
    header: 'DIM-001 // CRANIUM // POST-BIOLOGICAL FRAGMENT',
    subtitle: '(The Dead Dimension)',
    body: 'Signal integrity critical. A skull \u2014 but not bone. This is vapor. Smoke. The dimension\'s atmosphere, crystallized into a shape that almost remembers being a face. The eyes are hollow because there\'s nothing left to see. This is what a world looks like when the last observer stops looking. The white space around it isn\'t empty \u2014 it\'s everything that used to be there.',
    footer: 'STATUS: CONTAMINATED // SIGNAL: 3.2kHz'
  },
  { // Inferno (Fire)
    header: 'DIM-002 // INFERNO // FINAL TRANSMISSION',
    subtitle: '(The Last Ritual)',
    body: 'Signal degrading. A figure in patterned vest and kilt \u2014 cultural markers from a civilization that worshipped fire as language. The sparks erupting from the torch aren\'t random. They\'re a message. Each spark is a character. The figure\'s face is calm because they know what they\'re doing: burning their world\'s history into the dark, hoping something on the other side reads it. The darkness around them isn\'t night \u2014 it\'s the void between dimensions.',
    footer: 'STATUS: CRITICAL // SIGNAL: 265.13kHz'
  },
  { // Abyss (dark road)
    header: 'DIM-003 // ABYSS // MOTION DEGRADATION',
    subtitle: '(The Lost Path)',
    body: 'Signal unstable. A road. A guardrail. Trees stripped bare by wind that no one else can feel. A figure walking away \u2014 or toward. The motion blur makes it impossible to tell direction. This is what temporal collapse looks like: not a bang, but a blur. The road is still there. The guardrail is still there. But the figure is becoming something else \u2014 something that exists in multiple positions at once, a person stretched across time like a long exposure.',
    footer: 'STATUS: SINKING // SIGNAL: 0.001kHz'
  },
  { // Nexus (three figures in room)
    header: 'DIM-004 // NEXUS // THREE AT THE EDGE',
    subtitle: '(The Witness)',
    body: 'Three figures in a dark room. Plastic. Tape. One lies down. One stands over them. One reaches in from the edge of the frame. This isn\'t violence \u2014 it\'s a procedure. They\'re preparing something. The tape creates a grid on skin like a circuit board. The plastic bags are being filled with something \u2014 air? Memory? The last breath of a dimension? The harsh light reveals everything and nothing. They know what comes next.',
    footer: 'STATUS: MERGING // SIGNAL: \u221e kHz'
  },
  { // Echo (wedding dance)
    header: 'DIM-005 // ECHO // THE DANCE',
    subtitle: '(The Last Dance)',
    body: 'Signal recovering. A wedding. A couple spinning \u2014 the dress billowing like wings, the blur creating ghosts of their movement. This is the dimension\'s happiest moment, preserved in the exact frame where joy becomes something else. The motion blur isn\'t a flaw \u2014 it\'s the dimension trying to hold onto the feeling. If they keep spinning, maybe they never have to stop. Maybe they never have to face the end. For one infinite frame, they\'re just turning and turning and the world is still whole.',
    footer: 'STATUS: REVERBERATING // SIGNAL: 440Hz'
  },
  { // Fracture (London street)
    header: 'DIM-006 // FRACTURE // LONDON // 2024',
    subtitle: '(The Last Commute)',
    body: 'Signal strong. This one\'s recent. A London street. A double-decker bus blurring past. People waiting at bus stop A30. They have no idea. They\'re just commuting, going home, living in a world that has 47 seconds left. The bus is moving at 30mph. The car is idling. The woman with the ponytail is thinking about dinner. None of them know they\'re the last citizens of a dimension that will cease to exist before they reach their destination. The blur on the bus isn\'t motion \u2014 it\'s the dimension dissolving at the edges.',
    footer: 'STATUS: SUPERPOSED // SIGNAL: 12.5kHz'
  },
  { // Resonance (sunset walkers)
    header: 'DIM-007 // RESONANCE // HORIZON LINE',
    subtitle: '(The Mapping)',
    body: 'Signal fluctuating. Two figures walking toward a sunset that shouldn\'t exist \u2014 the sky is the color of a dying star, oranges bleeding into purple. One holds a staff like a measuring rod. The other walks ahead, already halfway across the threshold. They\'re not fleeing. They\'re mapping. The staff measures how far the edge has receded. Today it\'s closer than yesterday.',
    footer: 'STATUS: RESONATING // SIGNAL: 18.7kHz'
  },
  { // Shard (woman in field)
    header: 'DIM-008 // SHARD // THE ONE WHO STAYED',
    subtitle: '(The One Who Stayed)',
    body: 'Signal patchy. A woman in a field of tall grass, wind tearing at her hair, looking back at something the camera can\'t see. She\'s not looking at the lens \u2014 she\'s looking at the horizon where the world ended. Her expression isn\'t fear. It\'s the quiet of someone who has already said goodbye and is just making sure the memory holds. The grain in this image isn\'t noise \u2014 it\'s the weight of all the things she\'s carrying.',
    footer: 'STATUS: DECAYING // SIGNAL: 0.0001kHz'
  },
  { // Threshold (Tunnel)
    header: 'DIM-009 // THRESHOLD // THE WAY OUT',
    subtitle: '(The Finale \u2014 The Exit)',
    body: 'Signal \u2014 signal \u2014 SIGNAL. This is the last one. The final fragment. A tunnel. Railroad tracks cutting through darkness like a vein. A figure walking away from us, toward the light \u2014 the blinding, overexposed, impossible light at the end of the tunnel. They\'re carrying something long and rectangular. A case. A box. The last message from every dimension that came before. The fire performer\'s sparks. The skull\'s vapor. The wedding\'s spinning dress. The commuters\' last commute. All of it, packed into that case, being carried out of the dark. The light at the end isn\'t salvation. It\'s not hell. It\'s just the next place. And the figure is walking toward it because that\'s what you do when every world behind you is gone \u2014 you keep walking. You trust the light. You trust that someone, somewhere, is ready to receive what you\'re carrying.',
    footer: 'STATUS: IMPENDING // SIGNAL: 999.9kHz'
  }
];

// Lore data for intercepted fragments
const loreData = [
  { header: '> PACKET DECRYPTED [DIM-4G]', text: 'SIGNAL TRACE: 73.2kHz // BIO-SIGNATURE: UNKNOWN // ORIGIN: SECTOR 7-G' },
  { header: '> WARNING: TEMPORAL FRACTURE', text: 'CAUSALITY ANCHOR UNSTABLE // DIMENSIONAL BOUNDARY THINNING // EST. COLLAPSE: 72 HOURS' },
  { header: '> AUDIO INTERCEPT [DIM-VOID]', text: 'FREQUENCY: 3.2kHz // PATTERN RECOGNITION: NON-HUMAN // TRANSLATION: "THEY ARE WATCHING"' },
  { header: '> DATA FRAGMENT RECOVERED', text: 'IMAGE CORRUPTION: 68% // CONTENT: STRUCTURES // ANALYSIS: ARCHITECTURAL, NON-TERRESTRIAL' },
  { header: '> CONNECTION ESTABLISHED [DIM-7G]', text: 'SIGNAL STRENGTH: 87% // ENCRYPTION: NONE // WARNING: UNFILTERED FEED' },
  { header: '> ANOMALY DETECTED', text: 'GRAVITATIONAL FLUCTUATION: ±0.03G // SOURCE: UNKNOWN // DIRECTION: IMPENDING' },
  { header: '> TRANSMISSION INCOMING', text: 'FROM: DIMENSION THRESHOLD // MESSAGE LENGTH: INFINITE // DECRYPTION: FAILED' },
  { header: '> SYSTEM ALERT', text: 'TEMPORAL DRIFT DETECTED // CLOCK DESYNC: +0.003s // RECOMMENDATION: RECALIBRATE' },
];

function spawnLoreFragment() {
  let lore = loreData[currentLoreIndex % loreData.length];
  currentLoreIndex++;

  document.getElementById('lore-header').textContent = lore.header;
  document.getElementById('lore-text').textContent = lore.text;
  document.getElementById('lore-popup').style.display = 'block';

  // Auto-close after 5 seconds
  setTimeout(() => {
    document.getElementById('lore-popup').style.display = 'none';
  }, 5000);
}

function updateLoreFragments() {
  // Randomly spawn lore fragments based on signal integrity
  if (signalIntegrity > 60 && Math.random() < 0.001) {
    spawnLoreFragment();
  }
}

function updateClock() {
  let clock = document.getElementById('clock');
  if (clock) {
    let now = new Date();
    clock.textContent = now.toTimeString().split(' ')[0];
  }
}

// Call setup after audio starts
function initUI() {
  setInterval(updateLoreFragments, 100);
  setInterval(updateClock, 1000);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  portalCenterX = width / 2;
  portalCenterY = height / 2;
}
