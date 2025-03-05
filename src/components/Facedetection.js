import React, { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

// import './FaceDetection.css'; // Import custom CSS

function Facedetection() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAutoComparing, setIsAutoComparing] = useState(true);
  const [showReference, setShowReference] = useState(false);

  const referenceImage = '/image/image1.jpg';

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        await Promise.all([
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
        ]);
        setIsModelLoaded(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading models:', error);
        setIsLoading(false);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    let interval;
    if (isAutoComparing && isModelLoaded && webcamRef.current?.video?.readyState === 4) {
      interval = setInterval(compareFaces, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoComparing, isModelLoaded]);

  const compareFaces = async () => {
    if (!webcamRef.current || !isModelLoaded) return;

    try {
      setIsLoading(true);
      const referenceImg = await faceapi.fetchImage(referenceImage);
      const webcamImage = webcamRef.current.getScreenshot();

      if (!webcamImage) return;

      const img = await faceapi.fetchImage(webcamImage);
      const referenceDetection = await faceapi.detectSingleFace(referenceImg).withFaceLandmarks().withFaceDescriptor();
      const currentDetection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

      if (referenceDetection && currentDetection) {
        const distance = faceapi.euclideanDistance(referenceDetection.descriptor, currentDetection.descriptor);
        const isMatch = distance < 0.6;
        setMatchResult(isMatch);
      } else {
        setMatchResult(false);
      }
    } catch (error) {
      console.error('Error comparing faces:', error);
      setMatchResult(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 className="title"><Camera /> Face Recognition System</h1>
      <div className="content">
        {showReference && (
          <div className="section">
            <h2>Reference Image</h2>
            <img src={referenceImage} alt="Reference" className="image" />
          </div>
        )}
        <div className="section">
          <h2>Live Camera</h2>
          <div className="camera-container">
            <Webcam ref={webcamRef} className="webcam" mirrored />
            <canvas ref={canvasRef} className="canvas" />
          </div>
        </div>
      </div>
      <div className="status">
        {isLoading && <p className="loading">Processing...</p>}
        {matchResult !== null && !isLoading && (
          <p className={matchResult ? 'match' : 'no-match'}>
            {matchResult ? <CheckCircle /> : <XCircle />} {matchResult ? 'Match Found!' : 'No Match'}
          </p>
        )}
      </div>
    </div>
  );
}

export default Facedetection;