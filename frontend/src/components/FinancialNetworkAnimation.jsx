import React, { useEffect, useRef, useState } from 'react';

/**
 * SENTINEL FinancialNetworkAnimation
 * Native HTML5 Canvas 2D Live Financial Crime Intelligence Engine.
 * Follows exact visual reference: Screenshot 2026-09-25 060603.png & StitchMCP Design System.
 * 
 * Continuous Transaction Intelligence Cycle (7.5s Narrative + Continuous Flow):
 *   0.0s - 1.0s: SYSTEM MONITORING (Continuous background traffic, calm baseline)
 *   1.0s - 2.2s: ANOMALY & SIGNAL CONVERGENCE (Node 06 flagged, 4 forensic signals converge into Core, risk dots build)
 *   2.2s - 3.4s: MULTI-HOP HOP 1 (Node 06 -> Node 07 with amber breadcrumb trail)
 *   3.4s - 3.55s: ANTICIPATION PAUSE (Node 07 activates, next edge pre-glows, Core tightens)
 *   3.55s - 4.2s: MULTI-HOP HOP 2 (Node 07 -> 75% path to Node 09 with pre-interception acceleration & red pre-glow)
 *   4.2s - 6.6s: HARD CONTAINMENT & EVIDENCE (Dead stop at 75%, crimson snap, shockwave, '✕' marker, reverse echo pulse, evidence checkmarks)
 *   6.6s - 7.5s: SEAMLESS DECAY TO MONITORING (Investigation fades, continuous background traffic uninterrupted)
 */

const CYCLE_DURATION = 7.5; // seconds

// Easing helper functions
const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeInExpo = (x) => (x === 0 ? 0 : Math.pow(2, 10 * x - 10));
const easeOutQuart = (x) => 1 - Math.pow(1 - x, 4);

const FinancialNetworkAnimation = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;

    // Node hit timestamps for micro-pulses
    const nodePulseTimes = {};

    // 16 Continuous Background Transaction Packets (independent continuous flow)
    // Routes defined by pairs of topology edge indices
    const bgPackets = [
      { edgeIndex: 0, p: 0.12, speed: 0.19, len: 18, baseAlpha: 0.65 },
      { edgeIndex: 1, p: 0.45, speed: 0.22, len: 20, baseAlpha: 0.70 },
      { edgeIndex: 2, p: 0.82, speed: 0.17, len: 16, baseAlpha: 0.55 },
      { edgeIndex: 3, p: 0.33, speed: 0.24, len: 22, baseAlpha: 0.75 },
      { edgeIndex: 4, p: 0.60, speed: 0.15, len: 14, baseAlpha: 0.50 },
      { edgeIndex: 5, p: 0.22, speed: 0.20, len: 19, baseAlpha: 0.60 },
      { edgeIndex: 6, p: 0.78, speed: 0.23, len: 21, baseAlpha: 0.70 },
      { edgeIndex: 7, p: 0.52, speed: 0.18, len: 15, baseAlpha: 0.55 },
      { edgeIndex: 8, p: 0.15, speed: 0.21, len: 18, baseAlpha: 0.65 },
      { edgeIndex: 9, p: 0.68, speed: 0.26, len: 24, baseAlpha: 0.75 },
      { edgeIndex: 10, p: 0.38, speed: 0.16, len: 16, baseAlpha: 0.50 },
      { edgeIndex: 11, p: 0.88, speed: 0.25, len: 20, baseAlpha: 0.70 },
      { edgeIndex: 12, p: 0.42, speed: 0.19, len: 17, baseAlpha: 0.60 },
      { edgeIndex: 13, p: 0.71, speed: 0.22, len: 22, baseAlpha: 0.65 },
      { edgeIndex: 0, p: 0.58, speed: 0.14, len: 15, baseAlpha: 0.55 },
      { edgeIndex: 7, p: 0.95, speed: 0.20, len: 18, baseAlpha: 0.65 },
    ];

    const resize = () => {
      if (!container || !canvas) return;
      width = container.clientWidth;
      height = container.clientHeight;
      dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const render = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsedMs = timestamp - startTimeRef.current;
      const continuousTime = elapsedMs / 1000;
      // Fixed at contained state if user prefers reduced motion
      const t = reducedMotion ? 5.2 : continuousTime % CYCLE_DURATION;

      // Clear Canvas with Deep Navy/Black (#05070D)
      ctx.fillStyle = '#05070D';
      ctx.fillRect(0, 0, width, height);

      // --- GRAPH TOPOLOGY ANCHORS (Exact match to screenshot reference) ---
      const core = { id: 'core', x: width * 0.14, y: height * 0.58 };
      const n06 = { id: 'n06', x: width * 0.48, y: height * 0.58 };
      const n07 = { id: 'n07', x: width * 0.69, y: height * 0.58 };
      const n09 = { id: 'n09', x: width * 0.84, y: height * 0.58 };
      const n11 = { id: 'n11', x: width * 0.95, y: height * 0.58 };

      // Outer Constellation Nodes
      const nTop0 = { id: 'nTop0', x: width * 0.48, y: height * 0.22, phase: 0.2 };
      const nTop1 = { id: 'nTop1', x: width * 0.65, y: height * 0.26, phase: 1.1 };
      const nTop2 = { id: 'nTop2', x: width * 0.82, y: height * 0.29, phase: 2.3 };
      const nMidL = { id: 'nMidL', x: width * 0.42, y: height * 0.48, phase: 3.5 };
      const nBotL = { id: 'nBotL', x: width * 0.31, y: height * 0.80, phase: 4.2 };
      const nBotC = { id: 'nBotC', x: width * 0.48, y: height * 0.91, phase: 5.1 };
      const nBotR = { id: 'nBotR', x: width * 0.80, y: height * 0.88, phase: 0.8 };
      const nMidR = { id: 'nMidR', x: width * 0.81, y: height * 0.74, phase: 1.9 };

      const outerNodes = [
        nTop0, nTop1, nTop2, nMidL, n07, nBotL, nBotC, nBotR, nMidR, n09, n11
      ];

      // Outer Constellation Edges
      const bgEdges = [
        [nTop0, nTop1], // 0
        [nTop1, nTop2], // 1
        [nTop2, n07],   // 2
        [nMidL, nTop0], // 3
        [nMidL, core],  // 4
        [nMidL, nBotL], // 5
        [nBotL, n06],   // 6
        [nBotL, nBotC], // 7
        [n06, nBotC],   // 8
        [n07, nBotR],   // 9
        [nBotR, nMidR], // 10
        [nMidR, n09],   // 11
        [n09, n11],     // 12
        [nTop0, n06],   // 13
      ];

      // Investigation loop fade factor (seamless reset at 6.6s - 7.5s)
      const investigationFade = t >= 6.6 ? Math.max(0, (CYCLE_DURATION - t) / 0.9) : 1.0;

      // Background traffic focus dimming during climax (4.2s - 6.0s)
      const bgTrafficDim = (t >= 4.2 && t < 6.0) ? 0.4 : (t >= 1.0 && t < 4.2) ? 0.65 : 1.0;

      // ── 1. SUBTLE BACKGROUND GRAPH EDGES ──────────────────────────────
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      bgEdges.forEach(([p1, p2]) => {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      // Central spine connecting Sentinel Core to Node 06
      ctx.beginPath();
      ctx.moveTo(core.x, core.y);
      ctx.lineTo(n06.x, n06.y);
      ctx.strokeStyle = t >= 1.0 
        ? `rgba(227, 162, 76, ${0.25 * investigationFade})` 
        : 'rgba(56, 189, 248, 0.16)';
      ctx.stroke();
      ctx.restore();

      // ── 2. CONTINUOUS BACKGROUND TRANSACTION STREAM ───────────────────
      // Uninterrupted stream of packets traveling along graph edges
      if (!reducedMotion) {
        ctx.save();
        bgPackets.forEach((pkt) => {
          pkt.p += pkt.speed * 0.016;
          if (pkt.p >= 1.0) {
            pkt.p = 0;
            // Record pulse on destination node
            const edge = bgEdges[pkt.edgeIndex % bgEdges.length];
            if (edge && edge[1]) {
              nodePulseTimes[edge[1].id] = continuousTime;
            }
          }

          const [p1, p2] = bgEdges[pkt.edgeIndex % bgEdges.length];
          if (!p1 || !p2) return;

          const hx = p1.x + (p2.x - p1.x) * pkt.p;
          const hy = p1.y + (p2.y - p1.y) * pkt.p;

          const dx = (p2.x - p1.x);
          const dy = (p2.y - p1.y);
          const dist = Math.hypot(dx, dy) || 1;
          const tx = hx - (dx / dist) * pkt.len;
          const ty = hy - (dy / dist) * pkt.len;

          const currentAlpha = pkt.baseAlpha * bgTrafficDim;

          // Motion tail gradient
          const grad = ctx.createLinearGradient(tx, ty, hx, hy);
          grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
          grad.addColorStop(1, `rgba(127, 208, 255, ${currentAlpha})`);

          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(hx, hy);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.4;
          ctx.stroke();

          // Packet head
          ctx.beginPath();
          ctx.arc(hx, hy, 1.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(186, 230, 253, ${currentAlpha})`;
          ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
          ctx.shadowBlur = 4;
          ctx.fill();
        });
        ctx.restore();
      }

      // ── 3. LIVING NODES (Breathing, Micro-Ripples, Living Energy) ──────
      ctx.save();
      outerNodes.forEach((node) => {
        // Subtle base breathing
        const breath = Math.sin(continuousTime * 2.2 + (node.phase || 0)) * 0.35;
        const baseR = 2.5 + breath;

        // Arrival micro-ripple
        const lastHit = nodePulseTimes[node.id] || 0;
        const timeSinceHit = continuousTime - lastHit;
        if (timeSinceHit > 0 && timeSinceHit < 0.5) {
          const rippleProgress = timeSinceHit / 0.5;
          const rippleR = baseR + rippleProgress * 8;
          const rippleAlpha = (1 - rippleProgress) * 0.45 * bgTrafficDim;
          ctx.beginPath();
          ctx.arc(node.x, node.y, rippleR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56, 189, 248, ${rippleAlpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Node center
        ctx.beginPath();
        ctx.arc(node.x, node.y, baseR, 0, Math.PI * 2);
        ctx.fillStyle = '#7FD0FF';
        ctx.shadowColor = 'rgba(56, 189, 248, 0.7)';
        ctx.shadowBlur = 4;
        ctx.fill();

        // Node subtle halo ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, baseR + 2.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      ctx.restore();

      // ── 4. FORENSIC SIGNAL CALLOUTS (Matches Screenshot Upper Left) ───
      const calloutX = width * 0.32;
      const calloutY = height * 0.30;
      const signals = [
        { label: 'UNUSUAL AMOUNT', start: 1.05, impact: 1.35 },
        { label: 'NEW BENEFICIARY', start: 1.25, impact: 1.55 },
        { label: 'RAPID FUND MOVEMENT', start: 1.45, impact: 1.75 },
        { label: 'BEHAVIORAL ANOMALY', start: 1.65, impact: 1.95 },
      ];

      ctx.save();
      ctx.font = '500 7.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const lineSpacing = 11;

      // Draw callout texts and tick connectors
      signals.forEach((sig, idx) => {
        const sy = calloutY + idx * lineSpacing;
        const isTriggered = t >= sig.start;
        const alpha = isTriggered 
          ? (0.85 * investigationFade) 
          : (0.35 * investigationFade);

        ctx.fillStyle = isTriggered 
          ? `rgba(227, 162, 76, ${alpha})` 
          : `rgba(148, 163, 184, ${alpha})`;
        ctx.fillText(sig.label, calloutX, sy);

        // Connector tick pointing right
        ctx.beginPath();
        ctx.moveTo(calloutX + 4, sy);
        ctx.lineTo(calloutX + 16, sy);
        ctx.strokeStyle = `rgba(227, 162, 76, ${0.35 * investigationFade})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });

      // Bracket gathering line down to pattern correlated
      const bracketTopY = calloutY;
      const bracketBotY = calloutY + 3 * lineSpacing;
      const bracketX = calloutX + 16;

      ctx.beginPath();
      ctx.moveTo(bracketX, bracketTopY);
      ctx.lineTo(bracketX, bracketBotY);
      ctx.lineTo(bracketX + 10, bracketBotY + 12);
      ctx.strokeStyle = `rgba(227, 162, 76, ${0.35 * investigationFade})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Angled light cyan line from signal correlation bracket to Node 06
      ctx.beginPath();
      ctx.moveTo(bracketX + 10, bracketBotY + 12);
      ctx.lineTo(n06.x, n06.y);
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.55 * investigationFade})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // [ PATTERN CORRELATED ] badge (Matches Screenshot)
      if (t >= 1.95) {
        const pcW = 86;
        const pcH = 14;
        const pcX = calloutX - 10;
        const pcY = bracketBotY + 8;

        ctx.fillStyle = `rgba(8, 14, 28, ${0.9 * investigationFade})`;
        ctx.strokeStyle = `rgba(227, 162, 76, ${0.65 * investigationFade})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(pcX, pcY, pcW, pcH, 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '600 7px "JetBrains Mono", monospace';
        ctx.fillStyle = `rgba(227, 162, 76, ${investigationFade})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PATTERN CORRELATED', pcX + pcW * 0.5, pcY + pcH * 0.5 + 0.5);
      }
      ctx.restore();

      // ── 5. FORENSIC SIGNAL FLYING PACKETS (Converging into Sentinel Core) ─
      if (!reducedMotion && t >= 1.0 && t < 2.5) {
        ctx.save();
        signals.forEach((sig, idx) => {
          if (t >= sig.start && t <= sig.impact) {
            const rawProgress = (t - sig.start) / (sig.impact - sig.start);
            const p = easeInExpo(rawProgress);

            const sy = calloutY + idx * lineSpacing;
            const startPt = { x: calloutX + 16, y: sy };
            // Quadratic Bezier curve curving downward into Sentinel Core
            const controlPt = { x: (startPt.x + core.x) * 0.5 - 20, y: (startPt.y + core.y) * 0.5 - 30 };

            const oneMinusP = 1 - p;
            const curX = oneMinusP * oneMinusP * startPt.x + 2 * oneMinusP * p * controlPt.x + p * p * core.x;
            const curY = oneMinusP * oneMinusP * startPt.y + 2 * oneMinusP * p * controlPt.y + p * p * core.y;

            // Packet dot
            ctx.beginPath();
            ctx.arc(curX, curY, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = '#E3A24C';
            ctx.shadowColor = 'rgba(227, 162, 76, 0.9)';
            ctx.shadowBlur = 6;
            ctx.fill();
          }

          // Impact spark bloom at Core
          const timeSinceImpact = t - sig.impact;
          if (timeSinceImpact > 0 && timeSinceImpact < 0.25) {
            const bloomP = timeSinceImpact / 0.25;
            ctx.beginPath();
            ctx.arc(core.x, core.y, 8 + bloomP * 12, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(227, 162, 76, ${(1 - bloomP) * 0.7})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
        ctx.restore();
      }

      // ── 6. RISK BUILD-UP INDICATOR (Matches Screenshot Left of Core) ──
      const rbX = width * 0.16;
      const rbY = height * 0.49;

      ctx.save();
      ctx.font = '500 6.5px "JetBrains Mono", monospace';
      ctx.fillStyle = `rgba(227, 162, 76, ${0.65 * investigationFade})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('RISK BUILD-UP', rbX, rbY - 4);

      // 4 dots filling in dynamically as signals impact
      let filledDots = 0;
      if (t >= 1.95) filledDots = 4;
      else if (t >= 1.75) filledDots = 3;
      else if (t >= 1.55) filledDots = 2;
      else if (t >= 1.35) filledDots = 1;

      const dotSpacing = 7;
      const totalDotW = 3 * dotSpacing;
      const dotStartX = rbX - totalDotW * 0.5;

      for (let i = 0; i < 4; i++) {
        const dx = dotStartX + i * dotSpacing;
        ctx.beginPath();
        ctx.arc(dx, rbY + 2, 1.8, 0, Math.PI * 2);
        if (i < filledDots) {
          ctx.fillStyle = `rgba(227, 162, 76, ${investigationFade})`;
          ctx.shadowColor = 'rgba(227, 162, 76, 0.8)';
          ctx.shadowBlur = 4;
        } else {
          ctx.fillStyle = `rgba(227, 162, 76, ${0.2 * investigationFade})`;
          ctx.shadowBlur = 0;
        }
        ctx.fill();
      }
      ctx.restore();

      // ── 7. SENTINEL CORE (Layered Dial / Reactor / Arbiter) ────────────
      ctx.save();
      // Tick rotation accelerates during active threat
      const isThreatActive = t >= 1.0 && t < 6.6;
      const tickSpeed = isThreatActive ? 1.4 : 0.35;
      const tickRotation = continuousTime * tickSpeed;

      // Outer dial ring with 16 radial ticks (Matches screenshot dial)
      const tickCount = 16;
      const innerTickR = 12;
      const outerTickR = 16.5;

      ctx.strokeStyle = isThreatActive 
        ? `rgba(227, 162, 76, ${0.6 * investigationFade + 0.2})` 
        : 'rgba(127, 208, 255, 0.5)';
      ctx.lineWidth = 1;

      for (let i = 0; i < tickCount; i++) {
        const angle = (i / tickCount) * Math.PI * 2 + tickRotation;
        const x1 = core.x + Math.cos(angle) * innerTickR;
        const y1 = core.y + Math.sin(angle) * innerTickR;
        const x2 = core.x + Math.cos(angle) * outerTickR;
        const y2 = core.y + Math.sin(angle) * outerTickR;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Layer 1: Breathing ring
      const coreBreath = Math.sin(continuousTime * (isThreatActive ? 5 : 2.5)) * 0.8;
      ctx.beginPath();
      ctx.arc(core.x, core.y, 8 + coreBreath, 0, Math.PI * 2);
      ctx.fillStyle = '#060D1E';
      ctx.strokeStyle = isThreatActive 
        ? `rgba(227, 162, 76, ${0.6 * investigationFade})` 
        : 'rgba(127, 208, 255, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.fill();
      ctx.stroke();

      // Layer 2: Center nucleus (White/Cyan core)
      ctx.beginPath();
      ctx.arc(core.x, core.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#F4F7FB';
      ctx.shadowColor = isThreatActive ? '#E3A24C' : '#7FD0FF';
      ctx.shadowBlur = 8;
      ctx.fill();

      // Synchronized containment response ring from Core at t = 4.2s
      if (t >= 4.2 && t < 4.8) {
        const coreRingProgress = (t - 4.2) / 0.6;
        ctx.beginPath();
        ctx.arc(core.x, core.y, 16.5 + coreRingProgress * 18, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(229, 72, 77, ${(1 - coreRingProgress) * 0.65})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.restore();

      // ── 8. NODE 06 (Amber Suspicious Anchor with Rectangular Label) ────
      ctx.save();
      const n06IsAmber = t >= 1.0;
      const n06Pulse = n06IsAmber ? Math.sin(continuousTime * 4) * 0.6 : 0;

      ctx.beginPath();
      ctx.arc(n06.x, n06.y, 3.2 + n06Pulse, 0, Math.PI * 2);
      ctx.fillStyle = n06IsAmber ? '#E3A24C' : '#7FD0FF';
      ctx.shadowColor = n06IsAmber ? 'rgba(227, 162, 76, 0.8)' : 'rgba(56, 189, 248, 0.6)';
      ctx.shadowBlur = 6;
      ctx.fill();

      // Rectangular Telemetry Label for Node 06 (Matches Screenshot)
      const lW = 68;
      const lH = 18;
      const lX = n06.x - lW * 0.5;
      const lY = n06.y - lH * 0.5;

      ctx.fillStyle = 'rgba(8, 14, 28, 0.85)';
      ctx.strokeStyle = n06IsAmber 
        ? `rgba(227, 162, 76, ${0.55 * investigationFade})` 
        : 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(lX, lY, lW, lH, 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = '600 7.5px "JetBrains Mono", monospace';
      ctx.fillStyle = n06IsAmber ? `rgba(227, 162, 76, ${investigationFade})` : '#7FD0FF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('NODE 06', n06.x, lY + 2.5);

      ctx.font = '500 6.5px "JetBrains Mono", monospace';
      ctx.fillStyle = n06IsAmber ? `rgba(227, 162, 76, ${0.85 * investigationFade})` : 'rgba(127, 208, 255, 0.7)';
      ctx.fillText('UNUSUAL AMOUNT', n06.x, lY + 10);

      // Node 07 (Relay point)
      const n07IsActive = t >= 3.4 && t < 6.6;
      ctx.beginPath();
      ctx.arc(n07.x, n07.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = n07IsActive ? '#E3A24C' : '#7FD0FF';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(n07.x, n07.y, 6.5, 0, Math.PI * 2);
      ctx.strokeStyle = n07IsActive 
        ? `rgba(227, 162, 76, ${0.5 * investigationFade})` 
        : 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // ── 9. MULTI-HOP PATHS & HARD CONTAINMENT (Node 06 -> 07 -> 09) ────
      ctx.save();
      // Hop 1: Node 06 -> Node 07
      ctx.beginPath();
      ctx.moveTo(n06.x, n06.y);
      ctx.lineTo(n07.x, n07.y);
      if (t >= 2.2) {
        ctx.strokeStyle = `rgba(227, 162, 76, ${investigationFade})`;
        ctx.lineWidth = 1.4;
      } else {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1;
      }
      ctx.stroke();

      // Hop 2: Node 07 -> Node 09 with 75% Interception
      const interceptionFrac = 0.75;
      const interceptX = n07.x + (n09.x - n07.x) * interceptionFrac;
      const interceptY = n07.y + (n09.y - n07.y) * interceptionFrac;

      if (t >= 4.2) {
        // CONTAINED STATE (Matches Screenshot)
        // Red solid segment: Node 07 to 75% interception point
        ctx.beginPath();
        ctx.moveTo(n07.x, n07.y);
        ctx.lineTo(interceptX, interceptY);
        ctx.strokeStyle = `rgba(229, 72, 77, ${investigationFade})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Dashed red segment: 75% point to Node 09
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(interceptX, interceptY);
        ctx.lineTo(n09.x, n09.y);
        ctx.strokeStyle = `rgba(229, 72, 77, ${0.4 * investigationFade})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (t >= 3.55) {
        // Hop 2 active movement
        const rawP = (t - 3.55) / 0.65;
        const p = easeInOutCubic(Math.min(1, rawP));
        const currentP = p * interceptionFrac;
        const cx = n07.x + (n09.x - n07.x) * currentP;
        const cy = n07.y + (n09.y - n07.y) * currentP;

        // Traversed portion
        ctx.beginPath();
        ctx.moveTo(n07.x, n07.y);
        ctx.lineTo(cx, cy);
        ctx.strokeStyle = '#E3A24C';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Remaining portion
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(n09.x, n09.y);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Subtle anticipatory pre-glow on Hop 2 edge during pause (3.4s - 3.55s)
        ctx.beginPath();
        ctx.moveTo(n07.x, n07.y);
        ctx.lineTo(n09.x, n09.y);
        ctx.strokeStyle = (t >= 3.4 && t < 3.55) 
          ? 'rgba(227, 162, 76, 0.45)' 
          : 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = (t >= 3.4 && t < 3.55) ? 1.3 : 1;
        ctx.stroke();
      }
      ctx.restore();

      // ── 10. SUSPICIOUS TRANSACTION MOVING PACKET ──────────────────────
      if (t >= 1.0 && t < 4.2) {
        let sx = n06.x;
        let sy = n06.y;

        if (t >= 2.2 && t < 3.4) {
          // Hop 1: Node 06 -> Node 07
          const p = easeInOutCubic((t - 2.2) / 1.2);
          sx = n06.x + (n07.x - n06.x) * p;
          sy = n06.y + (n07.y - n06.y) * p;
        } else if (t >= 3.4 && t < 3.55) {
          // Anticipation pause at Node 07
          sx = n07.x;
          sy = n07.y;
        } else if (t >= 3.55) {
          // Hop 2: Node 07 -> 75% path to Node 09
          const rawP = (t - 3.55) / 0.65;
          const p = easeInOutCubic(Math.min(1, rawP));
          sx = n07.x + (n09.x - n07.x) * (p * interceptionFrac);
          sy = n07.y + (n09.y - n07.y) * (p * interceptionFrac);
        }

        ctx.save();
        // Pre-interception anticipation (3.95s - 4.2s): pulse red pre-glow
        const isPreInterception = t >= 3.95;
        ctx.beginPath();
        ctx.arc(sx, sy, 3.8, 0, Math.PI * 2);
        ctx.fillStyle = isPreInterception ? '#F87171' : '#E3A24C';
        ctx.shadowColor = isPreInterception ? 'rgba(239, 68, 68, 0.9)' : 'rgba(227, 162, 76, 0.9)';
        ctx.shadowBlur = 10;
        ctx.fill();

        // Trailing glow
        ctx.beginPath();
        ctx.arc(sx, sy, 7, 0, Math.PI * 2);
        ctx.strokeStyle = isPreInterception ? 'rgba(239, 68, 68, 0.4)' : 'rgba(227, 162, 76, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      // ── 11. CONTAINMENT MARKER & SHOCKWAVE (Climax at exactly 75%) ───
      if (t >= 4.2) {
        ctx.save();
        // Expanding containment shockwave (4.2s - 4.6s)
        if (!reducedMotion && t < 4.7) {
          const swProgress = easeOutQuart((t - 4.2) / 0.5);
          const swRadius = 11 + swProgress * 16;
          ctx.beginPath();
          ctx.arc(interceptX, interceptY, swRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(229, 72, 77, ${(1 - swProgress) * 0.75})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Reverse echo pulse travelling from 75% mark back to Node 07
          const echoX = interceptX - (interceptX - n07.x) * swProgress;
          const echoY = interceptY;
          ctx.beginPath();
          ctx.arc(echoX, echoY, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(229, 72, 77, ${(1 - swProgress) * 0.9})`;
          ctx.fill();
        }

        // Red containment circle (Matches screenshot circle)
        ctx.beginPath();
        ctx.arc(interceptX, interceptY, 11, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(229, 72, 77, ${investigationFade})`;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(229, 72, 77, 0.6)';
        ctx.shadowBlur = 6;
        ctx.stroke();

        // Centered red X
        ctx.strokeStyle = `rgba(229, 72, 77, ${investigationFade})`;
        ctx.lineWidth = 1.6;
        const xSpan = 3.5;
        ctx.beginPath();
        ctx.moveTo(interceptX - xSpan, interceptY - xSpan);
        ctx.lineTo(interceptX + xSpan, interceptY + xSpan);
        ctx.moveTo(interceptX + xSpan, interceptY - xSpan);
        ctx.lineTo(interceptX - xSpan, interceptY + xSpan);
        ctx.stroke();

        // Small red badge below containment marker: [ ● TRANSACTION CONTAINED ]
        const bW = 104;
        const bH = 17;
        const bX = interceptX - bW * 0.55;
        const bY = interceptY + 16;

        ctx.fillStyle = `rgba(10, 16, 30, ${0.92 * investigationFade})`;
        ctx.strokeStyle = `rgba(229, 72, 77, ${0.45 * investigationFade})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bX, bY, bW, bH, 3);
        ctx.fill();
        ctx.stroke();

        // Red dot
        ctx.beginPath();
        ctx.arc(bX + 7, bY + bH * 0.5, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(229, 72, 77, ${investigationFade})`;
        ctx.fill();

        // Red text
        ctx.font = '600 7.5px "JetBrains Mono", monospace';
        ctx.fillStyle = `rgba(229, 72, 77, ${investigationFade})`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('TRANSACTION CONTAINED', bX + 13, bY + bH * 0.5 + 0.5);
        ctx.restore();
      }

      // ── 12. EVIDENCE CONFIRMATION TELEMETRY (Section 18) ───────────────
      // Small technical checkmarks appearing sequentially after containment
      if (t >= 4.8) {
        ctx.save();
        const evX = width * 0.94;
        const evY = height * 0.22;
        const evItems = [
          { text: 'TRANSACTION RECORD', trigger: 4.8 },
          { text: 'ACCOUNT BEHAVIOR', trigger: 5.1 },
          { text: 'BENEFICIARY RELATION', trigger: 5.4 },
          { text: 'TRANSACTION HISTORY', trigger: 5.7 },
        ];

        ctx.font = '500 7px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        evItems.forEach((item, i) => {
          if (t >= item.trigger) {
            const iy = evY + i * 11;
            ctx.fillStyle = `rgba(148, 163, 184, ${0.85 * investigationFade})`;
            ctx.fillText(item.text, evX - 12, iy);

            // Verification checkmark
            ctx.fillStyle = `rgba(16, 185, 129, ${investigationFade})`;
            ctx.fillText('✓', evX, iy);
          }
        });

        if (t >= 6.0) {
          ctx.font = '600 7px "JetBrains Mono", monospace';
          ctx.fillStyle = `rgba(56, 189, 248, ${investigationFade})`;
          ctx.fillText('INVESTIGATION READY', evX, evY + 4 * 11 + 2);
        }
        ctx.restore();
      }

      // ── 13. TEMPORAL CHRONOLOGY STEPPER (Section 17) ───────────────────
      // Subtle 1px progress track at the bottom of the animation panel
      ctx.save();
      const timelineY = height * 0.97;
      const timelineStartX = width * 0.04;
      const timelineW = width * 0.92;

      ctx.beginPath();
      ctx.moveTo(timelineStartX, timelineY);
      ctx.lineTo(timelineStartX + timelineW, timelineY);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Active temporal indicator
      const loopFraction = t / CYCLE_DURATION;
      const currentIndicatorX = timelineStartX + timelineW * loopFraction;
      ctx.beginPath();
      ctx.arc(currentIndicatorX, timelineY, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = t >= 4.2 ? '#E5484D' : t >= 1.0 ? '#E3A24C' : '#7FD0FF';
      ctx.fill();
      ctx.restore();

      // ── 14. TOP STATUS (Matches Screenshot: ● TRANSACTION CONTAINED) ──
      const topStatusY = height * 0.055;
      const topStatusX = width * 0.04;

      ctx.save();
      ctx.font = '600 8.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      if (t >= 4.2) {
        // Red Contained
        ctx.beginPath();
        ctx.arc(topStatusX, topStatusY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(229, 72, 77, ${investigationFade})`;
        ctx.fill();

        ctx.fillStyle = `rgba(229, 72, 77, ${investigationFade})`;
        ctx.fillText('TRANSACTION CONTAINED', topStatusX + 8, topStatusY + 0.5);
      } else if (t >= 1.0) {
        // Amber Detected
        ctx.beginPath();
        ctx.arc(topStatusX, topStatusY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#E3A24C';
        ctx.fill();

        ctx.fillStyle = '#E3A24C';
        ctx.fillText('ANOMALY DETECTED • MULTI-HOP TRACK', topStatusX + 8, topStatusY + 0.5);
      } else {
        // Cyan Monitoring
        ctx.beginPath();
        ctx.arc(topStatusX, topStatusY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#7FD0FF';
        ctx.fill();

        ctx.fillStyle = '#7FD0FF';
        ctx.fillText('SYSTEM MONITORING • NOMINAL', topStatusX + 8, topStatusY + 0.5);
      }
      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();
    };
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#05070D] flex items-center justify-center overflow-hidden select-none"
      role="region"
      aria-label="Financial crime investigation and containment network graph"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full"
        role="img"
        aria-label="Real-time multi-hop network investigation and autonomous containment graph"
      />
    </div>
  );
};

export default FinancialNetworkAnimation;
