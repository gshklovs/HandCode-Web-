import { Ref, useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import useKeyPointClassifier from './useKeyPointClassifier';
import CONFIGS from '../../constants';

// Thumb tip is landmark 4, index finger tip is landmark 8
const THUMB_TIP = 4;
const INDEX_TIP = 8;

interface ICursorPointsLogic {
  videoElement: Ref<any>;
  canvasEl: Ref<any>;
  onUpdate?: (points: CursorPoint[], states: CursorPoint[]) => void;
}

export interface CursorPoint {
  x: number;
  y: number;
  gestureState?: string;
  lastUpdated?: number;
  handedness?: string;
}

interface AnimationEffect {
  x: number;
  y: number;
  startTime: number;
  handIndex: number;
}

function useCursorPoints({ videoElement, canvasEl, onUpdate }: ICursorPointsLogic) {
  const handLandmarker = useRef<any>(null);
  const cursorPoints = useRef<CursorPoint[]>([]);
  const [cursorStates, setCursorStates] = useState<CursorPoint[]>([]);
  const animationEffects = useRef<AnimationEffect[]>([]);
  const { processLandmark } = useKeyPointClassifier();
  const animationFrameRef = useRef<number>();
  const renderLoopRef = useRef<number>();
  const isProcessing = useRef(false);
  const stream = useRef<MediaStream | null>(null);
  const lastGestureStates = useRef<string[]>(['open', 'open']);

  useEffect(() => {
    if (!videoElement.current) return;

    const video = videoElement.current;
    
    const handleCanPlay = () => {
      if (canvasEl.current) {
        canvasEl.current.width = video.videoWidth;
        canvasEl.current.height = video.videoHeight;
      }
    };

    video.addEventListener('canplay', handleCanPlay);
    return () => video.removeEventListener('canplay', handleCanPlay);
  }, []);

  useEffect(() => {
    let isInitialized = false;

    async function initializeCamera() {
      if (isInitialized || !videoElement.current) return;
      isInitialized = true;

      try {
        stream.current = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        });

        const video = videoElement.current;
        video.srcObject = stream.current;
        
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => {
            video.play().then(resolve).catch(console.error);
          };
        });

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        handLandmarker.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });

        startVideoProcessing();
      } catch (error) {
        console.error("Error initializing camera or HandLandmarker:", error);
        isInitialized = false;
      }
    }

    initializeCamera();

    return () => {
      isInitialized = false;
      if (stream.current) {
        stream.current.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (renderLoopRef.current) {
        cancelAnimationFrame(renderLoopRef.current);
      }
    };
  }, []);

  const getColorForGesture = (gestureState: string): [number, number, number] => {
    switch (gestureState) {
      case 'open':
        return [0, 255, 0]; // Green
      case 'closed':
        return [138, 43, 226]; // Purple
      case 'pointing':
        return [255, 105, 180]; // Hot Pink
      default:
        return [138, 43, 226]; // Default to purple
    }
  };

  const drawCursor = (ctx: CanvasRenderingContext2D, point: CursorPoint) => {
    const color = getColorForGesture(point.gestureState || 'open');
    const baseRadius = 15;
    
    ctx.filter = 'blur(4px)';
    ctx.beginPath();
    ctx.arc(point.x, point.y, baseRadius, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.3)`;
    ctx.fill();

    ctx.filter = 'none';
    ctx.beginPath();
    ctx.arc(point.x, point.y, baseRadius * 0.7, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.8)`;
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (point.handedness) {
      ctx.save(); // Save current context state
      ctx.translate(point.x, point.y - baseRadius - 5);
      ctx.scale(-1, 1); // Flip text horizontally
      ctx.font = '12px Arial';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(point.handedness, 0, 0);
      ctx.restore(); // Restore context state
    }
  };

  const drawAnimationEffect = (ctx: CanvasRenderingContext2D, effect: AnimationEffect) => {
    const currentTime = Date.now();
    const animationDuration = 400; // 400ms duration
    const timeSinceStart = currentTime - effect.startTime;
    
    if (timeSinceStart >= animationDuration) return false;

    const progress = timeSinceStart / animationDuration;
    const maxRadius = 100;
    const currentRadius = maxRadius * progress;
    
    const baseAlpha = 0.3 * 1.5; // Base alpha increased by 50%
    const alpha = baseAlpha * Math.pow(1 - progress, 1.5); // Faster fade out with exponential curve
    
    ctx.filter = `blur(${8 + progress * 12}px)`;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, currentRadius, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(138, 43, 226, ${alpha})`; // Always purple
    ctx.fill();
    
    return true;
  };

  const startVideoProcessing = () => {
    if (!videoElement.current || !handLandmarker.current || !canvasEl.current) return;

    const processFrame = async () => {
      if (!isProcessing.current && videoElement.current.readyState === 4) {
        isProcessing.current = true;
        
        try {
          const startTimeMs = performance.now();
          const results = await handLandmarker.current.detectForVideo(
            videoElement.current,
            startTimeMs
          );
          
          if (results.landmarks) {
            const newCursorPoints: CursorPoint[] = [];
            
            for (let i = 0; i < Math.min(results.landmarks.length, 2); i++) {
              const handLandmarks = results.landmarks[i];
              const handState = await processLandmark(handLandmarks, videoElement.current);
              // Flip handedness since video is mirrored
              const rawHandedness = results.handedness[i][0].categoryName;
              const handedness = rawHandedness === 'Left' ? 'Right' : 'Left';
              
              // Calculate average position between thumb and index finger tips
              const x = ((handLandmarks[THUMB_TIP].x + handLandmarks[INDEX_TIP].x) / 2) * canvasEl.current.width;
              const y = ((handLandmarks[THUMB_TIP].y + handLandmarks[INDEX_TIP].y) / 2) * canvasEl.current.height;
              
              if (handState === 'closed' && lastGestureStates.current[i] !== 'closed') {
                console.log(`Hand ${i + 1} starting closed animation`);
                animationEffects.current.push({
                  x,
                  y,
                  startTime: Date.now(),
                  handIndex: i
                });
              }
              
              lastGestureStates.current[i] = handState;
              
              newCursorPoints.push({
                x,
                y,
                gestureState: handState,
                lastUpdated: Date.now(),
                handedness
              });
            }
            
            for (let i = results.landmarks.length; i < 2; i++) {
              lastGestureStates.current[i] = 'open';
            }
            
            cursorPoints.current = newCursorPoints;
            setCursorStates(newCursorPoints);
            onUpdate?.(newCursorPoints, newCursorPoints);
          }
        } catch (error) {
          console.error("Error processing video frame:", error);
        }
        
        isProcessing.current = false;
      }
      
      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    processFrame();
    
    const renderLoop = () => {
      if (canvasEl.current) {
        const ctx = canvasEl.current.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvasEl.current.width, canvasEl.current.height);
        
        animationEffects.current = animationEffects.current.filter(effect => {
          if (cursorPoints.current[effect.handIndex]) {
            effect.x = cursorPoints.current[effect.handIndex].x;
            effect.y = cursorPoints.current[effect.handIndex].y;
          }
          return drawAnimationEffect(ctx, effect);
        });
        
        cursorPoints.current.forEach(point => {
          if (Date.now() - (point.lastUpdated || 0) <= 100) {
            drawCursor(ctx, point);
          }
        });
      }
      
      renderLoopRef.current = requestAnimationFrame(renderLoop);
    };
    
    renderLoop();
  };

  return {
    cursorPoints: cursorPoints.current,
    cursorStates: cursorStates.current
  };
}

export default useCursorPoints;
