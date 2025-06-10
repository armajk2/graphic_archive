import React from "react";
import { useNavigate } from "react-router-dom";
import "./about.css";

function About() {
  const navigate = useNavigate();

  return (
    <div className="ho-container">
      <div className="ho-title-container">
      <div className="ho-logo">
          <img src={process.env.PUBLIC_URL + '/images/logo_home.png'} alt="Home Logo" />
        </div>
      </div>

      <div className="ar-main">
        <div className="box3">
          <div className="intro">
          <p>이미지 제작 과정 </p>
          이미지 생성 과정은 여러 층의 시각적 요소를 결합하여 독특한 구성을 만듭니다.
          새로운 그래픽을 만들어내는 과정을 간단하게 적어놓겠습니다.
          </div>
        <div className="new-page">
          <h1 className="about-list" onClick={() => navigate('/archive')} style={{ cursor: 'pointer' }}>Archive</h1>
          <h1 className="about-list" onClick={() => navigate("/")} style={{ cursor: 'pointer' }}>Collected Graphics</h1>
        </div>
        </div>

        <div className="about-content">


          <h3>1. 색 배경 제작</h3>
          <p>
          주로 사용되는 색상을 추출하기 위해 선택한 이미지를 분석하며 해당 색을 활용해 배경층이 제작됩니다. 그 후 다양한 사각형 형태로 해당 색상들을 활용해서 캔버스를 채웁니다.
          </p>

          <h3>2. 구조 분석 및 삼각형 배치</h3>
          <p>
          메인 구성 요소는 원래 이미지에서 삼각형 조각으로 절단됩니다. 그 후 랜덤한 크기, 형태, 각도를 지닌 삼각형을 총 120개 생성합니다.
            - 정삼각형
            - 예각삼각형
            - 둔각삼각형
            - 다이아몬드
            - 나선 삼각형
          </p>

          <h3>3. 중심 형태 강조 및 자연스러운 배치</h3>
          <p>
          120 삼각형에서 가장 큰 순으로 총 8개의 삼각형은 검은색 테두리(20px)를 지니고 있으며 나머지 삼각형은 흰색 테두리(2px)로 표시됩니다. 각 삼각형은 원래 이미지 콘텐츠를 유지합니다.
          </p>

          <h3>4. 시각적효과</h3>
          <p>
          최종 구성은 다양한 효과로 향상될 수 있습니다:
            - 그레인: 이미지에 질감과 노이즈를 더합니다
            - 스캔라인: 레트로 CRT 모니터 효과 생성합니다.
            - 글리치: 디지털 왜곡과 변위를 도입합니다.
            - 채도: 색상 강도를 조절합니다.
          </p>

          <h3>5. 최종 결과물</h3>
          <p>
          최종 이미지는 1080 x 1080 해상도를 유지하며 편하게 다운로드 하시거나 다른 사람과 공유하고 싶으면 'Archive' 버튼을 누르시면 됩니다. 
          </p>
        </div>
      </div>
    </div>
  );
}

export default About; 