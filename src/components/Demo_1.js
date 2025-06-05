// 페이지별로는 아니지만 보임

import React, { useState, useRef, useEffect } from 'react';

function Demo() {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [noteData, setNoteData] = useState({}); // 페이지별 필기 데이터 저장
  const [error, setError] = useState('');
  const noteCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const pdfViewerRef = useRef(null);

  // 파일 드래그 앤 드롭 핸들러
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      handleFileUpload(files[0]);
    } else {
      alert('PDF 파일만 업로드할 수 있습니다.');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      handleFileUpload(file);
    } else {
      alert('PDF 파일만 업로드할 수 있습니다.');
    }
  };

  const handleFileUpload = async (file) => {
    setIsLoading(true);
    setError('');
    
    try {
      // 기존 URL이 있으면 해제
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      
      // 새 URL 생성
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setPdfFile(file);
      setCurrentPage(1);
      setNoteData({});
      
      // PDF 페이지 수 추정 (파일 크기 기반 대략적 계산)
      // 실제로는 정확하지 않지만 UI를 위한 초기값
      const estimatedPages = Math.max(1, Math.floor(file.size / 50000)); // 대략적 추정
      setTotalPages(estimatedPages);
      
      console.log('PDF 파일 로드 완료:', file.name);
      
    } catch (error) {
      console.error('PDF 업로드 에러:', error);
      setError(`PDF 파일 업로드 중 오류가 발생했습니다: ${error.message}`);
    }
    
    setIsLoading(false);
  };

  // PDF 뷰어 로드 완료 시 실제 페이지 수 업데이트
  const handlePdfLoad = () => {
    // PDF 뷰어가 로드되면 실제 페이지 수를 가져올 수 있지만
    // 브라우저 내장 뷰어에서는 직접 접근이 제한적이므로
    // 사용자가 수동으로 설정하도록 함
    console.log('PDF 로드 완료');
  };

  // 현재 페이지 필기 데이터 저장
  const saveCurrentPageNotes = () => {
    if (noteCanvasRef.current) {
      const canvas = noteCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // 빈 캔버스인지 확인
      const isBlank = !imageData.data.some(channel => channel !== 0);
      
      if (!isBlank) {
        const dataUrl = canvas.toDataURL();
        setNoteData(prev => ({
          ...prev,
          [currentPage]: dataUrl
        }));
      } else {
        // 빈 캔버스면 데이터에서 제거
        setNoteData(prev => {
          const newData = { ...prev };
          delete newData[currentPage];
          return newData;
        });
      }
    }
  };

  // 페이지 변경 시 필기 데이터 로드
  const loadPageNotes = (pageIndex) => {
    if (noteCanvasRef.current) {
      const ctx = noteCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, noteCanvasRef.current.width, noteCanvasRef.current.height);
      
      if (noteData[pageIndex]) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = noteData[pageIndex];
      }
    }
  };

  // 필기 기능
  const startDrawing = (e) => {
    if (!noteCanvasRef.current) return;
    setIsDrawing(true);
    const rect = noteCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = noteCanvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing || !noteCanvasRef.current) return;
    const rect = noteCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = noteCanvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveCurrentPageNotes();
    }
  };

  // 캔버스 초기화
  useEffect(() => {
    if (noteCanvasRef.current) {
      const ctx = noteCanvasRef.current.getContext('2d');
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      loadPageNotes(currentPage);
    }
  }, [currentPage]);

  const clearNotes = () => {
    if (noteCanvasRef.current) {
      const ctx = noteCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, noteCanvasRef.current.width, noteCanvasRef.current.height);
      setNoteData(prev => {
        const newData = { ...prev };
        delete newData[currentPage];
        return newData;
      });
    }
  };

  const nextPage = () => {
    saveCurrentPageNotes();
    setCurrentPage(prev => prev + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) {
      saveCurrentPageNotes();
      setCurrentPage(prev => prev - 1);
    }
  };

  const goToPage = (pageNum) => {
    saveCurrentPageNotes();
    setCurrentPage(pageNum);
  };

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (pdfFile) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          if (currentPage > 1) prevPage();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          nextPage();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, pdfFile]);

  // 컴포넌트 언마운트 시 URL 해제
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      {!pdfFile ? (
        // 파일 업로드 화면
        <div style={{ 
          height: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          backgroundColor: '#f8f9fa'
        }}>
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{
              border: '2px dashed #dee2e6',
              borderRadius: '10px',
              padding: '60px',
              textAlign: 'center',
              backgroundColor: 'white',
              cursor: 'pointer',
              minWidth: '400px',
              maxWidth: '600px'
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <h2 style={{ color: '#6c757d', marginBottom: '20px' }}>PDF 파일 업로드</h2>
            <p style={{ color: '#868e96', fontSize: '16px' }}>
              파일을 여기로 드래그하거나 클릭해서 선택하세요
            </p>
            <p style={{ color: '#868e96', fontSize: '14px' }}>
              PDF 파일만 지원됩니다
            </p>
            
            {isLoading && (
              <div style={{ marginTop: '20px' }}>
                <div className="spinner-border text-primary" role="status">
                  <span className="sr-only">로딩 중...</span>
                </div>
                <p style={{ marginTop: '10px', color: '#6c757d' }}>PDF 파일을 로드 중입니다...</p>
              </div>
            )}
            
            {error && (
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '5px' }}>
                <p style={{ margin: 0, fontSize: '14px' }}>{error}</p>
                <button 
                  onClick={() => setError('')}
                  style={{ marginTop: '10px', padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                >
                  닫기
                </button>
              </div>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <p style={{ marginTop: '20px', color: '#6c757d', fontSize: '12px' }}>
            키보드 단축키: ← → (또는 ↑ ↓) 페이지 이동
          </p>
        </div>
      ) : (
        // PDF 뷰어 화면
        <div style={{ display: 'flex', height: '100vh' }}>
          {/* PDF 페이지 영역 */}
          <div style={{ 
            flex: '1', 
            padding: '20px', 
            backgroundColor: '#f8f9fa',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={prevPage} 
                disabled={currentPage === 1}
                className="btn btn-outline-primary"
              >
                ← 이전
              </button>
              
              <input 
                type="number" 
                value={currentPage} 
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1) {
                    goToPage(page);
                  }
                }}
                min="1"
                style={{ 
                  width: '80px', 
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  textAlign: 'center'
                }}
              />
              
              <span style={{ fontSize: '16px' }}>페이지</span>
              
              <button 
                onClick={nextPage} 
                className="btn btn-outline-primary"
              >
                다음 →
              </button>
              
              <div style={{ marginLeft: '20px', fontSize: '14px', color: '#6c757d' }}>
                총 페이지: 
                <input 
                  type="number" 
                  value={totalPages} 
                  onChange={(e) => setTotalPages(parseInt(e.target.value) || 1)}
                  min="1"
                  style={{ 
                    width: '60px', 
                    marginLeft: '5px',
                    padding: '4px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    textAlign: 'center'
                  }}
                  placeholder="?"
                />
              </div>
            </div>
            
            <div style={{ 
              flex: 1,
              border: '1px solid #dee2e6',
              borderRadius: '5px',
              backgroundColor: 'white',
              overflow: 'hidden'
            }}>
              <iframe
                ref={pdfViewerRef}
                src={`${pdfUrl}#page=${currentPage}&toolbar=0&navpanes=0&scrollbar=0`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                onLoad={handlePdfLoad}
                title={`PDF 페이지 ${currentPage}`}
              />
            </div>
          </div>
          
          {/* 필기 영역 */}
          <div style={{ 
            flex: '1', 
            padding: '20px',
            backgroundColor: 'white',
            borderLeft: '1px solid #dee2e6',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h4 style={{ margin: 0, fontSize: '18px' }}>
                필기 공간 - 페이지 {currentPage}
                {noteData[currentPage] && <span style={{ color: '#28a745', fontSize: '12px' }}> ✓ 저장됨</span>}
              </h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={clearNotes}
                  className="btn btn-outline-danger btn-sm"
                >
                  지우기
                </button>
                <button 
                  onClick={() => {
                    saveCurrentPageNotes();
                    if (pdfUrl) {
                      URL.revokeObjectURL(pdfUrl);
                    }
                    setPdfFile(null);
                    setPdfUrl('');
                    setNoteData({});
                    setCurrentPage(1);
                    setTotalPages(0);
                  }}
                  className="btn btn-outline-secondary btn-sm"
                >
                  새 파일
                </button>
              </div>
            </div>
            
            <canvas
              ref={noteCanvasRef}
              width={600}
              height={800}
              style={{
                border: '1px solid #dee2e6',
                borderRadius: '5px',
                backgroundColor: '#fafafa',
                cursor: 'crosshair',
                flex: 1
              }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
            
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#6c757d' }}>
              💡 마우스로 드래그해서 필기하세요. 페이지별로 자동 저장됩니다.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Demo;