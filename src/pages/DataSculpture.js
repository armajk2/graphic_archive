import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

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

          // [수정 1] 투명한 것만 빼고, 검은색(어두운색)도 모두 포함!
          if (a < 50) continue; 

          const brightness = (r + g + b) / 3;

          // 레이어 분류 (0 ~ 5)
          let layer = Math.floor(brightness * 5.99);

          // 위치
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
    
    // 기계적인 확장 애니메이션
    const expand = Math.pow(Math.sin(time * 0.5), 2) * 12;

    for (let i = 0; i < size * size; i++) {
        const layer = layerIndex[i];
        const zIndex = i * 3 + 2;

        // [수정 2] 중앙 기준 확장 (Center Expansion)
        // 층: 0, 1, 2, 3, 4, 5
        // 이동: -2.5, -1.5, -0.5, 0.5, 1.5, 2.5
        // 결과: 어두운 건 뒤로 가고, 밝은 건 앞으로 와서 '모두' 움직임
        const offset = layer - 2.5; 
        
        // offset이 0이 되지 않도록 최소값 보정 (완전 중간색도 살짝 움직이게)
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

// 녹화기 (유지)
function Recorder({ isRecording, onStop }) {
  const { gl } = useThree(); 
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  useEffect(() => {
    if (isRecording) {
      chunks.current = [];
      const canvas = gl.domElement;
      const stream = canvas.captureStream(30);
      mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
      mediaRecorder.current.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `structure_scan_${Date.now()}.webm`; a.click(); onStop(); 
      };
      mediaRecorder.current.start();
      setTimeout(() => { if (mediaRecorder.current && mediaRecorder.current.state === 'recording') mediaRecorder.current.stop(); }, 4000);
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
          fontSize: '12px', cursor: 'pointer',
          zIndex: 10, backdropFilter: 'blur(4px)', transition: 'all 0.3s'
        }}
      >
        {recording ? "ANALYZING..." : "RECORD STRUCTURE"}
      </button>
    </div>
  );
}