import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Ho.css";

// 기본 이미지 리스트 (기존 gif들)
const images = Array.from({ length: 20 }, (_, i) => `/images/a${i + 1}.webp`);

// --- [Helper Functions] ---

// 1. 이미지 압축 및 포맷 변환 (핵심 기능)
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        
        // 최대 크기 설정 (600px로 제한하여 용량 대폭 절감)
        const maxSize = 600; 
        let width = img.width;
        let height = img.height;

        // 비율 유지 리사이징
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

        // WebP 포맷으로 변환 (품질 0.7) - JPG/PNG보다 효율적
        const compressedDataUrl = canvas.toDataURL("image/webp", 0.7);
        resolve(compressedDataUrl);
      };
    };
  });
};

// 2. 색상 차이 계산 (유사 색상 필터링용)
const getColorDifference = (color1, color2) => {
  const [r1, g1, b1] = color1.split(',').map(Number);
  const [r2, g2, b2] = color2.split(',').map(Number);
  return Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  );
};

// 3. 주요 색상 추출 함수
const getDominantColors = (imageUrl, numColors = 5) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const maxSize = 100;
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      const colorMap = new Map();
      
      for (let i = 0; i < pixels.length; i += 32) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        if (pixels[i + 3] < 128) continue;
        
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
      console.error('Error loading image for color detection:', imageUrl);
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

  // Load uploaded images from localStorage
  useEffect(() => {
    const savedImages = localStorage.getItem('uploadedImages');
    if (savedImages) {
      setUploadedImages(JSON.parse(savedImages));
    }
  }, []);

  // Save uploaded images to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('uploadedImages', JSON.stringify(uploadedImages));
    } catch (e) {
      console.error("Storage full or error", e);
      alert("Storage is full. Please remove some images.");
    }
  }, [uploadedImages]);

  // Extract Colors
  useEffect(() => {
    const loadColors = async () => {
      const allImages = [...images, ...uploadedImages.map(img => img.url)];
      const colors = {};
      
      for (const imgUrl of allImages) {
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
      setImageColors(prev => ({ ...prev, ...colors }));
    };
    loadColors();
  }, [uploadedImages]); // images는 고정이므로 dependency에서 제외해도 됨

  // [수정된 파일 업로드 핸들러]
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    const newImages = await Promise.all(
      files.map(async (file) => {
        if (file.type.startsWith('image/')) {
          // 압축 실행 (JPG/PNG -> WebP & Resize)
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
    
    // 입력 초기화 (같은 파일 재업로드 가능하게)
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
              accept="image/*" // 모든 이미지 허용
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

        <div className="ho-grid">
          {/* Default Images */}
          {images.map((img, i) => {
            const selectedIndex = selectedImages.indexOf(img);
            return (
              <div key={`existing-${i}`} className="ho-image-container">
                <img
                  src={img}
                  alt={`tile-${i}`}
                  onClick={() => toggleImage(img)}
                  className={`ho-image ${selectedIndex !== -1 ? 'selected' : ''}`}
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

          {/* Uploaded Images */}
          {uploadedImages.map((img, i) => {
            const selectedIndex = selectedImages.indexOf(img.url);
            return (
              <div key={`uploaded-${i}`} className="ho-image-container">
                <img
                  src={img.url}
                  alt={`uploaded-${i}`}
                  onClick={() => toggleImage(img.url)}
                  className={`ho-image ${selectedIndex !== -1 ? 'selected' : ''}`}
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
                </button>
                {/* 타임스탬프는 깔끔하게 보이지 않도록 숨기거나 스타일 조정 가능 */}
                {/* <div className="ho-timestamp">{new Date(img.timestamp).toLocaleDateString()}</div> */}
                
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