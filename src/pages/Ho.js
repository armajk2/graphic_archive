import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Ho.css";

const images = Array.from({ length: 30 }, (_, i) => `/images/a${i + 1}.gif`);

// Function to calculate color difference
const getColorDifference = (color1, color2) => {
  const [r1, g1, b1] = color1.split(',').map(Number);
  const [r2, g2, b2] = color2.split(',').map(Number);
  return Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  );
};

// Function to get dominant colors from an image
const getDominantColors = (imageUrl, numColors = 5) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size to a smaller size for better performance
      const maxSize = 100;
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      // Draw image to canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      
      // Create a map to store color frequencies
      const colorMap = new Map();
      
      // Sample pixels (every 4th pixel for performance)
      for (let i = 0; i < pixels.length; i += 32) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        
        // Skip transparent pixels
        if (pixels[i + 3] < 128) continue;
        
        // Round colors to reduce the number of unique colors
        const roundedR = Math.round(r / 5) * 5; // More precise rounding
        const roundedG = Math.round(g / 5) * 5;
        const roundedB = Math.round(b / 5) * 5;
        
        const colorKey = `${roundedR},${roundedG},${roundedB}`;
        colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
      }
      
      // Convert to array and sort by frequency
      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([color]) => {
          const [r, g, b] = color.split(',').map(Number);
          return `rgb(${r},${g},${b})`;
        });

      // Filter out similar colors with a higher threshold
      const uniqueColors = [];
      const similarityThreshold = 500; // Increased threshold for more variation

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

  // Load uploaded images from localStorage on component mount
  useEffect(() => {
    const savedImages = localStorage.getItem('uploadedImages');
    if (savedImages) {
      setUploadedImages(JSON.parse(savedImages));
    }
  }, []);

  // Save uploaded images to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('uploadedImages', JSON.stringify(uploadedImages));
  }, [uploadedImages]);

  // Load and process colors for all images
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
            console.error('Error processing colors for image:', imgUrl, error);
            colors[imgUrl] = [];
          }
        }
      }
      
      setImageColors(prev => ({ ...prev, ...colors }));
    };
    
    loadColors();
  }, [uploadedImages]);

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          const imageUrl = e.target.result;
          setUploadedImages(prev => [...prev, {
            url: imageUrl,
            timestamp: new Date().toISOString()
          }]);
        };
        
        reader.readAsDataURL(file);
      }
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

    // Create a temporary canvas to stack images
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    // Fill with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save selected images to localStorage
    localStorage.setItem("selectedImages", JSON.stringify(selectedImages));

    // Navigate to generate page
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
        <div className="ho-nav">
        </div>
      </div>

      <div className="ho-main">
        <div className="box1">
          <div className="intro">이 웹사이트는 사람들이 올린 그래픽 이미지들을 모아둔 곳입니다. 최대 3개의 이미지를 선택한 후 'Generate' 버튼을 누르면, 제가 평소에 이미지를 어떻게 편집하고 새로운 그래픽으로 재구성하는지를 볼 수 있습니다. 자세한 내용이 궁금하시다면 언제든지 편하게 질문해주세요.</div>

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
              Upload gif!
            </button>
          </div>

          <div className="new-page">
            <h1 className="ho-list" onClick={() => navigate('/archive')} style={{ cursor: 'pointer' }}>Archived graphics</h1>
            <h1 className="ho-list" onClick={() => navigate('/about')} style={{ cursor: 'pointer' }}>About</h1>
          </div>
        </div>

        <div className="ho-grid">
          {/* Display existing images */}
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

          {/* Display uploaded images */}
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
                {img.timestamp && (
                  <div className="ho-timestamp">
                    {new Date(img.timestamp).toLocaleString()}
                  </div>
                )}
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
