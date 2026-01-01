import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Ge.css";
import DataSculpture from './DataSculpture'; 

// [Helper] 워터마크 합성 함수 (다운로드용)
const applyWatermark = async (originalDataUrl, effects, currentView) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = originalDataUrl;
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = img.width;
      const h = img.height;
      
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      // 1. 원본 이미지 그리기
      ctx.drawImage(img, 0, 0);

      // 2. 워터마크 스타일 설정
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.lineWidth = 3;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";

      // 폰트 크기 및 서체 설정 (Orbit 폰트 적용)
      const fontSize = Math.floor(h * 0.014); // 높이의 1.4%
      ctx.font = `bold ${fontSize}px "Orbit", sans-serif`;

      // 3. 적을 내용 준비
      const id = Math.floor(Math.random() * 999999).toString(16).toUpperCase();
      const date = new Date();
      // 날짜 포맷 (YYYY.MM.DD)
      const dateStr = `${date.getFullYear()}.${date.getMonth()+1}.${date.getDate()}`;
      
      // 현재 뷰에 따라 '사용된 레이어' 텍스트 결정
      let layerInfo = "";
      switch(currentView) {
          case 'source': layerInfo = "SOURCE_IMAGE"; break;
          case 'layer1': layerInfo = "LAYER: HUD (STRUCTURE)"; break;
          case 'layer2': layerInfo = "LAYER: TEXTURE (COLOR)"; break;
          case 'layer3': layerInfo = "LAYER: CONTOUR (FLOW)"; break;
          case 'final': default: layerInfo = "LAYERS: HUD + TEXTURE + CONTOUR"; break;
      }

      // [요청하신 내용 순서대로 배치]
      const lines = [
        `ID: #${id}`,                                 
        `DATE: ${dateStr}`,                           
        `${layerInfo}`,                               
        `NOISE_LEVEL: ${effects.grain.intensity}`,    
        `Arranged_by_Hyunsang_Jeong`                  
      ];

      // 4. 우측 하단에 글씨 쓰기 (아래에서 위로 쌓음)
      const margin = fontSize; 
      const lineHeight = fontSize * 1.5;
      
      lines.reverse().forEach((line, index) => {
        const x = w - margin -20;
        const y = h - margin - (index * lineHeight) - 20;
        
        ctx.strokeText(line, x, y); // 검은 테두리
        ctx.fillText(line, x, y);   // 흰 글씨
      });

      resolve(canvas.toDataURL("image/png"));
    };
  });
};


function Generate() {
  const canvasRef = useRef();
  const compositeCanvasRef = useRef(null);
  const gridDataRef = useRef([]);

  const [imagePaths, setImagePaths] = useState([]);
  const [isFading, setIsFading] = useState(false);
  
  const [currentView, setCurrentView] = useState('final');
  const [textureUrl, setTextureUrl] = useState(null); 

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
      if (currentView !== '3d') {
        drawCurrentView();
      }
    }
  }, [currentView, effects]);

  // (기존 remixSourceImage, analyzeImageStatistics 등 로직 동일 - 생략 없음)
  const remixSourceImage = (ctx, width, height) => {
    const tileSize = Math.floor(5 + Math.random() * 35); 
    const cols = Math.ceil(width / tileSize); const rows = Math.ceil(height / tileSize);
    const tiles = [];
    for (let x = 0; x < cols; x++) {
        const colTiles = [];
        for (let y = 0; y < rows; y++) {
            const data = ctx.getImageData(x * tileSize, y * tileSize, tileSize, tileSize);
            let r=0, g=0, b=0, count=0;
            const d = data.data;
            for(let i=0; i<d.length; i+=4) { if(d[i+3]>0) { r+=d[i]; g+=d[i+1]; b+=d[i+2]; count++; } }
            const brightness = count > 0 ? (r+g+b)/3/count : 0;
            colTiles.push({ data, brightness, y: y * tileSize });
        }
        tiles.push(colTiles);
    }
    tiles.forEach((colTiles, colIndex) => {
        const sortType = Math.random();
        if (sortType < 0.45) colTiles.sort((a, b) => b.brightness - a.brightness);
        else if (sortType < 0.90) colTiles.sort((a, b) => a.brightness - b.brightness);
        colTiles.forEach((tile, rowIndex) => { ctx.putImageData(tile.data, colIndex * tileSize, rowIndex * tileSize); });
    });
  };

  const analyzeImageStatistics = (width, height, sourceCanvas) => {
    const ctx = sourceCanvas.getContext('2d');
    const gridSize = 20; const cols = Math.ceil(width / gridSize); const rows = Math.ceil(height / gridSize);
    const analyzedData = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const posX = x * gridSize; const posY = y * gridSize;
        const imgData = ctx.getImageData(posX, posY, gridSize, gridSize);
        const data = imgData.data;
        let rSum=0, gSum=0, bSum=0, totalLum=0; const pixels = [];
        for(let i=0; i<data.length; i+=4) {
            const r = data[i]; const g = data[i+1]; const b = data[i+2];
            const lum = 0.299*r + 0.587*g + 0.114*b; rSum += r; gSum += g; bSum += b; totalLum += lum; pixels.push(lum);
        }
        const count = pixels.length; if(count === 0) continue;
        const avgLum = totalLum / count;
        const avgR = Math.floor(rSum / count); const avgG = Math.floor(gSum / count); const avgB = Math.floor(bSum / count);
        let varianceSum = 0; for(let i=0; i<pixels.length; i++) varianceSum += Math.pow(pixels[i] - avgLum, 2);
        const variance = Math.sqrt(varianceSum / count);
        const rNorm = avgR/255, gNorm = avgG/255, bNorm = avgB/255;
        const max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
        let h, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; } 
        else {
            const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) { case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break; case gNorm: h = (bNorm - rNorm) / d + 2; break; case bNorm: h = (rNorm - gNorm) / d + 4; break; }
            h /= 6;
        }
        analyzedData.push({ x: posX, y: posY, w: gridSize, h: gridSize, avgLum, variance, avgR, avgG, avgB, hue: h * 360, sat: s, col: x, row: y });
      }
    }
    return analyzedData;
  };

  const drawLayerVariance = (ctx, w, h) => { const data = gridDataRef.current; ctx.lineWidth = 0.8; data.forEach(cell => { const margin=60; if(cell.x<margin||cell.x>w-margin||cell.y<margin||cell.y>h-margin)return; const cx=cell.x+cell.w/2;const cy=cell.y+cell.h/2; if(cell.sat<0.15||cell.avgLum<15)return; const hc=`hsla(${cell.hue},100%,65%,0.9)`; ctx.strokeStyle=hc;ctx.fillStyle=hc; if((cell.hue>=330||cell.hue<30)||(cell.hue>=150&&cell.hue<210)){ctx.beginPath();ctx.arc(cx,cy,cell.w*0.35,0,Math.PI*2);ctx.stroke();const sz=cell.w*0.6;ctx.beginPath();ctx.moveTo(cx-sz,cy);ctx.lineTo(cx+sz,cy);ctx.moveTo(cx,cy-sz);ctx.lineTo(cx,cy+sz);ctx.stroke();}else if(cell.hue>=210&&cell.hue<270){const sz=cell.w*0.4;const g=3;ctx.beginPath();ctx.moveTo(cx-sz/2+g,cy-sz/2);ctx.lineTo(cx-sz/2,cy-sz/2);ctx.lineTo(cx-sz/2,cy+sz/2);ctx.lineTo(cx-sz/2+g,cy+sz/2);ctx.moveTo(cx+sz/2-g,cy-sz/2);ctx.lineTo(cx+sz/2,cy-sz/2);ctx.lineTo(cx+sz/2,cy+sz/2);ctx.lineTo(cx+sz/2-g,cy+sz/2);ctx.stroke();}else{ctx.fillRect(cx-1,cy-1,2,2);ctx.beginPath();ctx.moveTo(cx-3,cy+3);ctx.lineTo(cx+3,cy-3);ctx.stroke();} }); };
  const drawLayerGrunge = (ctx, w, h) => { const data=gridDataRef.current; const bm=60;const r=50; data.forEach(cell=>{ if(cell.avgLum<5)return; const rm=bm+(Math.random()*r); if(cell.x<rm||cell.x>w-rm||cell.y<rm||cell.y>h-rm)return; const den=Math.floor((cell.avgLum/255)*10); const cx=cell.x+cell.w/2;const cy=cell.y+cell.h/2; ctx.fillStyle=`rgba(${cell.avgR},${cell.avgG},${cell.avgB},0.55)`; ctx.strokeStyle=`rgba(${cell.avgR},${cell.avgG},${cell.avgB},0.25)`; for(let i=0;i<den;i++){const sp=cell.w*1.5; const rx=cx+(Math.random()-0.5)*sp*2;const ry=cy+(Math.random()-0.5)*sp*2; const t=Math.random();const sz=Math.random()*12+4; if(t<0.6){const a=Math.random()*Math.PI*2;const l=Math.random()*30+10; ctx.beginPath();ctx.moveTo(rx,ry);ctx.lineTo(rx+Math.cos(a)*l,ry+Math.sin(a)*l);ctx.lineWidth=Math.random()*3+1;ctx.stroke();}else{ctx.save();ctx.translate(rx,ry);ctx.rotate(Math.random()*Math.PI);ctx.fillRect(-sz/2,-sz/2,sz,sz*(Math.random()*2+1));ctx.restore();}} }); };
  const drawLayerContours = (ctx, w, h) => { const data=gridDataRef.current; const gs=20;const cols=Math.ceil(w/gs);const step=30; ctx.lineWidth=1.2;ctx.lineCap="round"; for(let i=0;i<data.length;i++){const c=data[i];const m=50; if(c.x<m||c.x>w-m||c.y<m||c.y>h-m)continue; if(c.avgLum<20||c.sat<0.1)continue; const cx=c.x+c.w/2;const cy=c.y+c.h/2; const ns=[{idx:i+1,type:'r'},{idx:i+cols,type:'d'}]; for(let n of ns){if(n.idx>=data.length)continue;const nb=data[n.idx]; if(n.type==='r'&&nb.row!==c.row)continue; if(nb.avgLum<20||nb.sat<0.1)continue; const h1=c.hue;const h2=nb.hue; if(Math.abs(h1-h2)>180)continue; const minH=Math.min(h1,h2);const maxH=Math.max(h1,h2); const sl=Math.ceil(minH/step)*step; if(sl<maxH){const nx=nb.x+nb.w/2;const ny=nb.y+nb.h/2; ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(nx,ny);ctx.strokeStyle=`hsla(${sl},100%,70%,0.8)`;ctx.stroke();ctx.fillStyle="#fff";const mx=(cx+nx)/2;const my=(cy+ny)/2;ctx.fillRect(mx-1,my-1,2,2);}}} };
  const drawFinal = (ctx, w, h) => { ctx.globalCompositeOperation='source-over';ctx.fillStyle="#050a14";ctx.fillRect(0,0,w,h); ctx.save();drawLayerGrunge(ctx,w,h);ctx.restore(); ctx.save();ctx.globalCompositeOperation='screen';drawLayerVariance(ctx,w,h);ctx.restore(); ctx.save();ctx.globalCompositeOperation='screen';drawLayerContours(ctx,w,h);ctx.restore(); ctx.globalCompositeOperation='source-over';ctx.strokeStyle="rgba(255,255,255,0.08)";drawGridOverlay(ctx,w,h); };
  const drawCurrentView = () => { const cvs=canvasRef.current;if(!cvs)return; const ctx=cvs.getContext("2d");const w=cvs.width;const h=cvs.height; ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1.0;ctx.fillStyle="#050505";ctx.fillRect(0,0,w,h); switch(currentView){case'source':ctx.drawImage(compositeCanvasRef.current,0,0,w,h);break;case'layer1':drawLayerVariance(ctx,w,h);break;case'layer2':drawLayerGrunge(ctx,w,h);break;case'layer3':drawLayerContours(ctx,w,h);break;case'final':default:drawFinal(ctx,w,h);} ctx.globalCompositeOperation='source-over';applyScanlines(ctx,w,h);generateGrain(ctx,w,h); };
  const drawGridOverlay = (ctx, w, h) => { ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();ctx.strokeRect(10,10,w-20,h-20); };
  const initializeGeneration = (paths) => { const cvs=canvasRef.current;if(!cvs)return; const w=cvs.width;const h=cvs.height; const load=(src)=>new Promise(r=>{const i=new Image();i.crossOrigin="Anonymous";i.onload=()=>r(i);i.src=src;}); Promise.all(paths.map(load)).then(imgs=>{const cc=document.createElement('canvas');cc.width=w;cc.height=h;const cctx=cc.getContext('2d');cctx.fillStyle="#000";cctx.fillRect(0,0,w,h); imgs.forEach((im,i)=>{if(i===0)cctx.drawImage(im,0,0,w,h);else{cctx.globalCompositeOperation='screen';cctx.drawImage(im,0,0,w,h);}}); remixSourceImage(cctx,w,h); compositeCanvasRef.current=cc; gridDataRef.current=analyzeImageStatistics(w,h,cc); drawCurrentView();}); };
  const generateGrain=(ctx,w,h)=>{if(effects.grain.intensity<=0)return;const id=ctx.getImageData(0,0,w,h);const d=id.data;for(let i=0;i<d.length;i+=4){const n=(Math.random()-0.5)*effects.grain.intensity;d[i]+=n;d[i+1]+=n;d[i+2]+=n;}ctx.putImageData(id,0,0);};
  const applyScanlines=(ctx,w,h)=>{if(effects.scanlines.alpha<=0)return;ctx.fillStyle=`rgba(0,0,0,${effects.scanlines.alpha})`;for(let y=0;y<h;y+=effects.scanlines.gap)ctx.fillRect(0,y,w,1);};

  const switchTo3D = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/webp");
    setTextureUrl(dataUrl);
    setCurrentView('3d');
  };

  // [Archive 핸들러]
  const handleArchive = () => {
    let sourceUrl = null;

    if (currentView === '3d') {
        sourceUrl = textureUrl; // 3D 모드면 텍스처(원본) 사용
    } else {
        if (!canvasRef.current) return;
        sourceUrl = canvasRef.current.toDataURL("image/png");
    }

    if (!sourceUrl) return;

    try {
      const newArchiveItem = {
        id: Date.now(),
        imageData: sourceUrl, // 영수증 없는 깨끗한 이미지 저장!
        timestamp: new Date().toISOString(),
        viewMode: currentView,
        effects: { ...effects }
      };

      const existingArchives = JSON.parse(localStorage.getItem("archivedImages") || "[]");
      const updatedArchives = [newArchiveItem, ...existingArchives].slice(0, 20);
      localStorage.setItem("archivedImages", JSON.stringify(updatedArchives));

      alert("Successfully Archived! (Original Quality)");
    } catch (e) {
      console.error("Storage failed", e);
      alert("Storage error. Please delete old archives.");
    }
  };

  // [Download 핸들러 - 수정됨]
  const handleDownload = async () => {
    if (currentView === '3d') { 
        alert("Use the 'RECORD' button in 3D view to save video."); 
        return; 
    }
    
    // 1. 현재 캔버스(원본) 가져오기
    const originalUrl = canvasRef.current.toDataURL("image/png");

    // 2. 워터마크 합성하기 (currentView 정보 전달!)
    const watermarkedUrl = await applyWatermark(originalUrl, effects, currentView);
    
    // 3. 합성된 이미지 다운로드
    const link = document.createElement("a");
    link.download = `graphic_${Date.now()}.png`;
    link.href = watermarkedUrl;
    link.click();
  };

  const handleRegenerate = () => { setIsFading(true); setTimeout(() => { initializeGeneration(imagePaths); setIsFading(false); }, 300); };
  const handleBack = () => { localStorage.removeItem("generatedImage"); localStorage.removeItem("selectedImages"); navigate("/"); };

  return (
    <div className="ge-container">
      <div className="ge-title-container">
        <img src="/images/logo.gif" alt="Graphic Archive" style={{ height: '100px', width: 'auto', objectFit: 'contain',  transform: 'translateY(30px)' }} />
      </div>

      <div className="ge-main">
        <div className="ge-box1">
          <div className="ge-effects-panel">
            <div style={{ marginBottom: '20px' }}>
                <h3>ANALYSIS LAYERS</h3>
                <div className="ge-layer-buttons">
                    <button className={`ge-layer-btn ${currentView === 'source' ? 'active' : ''}`} onClick={() => setCurrentView('source')}>SOURCES</button>
                    <button className={`ge-layer-btn ${currentView === 'layer1' ? 'active' : ''}`} onClick={() => setCurrentView('layer1')}>HUD</button>
                    <button className={`ge-layer-btn ${currentView === 'layer2' ? 'active' : ''}`} onClick={() => setCurrentView('layer2')}>TEXTURE</button>
                    <button className={`ge-layer-btn ${currentView === 'layer3' ? 'active' : ''}`} onClick={() => setCurrentView('layer3')}>CONTOUR</button>
                    <button className={`ge-layer-btn final ${currentView === 'final' ? 'active' : ''}`} onClick={() => setCurrentView('final')}>FINAL VIEW</button>
                    <button className={`ge-layer-btn final ${currentView === '3d' ? 'active' : ''}`} onClick={switchTo3D} style={{ marginTop: '5px' }}>3D VIEW (CURRENT)</button>
                </div>
            </div>

            <h3>DISPLAY PARAMS</h3>
            {currentView === '3d' ? (
              <div style={{ fontSize: '12px', color: '#666', padding: '10px 0', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                <p><strong>3D MODE ACTIVE</strong></p>
                <p>Data visualization initialized.</p>
                <p>Status: Monitoring...</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontFamily: "monospace" }}>NOISE_LEVEL: {effects.grain.intensity}</label>
                  <input type="range" min="0" max="50" step="5" value={effects.grain.intensity} onChange={(e) => setEffects(p => ({...p, grain: {...p.grain, intensity: Number(e.target.value)}}))} style={{ width: "100%" }} />
                </div>
              </div>
            )}
          </div>

          <div className="ge-button-container">
            <button onClick={handleBack} className="ge-button ge-button-back">BACK</button>
            <button onClick={handleArchive} className="ge-button ge-button-archive" disabled={currentView === '3d'} style={currentView === '3d' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
                {currentView === '3d' ? "ARCHIVE (2D ONLY)" : "ARCHIVE"}
            </button> 
            <button onClick={handleRegenerate} className="ge-button ge-button-regenerate">RE-ANALYZE</button>
            <button onClick={handleDownload} className="ge-button ge-button-download">EXPORT DATA</button>
          </div>
        </div>

        <div className="ge-canvas-container">
          {currentView === '3d' ? (
             <div style={{ 
                 width: '100%', height: '100%', aspectRatio: '1/1', maxHeight: '90vh', maxWidth: '90vh',
                 boxShadow: '0 20px 50px rgba(0,0,0,0.15)', border: '1px solid #000',
                 overflow: 'hidden', background: 'black', position: 'relative'
               }}>
                {/* 3D 뷰어 (녹화 가능) - 영수증 오버레이 제거됨 */}
                <DataSculpture imageUrl={textureUrl} />
             </div>
          ) : (
             <canvas ref={canvasRef} width={1080} height={1080} className="ge-canvas" style={{ opacity: isFading ? 0.2 : 1 }} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Generate;