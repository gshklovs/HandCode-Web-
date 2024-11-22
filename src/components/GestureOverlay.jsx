import { useRef, useEffect } from 'react';
import useGestureRecognition from '../gesture_utils/hooks';

const GestureOverlay = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useGestureRecognition({
    videoElement: videoRef,
    canvasEl: canvasRef,
  });

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error("Error accessing webcam:", err);
        });
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <video
        ref={videoRef}
        className="w-full h-full object-cover opacity-[.20]"
        autoPlay
        playsInline
        style={{ transform: 'scaleX(-1)' }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        width={window.innerWidth}
        height={window.innerHeight}
        style={{ transform: 'scaleX(1)' }}
      />
    </div>
  );
};

export default GestureOverlay;
