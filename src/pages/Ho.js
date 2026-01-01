import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Ho.css"; // CSS 파일명이 Ho.css가 맞는지 확인해주세요

// 기본 이미지 리스트
const images = Array.from({ length: 20 }, (_, i) => `/images/a${i + 1}.webp`);

// --- [Helper Functions] ---

// 1. 이미지 압축 및 최적화 (Optimized)
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        
        // [최적화 1] 썸네일용으로 크기를 500px로 제한 (기존 600 -> 500)
        // 원본 화질이 굳이 필요 없는 리스트 화면에서 용량을 크게 아낍니다.
        const maxSize = 500; 
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // [최적화 2] WebP 품질을 0.5로 낮춤 (육안 차이 미미, 용량 급감)
        const compressedDataUrl = canvas.toDataURL("image/webp", 0.5);
        resolve(compressedDataUrl);
      };
    };
  });
};

// 2. 색상 차이 계산 (유사 색상 필터링)
const getColorDifference = (color1, color2) => {
  const [r1, g1, b1] = color1.split(',').map(Number);
  const [r2, g2, b2] = color2.split(',').map(Number);
  return Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  );
};

// 3. 주요 색상 추출 (Optimized)
const getDominantColors = (imageUrl, numColors = 5) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // [최적화 3] 분석용 캔버스 크기를 50px로 대폭 축소
      // 색상 분포만 보는 것이므로 클 필요가 없습니다. 속도 매우 빨라짐.
      const maxSize = 50;
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      const colorMap = new Map();
      
      // [최적화 4] 샘플링 간격을 64로 늘림 (모든 픽셀을 볼 필요 없음)
      for (let i = 0; i < pixels.length; i += 64) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        // 너무 어두운 색 제외
        if (pixels[i + 3] < 128) continue;
        
        // 색상 단순화 (Quantization)
        const roundedR = Math.round(r / 5) * 5;
        const roundedG = Math.round(g / 5) * 5;
        const roundedB = Math.round(b / 5) * 5;
        
        const colorKey = `${roundedR},${roundedG},${roundedB}`;
        colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
      }
      
      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([color]) => {
          const [r, g, b] = color.split(',').map(Number);
          return `rgb(${r},${g},${b})`;
        });

      const uniqueColors = [];
      const similarityThreshold = 50; 

      for (const color of sortedColors) {
        const isSimilar = uniqueColors.some(existingColor => 
          getColorDifference(color, existingColor) < similarityThreshold
        );
        
        if (!isSimilar) {
          uniqueColors.push(color);
          if (uniqueColors.length >= numColors) break;
        }
      }
      resolve(uniqueColors);
    };
    
    img.onerror = () => {
      // 에러 발생 시 빈 배열 반환하여 멈춤 방지
      resolve([]);
    };
    img.src = imageUrl;
  });
};

function Home() {
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [imageColors, setImageColors] = useState({});
  const fileInputRef = useRef();
  const navigate = useNavigate();

  // Load uploaded images
  useEffect(() => {
    const savedImages = localStorage.getItem('uploadedImages');
    if (savedImages) {
      setUploadedImages(JSON.parse(savedImages));
    }
  }, []);

  // Save uploaded images
  useEffect(() => {
    try {
      localStorage.setItem('uploadedImages', JSON.stringify(uploadedImages));
    } catch (e) {
      console.error("Storage full or error", e);
      alert("Storage is full. Please remove some images.");
    }
  }, [uploadedImages]);

  // Color Extraction Effect
  useEffect(() => {
    const loadColors = async () => {
      const allImages = [...images, ...uploadedImages.map(img => img.url)];
      const colors = {};
      
      for (const imgUrl of allImages) {
        // 이미 분석된 색상이면 건너뜀 (중복 연산 방지)
        if (!imageColors[imgUrl]) {
          try {
            const dominantColors = await getDominantColors(imgUrl);
            colors[imgUrl] = dominantColors;
          } catch (error) {
            console.error('Error processing colors:', imgUrl);
            colors[imgUrl] = [];
          }
        }
      }
      
      // 새로 찾은 색상이 있을 때만 상태 업데이트
      if (Object.keys(colors).length > 0) {
        setImageColors(prev => ({ ...prev, ...colors }));
      }
    };
    
    // 딜레이를 살짝 주어 UI 렌더링 우선순위 확보
    const timer = setTimeout(() => {
        loadColors();
    }, 100);
    return () => clearTimeout(timer);

  }, [uploadedImages, imageColors]); 

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    const newImages = await Promise.all(
      files.map(async (file) => {
        if (file.type.startsWith('image/')) {
          const compressedUrl = await compressImage(file);
          return {
            url: compressedUrl,
            timestamp: new Date().toISOString()
          };
        }
        return null;
      })
    );

    const validImages = newImages.filter(img => img !== null);
    setUploadedImages(prev => [...prev, ...validImages]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleImage = (img) => {
    setSelectedImages((prev) => {
      if (prev.includes(img)) {
        return prev.filter((i) => i !== img);
      } else if (prev.length < 3) {
        return [...prev, img];
      }
      return prev;
    });
  };

  const generateImage = () => {
    if (selectedImages.length === 0) return;
    localStorage.setItem("selectedImages", JSON.stringify(selectedImages));
    navigate("/generate");
  };

  const removeUploadedImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="ho-container">
      <div className="ho-header">
        <div className="ho-logo">
          <img src={process.env.PUBLIC_URL + '/images/logo_home.png'} alt="Home Logo" />
        </div>
        <div className="ho-nav"></div>
      </div>

      <div className="ho-main">
        {/* 사이드바 / 모바일 하단 패널 */}
        <div className="box1">
          <div className="intro">
            이 웹사이트는 사람들이 올린 그래픽 이미지들을 모아둔 곳입니다. 최대 3개의 이미지를 선택한 후 'Generate' 버튼을 누르면, 제가 평소에 이미지를 어떻게 편집하고 새로운 그래픽으로 재구성하는지를 볼 수 있습니다. 자세한 내용이 궁금하시다면 언제든지 편하게 질문해주세요.
          </div>

          <div className="ho-selection-info">
            Selected: {selectedImages.length}/3 images
          </div>

          <div className="ho-generate-container">
            <button
              className="ho-generate-button"
              onClick={generateImage}
              disabled={selectedImages.length === 0}
            >
              Generate
            </button>
          </div>

          <div className="ho-upload-section">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
            />
            <button
              className="ho-upload-button"
              onClick={() => fileInputRef.current.click()}
            >
              Upload Image!
            </button>
          </div>

          <div className="new-page">
            <h1 className="ho-list" onClick={() => navigate('/archive')} style={{ cursor: 'pointer' }}>Archived graphics</h1>
            <h1 className="ho-list" onClick={() => navigate('/about')} style={{ cursor: 'pointer' }}>About</h1>
          </div>
        </div>

        {/* 이미지 그리드 */}
        <div className="ho-grid">
          {/* 1. Default Images */}
          {images.map((img, i) => {
            const selectedIndex = selectedImages.indexOf(img);
            return (
              <div key={`existing-${i}`} className="ho-image-container">
                <img
                  src={img}
                  alt={`tile-${i}`}
                  onClick={() => toggleImage(img)}
                  className={`ho-image ${selectedIndex !== -1 ? 'selected' : ''}`}
                  /* [최적화 5] Lazy Loading & Async Decoding */
                  loading="lazy" 
                  decoding="async"
                />
                {selectedIndex !== -1 && (
                  <div className="ho-image-number">
                    {selectedIndex + 1}
                  </div>
                )}
                {imageColors[img] && (
                  <div className="color-swatches">
                    {imageColors[img].map((color, index) => (
                      <div
                        key={index}
                        className="color-swatch"
                        style={{ backgroundColor: color }}
                        title={color}
                      >
                        <span className="color-code">{color}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* 2. Uploaded Images */}
          {uploadedImages.map((img, i) => {
            const selectedIndex = selectedImages.indexOf(img.url);
            return (
              <div key={`uploaded-${i}`} className="ho-image-container">
                <img
                  src={img.url}
                  alt={`uploaded-${i}`}
                  onClick={() => toggleImage(img.url)}
                  className={`ho-image ${selectedIndex !== -1 ? 'selected' : ''}`}
                  /* [최적화 5] Lazy Loading & Async Decoding */
                  loading="lazy"
                  decoding="async"
                />
                {selectedIndex !== -1 && (
                  <div className="ho-image-number">
                    {selectedIndex + 1}
                  </div>
                )}
                <button
                  className="ho-remove-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeUploadedImage(i);
                  }}
                >
                  {/* 삭제 아이콘 (X 표시 등) 필요하면 추가, 현재는 CSS 배경으로 처리됨 */}
                </button>
                
                {imageColors[img.url] && (
                  <div className="color-swatches">
                    {imageColors[img.url].map((color, index) => (
                      <div
                        key={index}
                        className="color-swatch"
                        style={{ backgroundColor: color }}
                        title={color}
                      >
                        <span className="color-code">{color}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Home;