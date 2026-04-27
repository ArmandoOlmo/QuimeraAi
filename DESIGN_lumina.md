---
version: "alpha"
name: "Lumina - Global Experiences"
description: "Lumina Global Onboarding Section is designed for building reusable UI components in modern web projects. Key features include reusable structure, responsive behavior, and production-ready presentation. It is suitable for component libraries and responsive product interfaces."
colors:
  primary: "#064E3B"
  secondary: "#022C22"
  tertiary: "#10B981"
  neutral: "#FFFFFF"
  background: "#064E3B"
  surface: "#022C22"
  text-primary: "#FFFFFF"
  text-secondary: "#D1D5DB"
  border: "#10B981"
  accent: "#064E3B"
typography:
  display-lg:
    fontFamily: "System Font"
    fontSize: "88px"
    fontWeight: 600
    lineHeight: "88px"
    letterSpacing: "-0.025em"
  body-md:
    fontFamily: "System Font"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: "28px"
  label-md:
    fontFamily: "System Font"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
rounded:
  md: "0px"
  full: "9999px"
spacing:
  base: "6px"
  sm: "6px"
  md: "8px"
  lg: "13.2px"
  xl: "22px"
  gap: "8px"
  section-padding: "32px"
components:
  button-primary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.neutral}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "6px"
  button-secondary:
    textColor: "#E5E7EB"
    rounded: "{rounded.full}"
    padding: "8px"
  button-link:
    textColor: "{colors.text-secondary}"
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

The color system uses dark mode with #064E3B as the main accent and #FFFFFF as the neutral foundation.

- **Primary (#064E3B):** Main accent and emphasis color.
- **Secondary (#022C22):** Supporting accent for secondary emphasis.
- **Tertiary (#10B981):** Reserved accent for supporting contrast moments.
- **Neutral (#FFFFFF):** Neutral foundation for backgrounds, surfaces, and supporting chrome.

- **Usage:** Background: #064E3B; Surface: #022C22; Text Primary: #FFFFFF; Text Secondary: #D1D5DB; Border: #10B981; Accent: #064E3B

## Typography

Typography relies on System Font across display, body, and utility text.

- **Display (`display-lg`):** System Font, 88px, weight 600, line-height 88px, letter-spacing -0.025em.
- **Body (`body-md`):** System Font, 18px, weight 500, line-height 28px.
- **Labels (`label-md`):** System Font, 16px, weight 400, line-height 24px.

## Layout

Layout follows a flex composition with reusable spacing tokens. Preserve the flex, bounded structural frame before changing ornament or component styling. Use 6px as the base rhythm and let larger gaps step up from that cadence instead of introducing unrelated spacing values.

Treat the page as a flex / bounded composition, and keep that framing stable when adding or remixing sections.

- **Layout type:** Flex
- **Content width:** Bounded
- **Base unit:** 6px
- **Scale:** 6px, 8px, 13.2px, 22px, 24px, 32px, 48px, 96px
- **Section padding:** 32px
- **Gaps:** 8px, 12px, 22px, 40px

## Elevation & Depth

Depth is communicated through glass, border contrast, and reusable shadow or blur treatments. Keep those recipes consistent across hero panels, cards, and controls so the page reads as one material system.

Surfaces should read as glass first, with borders, shadows, and blur only reinforcing that material choice.

- **Surface style:** Glass
- **Borders:** 2px #10B981; 1px #FFFFFF; 1px #10B981
- **Shadows:** rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(16, 185, 129, 0.5) 0px 0px 15px 0px
- **Blur:** 12px

## Shapes

Shapes rely on a tight radius system anchored by 9999px and scaled across cards, buttons, and supporting surfaces. Icon geometry should stay compatible with that soft-to-controlled silhouette.

Use the radius family intentionally: larger surfaces can open up, but controls and badges should stay within the same rounded DNA instead of inventing sharper or pill-only exceptions.

- **Corner radii:** 9999px
- **Icon treatment:** Linear
- **Icon sets:** Solar

## Components

Anchor interactions to the detected button styles.

### Buttons
- **Primary:** background #022C22, text #FFFFFF, radius 9999px, padding 6px, border 1px solid rgba(16, 185, 129, 0.4).
- **Secondary:** text #E5E7EB, radius 9999px, padding 8px, border 1px solid rgba(255, 255, 255, 0.1).
- **Links:** text #D1D5DB, radius 0px, padding 0px, border 0px solid rgb(229, 231, 235).

### Iconography
- **Treatment:** Linear.
- **Sets:** Solar.

## Do's and Don'ts

Use these constraints to keep future generations aligned with the current system instead of drifting into adjacent styles.

### Do
- Do use the primary palette as the main accent for emphasis and action states.
- Do keep spacing aligned to the detected 6px rhythm.
- Do reuse the Glass surface treatment consistently across cards and controls.
- Do keep corner radii within the detected 9999px family.

### Don't
- Don't introduce extra accent colors outside the core palette roles unless the page needs a new semantic state.
- Don't mix unrelated shadow or blur recipes that break the current depth system.
- Don't exceed the detected moderate motion intensity without a deliberate reason.

## Motion

Motion feels controlled and interface-led across text, layout, and section transitions. Timing clusters around 200ms and 300ms. Easing favors ease and cubic-bezier(0.4. Hover behavior focuses on text and color changes. Scroll choreography uses GSAP ScrollTrigger for section reveals and pacing.

**Motion Level:** moderate

**Durations:** 200ms, 300ms, 150ms, 2000ms

**Easings:** ease, cubic-bezier(0.4, 0, 1), 0.2, 0.6

**Hover Patterns:** text, color

**Scroll Patterns:** gsap-scrolltrigger

## WebGL

Reconstruct the graphics as a full-bleed background field using webgl, custom shaders. The effect should read as technical, meditative, and atmospheric: dot-matrix particle field with black and sparse spacing. Build it from dot particles + soft depth fade so the effect reads clearly. Animate it as slow breathing pulse. Interaction can react to the pointer, but only as a subtle drift. Preserve dom fallback.

**Id:** webgl

**Label:** WebGL

**Stack:** WebGL

**Insights:**
  - **Scene:**
    - **Value:** Full-bleed background field
  - **Effect:**
    - **Value:** Dot-matrix particle field
  - **Primitives:**
    - **Value:** Dot particles + soft depth fade
  - **Motion:**
    - **Value:** Slow breathing pulse
  - **Interaction:**
    - **Value:** Pointer-reactive drift
  - **Render:**
    - **Value:** WebGL, custom shaders

**Techniques:** Dot matrix, Breathing pulse, Pointer parallax, Shader gradients, DOM fallback

**Code Evidence:**
  - **HTML reference:**
    - **Language:** html
    - **Snippet:**
      ```html
      <!-- WebGL Canvas Background -->
      <canvas id="webgl-bg" class="absolute inset-0 w-full h-full z-0 pointer-events-none opacity-90"></canvas>

      <!-- Content Overlay -->
      ```
  - **JS reference:**
    - **Language:** js
    - **Snippet:**
      ```
      }
      });

      // WebGL Background
      const canvas = document.getElementById('webgl-bg');
      const gl = canvas.getContext('webgl');

      if (!gl) {
      …
      ```
  - **Renderer setup:**
    - **Language:** js
    - **Snippet:**
      ```
      });

      // WebGL Background
      const canvas = document.getElementById('webgl-bg');
      const gl = canvas.getContext('webgl');

      if (!gl) {
          console.error('WebGL not supported');
      …
      ```
