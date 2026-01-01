import React from 'react';

// 랜덤한 16진수 문자열 생성기
const randomHex = (len) => [...Array(len)].map(() => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();

const DataReceipt = () => {
  const date = new Date();
  
  return (
    <div style={{
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: '11px',
      color: '#333',
      background: '#fff',
      border: '1px dashed #333',
      padding: '15px',
      lineHeight: '1.4',
      marginTop: '10px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
    }}>
      <div style={{ textAlign: 'center', borderBottom: '1px dashed #333', paddingBottom: '10px', marginBottom: '10px' }}>
        <strong>ANALYSIS REPORT</strong><br/>
        NO.{randomHex(6)}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>DATE:</span>
        <span>{date.toLocaleDateString()}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>TIME:</span>
        <span>{date.toLocaleTimeString()}</span>
      </div>
      
      <div style={{ margin: '10px 0', borderBottom: '1px dashed #ddd' }}></div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>DATA_ENTROPY:</span>
        <span>{Math.floor(Math.random() * 20 + 80)}%</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>LUM_DENSITY:</span>
        <span>HIGH</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>POLYGONS:</span>
        <span>14,400</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>RENDER_ENGINE:</span>
        <span>R3F/WEBGL</span>
      </div>

      <div style={{ margin: '10px 0', borderBottom: '1px dashed #ddd' }}></div>

      <div style={{ textAlign: 'center', fontSize: '9px', color: '#888', marginTop: '10px' }}>
        * DATA HAS BEEN SUCCESSFULLY<br/>RECONSTRUCTED IN 3D SPACE.
      </div>
      
      <div style={{ textAlign: 'center', marginTop: '10px' }}>
        <svg width="100%" height="30">
           {/* 바코드 느낌의 단순 라인 */}
           <rect x="0" y="0" width="2" height="30" fill="#333" />
           <rect x="5" y="0" width="4" height="30" fill="#333" />
           <rect x="12" y="0" width="1" height="30" fill="#333" />
           <rect x="15" y="0" width="6" height="30" fill="#333" />
           <rect x="25" y="0" width="2" height="30" fill="#333" />
           <rect x="30" y="0" width="3" height="30" fill="#333" />
           <rect x="36" y="0" width="8" height="30" fill="#333" />
           <rect x="50" y="0" width="2" height="30" fill="#333" />
           <rect x="55" y="0" width="5" height="30" fill="#333" />
           <rect x="65" y="0" width="90%" height="30" fill="transparent" /> {/* Spacer */}
        </svg>
      </div>
    </div>
  );
};

export default DataReceipt;