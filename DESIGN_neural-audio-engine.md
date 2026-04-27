---
version: "alpha"
name: "Auralis - Neural Audio Engine"
description: "Auralis Neural Login Section is designed for authenticating users through a focused access flow. Key features include reusable structure, responsive behavior, and production-ready presentation. It is suitable for authentication screens in web products."
colors:
  primary: "#111827"
  secondary: "#4B5563"
  tertiary: "#EA580C"
  neutral: "#FFFFFF"
  background: "#FFF7ED"
  surface: "#1C1C1E"
  text-primary: "#111827"
  text-secondary: "#4B5563"
  border: "#FFFFFF"
  accent: "#111827"
typography:
  display-lg:
    fontFamily: "Geist"
    fontSize: "96px"
    fontWeight: 300
    lineHeight: "96px"
    letterSpacing: "-0.05em"
  body-md:
    fontFamily: "Geist"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: "28px"
  label-md:
    fontFamily: "Geist"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
rounded:
  md: "0px"
spacing:
  base: "4px"
  sm: "2px"
  md: "4px"
  lg: "6px"
  xl: "14px"
  gap: "4px"
  section-padding: "32px"
components:
  button-primary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.neutral}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "14px"
  button-link:
    textColor: "{colors.secondary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "0px"
---

## Overview

- **Composition cues:**
  - Layout: Flex
  - Content Width: Bounded
  - Framing: Glassy
  - Grid: Minimal

## Colors

The color system uses light mode with #111827 as the main accent and #FFFFFF as the neutral foundation.

- **Primary (#111827):** Main accent and emphasis color.
- **Secondary (#4B5563):** Supporting accent for secondary emphasis.
- **Tertiary (#EA580C):** Reserved accent for supporting contrast moments.
- **Neutral (#FFFFFF):** Neutral foundation for backgrounds, surfaces, and supporting chrome.

- **Usage:** Background: #FFF7ED; Surface: #1C1C1E; Text Primary: #111827; Text Secondary: #4B5563; Border: #FFFFFF; Accent: #111827

- **Gradients:** bg-gradient-to-r from-[#ea580c] to-[#e11d48]

## Typography

Typography relies on Geist across display, body, and utility text.

- **Display (`display-lg`):** Geist, 96px, weight 300, line-height 96px, letter-spacing -0.05em.
- **Body (`body-md`):** Geist, 18px, weight 400, line-height 28px.
- **Labels (`label-md`):** Geist, 14px, weight 400, line-height 20px.

## Layout

Layout follows a flex composition with reusable spacing tokens. Preserve the flex, bounded structural frame before changing ornament or component styling. Use 4px as the base rhythm and let larger gaps step up from that cadence instead of introducing unrelated spacing values.

Treat the page as a flex / bounded composition, and keep that framing stable when adding or remixing sections.

- **Layout type:** Flex
- **Content width:** Bounded
- **Base unit:** 4px
- **Scale:** 2px, 4px, 6px, 14px, 28px, 32px, 40px, 48px
- **Section padding:** 32px, 40px, 80px
- **Gaps:** 4px, 8px, 16px, 40px

## Elevation & Depth

Depth is communicated through glass, border contrast, and reusable shadow or blur treatments. Keep those recipes consistent across hero panels, cards, and controls so the page reads as one material system.

Surfaces should read as glass first, with borders, shadows, and blur only reinforcing that material choice.

- **Surface style:** Glass
- **Borders:** 1px #FFFFFF
- **Shadows:** rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 2px 3px -1px, rgba(25, 28, 33, 0.02) 0px 1px 0px 0px, rgba(25, 28, 33, 0.08) 0px 0px 0px 1px; rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(255, 255, 255) -15px 0px 30px -10px; rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(255, 255, 255, 0.9) -15px 0px 30px -10px
- **Blur:** 12px, 16px, 6px

### Techniques
- **Gradient border shell:** Use a thin gradient border shell around the main card. Wrap the surface in an outer shell with 0px padding and a 0px radius. Drive the shell with linear-gradient(to right, rgb(255, 255, 255) 0%, rgba(255, 255, 255, 0.85) 100%) so the edge reads like premium depth instead of a flat stroke. Keep the actual stroke understated so the gradient shell remains the hero edge treatment. Inset the real content surface inside the wrapper with a slightly smaller radius so the gradient only appears as a hairline frame.

## Shapes

Shapes stay consistent across cards, controls, and icon treatments.

- **Icon treatment:** Linear
- **Icon sets:** Solar

## Components

Anchor interactions to the detected button styles.

### Buttons
- **Primary:** background #1C1C1E, text #FFFFFF, radius 0px, padding 14px, border 0px solid rgb(229, 231, 235).
- **Links:** text #4B5563, radius 0px, padding 0px, border 0px solid rgb(229, 231, 235).

### Iconography
- **Treatment:** Linear.
- **Sets:** Solar.

## Do's and Don'ts

Use these constraints to keep future generations aligned with the current system instead of drifting into adjacent styles.

### Do
- Do use the primary palette as the main accent for emphasis and action states.
- Do keep spacing aligned to the detected 4px rhythm.
- Do reuse the Glass surface treatment consistently across cards and controls.

### Don't
- Don't introduce extra accent colors outside the core palette roles unless the page needs a new semantic state.
- Don't mix unrelated shadow or blur recipes that break the current depth system.
- Don't exceed the detected moderate motion intensity without a deliberate reason.

## Motion

Motion feels controlled and interface-led across text, layout, and section transitions. Timing clusters around 150ms and 800ms. Easing favors ease and 1). Hover behavior focuses on text and color changes. Scroll choreography uses GSAP ScrollTrigger for section reveals and pacing.

**Motion Level:** moderate

**Durations:** 150ms, 800ms, 300ms

**Easings:** ease, 1), cubic-bezier(0.4, 0, 0.2, cubic-bezier(0.16

**Hover Patterns:** text, color

**Scroll Patterns:** gsap-scrolltrigger

## WebGL

Reconstruct the graphics as a full-bleed background field using webgl, renderer, alpha, antialias, custom shaders. The effect should read as technical and atmospheric: dot-matrix particle field with white and sparse spacing. Build it from dot particles + soft depth fade so the effect reads clearly. Animate it as soft wave motion. Interaction can react to the pointer, but only as a subtle drift. Preserve dom fallback.

**Id:** webgl

**Label:** WebGL

**Stack:** ThreeJS, WebGL

**Insights:**
  - **Scene:**
    - **Value:** Full-bleed background field
  - **Effect:**
    - **Value:** Dot-matrix particle field
  - **Primitives:**
    - **Value:** Dot particles + soft depth fade
  - **Motion:**
    - **Value:** Soft wave motion
  - **Interaction:**
    - **Value:** Pointer-reactive drift
  - **Render:**
    - **Value:** WebGL, Renderer, alpha, antialias, custom shaders

**Techniques:** Dot matrix, Wave deformation, Pointer parallax, Shader gradients, Noise fields

**Code Evidence:**
  - **HTML reference:**
    - **Language:** html
    - **Snippet:**
      ```html
      <!-- WebGL Animated Gradient Canvas -->
      <canvas id="webgl-canvas" class="absolute inset-0 w-full h-full"></canvas>

      <!-- Glass Slices Overlay -->
      ```
  - **JS reference:**
    - **Language:** js
    - **Snippet:**
      ```
      // --- WebGL Background Animation (Warm Palette Remix) ---
      const canvas = document.getElementById('webgl-canvas');
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const geometry = new THREE.PlaneGeometry(2, 2);

      const material = new THREE.ShaderMaterial({
      ```
  - **Renderer setup:**
    - **Language:** js
    - **Snippet:**
      ```
      // --- WebGL Background Animation (Warm Palette Remix) ---
      const canvas = document.getElementById('webgl-canvas');
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const geometry = new THREE.PlaneGeometry(2, 2);
      ```
  - **Draw call:**
    - **Language:** js
    - **Snippet:**
      ```
      gl_Position = vec4(position, 1.0);
          }
      `,
      fragmentShader: `
          uniform float u_time;
          uniform vec2 u_resolution;

          vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
      …
      ```

## ThreeJS

Reconstruct the Three.js layer as a full-bleed background field with layered spatial depth that feels technical. Use alpha, antialias renderer settings, orthographic projection, plane geometry, shadermaterial materials, and ambient + key + rim lighting. Motion should read as timeline-led reveals, with poster frame + dom fallback.

**Id:** threejs

**Label:** ThreeJS

**Stack:** ThreeJS, WebGL

**Insights:**
  - **Scene:**
    - **Value:** Full-bleed background field with layered spatial depth
  - **Render:**
    - **Value:** alpha, antialias
  - **Camera:**
    - **Value:** Orthographic projection
  - **Lighting:**
    - **Value:** ambient + key + rim
  - **Materials:**
    - **Value:** ShaderMaterial
  - **Geometry:**
    - **Value:** plane
  - **Motion:**
    - **Value:** Timeline-led reveals

**Techniques:** Shader materials, Timeline beats, alpha, antialias, Poster frame + DOM fallback

**Code Evidence:**
  - **HTML reference:**
    - **Language:** html
    - **Snippet:**
      ```html
      <!-- WebGL Animated Gradient Canvas -->
      <canvas id="webgl-canvas" class="absolute inset-0 w-full h-full"></canvas>

      <!-- Glass Slices Overlay -->
      ```
  - **JS reference:**
    - **Language:** js
    - **Snippet:**
      ```
      // --- WebGL Background Animation (Warm Palette Remix) ---
      const canvas = document.getElementById('webgl-canvas');
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const geometry = new THREE.PlaneGeometry(2, 2);

      const material = new THREE.ShaderMaterial({
      ```
  - **Renderer setup:**
    - **Language:** js
    - **Snippet:**
      ```
      // --- WebGL Background Animation (Warm Palette Remix) ---
      const canvas = document.getElementById('webgl-canvas');
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const geometry = new THREE.PlaneGeometry(2, 2);
      ```
  - **Draw call:**
    - **Language:** js
    - **Snippet:**
      ```
      gl_Position = vec4(position, 1.0);
          }
      `,
      fragmentShader: `
          uniform float u_time;
          uniform vec2 u_resolution;

          vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
      …
      ```
