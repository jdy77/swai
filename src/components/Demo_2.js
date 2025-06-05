// 필기칸 드로잉 방식

import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';

function Demo() {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPages, setPdfPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [noteData, setNoteData] = useState({});
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('center');
  const noteCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const pdfContainerRef = useRef(null);

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

  // PDF를 페이지별로 분할하는 함수
  const splitPdfPages = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const totalPages = pdfDoc.getPageCount();
      
      const pages = [];
      
      for (let i = 0; i < totalPages; i++) {
        const newPdfDoc = await PDFDocument.create();
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [i]);
        newPdfDoc.addPage(copiedPage);
        
        const pdfBytes = await newPdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        pages.push({
          pageNumber: i + 1,
          url: url,
          blob: blob
        });
      }
      
      return pages;
    } catch (error) {
      throw new Error(`PDF 분할 중 오류 발생: ${error.message}`);
    }
  };

  const handleFileUpload = async (file) => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('PDF 파일 분할 시작:', file.name);
      
      pdfPages.forEach(page => {
        if (page.url) {
          URL.revokeObjectURL(page.url);
        }
      });
      
      const pages = await splitPdfPages(file);
      
      console.log(`${pages.length}개 페이지로 분할 완료`);
      setPdfPages(pages);
      setCurrentPage(0);
      setPdfFile(file);
      setNoteData({});
      
    } catch (error) {
      console.error('PDF 처리 에러:', error);
      setError(error.message);
    }
    
    setIsLoading(false);
  };

  // 현재 페이지 필기 데이터 저장
  const saveCurrentPageNotes = () => {
    if (noteCanvasRef.current) {
      const canvas = noteCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      const isBlank = !imageData.data.some(channel => channel !== 0);
      
      if (!isBlank) {
        const dataUrl = canvas.toDataURL();
        setNoteData(prev => ({
          ...prev,
          [currentPage]: dataUrl
        }));
      } else {
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
    if (currentPage < pdfPages.length - 1) {
      saveCurrentPageNotes();
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      saveCurrentPageNotes();
      setCurrentPage(prev => prev - 1);
    }
  };

  const goToPage = (pageIndex) => {
    if (pageIndex >= 0 && pageIndex < pdfPages.length) {
      saveCurrentPageNotes();
      setCurrentPage(pageIndex);
    }
  };

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (pdfFile && !e.target.matches('input, select')) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          prevPage();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          nextPage();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, pdfPages.length, pdfFile]);

  // 컴포넌트 언마운트 시 URL 해제
  useEffect(() => {
    return () => {
      pdfPages.forEach(page => {
        if (page.url) {
          URL.revokeObjectURL(page.url);
        }
      });
    };
  }, []);

  // 뷰 모드에 따른 PDF URL 설정
  const getPdfViewUrl = () => {
    if (!pdfPages[currentPage]) return '';
    
    const baseUrl = pdfPages[currentPage].url;
    switch(viewMode) {
      case 'fit':
        return `${baseUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`;
      case 'center':
        return `${baseUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`;
      case 'fill':
        return `${baseUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitV`;
      default:
        return `${baseUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`;
    }
  };

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      {pdfPages.length === 0 ? (
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
              PDF 파일을 페이지별로 분할하여 표시합니다
            </p>
            
            {isLoading && (
              <div style={{ marginTop: '20px' }}>
                <div className="spinner-border text-primary" role="status">
                  <span className="sr-only">로딩 중...</span>
                </div>
                <p style={{ marginTop: '10px', color: '#6c757d' }}>PDF를 페이지별로 분할 중입니다...</p>
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
          <div 
            ref={pdfContainerRef}
            style={{ 
              flex: '1', 
              padding: '20px', 
              backgroundColor: '#f8f9fa',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* 페이지 네비게이션 */}
            <div style={{ 
              marginBottom: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '15px', 
              flexWrap: 'wrap',
              backgroundColor: 'white',
              padding: '15px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <button 
                onClick={prevPage} 
                disabled={currentPage === 0}
                className="btn btn-outline-primary"
                style={{ minWidth: '80px' }}
              >
                ← 이전
              </button>
              
              <select 
                value={currentPage} 
                onChange={(e) => goToPage(parseInt(e.target.value))}
                className="form-select"
                style={{ width: 'auto', minWidth: '120px' }}
              >
                {pdfPages.map((_, index) => (
                  <option key={index} value={index}>
                    페이지 {index + 1}
                  </option>
                ))}
              </select>
              
              <span style={{ fontSize: '16px', fontWeight: '500' }}>
                / {pdfPages.length}
              </span>
              
              <button 
                onClick={nextPage} 
                disabled={currentPage >= pdfPages.length - 1}
                className="btn btn-outline-primary"
                style={{ minWidth: '80px' }}
              >
                다음 →
              </button>

              {/* 뷰 모드 선택 */}
              <div style={{ marginLeft: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: '#6c757d' }}>표시 모드:</span>
                <select 
                  value={viewMode} 
                  onChange={(e) => setViewMode(e.target.value)}
                  className="form-select"
                  style={{ width: 'auto', fontSize: '14px' }}
                >
                  <option value="center">중앙 정렬</option>
                  <option value="fit">전체 맞춤</option>
                  <option value="fill">세로 맞춤</option>
                </select>
              </div>
            </div>
            
            {/* 분할된 PDF 페이지 뷰어 */}
            {pdfPages[currentPage] && (
              <div style={{ 
                flex: 1,
                position: 'relative',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                overflow: 'hidden'
              }}>
                {viewMode === 'center' ? (
                  // 완전 중앙 정렬 모드 - CSS로 정확한 중앙 배치
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '80%',
                    height: '80%',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    overflow: 'hidden'
                  }}>
                    <iframe
                      key={`page-${currentPage}-${viewMode}`}
                      src={getPdfViewUrl()}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none'
                      }}
                      title={`페이지 ${currentPage + 1}`}
                    />
                  </div>
                ) : (
                  // 전체 화면 모드
                  <iframe
                    key={`page-${currentPage}-${viewMode}`}
                    src={getPdfViewUrl()}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none'
                    }}
                    title={`페이지 ${currentPage + 1}`}
                  />
                )}
                
                {/* 페이지 정보 오버레이 */}
                <div style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  backdropFilter: 'blur(4px)',
                  zIndex: 10
                }}>
                  {currentPage + 1} / {pdfPages.length}
                </div>
              </div>
            )}
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
            <div style={{ 
              marginBottom: '20px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: '10px',
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px'
            }}>
              <h4 style={{ margin: 0, fontSize: '18px', color: '#495057' }}>
                필기 공간 - 페이지 {currentPage + 1}
                {noteData[currentPage] && 
                  <span style={{ color: '#28a745', fontSize: '12px', marginLeft: '8px' }}>
                    ✓ 저장됨
                  </span>
                }
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
                    pdfPages.forEach(page => {
                      if (page.url) {
                        URL.revokeObjectURL(page.url);
                      }
                    });
                    setPdfFile(null);
                    setPdfPages([]);
                    setNoteData({});
                    setCurrentPage(0);
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
                borderRadius: '8px',
                backgroundColor: '#fafafa',
                cursor: 'crosshair',
                flex: 1,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
            
            <div style={{ 
              marginTop: '15px', 
              fontSize: '12px', 
              color: '#6c757d',
              textAlign: 'center',
              backgroundColor: '#f8f9fa',
              padding: '10px',
              borderRadius: '4px'
            }}>
              💡 마우스로 드래그해서 필기하세요. 페이지별로 자동 저장됩니다.<br/>
              ← → 키로 페이지 이동이 가능합니다.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Demo;