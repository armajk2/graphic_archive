import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// [Helper] 원형 텍스처
function getCircleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

// [1] 시각화 컴포넌트
function ExplodedLayers({ imageUrl }) {
  const pointsRef = useRef();
  const size = 100;
  
  const circleTexture = useMemo(() => getCircleTexture(), []);

  const { positions, colors, layerIndex } = useMemo(() => {
    return {
      positions: new Float32Array(size * size * 3),
      colors: new Float32Array(size * size * 3),
      layerIndex: new Float32Array(size * size) 
    };
  }, []);

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = (y * size + x);
          const pixelI = i * 4;

          const r = data[pixelI] / 255;
          const g = data[pixelI + 1] / 255;
          const b = data[pixelI + 2] / 255;
          const a = data[pixelI + 3];

          if (a < 50) continue; 

          const brightness = (r + g + b) / 3;
          let layer = Math.floor(brightness * 5.99);

          const posX = (x - size / 2) * 0.6;
          const posY = -(y - size / 2) * 0.6;
          const posZ = 0;

          positions[i * 3] = posX;
          positions[i * 3 + 1] = posY;
          positions[i * 3 + 2] = posZ;

          colors[i * 3] = r;
          colors[i * 3 + 1] = g;
          colors[i * 3 + 2] = b;

          layerIndex[i] = layer;
        }
      }
      setIsLoaded(true);
    };
  }, [imageUrl, positions, colors, layerIndex]);

  useFrame(({ clock }) => {
    if (!pointsRef.current || !isLoaded) return;
    
    const time = clock.getElapsedTime();
    const positionsArray = pointsRef.current.geometry.attributes.position.array;
    
    const expand = Math.pow(Math.sin(time * 0.5), 2) * 12;

    for (let i = 0; i < size * size; i++) {
        const layer = layerIndex[i];
        const zIndex = i * 3 + 2;
        const offset = layer - 2.5; 
        const finalOffset = offset === 0 ? 0.2 : offset;
        positionsArray[zIndex] = finalOffset * expand;
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.rotation.y = time * 0.1;
  });

  if (!isLoaded) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial 
        size={0.7}
        map={circleTexture}
        alphaTest={0.5}
        sizeAttenuation={true} 
        vertexColors={true} 
        transparent={true}
        opacity={1.0}
        depthWrite={false}
      />
    </points>
  );
}

// [2] 녹화기 (수정됨: MP4 지원 확인)
function Recorder({ isRecording, onStop }) {
  const { gl } = useThree(); 
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);

  useEffect(() => {
    if (isRecording) {
      chunks.current = [];
      const canvas = gl.domElement;
      
      // 지원 가능한 MIME 타입 확인 (MP4 우선)
      const mimeTypes = [
        "video/mp4",
        "video/webm;codecs=h264",
        "video/webm",
        "video/vp8"
      ];
      
      let selectedMimeType = "";
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }
      
      // 확장자 결정
      const fileExtension = selectedMimeType.includes("mp4") ? "mp4" : "webm";

      try {
        const stream = canvas.captureStream(30); // 30 FPS
        
        // 옵션 설정 (MP4가 지원되면 사용)
        const options = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
        mediaRecorder.current = new MediaRecorder(stream, options);

        mediaRecorder.current.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.current.push(e.data);
        };

        mediaRecorder.current.onstop = () => {
          const blob = new Blob(chunks.current, { type: selectedMimeType || 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          // 파일명에 올바른 확장자 적용
          a.download = `data_structure_${Date.now()}.${fileExtension}`;
          a.click();
          onStop(); 
        };

        mediaRecorder.current.start();

        // 4초 후 자동 종료
        setTimeout(() => {
          if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
            mediaRecorder.current.stop();
          }
        }, 4000);

      } catch (e) {
        console.error("Recording failed:", e);
        onStop(); // 에러 시 상태 복구
      }
    }
  }, [isRecording, gl, onStop]);

  return null;
}

export default function DataSculpture({ imageUrl }) {
  const [recording, setRecording] = useState(false);

  return (
    <div style={{ width: '100%', height: '100%', background: '#000000', position: 'relative' }}>
      <Canvas gl={{ preserveDrawingBuffer: true }}> 
        <PerspectiveCamera makeDefault position={[0, 0, 80]} fov={50} />
        <ambientLight intensity={1.0} />
        {imageUrl && <ExplodedLayers key={imageUrl} imageUrl={imageUrl} />}
        <Recorder isRecording={recording} onStop={() => setRecording(false)} />
        <OrbitControls enableZoom={true} autoRotate={false} />
      </Canvas>

      <button 
        onClick={() => setRecording(true)}
        disabled={recording}
        style={{
          position: 'absolute', bottom: '20px', right: '20px',
          background: recording ? 'red' : 'rgba(255,255,255,0.1)', color: 'white',
          border: '1px solid white', padding: '8px 16px',
          fontFamily: "'Courier New', monospace", fontSize: '12px', cursor: 'pointer',
          zIndex: 10, backdropFilter: 'blur(4px)', transition: 'all 0.3s'
        }}
      >
        {recording ? "ANALYZING..." : "RECORD STRUCTURE"}
      </button>
    </div>
  );
}