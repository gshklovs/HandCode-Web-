import { useRef } from 'react';
import useCursorPoints from '../gesture_utils/hooks/useCursorPoints';

const CursorOverlay = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useCursorPoints({
    videoElement: videoRef,
    canvasEl: canvasRef,
  });

  return (
    <div className="fixed inset-0 z-[51] pointer-events-none">
      <video
        ref={videoRef}
        className="w-full h-full object-cover opacity-0"
        autoPlay
        playsInline
        style={{ transform: 'scaleX(-1)' }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        width={window.innerWidth}
        height={window.innerHeight}
        style={{ transform: 'scaleX(-1)' }}
      />
    </div>
  );
};

export default CursorOverlay;
