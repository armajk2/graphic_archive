import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Ge.css";

function Generate() {
  const canvasRef = useRef();
  const [imagePaths, setImagePaths] = useState([]);
  const [isFading, setIsFading] = useState(false);
  const [effects, setEffects] = useState({
    grain: { intensity: 0, gamma: 1.4 },
    scanlines: { gap: 3, alpha: 0 },
    glitch: { lineHeight: 4, shiftAmount: 0 },
    saturation: { value: 100 }
  });
  const animationRef = useRef();
  const navigate = useNavigate();
  const topFivePieces = useRef([]);

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

  const generateGrain = (ctx, width, height) => {
    const { intensity } = effects.grain;
    if (intensity <= 0) return;
    
    const grainData = ctx.getImageData(0, 0, width, height);
    const data = grainData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.floor(Math.random() * intensity) - intensity / 2;
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
    if (value === 100) return; // No change if at default
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculate grayscale value using luminance formula
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      
      // Calculate saturation factor (0 = grayscale, 1 = original color)
      const saturationFactor = value / 100;
      
      // Apply saturation
      data[i] = Math.round(gray + (r - gray) * saturationFactor);
      data[i + 1] = Math.round(gray + (g - gray) * saturationFactor);
      data[i + 2] = Math.round(gray + (b - gray) * saturationFactor);
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  const handleArchive = () => {
    const canvas = canvasRef.current;
    
    // Compress the image before storing
    const compressedImageData = compressImage(canvas);
    const timestamp = new Date().toISOString();
    
    // Get existing archives
    const archives = JSON.parse(localStorage.getItem("archivedImages") || "[]");
    
    // Add new archive
    archives.push({
      imageData: compressedImageData,
      timestamp,
      effects: { ...effects }
    });
    
    // Keep only the last 10 images to prevent storage quota issues
    const trimmedArchives = archives.slice(-10);
    
    try {
      localStorage.setItem("archivedImages", JSON.stringify(trimmedArchives));
      alert("Image archived successfully!");
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        // If still getting quota error, remove oldest images until it fits
        let currentArchives = [...trimmedArchives];
        while (currentArchives.length > 0) {
          try {
            localStorage.setItem("archivedImages", JSON.stringify(currentArchives));
            alert("Image archived successfully! (Some older images were removed due to storage limits)");
            break;
          } catch (e) {
            currentArchives.shift(); // Remove the oldest image
          }
        }
      } else {
        alert("Failed to archive image. Please try again.");
      }
    }
  };

  // Function to compress image
  const compressImage = (canvas) => {
    // Create a temporary canvas for compression
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    // Set size to 1080x1080
    tempCanvas.width = 1080;
    tempCanvas.height = 1080;
    
    // Draw the image at full resolution
    tempCtx.drawImage(canvas, 0, 0, 1080, 1080);
    
    // Convert to PNG to maintain quality
    return tempCanvas.toDataURL('image/png');
  };

  const generateImage = (imagePaths) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Helper function to load images
    const loadImage = (src) =>
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.src = src;
      });

    // Function to get color swatches from an image
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
              const color = `rgb(${pixels[i]},${pixels[i + 1]},${pixels[i + 2]})`;
              colors.add(color);
            }
          }
          
          resolve(Array.from(colors));
        };
        img.src = imageUrl;
      });
    };

    // Function to draw color shapes with complete coverage
    const drawColorShapes = (colors) => {
      const gridSize = 40; // Reduced grid size for more pieces
      const cols = Math.ceil(width / gridSize) + 2; // Added extra columns
      const rows = Math.ceil(height / gridSize) + 2; // Added extra rows
      
      // Create a grid of positions with overlap
      const positions = [];
      for (let y = -gridSize; y < height + gridSize; y += gridSize * 0.8) { // Overlapping positions
        for (let x = -gridSize; x < width + gridSize; x += gridSize * 0.8) {
          positions.push({ x, y });
        }
      }
      
      // Shuffle positions
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }
      
      // Draw shapes to fill the grid
      positions.forEach((pos, index) => {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const baseSize = gridSize * (1 + Math.random() * 0.8);
        
        const centerX = pos.x + baseSize/2;
        const centerY = pos.y + baseSize/2;
        
        ctx.fillStyle = color;
        
        // Draw rectangle with more dynamic proportions
        const shapeType = Math.random();
        let width, height;
        
        if (shapeType < 0.3) {
          // Long horizontal rectangle
          width = baseSize * (2.5 + Math.random() * 1.5);
          height = baseSize * (0.3 + Math.random() * 0.3);
        } else if (shapeType < 0.6) {
          // Long vertical rectangle
          width = baseSize * (0.3 + Math.random() * 0.3);
          height = baseSize * (2.5 + Math.random() * 1.5);
        } else if (shapeType < 0.8) {
          // Square with slight variation
          const size = baseSize * (0.8 + Math.random() * 0.4);
          width = size;
          height = size;
        } else {
          // Dynamic rectangle
          width = baseSize * (1.2 + Math.random() * 10);
          height = baseSize * (0.5 + Math.random() * 1.5);
        }
        
        // Add some random skewing
        if (Math.random() > 0.7) {
          ctx.save();
          ctx.transform(1, Math.random() * 0.3, Math.random() * 0.3, 1, 0, 0);
          ctx.fillRect(pos.x, pos.y, width, height);
          ctx.restore();
        } else {
          ctx.fillRect(pos.x, pos.y, width, height);
        }
      });
    };

    // Function to create and overlay image pieces
    const overlayImagePieces = (img) => {
      const numPieces = 120; // Increased number of pieces
      const pieces = [];
      const width = canvasRef.current.width;
      const height = canvasRef.current.height;
      
      // Calculate base size to achieve desired area range
      const minArea = 10000; // Minimum area in pixels
      const maxArea = 50000; // Maximum area in pixels
      const baseSize = Math.sqrt((minArea + maxArea) / 30); // Average size
      
      for (let i = 0; i < numPieces; i++) {
        // Calculate random area within range
        const area = minArea + Math.random() * (maxArea - minArea);
        const sizeVariation = Math.random();
        let pieceWidth, pieceHeight;
        
        // Determine triangle type once when creating the piece
        const shapeType = Math.random();
        
        if (sizeVariation < 0.3) {
          // Long horizontal triangle
          pieceWidth = Math.sqrt(area * 2.5);
          pieceHeight = Math.sqrt(area * 0.4);
        } else if (sizeVariation < 0.6) {
          // Long vertical triangle
          pieceWidth = Math.sqrt(area * 0.4);
          pieceHeight = Math.sqrt(area * 2.5);
        } else if (sizeVariation < 0.8) {
          // Equilateral-like triangle
          const size = Math.sqrt(area * 1.5);
          pieceWidth = size;
          pieceHeight = size;
        } else {
          // Dynamic triangle
          pieceWidth = Math.sqrt(area * (1 + Math.random()));
          pieceHeight = Math.sqrt(area * (1 + Math.random()));
        }
        
        // Extend piece positions beyond canvas boundaries
        const x = Math.random() * (width + pieceWidth * 2) - pieceWidth;
        const y = Math.random() * (height + pieceHeight * 2) - pieceHeight;
        
        // Create the triangle path points
        let trianglePoints;
        if (shapeType < 0.15) {
          // Right triangle with dynamic proportions
          trianglePoints = [
            { x: 0, y: pieceHeight },
            { x: pieceWidth, y: pieceHeight },
            { x: 0, y: 0 }
          ];
        } else if (shapeType < 0.3) {
          // Acute triangle
          trianglePoints = [
            { x: 0, y: pieceHeight },
            { x: pieceWidth * 0.8, y: pieceHeight * 0.3 },
            { x: pieceWidth * 0.2, y: 0 }
          ];
        } else if (shapeType < 0.45) {
          // Obtuse triangle
          trianglePoints = [
            { x: 0, y: pieceHeight },
            { x: pieceWidth * 0.9, y: pieceHeight * 0.1 },
            { x: pieceWidth * 0.1, y: pieceHeight * 0.9 }
          ];
        } else if (shapeType < 0.6) {
          // Dynamic scalene triangle
          trianglePoints = [
            { x: 0, y: pieceHeight },
            { x: pieceWidth * 0.7, y: pieceHeight * 0.2 },
            { x: pieceWidth * 0.3, y: pieceHeight * 0.8 }
          ];
        } else if (shapeType < 0.75) {
          // Star-like triangle
          trianglePoints = [
            { x: pieceWidth * 0.5, y: 0 },
            { x: pieceWidth, y: pieceHeight * 0.7 },
            { x: 0, y: pieceHeight * 0.7 }
          ];
        } else if (shapeType < 0.85) {
          // Diamond-like triangle
          trianglePoints = [
            { x: pieceWidth * 0.5, y: 0 },
            { x: pieceWidth, y: pieceHeight * 0.5 },
            { x: pieceWidth * 0.5, y: pieceHeight },
            { x: 0, y: pieceHeight * 0.5 }
          ];
        } else {
          // Spiral-like triangle
          const points = [];
          const numPoints = 5;
          for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const radius = pieceWidth * (0.3 + (i / numPoints) * 0.7);
            points.push({
              x: pieceWidth * 0.5 + Math.cos(angle) * radius,
              y: pieceHeight * 0.5 + Math.sin(angle) * radius
            });
          }
          trianglePoints = points;
        }
        
        pieces.push({
          x,
          y,
          width: pieceWidth,
          height: pieceHeight,
          area: pieceWidth * pieceHeight,
          centerX: x + pieceWidth/2,
          centerY: y + pieceHeight/2,
          angle: Math.random() * Math.PI * 2, // Random rotation for each triangle
          rotationSpeed: 0.001 + Math.random() * 0.009,
          trianglePoints // Store the triangle points
        });
      }
      
      const sortedPieces = [...pieces].sort((a, b) => {
        const centerX = width / 2;
        const centerY = height / 2;
        const distA = Math.sqrt(Math.pow(a.centerX - centerX, 2) + Math.pow(a.centerY - centerY, 2));
        const distB = Math.sqrt(Math.pow(b.centerX - centerX, 2) + Math.pow(b.centerY - centerY, 2));
        
        const scoreA = a.area * (1 - distA / (width + height));
        const scoreB = b.area * (1 - distB / (width + height));
        
        return scoreB - scoreA;
      });
      
      // Store exactly 8 pieces
      topFivePieces.current = sortedPieces.slice(0, 8);
      
      // First draw all pieces with white outlines
      pieces.forEach(piece => {
        // Skip if this is one of our selected pieces
        if (topFivePieces.current.includes(piece)) return;
        
        ctx.save();
        
        const centerX = piece.x + piece.width/2;
        const centerY = piece.y + piece.height/2;
        
        // Apply random rotation for the triangle
        ctx.translate(centerX, centerY);
        ctx.rotate(piece.angle);
        ctx.translate(-centerX, -centerY);
        
        // Draw triangle using stored points
        ctx.beginPath();
        ctx.moveTo(piece.x + piece.trianglePoints[0].x, piece.y + piece.trianglePoints[0].y);
        for (let i = 1; i < piece.trianglePoints.length; i++) {
          ctx.lineTo(piece.x + piece.trianglePoints[i].x, piece.y + piece.trianglePoints[i].y);
        }
        ctx.closePath();
        
        // Create clipping path for the triangle
        ctx.clip();
        
        // Draw the image without rotation
        ctx.drawImage(img, 0, 0, width, height);
        
        // Draw white outline
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
      });
      
      // Then draw the selected pieces with red outlines on top
      topFivePieces.current.forEach((piece) => {
        ctx.save();
        
        const centerX = piece.x + piece.width/2;
        const centerY = piece.y + piece.height/2;
        
        // Apply random rotation for the triangle
        ctx.translate(centerX, centerY);
        ctx.rotate(piece.angle);
        ctx.translate(-centerX, -centerY);
        
        // Draw triangle using stored points
        ctx.beginPath();
        ctx.moveTo(piece.x + piece.trianglePoints[0].x, piece.y + piece.trianglePoints[0].y);
        for (let i = 1; i < piece.trianglePoints.length; i++) {
          ctx.lineTo(piece.x + piece.trianglePoints[i].x, piece.y + piece.trianglePoints[i].y);
        }
        ctx.closePath();
        
        // Create clipping path for the triangle
        ctx.clip();
        
        // Set opacity for the triangle content
        ctx.globalAlpha = 0.3;
        
        // Draw the image without rotation
        ctx.drawImage(img, 0, 0, width, height);
        
        // Reset opacity for the outline
        ctx.globalAlpha = 1;
        
        // Draw red outline
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 20;
        ctx.stroke();
        
        ctx.restore();
      });
    };

    // Main generation process
    Promise.all(imagePaths.map(loadImage)).then(async (images) => {
      // Layer 1: Color image
      const colorCanvas = document.createElement('canvas');
      colorCanvas.width = width;
      colorCanvas.height = height;
      const colorCtx = colorCanvas.getContext('2d');
      
      // Get all color swatches from selected images
      const allColors = [];
      for (const img of images) {
        const colors = await getColorSwatches(img.src);
        allColors.push(...colors);
      }
      
      // Draw color shapes on the temporary canvas
      drawColorShapes(allColors);
      
      // Apply blur to the color layer
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      
      // Draw the color layer to temp canvas
      tempCtx.drawImage(colorCanvas, 0, 0);
      
      // Apply blur using CSS filter
      tempCtx.filter = 'blur(8px)';
      tempCtx.drawImage(colorCanvas, 0, 0);
      
      // Draw the blurred color layer on the main canvas
      ctx.drawImage(tempCanvas, 0, 0);
      
      // Layer 2: Image pieces
      ctx.globalCompositeOperation = 'hard-light';
      for (const img of images) {
        overlayImagePieces(img);
      }
      
      // Reset blend mode
      ctx.globalCompositeOperation = 'source-over';
      
      // Layer 3: Effects
      generateGrain(ctx, width, height);
      applyScanlines(ctx, width, height);
      applySaturation(ctx, width, height);
      applyGlitchEffect(ctx, width, height);
    });
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = "generated.png";
    // Use PNG format to maintain quality
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
    // Clear all image-related data from localStorage
    localStorage.removeItem("generatedImage");
    localStorage.removeItem("selectedImages");
    
    // Clear the canvas
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Reset the state
    setImagePaths([]);
    setIsFading(false);
    
    // Navigate back to the home page
    navigate("/");
  };

  return (
    <div className="ge-container">
      <div className="ge-title-container">
        <img 
          src="/images/logo.gif" 
          alt="Graphic Archive" 
          style={{ 
            height: '60px',
            width: 'auto',
            objectFit: 'contain'
          }}
        />
      </div>

      <div className="ge-main">
        <div className="ge-box1">
          
        <div className="ge-effects-panel">
        <h3 style={{ margin: "0 0 15px 0", fontSize: "16px", fontWeight: "500" }}>Effects</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
              <label style={{ fontSize: "14px" }}>Grain</label>
              <span style={{ fontSize: "12px", opacity: 0.7 }}>{effects.grain.intensity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={effects.grain.intensity}
              onChange={(e) => {
                const value = Number(e.target.value);
                e.target.style.setProperty('--value', `${value}%`);
                setEffects(prev => ({
                  ...prev,
                  grain: { ...prev.grain, intensity: value }
                }));
              }}
              style={{ width: "100%", "--value": `${effects.grain.intensity}%` }}
            />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
              <label style={{ fontSize: "14px" }}>Scanlines</label>
              <span style={{ fontSize: "12px", opacity: 0.7 }}>{effects.scanlines.alpha * 100}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={effects.scanlines.alpha * 100}
              onChange={(e) => {
                const value = Number(e.target.value);
                e.target.style.setProperty('--value', `${value}%`);
                setEffects(prev => ({
                  ...prev,
                  scanlines: { ...prev.scanlines, alpha: value / 100 }
                }));
              }}
              style={{ width: "100%", "--value": `${effects.scanlines.alpha * 100}%` }}
            />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
              <label style={{ fontSize: "14px" }}>Glitch</label>
              <span style={{ fontSize: "12px", opacity: 0.7 }}>{effects.glitch.shiftAmount}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={effects.glitch.shiftAmount}
              onChange={(e) => {
                const value = Number(e.target.value);
                e.target.style.setProperty('--value', `${value}%`);
                setEffects(prev => ({
                  ...prev,
                  glitch: { ...prev.glitch, shiftAmount: value }
                }));
              }}
              style={{ width: "100%", "--value": `${effects.glitch.shiftAmount}%` }}
            />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
              <label style={{ fontSize: "14px" }}>Saturation</label>
              <span style={{ fontSize: "12px", opacity: 0.7 }}>{effects.saturation.value}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={effects.saturation.value}
              onChange={(e) => {
                const value = Number(e.target.value);
                e.target.style.setProperty('--value', `${value}%`);
                setEffects(prev => ({
                  ...prev,
                  saturation: { ...prev.saturation, value }
                }));
              }}
              style={{ width: "100%", "--value": `${effects.saturation.value}%` }}
            />
          </div>
        </div>
      </div>



      <div className="ge-button-container">
        <button
          onClick={handleBack}
          className="ge-button ge-button-back"
        >
          Back
        </button>
        <button
          onClick={handleArchive}
          className="ge-button ge-button-archive"
        >
          Archive
        </button>
        <button
          onClick={handleRegenerate}
          className="ge-button ge-button-regenerate"
        >
          Regenerate
        </button>
        <button
          onClick={handleDownload}
          className="ge-button ge-button-download"
        >
          Download
        </button>
      </div>
        </div>

        <div className="ge-canvas-container">
          <canvas
            ref={canvasRef}
            width={1080}
            height={1080}
            className="ge-canvas"
            style={{
              opacity: isFading ? 0.2 : 1,
            }}
          />
        </div>
      </div>

      
    </div>
  );
}

export default Generate;
