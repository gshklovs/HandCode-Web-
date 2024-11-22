import { useEffect, useRef } from 'react';
import { Landmark } from '@mediapipe/hands';
import * as tf from '@tensorflow/tfjs';
import _ from 'lodash';

// Gesture state mapping (model outputs 3 classes)
export const GESTURE_STATES = {
  0: 'open',   // First class
  1: 'closed', // Second class
  2: 'pointing' // Third class
};

const calcLandmarkList = (image, landmarks) => {
  const landmarkPoint: any = [];

  // Keypoint
  Object.values(landmarks).forEach((landmark: Landmark) => {
    const landmarkX = Math.min(landmark.x, 1);
    const landmarkY = Math.min(landmark.y, 1);
    landmarkPoint.push([landmarkX, landmarkY]);
  });

  return landmarkPoint;
};

const preProcessLandmark = (landmarkList) => {
  let tempLandmarkList = _.cloneDeep(landmarkList);
  let baseX = 0;
  let baseY = 0;

  //convert to relative coordinates
  Object.values(tempLandmarkList).forEach((landmarkPoint, index) => {
    if (!index) {
      baseX = landmarkPoint[0];
      baseY = landmarkPoint[1];
    }
    tempLandmarkList[index][0] = tempLandmarkList[index][0] - baseX;
    tempLandmarkList[index][1] = tempLandmarkList[index][1] - baseY;
  });

  //convert to one-dimensional list
  tempLandmarkList = _.flatten(tempLandmarkList);

  //normalize
  const maxValue = Math.max(
    ...tempLandmarkList.map((value) => Math.abs(value))
  );
  
  // Avoid division by zero
  if (maxValue === 0) return tempLandmarkList;
  
  tempLandmarkList = tempLandmarkList.map((value) => value / maxValue);
  return tempLandmarkList;
};

function useKeyPointClassifier() {
  const model = useRef<any>();
  const isModelLoaded = useRef(false);

  const keyPointClassifier = async (landmarkList) => {
    if (!model.current || !isModelLoaded.current) {
      console.log('Model not ready:', { isLoaded: isModelLoaded.current });
      return [0]; // Return first class (open) if model isn't loaded
    }
    
    try {
      const tensor = tf.tensor2d([landmarkList]);
      const prediction = await model.current.execute(tensor);
      const result = await prediction.squeeze().argMax().data();
      tensor.dispose();
      prediction.dispose();
      return result;
    } catch (error) {
      console.error('Error classifying gesture:', error);
      return [0];
    }
  };

  const processLandmark = async (handLandmarks, image) => {
    try {
      const landmarkList = calcLandmarkList(image, handLandmarks);
      const preProcessedLandmarkList = preProcessLandmark(landmarkList);
      const handSignId = await keyPointClassifier(preProcessedLandmarkList);
      const gestureState = GESTURE_STATES[handSignId[0]];
      
      // Log only when gesture state changes
      console.log('Gesture detected:', gestureState);
      
      return gestureState || 'open'; // Default to open instead of unknown
    } catch (error) {
      console.error('Error processing landmark:', error);
      return 'open'; // Default to open on error
    }
  };

  useEffect(() => {
    let isMounted = true;

    (async function loadModel() {
      try {
        await tf.ready(); // Ensure TensorFlow.js is ready
        model.current = await tf.loadGraphModel(
          `/tf-models/key-point-classifier/model.json`
        );
        if (isMounted) {
          isModelLoaded.current = true;
          console.log('Hand gesture model loaded successfully');
        }
      } catch (error) {
        console.error('Error loading hand gesture model:', error);
        if (isMounted) {
          isModelLoaded.current = false;
        }
      }
    })();

    return () => {
      isMounted = false;
      isModelLoaded.current = false;
    };
  }, []);

  return { processLandmark };
}

export default useKeyPointClassifier;
