import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Archive.css";
import DataSculpture from './DataSculpture'; 

function Archive() {
  const [archivedImages, setArchivedImages] = useState([]);
  
  // [수정] URL 대신 '현재 3D로 보고 있는 아이템의 인덱스'를 저장 (없으면 null)
  const [active3DIndex, setActive3DIndex] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const archives = JSON.parse(localStorage.getItem("archivedImages") || "[]");
    setArchivedImages(archives);
  }, []);

  const handleDelete = (index) => {
    if (window.confirm("정말 이 그래픽을 삭제하시겠습니까?")) {
      const newArchives = archivedImages.filter((_, i) => i !== index);
      setArchivedImages(newArchives);
      localStorage.setItem("archivedImages", JSON.stringify(newArchives));
      
      // 만약 삭제한 게 보고 있던 3D라면 닫기
      if (active3DIndex === index) setActive3DIndex(null);
    }
  };

  const handleDownload = (imageData, index) => {
    const link = document.createElement('a');
    link.download = `archived-graphic-${index + 1}.png`;
    link.href = imageData;
    link.click();
  };

  // [추가] 3D 뷰 토글 함수
  const toggle3DView = (index) => {
    if (active3DIndex === index) {
      // 이미 보고 있는 거라면 닫기 (2D로 복귀)
      setActive3DIndex(null);
    } else {
      // 새로운 거 열기 (다른 게 열려있으면 닫히고 이게 열림)
      setActive3DIndex(index);
    }
  };

  return (
    <div className="ar-container">
      <div className="archive-header">
        <div className="archive-logo">
          <img src={process.env.PUBLIC_URL + '/images/archived-graphics.png'} alt="Archive Logo" />
        </div>
      </div>

      <div className="ar-main">
        {/* 왼쪽 사이드바 */}
        <div className="ar-box1">
          <div className="intro">
            다른 사람들이 선택하고 만든 그래픽 이미지를 아카이빙한 페이지입니다. 
            언제든 다운로드하고 자신이 좋아하는 방식대로 재조합해주시길 바라겠습니다. 
            과거의 방식대로 만들어진 그래픽도 저장이 되어있기에 제가 디자인을 편집하는 방법의 변화를 알 수 있습니다.
          </div>
          <div className="new-page">
            <h1 className="ar-list" onClick={() => navigate("/")} style={{ cursor: 'pointer' }}>Collected Graphics</h1>
            <h1 className="ar-list" onClick={() => navigate('/about')} style={{ cursor: 'pointer' }}>About</h1>
          </div>
        </div>

        {/* 오른쪽 그리드 영역 */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="ar-grid">
            {archivedImages.length === 0 && (
              <div style={{ padding: '20px', color: '#888' }}>아직 저장된 그래픽이 없습니다.</div>
            )}
            
            {archivedImages.map((archive, index) => {
              // 현재 아이템이 3D 모드인지 확인
              const is3DMode = active3DIndex === index;

              return (
                <div key={index} className="ar-item">
                  
                  {/* [핵심 변경] 이미지 래퍼 안에서 조건부 렌더링 */}
                  <div className="ar-image-wrapper">
                    {is3DMode ? (
                      /* 3D 모드일 때: DataSculpture 렌더링 */
                      <div style={{ width: '100%', height: '100%' }}>
                        <DataSculpture imageUrl={archive.imageData} />
                      </div>
                    ) : (
                      /* 2D 모드일 때: 일반 이미지 렌더링 */
                      <img 
                        src={archive.imageData} 
                        alt={`Archived ${index + 1}`}
                        className="ar-image"
                      />
                    )}
                  </div>
                  
                  <div className="ar-info">
                    <div className="ar-actions">
                      <button 
                        onClick={() => handleDownload(archive.imageData, index)}
                        className="ar-button"
                      >
                        Save
                      </button>
                      
                      {/* [수정] 버튼 텍스트와 기능이 상태에 따라 바뀜 */}
                      <button 
                        className={`ar-button ${is3DMode ? 'active' : ''}`}
                        onClick={() => toggle3DView(index)}
                        style={is3DMode ? { backgroundColor: 'black', color: 'white' } : {}}
                      >
                        {is3DMode ? "2D View" : "3D View"}
                      </button>

                      <button 
                        onClick={() => handleDelete(index)}
                        className="ar-button ar-button-delete"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Archive;