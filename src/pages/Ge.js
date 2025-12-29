import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Ge.css";

function Generate() {
  const canvasRef = useRef();
  const [imagePaths, setImagePaths] = useState([]);
  const [isFading, setIsFading] = useState(false);
  const [effects, setEffects] = useState({
    grain: { intensity: 15, gamma: 1.4 }, // 기본값을 살짝 주어 질감 형성
    scanlines: { gap: 4, alpha: 0.05 },
    glitch: { lineHeight: 4, shiftAmount: 0 },
    saturation: { value: 100 }
  });
  const animationRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("selectedImages") || "[]");
    if (!stored.length) {
      navigate("/");
      return;
    }
    setImagePaths(stored);
    generateImage(stored);
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  // --- [효과 함수들] ---
  const generateGrain = (ctx, width, height) => {
    const { intensity } = effects.grain;
    if (intensity <= 0) return;
    
    const grainData = ctx.getImageData(0, 0, width, height);
    const data = grainData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.floor(Math.random() * intensity) - intensity / 2;
      // 감마 보정 포함하여 노이즈 적용
      data[i] = 255 * Math.pow(Math.min(255, Math.max(0, data[i] + noise)) / 255, 1 / effects.grain.gamma);
      data[i + 1] = 255 * Math.pow(Math.min(255, Math.max(0, data[i + 1] + noise)) / 255, 1 / effects.grain.gamma);
      data[i + 2] = 255 * Math.pow(Math.min(255, Math.max(0, data[i + 2] + noise)) / 255, 1 / effects.grain.gamma);
    }
    ctx.putImageData(grainData, 0, 0);
  };

  const applyScanlines = (ctx, width, height) => {
    const { alpha } = effects.scanlines;
    if (alpha <= 0) return;
    
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    for (let y = 0; y < height; y += effects.scanlines.gap) {
      ctx.fillRect(0, y, width, 1);
    }
    ctx.restore();
  };

  const applyGlitchEffect = (ctx, width, height) => {
    const { shiftAmount } = effects.glitch;
    if (shiftAmount <= 0) return;
    
    for (let y = 0; y < height; y += effects.glitch.lineHeight * 4) {
      const shift = (Math.random() - 0.5) * shiftAmount;
      const imageData = ctx.getImageData(0, y, width, effects.glitch.lineHeight);
      ctx.putImageData(imageData, shift, y);
    }
  };

  const applySaturation = (ctx, width, height) => {
    const { value } = effects.saturation;
    if (value === 100) return;
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      const saturationFactor = value / 100;
      data[i] = Math.round(gray + (r - gray) * saturationFactor);
      data[i + 1] = Math.round(gray + (g - gray) * saturationFactor);
      data[i + 2] = Math.round(gray + (b - gray) * saturationFactor);
    }
    ctx.putImageData(imageData, 0, 0);
  };

  // --- [아카이브/다운로드 기능] ---
  const handleArchive = () => {
    const canvas = canvasRef.current;
    const compressedImageData = compressImage(canvas);
    const timestamp = new Date().toISOString();
    const archives = JSON.parse(localStorage.getItem("archivedImages") || "[]");
    
    archives.push({
      imageData: compressedImageData,
      timestamp,
      effects: { ...effects }
    });
    
    const trimmedArchives = archives.slice(-10);
    
    try {
      localStorage.setItem("archivedImages", JSON.stringify(trimmedArchives));
      alert("Image archived successfully!");
    } catch (error) {
      let currentArchives = [...trimmedArchives];
      while (currentArchives.length > 0) {
        try {
          localStorage.setItem("archivedImages", JSON.stringify(currentArchives));
          alert("Image archived (Older images removed due to storage limits)");
          break;
        } catch (e) {
          currentArchives.shift();
        }
      }
    }
  };

  const compressImage = (canvas) => {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = 1080;
    tempCanvas.height = 1080;
    tempCtx.drawImage(canvas, 0, 0, 1080, 1080);
    return tempCanvas.toDataURL('image/png');
  };

  // --- [메인 생성 로직: 유기적 네트워크 토폴로지] ---
  
  // 헬퍼: 단일 삼각형 면(Face)과 엣지(Edge) 그리기
  const drawNetworkTriangle = (ctx, img, p1, p2, p3) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    ctx.save();
    
    // 경로 생성
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();

    // 클리핑: 이미지를 삼각형 형태로 잘라냄
    ctx.clip();

    // 이미지 그리기 (약간의 스케일 조정을 통해 입체감 부여 가능, 여기선 정직하게 매핑)
    ctx.drawImage(img, 0, 0, width, height);

    // 엣지(Edge) 그리기: 얇은 흰색 선으로 네트워크 구조 강조
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"; // 반투명 흰색
    ctx.lineWidth = 1; 
    ctx.stroke();

    ctx.restore();
  };

  // 핵심 함수: 그리드 왜곡 및 네트워크 생성
  const overlayImagePieces = (img) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // [설정값] 네트워크 밀도와 왜곡 정도 조절
    const gap = 80; // 격자 간격 (작을수록 조밀함)
    const randomness = 0.6; // 왜곡 강도 (0 ~ 1.0)

    // 1. 토폴로지 그리드 포인트 생성
    const cols = Math.ceil(width / gap) + 2;
    const rows = Math.ceil(height / gap) + 2;
    const points = [];

    // 정점(Vertex) 생성 및 위치 이탈(Perturbation)
    for (let y = -1; y < rows; y++) {
      for (let x = -1; x < cols; x++) {
        // 정형적인 그리드 좌표에 랜덤 오프셋 적용
        const xOff = (Math.random() - 0.5) * gap * randomness;
        const yOff = (Math.random() - 0.5) * gap * randomness;
        
        points.push({
          x: x * gap + xOff,
          y: y * gap + yOff,
          c: x, // 열 인덱스
          r: y  // 행 인덱스
        });
      }
    }

    // 2. 네트워크 연결 및 면(Face) 재구성 (Triangulation)
    for (let y = -1; y < rows - 1; y++) {
      for (let x = -1; x < cols - 1; x++) {
        // 현재 격자 칸의 4개 정점 찾기
        const p1 = points.find(p => p.c === x && p.r === y);       // 좌상
        const p2 = points.find(p => p.c === x + 1 && p.r === y);   // 우상
        const p3 = points.find(p => p.c === x && p.r === y + 1);   // 좌하
        const p4 = points.find(p => p.c === x + 1 && p.r === y + 1); // 우하

        if (p1 && p2 && p3 && p4) {
          // 사각형을 두 개의 삼각형으로 분할하여 그리기
          drawNetworkTriangle(ctx, img, p1, p2, p3); // 삼각형 1
          drawNetworkTriangle(ctx, img, p2, p4, p3); // 삼각형 2
        }
      }
    }

    // 3. 노드(Node) 시각화: 교차점 강조
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    points.forEach(p => {
      // 캔버스 내부에 있는 점만 그리기
      if (p.x > 0 && p.x < width && p.y > 0 && p.y < height) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); // 반지름 2.5px 원
        ctx.fill();
      }
    });
  };

  const generateImage = (imagePaths) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const loadImage = (src) =>
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.src = src;
      });

    // 색상 추출 함수
    const getColorSwatches = async (imageUrl) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          tempCanvas.width = 100;
          tempCanvas.height = 100;
          tempCtx.drawImage(img, 0, 0, 100, 100);
          const imageData = tempCtx.getImageData(0, 0, 100, 100);
          const pixels = imageData.data;
          const colors = new Set();
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] > 128) {
              colors.add(`rgb(${pixels[i]},${pixels[i + 1]},${pixels[i + 2]})`);
            }
          }
          resolve(Array.from(colors));
        };
        img.src = imageUrl;
      });
    };

    // 배경용 색상 도형 그리기
    const drawColorShapes = (colors) => {
      const gridSize = 60;
      const cols = Math.ceil(width / gridSize) + 2;
      const positions = [];
      for (let y = -gridSize; y < height + gridSize; y += gridSize * 0.8) {
        for (let x = -gridSize; x < width + gridSize; x += gridSize * 0.8) {
          positions.push({ x, y });
        }
      }
      // 셔플
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }
      
      positions.forEach((pos) => {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const baseSize = gridSize * (1 + Math.random() * 0.8);
        ctx.fillStyle = color;
        ctx.fillRect(pos.x, pos.y, baseSize, baseSize);
      });
    };

    Promise.all(imagePaths.map(loadImage)).then(async (images) => {
      // [Layer 1] 배경: 색상 추출 및 블러
      const colorCanvas = document.createElement('canvas');
      colorCanvas.width = width;
      colorCanvas.height = height;
      
      const allColors = [];
      for (const img of images) {
        const colors = await getColorSwatches(img.src);
        allColors.push(...colors);
      }
      
      drawColorShapes(allColors); // 메인 캔버스에 직접 그림 (배경)
      
      // 배경 블러 처리
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(canvas, 0, 0);
      tempCtx.filter = 'blur(20px)'; // 몽환적인 배경을 위해 블러 강화
      tempCtx.drawImage(canvas, 0, 0);
      ctx.drawImage(tempCanvas, 0, 0);
      
      // [Layer 2] 유기적 네트워크 메쉬 (핵심 로직 변경됨)
      // 블렌드 모드를 사용하여 배경과 자연스럽게 섞이게 함
      ctx.globalCompositeOperation = 'hard-light'; 
      for (const img of images) {
        overlayImagePieces(img);
      }
      ctx.globalCompositeOperation = 'source-over';
      
      // [Layer 3] 후처리 이펙트
      generateGrain(ctx, width, height);
      applyScanlines(ctx, width, height);
      applySaturation(ctx, width, height);
      applyGlitchEffect(ctx, width, height);
    });
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = "generated_network.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleRegenerate = () => {
    setIsFading(true);
    setTimeout(() => {
      generateImage(imagePaths);
      setIsFading(false);
    }, 300);
  };

  const handleBack = () => {
    localStorage.removeItem("generatedImage");
    localStorage.removeItem("selectedImages");
    setImagePaths([]);
    setIsFading(false);
    navigate("/");
  };

  return (
    <div className="ge-container">
      <div className="ge-title-container">
        <img 
          src="/images/logo.gif" 
          alt="Graphic Archive" 
          style={{ height: '60px', width: 'auto', objectFit: 'contain' }}
        />
      </div>

      <div className="ge-main">
        <div className="ge-box1">
          <div className="ge-effects-panel">
            <h3 style={{ margin: "0 0 15px 0", fontSize: "16px", fontWeight: "500" }}>Effects</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {/* Grain Control */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <label style={{ fontSize: "14px" }}>Grain</label>
                  <span style={{ fontSize: "12px", opacity: 0.7 }}>{effects.grain.intensity}%</span>
                </div>
                <input
                  type="range" min="0" max="100" step="10"
                  value={effects.grain.intensity}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    e.target.style.setProperty('--value', `${value}%`);
                    setEffects(prev => ({ ...prev, grain: { ...prev.grain, intensity: value } }));
                  }}
                  style={{ width: "100%", "--value": `${effects.grain.intensity}%` }}
                />
              </div>
              {/* Scanlines Control */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <label style={{ fontSize: "14px" }}>Scanlines</label>
                  <span style={{ fontSize: "12px", opacity: 0.7 }}>{Math.round(effects.scanlines.alpha * 100)}%</span>
                </div>
                <input
                  type="range" min="0" max="100" step="10"
                  value={effects.scanlines.alpha * 100}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    e.target.style.setProperty('--value', `${value}%`);
                    setEffects(prev => ({ ...prev, scanlines: { ...prev.scanlines, alpha: value / 100 } }));
                  }}
                  style={{ width: "100%", "--value": `${effects.scanlines.alpha * 100}%` }}
                />
              </div>
              {/* Glitch Control */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <label style={{ fontSize: "14px" }}>Glitch</label>
                  <span style={{ fontSize: "12px", opacity: 0.7 }}>{effects.glitch.shiftAmount}%</span>
                </div>
                <input
                  type="range" min="0" max="100" step="10"
                  value={effects.glitch.shiftAmount}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    e.target.style.setProperty('--value', `${value}%`);
                    setEffects(prev => ({ ...prev, glitch: { ...prev.glitch, shiftAmount: value } }));
                  }}
                  style={{ width: "100%", "--value": `${effects.glitch.shiftAmount}%` }}
                />
              </div>
              {/* Saturation Control */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <label style={{ fontSize: "14px" }}>Saturation</label>
                  <span style={{ fontSize: "12px", opacity: 0.7 }}>{effects.saturation.value}%</span>
                </div>
                <input
                  type="range" min="0" max="100" step="10"
                  value={effects.saturation.value}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    e.target.style.setProperty('--value', `${value}%`);
                    setEffects(prev => ({ ...prev, saturation: { ...prev.saturation, value } }));
                  }}
                  style={{ width: "100%", "--value": `${effects.saturation.value}%` }}
                />
              </div>
            </div>
          </div>

          <div className="ge-button-container">
            <button onClick={handleBack} className="ge-button ge-button-back">Back</button>
            <button onClick={handleArchive} className="ge-button ge-button-archive">Archive</button>
            <button onClick={handleRegenerate} className="ge-button ge-button-regenerate">Regenerate</button>
            <button onClick={handleDownload} className="ge-button ge-button-download">Download</button>
          </div>
        </div>

        <div className="ge-canvas-container">
          <canvas
            ref={canvasRef}
            width={1080}
            height={1080}
            className="ge-canvas"
            style={{ opacity: isFading ? 0.2 : 1 }}
          />
        </div>
      </div>
    </div>
  );
}

export default Generate;