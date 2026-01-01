import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./about.css";
import DataSculpture from './DataSculpture'; // 경로에 맞게

function About() {
  const navigate = useNavigate();
  const [activeMethod, setActiveMethod] = useState(2); // 기본값: 2 (최신 방법론)
  return (
    
    <div className="about-container">
      <div className="about-title-container">
      <div className="about-logo">
          <img src={process.env.PUBLIC_URL + '/images/about.png'} alt="Home Logo" />
        </div>
      </div>


      

      <div className="ar-main">
        <div className="box3">
          <div className="intro">
          <p>이미지 제작 과정 </p>
          이미지 생성 과정은 여러 층의 시각적 요소를 결합하여 독특한 구성을 만듭니다.
          새로운 그래픽을 만들어내는 과정을 간단하게 적어놓겠습니다.
          </div>

                    {/* [추가됨] 방법론 선택 버튼 */}
          <div className="method-tabs">
            <button 
              className={`method-btn ${activeMethod === 1 ? 'active' : ''}`}
              onClick={() => setActiveMethod(1)}
            >
              Method 1 (Legacy)
            </button>
            <button 
              className={`method-btn ${activeMethod === 2 ? 'active' : ''}`}
              onClick={() => setActiveMethod(2)}
            >
              Method 2 (Current)
            </button>
          </div>


        <div className="new-page">
          <h1 className="about-list" onClick={() => navigate('/archive')} style={{ cursor: 'pointer' }}>Archive</h1>
          <h1 className="about-list" onClick={() => navigate("/")} style={{ cursor: 'pointer' }}>Collected Graphics</h1>
        </div>
        </div>

        <div className="about-content">

{activeMethod === 1 && (
            <div className="fade-in">
          <h3>1. 색채 분석 및 베이스 구축 (Chromatic Analysis)</h3>
              <p>
                원본 이미지의 주조색(Dominant Colors)을 분석하여 팔레트를 추출하고, 이를 기반으로 그래픽의 기초가 되는 배경 레이어를 구축합니다. 추출된 색상들은 다양한 크기의 그리드와 사각형 패턴으로 재배치되어 캔버스의 전체적인 톤 앤 매너를 형성합니다.
              </p>

              <h3>2. 기하학적 해체와 재배열 (Geometric Decomposition)</h3>
              <p>
                이미지의 형태를 있는 그대로 사용하지 않고, 삼각형이라는 기하학적 단위(Primitive)로 파편화합니다. 정삼각형, 예각/둔각 삼각형, 다이아몬드, 나선형 등 총 120개의 다각형이 생성되며, 각각 랜덤한 크기와 회전 값을 가지고 배치되어 원본 이미지를 추상적으로 재구성합니다.
              </p>

              <h3>3. 시각적 위계 설정 (Visual Hierarchy)</h3>
              <p>
                무작위로 배치된 요소들 사이에 질서를 부여하기 위해 크기에 따른 위계를 설정합니다. 가장 큰 8개의 주요 파편에는 굵은 검은색 테두리(20px)를 부여하여 시선을 집중시키고, 나머지 작은 파편들은 얇은 흰색 테두리(2px)로 마감하여 밀도 높은 디테일을 형성하면서도 이미지의 본질을 유지합니다.
              </p>

              <h3>4. 후처리 및 텍스처 합성 (Post-Processing)</h3>
              <p>
                디지털 그래픽에 아날로그적 물성을 더하기 위해 다양한 후처리 효과를 적용합니다.
                <br/>- 그레인 (Grain): 필름 사진과 같은 질감과 노이즈 추가
                <br/>- 스캔라인 (Scanline): CRT 모니터의 주사선 효과로 레트로 무드 조성
                <br/>- 글리치 (Glitch): 데이터 손상 및 왜곡 효과로 디지털 미학 강조
                <br/>- 채도 보정 (Saturation): 색상의 강도를 조절하여 시각적 임팩트 강화
              </p>

              <h3>5. 최종 렌더링 및 아카이빙 (Rendering & Archival)</h3>
              <p>
                모든 과정이 완료된 이미지는 1080x1080의 고해상도 규격으로 렌더링됩니다. 생성된 결과물은 즉시 다운로드하여 소장하거나, 'Archive' 기능을 통해 이 플랫폼의 데이터베이스에 기록하여 다른 사용자들과 시각적 경험을 공유할 수 있습니다.
              </p>
        </div>
)}

{/* METHOD 2: 최신 데이터 분석 방식 */}
          {activeMethod === 2 && (

            <div className="fade-in">

              <h3>1. 결정론적 데이터 리믹스</h3>
              <p>
                이미지를 단순한 그림이 아닌 픽셀 데이터의 집합으로 봅니다. 각 픽셀 라인의 밝기 합계를 계산하고, 그 값에 따라 오름차순, 내림차순, 혹은 시프트 방식으로 픽셀을 재정렬합니다. 이 과정에서 원본 이미지는 고유한 규칙을 가진 추상적인 글리치 텍스처로 변환됩니다.
              </p>

              <h3>2. 색상 분석</h3>
              <p>
                이미지의 색상(Hue)과 채도(Saturation)를 분석하여 데이터의 성격을 기호화합니다. 
                <br/>- 붉은색 계열: 활성 구역 (Target Scope)
                <br/>- 푸른색 계열: 안정 구역 (Brackets)
                <br/>- 기타 계열: 이진 데이터 비트 (Bits)
              </p>

              <h3>3. 질감적 분석</h3>
              <p>
                이미지의 밝기(Luminance)를 데이터 밀도로 해석합니다. 밝은 곳일수록 거친 붓터치를 중첩하여 밀도를 높이고, 가장자리는 찢어진 종이처럼 불규칙하게 비워내어(Torn Edge) 아날로그와 디지털이 충돌하는 질감을 만듭니다.
              </p>

              <h3>4. 형태적 분석</h3>
              <p>
                이미지를 색상의 높낮이가 있는 지형으로 간주하고 등고선(Iso-lines)을 추출합니다. 색상 변화가 급격한 곳은 선이 모이고 완만한 곳은 퍼지며, 이미지 전체를 관통하는 유기적인 흐름과 형태를 시각화합니다.
              </p>

              <h3>5. [2,3,4]번 그래픽 합성</h3>
              <p>
                방법론에 의거한 2번(구조적 분석), 3번(질감적 분석), 4번(형태적 분석) 그래픽을 레이어로 쌓아 최종 이미지를 구성합니다. 각 레이어는 서로 상호작용하며 복합적인 시각 효과를 창출합니다.
              </p>

              <h3>6. 최종 합성</h3>
              <p>
                최종 이미지는 1080 x 1080 해상도를 유지하며 편하게 다운로드 하시거나 다른 사람과 공유하고 싶으면 'Archive' 버튼을 누르시면 됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default About; 