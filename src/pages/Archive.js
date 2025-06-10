import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Archive.css";

function Archive() {
  const [archivedImages, setArchivedImages] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Load archived images from localStorage
    const archives = JSON.parse(localStorage.getItem("archivedImages") || "[]");
    setArchivedImages(archives);
  }, []);

  const handleDelete = (index) => {
    const newArchives = archivedImages.filter((_, i) => i !== index);
    setArchivedImages(newArchives);
    localStorage.setItem("archivedImages", JSON.stringify(newArchives));
  };

  const handleDownload = (imageData) => {
    const link = document.createElement('a');
    link.download = `archived-image-${new Date().toISOString()}.png`;
    link.href = imageData;
    link.click();
  };

  return (
    <div className="ar-container">
      <div className="archive-container">
        <div className="archive-header">
          <div className="archive-logo">
            <img src={process.env.PUBLIC_URL + '/images/archived-graphics.png'} alt="Archive Logo" />
          </div>
          <div className="archive-nav">
          </div>
        </div>
      </div>

      <div className="ar-main">
        <div className="ar-box1">
        <div className="intro">다른 사람들이 선택하고 만든 그래픽 이미지를 아카이빙한 페이지입니다. 언제든 다운로드하고 자신이 좋아하는 방식대로 재조합해주시길 바라겠습니다. 과거의 방식대로 만들어진 그래픽도 저장이 되어있기에 제가 디자인을 편집하는 방법의 변화를 알 수 있습니다.</div>
        <div className="new-page">
          <h1 className="ar-list" onClick={() => navigate("/")} style={{ cursor: 'pointer' }}>Collected Graphics</h1>
          <h1 className="ar-list" onClick={() => navigate('/about')} style={{ cursor: 'pointer' }}>About</h1>
        </div>
        </div>

        <div className="ar-grid">
          {archivedImages.map((archive, index) => (
            <div key={index} className="ar-item">
              <img 
                src={archive.imageData} 
                alt={`Archived ${index + 1}`}
                className="ar-image"
              />
              <div className="ar-info">
                
                <div className="ar-actions">
                  <button 
                    onClick={() => handleDownload(archive.imageData)}
                    className="ar-button ar-button-download"
                  >
                    Download
                  </button>
              
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Archive; 