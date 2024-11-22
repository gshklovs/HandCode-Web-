import { Ref, useEffect, useRef } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import useKeyPointClassifier from './useKeyPointClassifier';
import CONFIGS from '../../constants';

// Thumb tip is landmark 4, index finger tip is landmark 8
const THUMB_TIP = 4;
const INDEX_TIP = 8;

interface ICursorPointsLogic {
  videoElement: Ref<any>;
  canvasEl: Ref<any>;
}

interface CursorPoint {
  x: number;
  y: number;
  isOpen?: boolean;
  animationProgress?: number;
  lastUpdated?: number;
}

function useCursorPoints({ videoElement, canvasEl }: ICursorPointsLogic) {
  const hands = useRef<any>(null);
  const camera = useRef<any>(null);
  const cursorPoints = useRef<CursorPoint[]>([]);
  const { processLandmark } = useKeyPointClassifier();
  const animationFrameRef = useRef<number>();
  const renderLoopRef = useRef<number>();

  const drawCursor = (ctx: CanvasRenderingContext2D, point: CursorPoint, width: number, height: number) => {
    const isOpen = point.isOpen;
    const color = isOpen ? '#00FF00' : '#8A2BE2'; // Green for open, Purple for closed

    // Draw blur shadow
    ctx.filter = 'blur(8px)';
    ctx.beginPath();
    ctx.arc(
      point.x * width,
      point.y * height,
      12,
      0,
      2 * Math.PI
    );
    ctx.fillStyle = color.replace(')', ', 0.3)').replace('rgb', 'rgba');
    ctx.fill();

    // Draw sharp inner circle
    ctx.filter = 'none';
    ctx.beginPath();
    ctx.arc(
      point.x * width,
      point.y * height,
      6,
      0,
      2 * Math.PI
    );
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw animation if in progress
    if (point.animationProgress !== undefined && point.animationProgress < 1) {
      const progress = point.animationProgress;
      const radius = 12 + (progress * 150); // Expand even larger (from 12 to 162 pixels)
      
      // Create donut effect by making the inner part fade faster
      const innerRadius = progress * 60; // Larger inner radius
      
      // Exponential fade out as the effect expands
      const fadeOutFactor = Math.pow(1 - progress, 2); // Square the progress for faster fade
      const outerAlpha = fadeOutFactor * 0.4; // Base transparency that fades out exponentially
      const innerAlpha = Math.max(0, fadeOutFactor - progress * 4); // Inner part fades even faster

      ctx.filter = 'blur(24px)'; // Increased blur
      
      // Draw outer glow
      ctx.beginPath();
      ctx.arc(
        point.x * width,
        point.y * height,
        radius,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = `${color.replace(')', `, ${outerAlpha * 0.5})`).replace('rgb', 'rgba')}`;
      ctx.fill();

      // Create hole in the middle by drawing with destination-out
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(
        point.x * width,
        point.y * height,
        innerRadius,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - innerAlpha})`;
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  const renderFrame = () => {
    if (canvasEl.current) {
      const ctx = canvasEl.current.getContext("2d");
      const width = canvasEl.current.width;
      const height = canvasEl.current.height;

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // Filter out stale cursors (older than 100ms)
      const now = Date.now();
      cursorPoints.current = cursorPoints.current.filter(
        point => point.lastUpdated && now - point.lastUpdated < 100
      );

      // Draw all valid cursors
      cursorPoints.current.forEach(point => drawCursor(ctx, point, width, height));

      ctx.restore();
    }
    renderLoopRef.current = requestAnimationFrame(renderFrame);
  };

  async function onResults(results) {
    if (canvasEl.current) {
      const width = canvasEl.current.width;
      const height = canvasEl.current.height;

      if (results.multiHandLandmarks) {
        // Process each hand
        const newPoints = await Promise.all(results.multiHandLandmarks.map(async (landmarks, index) => {
          const thumbTip = landmarks[THUMB_TIP];
          const indexTip = landmarks[INDEX_TIP];
          const gestureId = await processLandmark(landmarks, { width, height });
          const isOpen = CONFIGS.keypointClassifierLabels[gestureId] === 'Open';
          
          const point: CursorPoint = {
            x: (thumbTip.x + indexTip.x) / 2,
            y: (thumbTip.y + indexTip.y) / 2,
            isOpen,
            lastUpdated: Date.now()
          };

          // Start animation if gesture changed from open to closed
          const prevPoint = cursorPoints.current[index];
          if (prevPoint && prevPoint.isOpen && !isOpen) {
            point.animationProgress = 0;
          } else if (prevPoint && prevPoint.animationProgress !== undefined) {
            point.animationProgress = prevPoint.animationProgress;
          }

          return point;
        }));

        cursorPoints.current = newPoints;

        // Update animation progress
        cursorPoints.current = cursorPoints.current.map(point => ({
          ...point,
          animationProgress: point.animationProgress !== undefined 
            ? Math.min((point.animationProgress + 0.12), 1) // Even faster animation
            : undefined
        }));
      }
    }
  }

  useEffect(() => {
    hands.current = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    hands.current.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.current.onResults(onResults);

    if (videoElement.current) {
      camera.current = new Camera(videoElement.current, {
        onFrame: async () => {
          await hands.current.send({ image: videoElement.current });
        },
        width: window.innerWidth,
        height: window.innerHeight,
      });
      camera.current.start();
    }

    // Start continuous render loop
    renderLoopRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (camera.current) {
        camera.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (renderLoopRef.current) {
        cancelAnimationFrame(renderLoopRef.current);
      }
    };
  }, []);

  return { cursorPoints };
}
// hello
export default useCursorPoints;
