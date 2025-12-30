import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Ge.css";

function Generate() {
  const canvasRef = useRef();
  const compositeCanvasRef = useRef(null);
  const gridDataRef = useRef([]);

  const [imagePaths, setImagePaths] = useState([]);
  const [isFading, setIsFading] = useState(false);
  const [currentView, setCurrentView] = useState('final');

  const [effects, setEffects] = useState({
    grain: { intensity: 8, gamma: 1.2 },
    scanlines: { gap: 2, alpha: 0.15 },
    glitch: { lineHeight: 2, shiftAmount: 0 },
    saturation: { value: 0 }
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
    initializeGeneration(stored);
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  useEffect(() => {
    if (compositeCanvasRef.current && gridDataRef.current.length > 0) {
      drawCurrentView();
    }
  }, [currentView, effects]);

  // =================================================================
  // PHASE 0: IMAGE REMIXING (Pixel Sorting)
  // 확률 조정: 원본 유지 비율을 대폭 낮춤 (40% -> 10%)
  // =================================================================
  const remixSourceImage = (ctx, width, height) => {
    const tileSize = Math.floor(5 + Math.random() * 35); 
    const cols = Math.ceil(width / tileSize);
    const rows = Math.ceil(height / tileSize);
    
    const tiles = [];
    for (let x = 0; x < cols; x++) {
        const colTiles = [];
        for (let y = 0; y < rows; y++) {
            const data = ctx.getImageData(x * tileSize, y * tileSize, tileSize, tileSize);
            let r=0, g=0, b=0, count=0;
            const d = data.data;
            for(let i=0; i<d.length; i+=4) {
                if(d[i+3]>0) { r+=d[i]; g+=d[i+1]; b+=d[i+2]; count++; }
            }
            const brightness = count > 0 ? (r+g+b)/3/count : 0;
            colTiles.push({ data, brightness, y: y * tileSize });
        }
        tiles.push(colTiles);
    }

    tiles.forEach((colTiles, colIndex) => {
        const sortType = Math.random();
        
        if (sortType < 0.45) {
            colTiles.sort((a, b) => b.brightness - a.brightness);
        } else if (sortType < 0.90) {
            colTiles.sort((a, b) => a.brightness - b.brightness);
        }
        colTiles.forEach((tile, rowIndex) => {
            ctx.putImageData(tile.data, colIndex * tileSize, rowIndex * tileSize);
        });
    });
  };

  // --- [Phase 1: Analysis] ---
  const analyzeImageStatistics = (width, height, sourceCanvas) => {
    const ctx = sourceCanvas.getContext('2d');
    const gridSize = 20; 
    const cols = Math.ceil(width / gridSize);
    const rows = Math.ceil(height / gridSize);
    const analyzedData = [];

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const posX = x * gridSize;
        const posY = y * gridSize;
        
        const imgData = ctx.getImageData(posX, posY, gridSize, gridSize);
        const data = imgData.data;
        
        let rSum=0, gSum=0, bSum=0, totalLum=0;
        const pixels = [];

        for(let i=0; i<data.length; i+=4) {
            const r = data[i]; const g = data[i+1]; const b = data[i+2];
            const lum = 0.299*r + 0.587*g + 0.114*b;
            rSum += r; gSum += g; bSum += b;
            totalLum += lum;
            pixels.push(lum);
        }
        
        const count = pixels.length;
        if(count === 0) continue;

        const avgLum = totalLum / count;
        const avgR = Math.floor(rSum / count);
        const avgG = Math.floor(gSum / count);
        const avgB = Math.floor(bSum / count);
        
        let varianceSum = 0;
        for(let i=0; i<pixels.length; i++) {
            varianceSum += Math.pow(pixels[i] - avgLum, 2);
        }
        const variance = Math.sqrt(varianceSum / count);

        const rNorm = avgR/255, gNorm = avgG/255, bNorm = avgB/255;
        const max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
        let h, s, l = (max + min) / 2;

        if (max === min) { h = s = 0; } 
        else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
                case gNorm: h = (bNorm - rNorm) / d + 2; break;
                case bNorm: h = (rNorm - gNorm) / d + 4; break;
            }
            h /= 6;
        }
        const hueDegree = h * 360; 

        analyzedData.push({
            x: posX, y: posY, w: gridSize, h: gridSize,
            avgLum, variance,
            avgR, avgG, avgB,
            hue: hueDegree, sat: s,
            col: x, row: y
        });
      }
    }
    return analyzedData;
  };

  // --- [Drawing Functions] ---
  
  // Layer 1: Color HUD (Structure)
  const drawLayerVariance = (ctx, width, height) => {
    const data = gridDataRef.current;
    ctx.lineWidth = 0.8;

    data.forEach(cell => {
        const margin = 60; 
        if (cell.x < margin || cell.x > width - margin || cell.y < margin || cell.y > height - margin) return;

        const cx = cell.x + cell.w / 2;
        const cy = cell.y + cell.h / 2;

        if (cell.sat < 0.15 || cell.avgLum < 15) return; 

        const hudColor = `hsla(${cell.hue}, 100%, 65%, 0.9)`;
        ctx.strokeStyle = hudColor;
        ctx.fillStyle = hudColor;

        if ((cell.hue >= 330 || cell.hue < 30) || (cell.hue >= 150 && cell.hue < 210)) {
            ctx.beginPath();
            ctx.arc(cx, cy, cell.w * 0.35, 0, Math.PI * 2);
            ctx.stroke();
            const size = cell.w * 0.6;
            ctx.beginPath();
            ctx.moveTo(cx - size, cy); ctx.lineTo(cx + size, cy);
            ctx.moveTo(cx, cy - size); ctx.lineTo(cx, cy + size);
            ctx.stroke();
        } else if (cell.hue >= 210 && cell.hue < 270) {
            const size = cell.w * 0.4;
            const gap = 3;
            ctx.beginPath();
            ctx.moveTo(cx - size/2 + gap, cy - size/2); ctx.lineTo(cx - size/2, cy - size/2); 
            ctx.lineTo(cx - size/2, cy + size/2); ctx.lineTo(cx - size/2 + gap, cy + size/2);
            ctx.moveTo(cx + size/2 - gap, cy - size/2); ctx.lineTo(cx + size/2, cy - size/2); 
            ctx.lineTo(cx + size/2, cy + size/2); ctx.lineTo(cx + size/2 - gap, cy + size/2);
            ctx.stroke();
        } else {
            ctx.fillRect(cx - 1, cy - 1, 2, 2);
            ctx.beginPath();
            ctx.moveTo(cx - 3, cy + 3); ctx.lineTo(cx + 3, cy - 3);
            ctx.stroke();
        }
    });
  };

  // Layer 2: Grunge Texture (Density)
  const drawLayerGrunge = (ctx, width, height) => {
    const data = gridDataRef.current;
    const baseMargin = 60; 
    const roughness = 50; 

    data.forEach(cell => {
        if (cell.avgLum < 5) return;

        const randomMargin = baseMargin + (Math.random() * roughness);
        if (cell.x < randomMargin || cell.x > width - randomMargin || cell.y < randomMargin || cell.y > height - randomMargin) return;

        const density = Math.floor((cell.avgLum / 255) * 10); 
        const cx = cell.x + cell.w / 2;
        const cy = cell.y + cell.h / 2;

        ctx.fillStyle = `rgba(${cell.avgR}, ${cell.avgG}, ${cell.avgB}, 0.55)`;
        ctx.strokeStyle = `rgba(${cell.avgR}, ${cell.avgG}, ${cell.avgB}, 0.25)`;

        for (let i = 0; i < density; i++) {
            const spread = cell.w * 1.5; 
            const rx = cx + (Math.random() - 0.5) * spread * 2;
            const ry = cy + (Math.random() - 0.5) * spread * 2;
            
            const type = Math.random();
            const size = Math.random() * 12 + 4; 

            if (type < 0.6) {
                const angle = Math.random() * Math.PI * 2;
                const len = Math.random() * 30 + 10; 
                ctx.beginPath();
                ctx.moveTo(rx, ry);
                ctx.lineTo(rx + Math.cos(angle) * len, ry + Math.sin(angle) * len);
                ctx.lineWidth = Math.random() * 3 + 1; 
                ctx.stroke();
            } else {
                ctx.save();
                ctx.translate(rx, ry);
                ctx.rotate(Math.random() * Math.PI);
                ctx.fillRect(-size/2, -size/2, size, size * (Math.random() * 2 + 1));
                ctx.restore();
            }
        }
    });
  };

  // Layer 3: Chromatic Contours (Iso-lines)
  const drawLayerContours = (ctx, width, height) => {
    const data = gridDataRef.current;
    const gridSize = 20;
    const cols = Math.ceil(width / gridSize);
    const step = 30; 
    
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";

    for (let i = 0; i < data.length; i++) {
        const current = data[i];
        const margin = 50;
        if (current.x < margin || current.x > width-margin || current.y < margin || current.y > height-margin) continue;
        if (current.avgLum < 20 || current.sat < 0.1) continue;

        const cx = current.x + current.w / 2;
        const cy = current.y + current.h / 2;

        const neighbors = [
            { idx: i + 1, type: 'right' },
            { idx: i + cols, type: 'down' }
        ];

        for (let n of neighbors) {
            if (n.idx >= data.length) continue;
            const neighbor = data[n.idx];
            if (n.type === 'right' && neighbor.row !== current.row) continue;
            if (neighbor.avgLum < 20 || neighbor.sat < 0.1) continue;

            const h1 = current.hue;
            const h2 = neighbor.hue;
            
            if (Math.abs(h1 - h2) > 180) continue;

            const minH = Math.min(h1, h2);
            const maxH = Math.max(h1, h2);
            const startLevel = Math.ceil(minH / step) * step;
            
            if (startLevel < maxH) {
                const nx = neighbor.x + neighbor.w / 2;
                const ny = neighbor.y + neighbor.h / 2;
                
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(nx, ny);
                ctx.strokeStyle = `hsla(${startLevel}, 100%, 70%, 0.8)`;
                ctx.stroke();
                
                ctx.fillStyle = "#fff";
                const midX = (cx + nx) / 2;
                const midY = (cy + ny) / 2;
                ctx.fillRect(midX-1, midY-1, 2, 2);
            }
        }
    }
  };

  // [Final Synthesis]
  const drawFinal = (ctx, width, height) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = "#050a14"; 
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    drawLayerGrunge(ctx, width, height);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen'; 
    drawLayerVariance(ctx, width, height); 
    ctx.restore();
    
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    drawLayerContours(ctx, width, height);
    ctx.restore();

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    drawGridOverlay(ctx, width, height);
  };

  // --- [Helpers] ---
  const drawCurrentView = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Reset logic
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, width, height);

    switch (currentView) {
        case 'source':
            ctx.drawImage(compositeCanvasRef.current, 0, 0, width, height);
            break;
        case 'layer1':
            drawLayerVariance(ctx, width, height);
            break;
        case 'layer2':
            drawLayerGrunge(ctx, width, height);
            break;
        case 'layer3': // Contours
            drawLayerContours(ctx, width, height);
            break;
        case 'final':
        default:
            drawFinal(ctx, width, height);
    }
    
    ctx.globalCompositeOperation = 'source-over';
    applyScanlines(ctx, width, height);
    generateGrain(ctx, width, height);
  };

  const drawGridOverlay = (ctx, w, h) => {
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h);
    ctx.moveTo(0, h/2); ctx.lineTo(w, h/2);
    ctx.stroke();
    ctx.strokeRect(10, 10, w-20, h-20);
  };

  const initializeGeneration = (imagePaths) => {
    const canvas = canvasRef.current;
    const width = canvas.width;
    const height = canvas.height;
    
    const loadImage = (src) => new Promise((resolve) => {
        const img = new Image(); img.crossOrigin = "Anonymous"; img.onload = () => resolve(img); img.src = src;
    });

    Promise.all(imagePaths.map(loadImage)).then((images) => {
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = width; compositeCanvas.height = height;
      const compositeCtx = compositeCanvas.getContext('2d');
      compositeCtx.fillStyle = "#000"; compositeCtx.fillRect(0, 0, width, height);
      
      images.forEach((img, i) => { 
          if(i===0) compositeCtx.drawImage(img, 0, 0, width, height);
          else {
             compositeCtx.globalCompositeOperation = 'screen';
             compositeCtx.drawImage(img, 0, 0, width, height);
          }
      });
      
      remixSourceImage(compositeCtx, width, height);
      compositeCanvasRef.current = compositeCanvas;
      gridDataRef.current = analyzeImageStatistics(width, height, compositeCanvas);
      drawCurrentView();
    });
  };

  // --- [새로 추가된 아카이브 로직] ---
  const handleArchive = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // 용량 최적화를 위해 webp 포맷 사용
      const dataUrl = canvas.toDataURL("image/webp", 0.8);
      
      const newArchiveItem = {
        id: Date.now(),
        imageData: dataUrl,
        timestamp: new Date().toISOString(),
        viewMode: currentView,
        effects: { ...effects }
      };

      const existingArchives = JSON.parse(localStorage.getItem("archivedImages") || "[]");
      // 최신 20개까지만 저장 (용량 관리)
      const updatedArchives = [newArchiveItem, ...existingArchives].slice(0, 20);
      localStorage.setItem("archivedImages", JSON.stringify(updatedArchives));

      alert("Successfully Archived!");
    } catch (e) {
      console.error("Storage failed", e);
      alert("Storage is full. Please delete some archived images.");
    }
  };

  const generateGrain = (ctx, w, h) => {
      if(effects.grain.intensity <= 0) return;
      const id = ctx.getImageData(0,0,w,h); const d = id.data;
      for(let i=0; i<d.length; i+=4) {
          const n = (Math.random()-0.5) * effects.grain.intensity;
          d[i]+=n; d[i+1]+=n; d[i+2]+=n;
      }
      ctx.putImageData(id, 0, 0);
  };
  const applyScanlines = (ctx, w, h) => {
      if(effects.scanlines.alpha <= 0) return;
      ctx.fillStyle = `rgba(0,0,0,${effects.scanlines.alpha})`;
      for(let y=0; y<h; y+=effects.scanlines.gap) ctx.fillRect(0,y,w,1);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.download = `analysis_${currentView}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };
  const handleRegenerate = () => { 
      setIsFading(true);
      setTimeout(() => {
        initializeGeneration(imagePaths);
        setIsFading(false);
      }, 300);
  };
  const handleBack = () => { 
      localStorage.removeItem("generatedImage");
      localStorage.removeItem("selectedImages");
      navigate("/"); 
  };

  return (
    <div className="ge-container">
      <div className="ge-title-container">
        <img src="/images/logo.gif" alt="Graphic Archive" style={{ height: '100px', width: 'auto', objectFit: 'contain',  transform: 'translateY(30px)' }} />

      </div>

      <div className="ge-main">
        <div className="ge-box1">
          <div className="ge-effects-panel">
            <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", fontWeight: "500", fontFamily: "monospace" }}>ANALYSIS LAYERS</h3>
                <div className="ge-layer-buttons">
                    <button className={`ge-layer-btn ${currentView === 'source' ? 'active' : ''}`} onClick={() => setCurrentView('source')}>SOURCES</button>
                    <button className={`ge-layer-btn ${currentView === 'layer1' ? 'active' : ''}`} onClick={() => setCurrentView('layer1')}>HUD</button>
                    <button className={`ge-layer-btn ${currentView === 'layer2' ? 'active' : ''}`} onClick={() => setCurrentView('layer2')}>TEXTURE</button>
                    <button className={`ge-layer-btn ${currentView === 'layer3' ? 'active' : ''}`} onClick={() => setCurrentView('layer3')}>CONTOUR</button>
                    <button className={`ge-layer-btn final ${currentView === 'final' ? 'active' : ''}`} onClick={() => setCurrentView('final')}>FINAL VIEW</button>
                </div>
            </div>

            <h3 style={{ margin: "0 0 15px 0", fontSize: "16px", fontWeight: "500", fontFamily: "monospace" }}>DISPLAY PARAMS</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div>
                <label style={{ fontSize: "12px", fontFamily: "monospace" }}>NOISE_LEVEL: {effects.grain.intensity}</label>
                <input type="range" min="0" max="50" step="5" value={effects.grain.intensity} onChange={(e) => setEffects(p => ({...p, grain: {...p.grain, intensity: Number(e.target.value)}}))} style={{ width: "100%" }} />
              </div>
            </div>
          </div>

          <div className="ge-button-container">
            <button onClick={handleBack} className="ge-button ge-button-back">BACK</button>
            {/* [새로 추가된 아카이브 버튼] */}
            <button onClick={handleArchive} className="ge-button ge-button-archive">ARCHIVE</button> 
            <button onClick={handleRegenerate} className="ge-button ge-button-regenerate">RE-ANALYZE</button>
            <button onClick={handleDownload} className="ge-button ge-button-download">EXPORT DATA</button>
          </div>
        </div>

        <div className="ge-canvas-container">
          <canvas ref={canvasRef} width={1080} height={1080} className="ge-canvas" style={{ opacity: isFading ? 0.2 : 1 }} />
        </div>
      </div>
    </div>
  );
}

export default Generate;