import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input } from '@angular/core';

@Component({
  selector: 'app-interactive-dots',
  standalone: true,
  template: `
    <div class="dots-container" [style.backgroundColor]="backgroundColor">
      <canvas #dotsCanvas class="dots-canvas"></canvas>
    </div>
  `,
  styles: [`
    .dots-container {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      z-index: -1;
      pointer-events: none;
    }
    .dots-canvas {
      display: block;
      width: 100%;
      height: 100%;
      pointer-events: auto;
    }
  `]
})
export class InteractiveDotsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('dotsCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  
  @Input() backgroundColor = '#101622';
  @Input() dotColor = '#232f48';
  @Input() gridSpacing = 35;
  @Input() animationSpeed = 0.003;

  private time = 0;
  private animationFrameId: number | null = null;
  private mouse = { x: 0, y: 0 };
  private ripples: Array<{ x: number; y: number; time: number; intensity: number }> = [];
  private dots: Array<{ x: number; y: number; originalX: number; originalY: number; phase: number }> = [];
  private dpr = 1;
  private resizeObserver!: ResizeObserver;
  private parsedDotColor = { r: 35, g: 47, b: 72 }; // Default

  ngAfterViewInit(): void {
    console.log('[InteractiveDots] Component initialized');
    console.log('[InteractiveDots] backgroundColor:', this.backgroundColor);
    console.log('[InteractiveDots] dotColor:', this.dotColor);
    
    this.parseDotColor();
    this.initCanvas();
    this.setupEventListeners();
    this.animate();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.resizeObserver?.disconnect();
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mousedown', this.handleMouseDown);
  }

  private parseDotColor(): void {
    // Handle named colors
    const namedColors: { [key: string]: { r: number; g: number; b: number } } = {
      'white': { r: 255, g: 255, b: 255 },
      'black': { r: 0, g: 0, b: 0 },
      'red': { r: 255, g: 0, b: 0 },
      'green': { r: 0, g: 255, b: 0 },
      'blue': { r: 0, g: 0, b: 255 },
      'gray': { r: 128, g: 128, b: 128 },
      'grey': { r: 128, g: 128, b: 128 }
    };

    const lowerColor = this.dotColor.toLowerCase();
    if (namedColors[lowerColor]) {
      this.parsedDotColor = namedColors[lowerColor];
      console.log('[InteractiveDots] Parsed named color:', this.parsedDotColor);
      return;
    }

    // Handle hex colors
    if (this.dotColor.startsWith('#') && this.dotColor.length >= 7) {
      this.parsedDotColor = {
        r: parseInt(this.dotColor.slice(1, 3), 16),
        g: parseInt(this.dotColor.slice(3, 5), 16),
        b: parseInt(this.dotColor.slice(5, 7), 16)
      };
      console.log('[InteractiveDots] Parsed hex color:', this.parsedDotColor);
      return;
    }

    // Default fallback - make dots visible
    this.parsedDotColor = { r: 100, g: 120, b: 150 };
    console.log('[InteractiveDots] Using default color:', this.parsedDotColor);
  }

  private initCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    if (!canvas) {
      console.error('[InteractiveDots] Canvas element not found!');
      return;
    }
    
    this.dpr = window.devicePixelRatio || 1;
    console.log('[InteractiveDots] Device pixel ratio:', this.dpr);
    
    this.resizeCanvas();
    
    this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
    this.resizeObserver.observe(canvas);
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;

    canvas.width = displayWidth * this.dpr;
    canvas.height = displayHeight * this.dpr;
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(this.dpr, this.dpr);
    }

    this.initializeDots();
    console.log('[InteractiveDots] Canvas resized:', displayWidth, 'x', displayHeight, '| Dots:', this.dots.length);
  }

  private initializeDots(): void {
    const canvas = this.canvasRef.nativeElement;
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;

    this.dots = [];
    for (let x = this.gridSpacing / 2; x < canvasWidth; x += this.gridSpacing) {
      for (let y = this.gridSpacing / 2; y < canvasHeight; y += this.gridSpacing) {
        this.dots.push({
          x, y,
          originalX: x,
          originalY: y,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mousedown', this.handleMouseDown);
  }

  private handleMouseMove = (e: MouseEvent): void => {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
  };

  private handleMouseDown = (e: MouseEvent): void => {
    this.ripples.push({
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      intensity: 1.5
    });
    // Clean old ripples
    const now = Date.now();
    this.ripples = this.ripples.filter(r => now - r.time < 3000);
  };

  private getMouseInfluence(x: number, y: number): number {
    const dx = x - this.mouse.x;
    const dy = y - this.mouse.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 120;
    return Math.max(0, 1 - distance / maxDistance);
  }

  private getRippleInfluence(x: number, y: number, currentTime: number): number {
    let totalInfluence = 0;
    this.ripples.forEach(ripple => {
      const age = currentTime - ripple.time;
      const maxAge = 2500;
      if (age < maxAge) {
        const dx = x - ripple.x;
        const dy = y - ripple.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const rippleRadius = (age / maxAge) * 250;
        const rippleWidth = 50;
        if (Math.abs(distance - rippleRadius) < rippleWidth) {
          const rippleStrength = (1 - age / maxAge) * ripple.intensity;
          const proximityToRipple = 1 - Math.abs(distance - rippleRadius) / rippleWidth;
          totalInfluence += rippleStrength * proximityToRipple;
        }
      }
    });
    return Math.min(totalInfluence, 1.5);
  }

  private animate = (): void => {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[InteractiveDots] No canvas context!');
      return;
    }

    this.time += this.animationSpeed;
    const currentTime = Date.now();
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;

    // Clear canvas with background
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const { r, g, b } = this.parsedDotColor;

    // Draw dots
    this.dots.forEach(dot => {
      const mouseInfluence = this.getMouseInfluence(dot.originalX, dot.originalY);
      const rippleInfluence = this.getRippleInfluence(dot.originalX, dot.originalY, currentTime);
      const totalInfluence = mouseInfluence + rippleInfluence;

      // Dot size based on influence - LARGER base size
      const baseDotSize = 2.5;
      const dotSize = baseDotSize + 
        totalInfluence * 6 + 
        Math.sin(this.time + dot.phase) * 0.4;
      
      // Opacity based on influence - HIGHER base opacity for visibility
      const baseOpacity = 0.5;
      const opacity = Math.min(1, baseOpacity + 
        totalInfluence * 0.4 + 
        Math.abs(Math.sin(this.time * 0.5 + dot.phase)) * 0.15);

      ctx.beginPath();
      ctx.arc(dot.originalX, dot.originalY, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      ctx.fill();
    });

    this.animationFrameId = requestAnimationFrame(this.animate);
  };
}
