import { useRef } from 'react';
import useCursorPoints from '../gesture_utils/hooks/useCursorPoints';

const CursorOverlay = ({ videoRef, canvasRef, onCursorUpdate }) => {
  const { cursorPoints, cursorStates } = useCursorPoints({
    videoElement: videoRef,
    canvasEl: canvasRef,
    onUpdate: onCursorUpdate
  });

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10000 }}>
      <video
        ref={videoRef}
        className="hidden"
        autoPlay
        playsInline
        style={{ transform: 'scaleX(-1)' }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ transform: 'scaleX(-1)', zIndex: 10000 }}
      />
    </div>
  );
};

export default CursorOverlay;
