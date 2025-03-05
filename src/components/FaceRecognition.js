import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import './FaceRecognition.css';

const FaceRecognition = ({ videoRef, handleVideoOnPlay, detections }) => {
  const [capturedImages, setCapturedImages] = useState([]);
  const [expressionMessage, setExpressionMessage] = useState('');  // To store the expression message
  const [isAlerting, setIsAlerting] = useState(false);  // Flag to control alert triggering

  useEffect(() => {
    const startVideo = () => {
      navigator.mediaDevices
        .getUserMedia({ video: {} })
        .then((stream) => {
          videoRef.current.srcObject = stream;
        })
        .catch((err) => console.error(err));
    };

    startVideo();
  }, [videoRef]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.addEventListener('play', () => {
        const canvas = faceapi.createCanvasFromMedia(videoRef.current);
        const displaySize = {
          width: videoRef.current.width,
          height: videoRef.current.height,
        };
        faceapi.matchDimensions(canvas, displaySize);

        const drawDetections = () => {
          const context = canvas.getContext('2d');
          context.clearRect(0, 0, canvas.width, canvas.height);
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
          faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
        };

        if (detections.length > 0) {
          drawDetections();
        }
      });
    }
  }, [detections, videoRef]);

  // Check for facial expressions
  useEffect(() => {
    if (detections.length > 0 && !isAlerting) {
      detections.forEach((detection, index) => {
        const { expressions } = detection;

        setTimeout(() => {
          if (!isAlerting) {  // Check if alerting is disabled
            let message = '';
            if (expressions.sad > 0.5) {
              message = "There is a thief 😞";
            } else if (expressions.neutral > 0.5) {
              message = "Someone has a neutral expression 😐";
            } else if (expressions.happy > 0.5) {
              message = "Someone looks happy 😊";
            }

            if (message) {
              setExpressionMessage(message); // Set message to be displayed
            }

            setIsAlerting(false); // Reset the flag after the message is displayed
          }
        }, index * 3000); // Adjust the delay here (3 seconds per detection)
      });

      setIsAlerting(true);  // Disable triggering new messages while one is showing
    }
  }, [detections, isAlerting]);

  const captureImage = () => {
    const video = videoRef.current;

    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw detections and expressions on the canvas
      if (detections.length > 0) {
        const resizedDetections = faceapi.resizeResults(detections, {
          width: canvas.width,
          height: canvas.height,
        });
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
      }

      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImages([...capturedImages, dataUrl]);

      const byteString = atob(dataUrl.split(',')[1]);
      const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });

      const formData = new FormData();
      formData.append('image', blob, 'capture.jpg');

      fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Failed to upload image.');
          }
          return response.json();
        })
        .then((data) => {
          console.log('Image saved successfully', data);
        })
        .catch((error) => {
          console.error('Error saving image:', error);
        });
    }
  };

  return (
    <div className="face-recognition-container">
      <video
        ref={videoRef}
        autoPlay
        muted
        onPlay={handleVideoOnPlay}
        width="720"
        height="560"
        className="video-stream"
      />
      <button onClick={captureImage} className="capture-button">
        Capture Image
      </button>
      <div className="captured-images-container">
        {capturedImages.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={`Captured ${index}`}
            className="captured-image"
          />
        ))}
      </div>
      {expressionMessage && (
        <div className="expression-message">
          {expressionMessage}
        </div>
      )}
    </div>
  );
};

export default FaceRecognition;
