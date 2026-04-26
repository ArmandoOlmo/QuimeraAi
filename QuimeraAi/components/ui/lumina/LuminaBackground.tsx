import React, { useRef, useEffect } from 'react';

// Helper to convert hex/rgb strings to webgl vec3 array [r,g,b]
const parseColorToRgb = (color?: string): [number, number, number] => {
  if (!color) return [0, 0, 0];
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16) / 255;
    return [r || 0, g || 0, b || 0];
  }
  if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      return [parseInt(match[0]) / 255, parseInt(match[1]) / 255, parseInt(match[2]) / 255];
    }
  }
  return [0, 0, 0];
};

export interface LuminaBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  animationEnabled?: boolean;
  animationColors?: {
    bg?: string;
    primary?: string;
    accent?: string;
  };
  pulseSpeed?: number;
  interactionStrength?: number;
}

export const LuminaBackground: React.FC<LuminaBackgroundProps> = ({ 
  className = '', 
  children, 
  animationEnabled = true,
  animationColors,
  pulseSpeed = 0.5,
  interactionStrength = 2.0,
  ...props 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Store current props in refs for the animation loop
  const configRef = useRef({
    colors: animationColors,
    pulseSpeed,
    interactionStrength
  });

  useEffect(() => {
    configRef.current = { colors: animationColors, pulseSpeed, interactionStrength };
  }, [animationColors, pulseSpeed, interactionStrength]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !animationEnabled) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vertexShaderSource = `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision highp float;
      varying vec2 vUv;
      uniform float time;
      uniform vec2 resolution;
      uniform vec2 mouse;
      
      uniform vec3 colorBg;
      uniform vec3 colorPrimary;
      uniform vec3 colorAccent;
      uniform float pulseSpeed;
      uniform float interactionStrength;

      void main() {
        // Normalize coordinates and adjust for aspect ratio
        vec2 uvNormalized = vUv * 0.5 + 0.5;
        vec2 uv = uvNormalized * resolution / min(resolution.x, resolution.y);
        
        // Mouse is already normalized [0,1], just adjust aspect ratio
        vec2 m = mouse * resolution / min(resolution.x, resolution.y);

        // Grid pattern for dots
        vec2 grid = fract(uv * 20.0) - 0.5;
        float dot = 1.0 - smoothstep(0.05, 0.15, length(grid));

        // Breathing pulse (period adjusted by PI to make speed 1.0 = 2s)
        float pulse = sin(time * pulseSpeed * 3.14159) * 0.5 + 0.5;
        
        // Mouse interaction
        float dist = length(uv - m);
        float interaction = max(0.0, 1.0 - dist * interactionStrength);

        vec3 color = colorBg;
        
        // Pulse dots from 10% to 70% opacity for clear animation
        color = mix(color, colorPrimary, dot * (0.1 + pulse * 0.6));
        
        // Mouse adds a bright accent over the dots
        color = mix(color, colorAccent, dot * interaction * 0.9);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const compileShader = (source: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fs = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    const vertices = new Float32Array([
      -1, -1,  1, -1, -1,  1,
      -1,  1,  1, -1,  1,  1
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, 'time');
    const resLoc = gl.getUniformLocation(program, 'resolution');
    const mouseLoc = gl.getUniformLocation(program, 'mouse');
    
    const colorBgLoc = gl.getUniformLocation(program, 'colorBg');
    const colorPrimaryLoc = gl.getUniformLocation(program, 'colorPrimary');
    const colorAccentLoc = gl.getUniformLocation(program, 'colorAccent');
    const pulseSpeedLoc = gl.getUniformLocation(program, 'pulseSpeed');
    const interactionStrengthLoc = gl.getUniformLocation(program, 'interactionStrength');

    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouseX = (e.clientX - rect.left) / rect.width;
      targetMouseY = 1.0 - (e.clientY - rect.top) / rect.height; // WebGL Y is inverted
    };

    window.addEventListener('mousemove', handleMouseMove);

    let animationFrameId: number;
    const startTime = performance.now();

    const resize = () => {
      if (!canvas) return;
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
    };

    window.addEventListener('resize', resize);
    resize();

    const render = (time: number) => {
      // Smooth mouse interpolation
      mouseX += (targetMouseX - mouseX) * 0.1;
      mouseY += (targetMouseY - mouseY) * 0.1;

      gl.uniform1f(timeLoc, (time - startTime) * 0.001);
      gl.uniform2f(mouseLoc, mouseX, mouseY);
      
      const conf = configRef.current;
      gl.uniform3fv(colorBgLoc, parseColorToRgb(conf.colors?.bg || '#022C22'));
      gl.uniform3fv(colorPrimaryLoc, parseColorToRgb(conf.colors?.primary || '#064E3B'));
      gl.uniform3fv(colorAccentLoc, parseColorToRgb(conf.colors?.accent || '#10B981'));
      gl.uniform1f(pulseSpeedLoc, conf.pulseSpeed ?? 0.5);
      gl.uniform1f(interactionStrengthLoc, conf.interactionStrength ?? 2.0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(program);
    };
  }, [animationEnabled]);

  const isPositioned = className.includes('absolute') || className.includes('fixed') || className.includes('relative');
  
  return (
    <div className={`${isPositioned ? '' : 'relative '}w-full overflow-hidden ${className}`} {...props}>
      {animationEnabled && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 0 }}
        />
      )}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
