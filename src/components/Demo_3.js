// 자동으로 줄바꿈시 bullet 빼고 다 됨

import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function Demo() {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPages, setPdfPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [noteData, setNoteData] = useState({}); // 페이지별 리치 텍스트 저장
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('center');
  const [pageSize, setPageSize] = useState({ width: 595, height: 842 });
  const [isPreviewMode, setIsPreviewMode] = useState(false); // 편집/프리뷰 모드 토글
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const pdfContainerRef = useRef(null);

  // 현재 페이지의 노트 내용
  const currentNote = noteData[currentPage] || '';

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

  // PDF를 페이지별로 분할하고 페이지 크기 정보도 가져오는 함수
  const splitPdfPages = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const totalPages = pdfDoc.getPageCount();
      
      const pages = [];
      let firstPageSize = null;
      
      for (let i = 0; i < totalPages; i++) {
        const newPdfDoc = await PDFDocument.create();
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [i]);
        
        if (i === 0) {
          const originalPage = pdfDoc.getPage(i);
          const { width, height } = originalPage.getSize();
          firstPageSize = { width, height };
          setPageSize({ width, height });
        }
        
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
      
      return { pages, pageSize: firstPageSize };
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
      
      const { pages, pageSize: extractedPageSize } = await splitPdfPages(file);
      
      console.log(`${pages.length}개 페이지로 분할 완료`);
      console.log('페이지 크기:', extractedPageSize);
      
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

  // 페이지 크기에 맞는 뷰어 크기 계산
  const calculateViewerSize = () => {
    if (!pdfContainerRef.current) return { width: 600, height: 800 };
    
    const containerWidth = pdfContainerRef.current.offsetWidth - 40;
    const containerHeight = pdfContainerRef.current.offsetHeight - 120;
    
    const aspectRatio = pageSize.height / pageSize.width;
    
    let viewerWidth = Math.min(containerWidth * 0.9, pageSize.width * 0.8);
    let viewerHeight = viewerWidth * aspectRatio;
    
    if (viewerHeight > containerHeight * 0.9) {
      viewerHeight = containerHeight * 0.9;
      viewerWidth = viewerHeight / aspectRatio;
    }
    
    return {
      width: Math.round(viewerWidth),
      height: Math.round(viewerHeight)
    };
  };

  const viewerSize = calculateViewerSize();

  // 에디터 내용 변경 핸들러
  const handleEditorChange = () => {
    if (!editorRef.current) return;
    
    // 페이지별 데이터 저장
    setNoteData(prev => ({
      ...prev,
      [currentPage]: editorRef.current.innerHTML
    }));
  };

  // 커서 위치를 안전하게 저장하고 복원하는 헬퍼 함수
  const saveCursorPosition = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    try {
      const range = selection.getRangeAt(0);
      return {
        startContainer: range.startContainer,
        startOffset: range.startOffset,
        endContainer: range.endContainer,
        endOffset: range.endOffset
      };
    } catch (error) {
      return null;
    }
  };

  const restoreCursorPosition = (savedPosition) => {
    if (!savedPosition) return;
    
    try {
      const selection = window.getSelection();
      const range = document.createRange();
      
      range.setStart(savedPosition.startContainer, savedPosition.startOffset);
      range.setEnd(savedPosition.endContainer, savedPosition.endOffset);
      
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (error) {
      // 커서 복원 실패 시 에디터 끝으로 이동
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (fallbackError) {
        console.log('커서 위치 복원 실패:', fallbackError);
      }
    }
  };

  // 자동 변환 함수 (더 안전하게)
  const performAutoConversion = (text, cursorOffset) => {
    const conversions = [
      { pattern: /-->/g, replacement: '→' },
      { pattern: /<--/g, replacement: '←' },
      { pattern: /->/g, replacement: '→' },
      { pattern: /<-/g, replacement: '←' },
      { pattern: /\(c\)/gi, replacement: '©' },
      { pattern: /\(r\)/gi, replacement: '®' },
      { pattern: /\(tm\)/gi, replacement: '™' },
      { pattern: /\.\.\./g, replacement: '…' },
      { pattern: /1\/2/g, replacement: '½' },
      { pattern: /1\/4/g, replacement: '¼' },
      { pattern: /3\/4/g, replacement: '¾' }
    ];

    let convertedText = text;
    let offsetDiff = 0;

    for (const conversion of conversions) {
      const matches = Array.from(text.matchAll(conversion.pattern));
      for (const match of matches) {
        if (match.index < cursorOffset) {
          const lengthDiff = conversion.replacement.length - match[0].length;
          offsetDiff += lengthDiff;
        }
      }
      convertedText = convertedText.replace(conversion.pattern, conversion.replacement);
    }

    return { convertedText, offsetDiff };
  };

  // 불릿 포인트 처리 (개선된 버전)
  const handleBulletConversion = () => {
    if (!editorRef.current) return false; // 변환이 일어났는지 반환
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    try {
      const range = selection.getRangeAt(0);
      const currentNode = range.startContainer;
      
      if (currentNode.nodeType !== Node.TEXT_NODE) return false;
      
      const textContent = currentNode.textContent || '';
      let lineStart = 0;
      
      // 현재 커서 위치에서 줄의 시작까지 찾기
      for (let i = range.startOffset - 1; i >= 0; i--) {
        if (textContent[i] === '\n') {
          lineStart = i + 1;
          break;
        }
      }
      
      // 현재 줄 텍스트 추출 (커서 위치까지)
      const currentLineStart = textContent.substring(lineStart, range.startOffset);
      
      // "* " 또는 "- " 패턴 확인 (정확히 스페이스바 다음에 와야 함)
      if (/^\s*[\*\-]\s$/.test(currentLineStart)) {
        // 불릿으로 변환
        const newText = currentLineStart.replace(/[\*\-]/, '•');
        
        // 기존 텍스트를 새 텍스트로 교체
        const beforeText = textContent.substring(0, lineStart);
        const afterText = textContent.substring(range.startOffset);
        const newFullText = beforeText + newText + afterText;
        
        currentNode.textContent = newFullText;
        
        // 커서를 불릿 뒤 (스페이스 뒤)로 정확히 이동
        const newCursorPosition = lineStart + newText.length;
        const newRange = document.createRange();
        newRange.setStart(currentNode, newCursorPosition);
        newRange.collapse(true);
        
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        handleEditorChange();
        return true; // 변환 성공
      }
    } catch (error) {
      console.log('불릿 변환 중 오류:', error);
    }
    
    return false; // 변환 없음
  };

  // 키 입력 핸들러 (깔끔하게 정리된 버전)
  const handleKeyDown = (e) => {
    // 스페이스바 입력 시 자동 변환
    if (e.key === ' ') {
      setTimeout(() => {
        if (!editorRef.current) return;
        
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        
        try {
          // 불릿 변환 먼저 시도
          const bulletConverted = handleBulletConversion();
          
          // 불릿 변환이 안 된 경우에만 다른 자동 변환 시도
          if (!bulletConverted) {
            const currentNode = selection.getRangeAt(0).startContainer;
            const textContent = currentNode.textContent || '';
            const cursorOffset = selection.getRangeAt(0).startOffset;
            
            // 기타 자동 변환
            const { convertedText, offsetDiff } = performAutoConversion(textContent, cursorOffset);
            
            if (convertedText !== textContent && currentNode.nodeType === Node.TEXT_NODE) {
              currentNode.textContent = convertedText;
              
              // 커서 위치 조정
              const newOffset = Math.min(cursorOffset + offsetDiff, convertedText.length);
              const newRange = document.createRange();
              newRange.setStart(currentNode, newOffset);
              newRange.collapse(true);
              
              selection.removeAllRanges();
              selection.addRange(newRange);
              
              handleEditorChange();
            }
          }
        } catch (error) {
          console.log('자동 변환 중 오류:', error);
        }
      }, 10);
    }
    
    // Enter 키로 불릿 포인트 계속 또는 종료 (통합된 버전)
    if (e.key === 'Enter') {
      // Enter 누르기 전에 현재 줄 상태 확인
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      try {
        const range = selection.getRangeAt(0);
        const currentNode = range.startContainer;
        
        if (currentNode.nodeType !== Node.TEXT_NODE) return;
        
        const textContent = currentNode.textContent || '';
        const cursorOffset = range.startOffset;
        
        // 현재 줄의 시작점 찾기
        let lineStart = 0;
        for (let i = cursorOffset - 1; i >= 0; i--) {
          if (textContent[i] === '\n') {
            lineStart = i + 1;
            break;
          }
        }
        
        // 현재 줄의 끝점 찾기
        let lineEnd = textContent.length;
        for (let i = cursorOffset; i < textContent.length; i++) {
          if (textContent[i] === '\n') {
            lineEnd = i;
            break;
          }
        }
        
        const currentLine = textContent.substring(lineStart, lineEnd);
        
        // 현재 줄이 불릿인지 확인
        if (/^\s*•\s/.test(currentLine)) {
          const bulletMatch = currentLine.match(/^(\s*•\s)/);
          const contentAfterBullet = currentLine.substring(bulletMatch[0].length).trim();
          
          if (!contentAfterBullet) {
            // 빈 불릿이면 불릿 제거하고 Enter 기본 동작 막기
            e.preventDefault();
            
            // 불릿 부분만 제거
            const beforeLine = textContent.substring(0, lineStart);
            const afterLine = textContent.substring(lineEnd);
            const newText = beforeLine + afterLine;
            
            currentNode.textContent = newText;
            
            // 커서를 줄 시작으로 이동
            const newRange = document.createRange();
            newRange.setStart(currentNode, lineStart);
            newRange.collapse(true);
            
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            handleEditorChange();
          } else {
            // 내용이 있는 불릿이면 다음 줄에 새 불릿 생성
            setTimeout(() => {
              try {
                const newSelection = window.getSelection();
                if (!newSelection || newSelection.rangeCount === 0) return;
                
                const newRange = newSelection.getRangeAt(0);
                const newNode = newRange.startContainer;
                
                if (newNode.nodeType !== Node.TEXT_NODE) return;
                
                const indent = bulletMatch[1].match(/^\s*/)[0]; // 들여쓰기 유지
                const bulletText = `${indent}• `;
                
                // 현재 커서 위치에 불릿 삽입
                const currentText = newNode.textContent || '';
                const currentOffset = newRange.startOffset;
                
                const beforeCursor = currentText.substring(0, currentOffset);
                const afterCursor = currentText.substring(currentOffset);
                const finalText = beforeCursor + bulletText + afterCursor;
                
                newNode.textContent = finalText;
                
                // 커서를 불릿 뒤로 이동
                const finalRange = document.createRange();
                finalRange.setStart(newNode, currentOffset + bulletText.length);
                finalRange.collapse(true);
                
                newSelection.removeAllRanges();
                newSelection.addRange(finalRange);
                
                handleEditorChange();
              } catch (error) {
                console.log('새 불릿 생성 중 오류:', error);
              }
            }, 50);
          }
        }
      } catch (error) {
        console.log('Enter 키 처리 중 오류:', error);
      }
    }
  };

  // 페이지 변경 시 에디터 내용 로드
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = noteData[currentPage] || '';
    }
  }, [currentPage]);

  // 서식 버튼 함수들
  const applyFormat = (command, value = null) => {
    try {
      document.execCommand(command, false, value);
      editorRef.current?.focus();
      handleEditorChange();
    } catch (error) {
      console.log('서식 적용 중 오류:', error);
    }
  };

  const insertHeading = (level) => {
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const heading = document.createElement(`h${level}`);
      heading.style.margin = '16px 0 8px 0';
      heading.style.fontWeight = 'bold';
      heading.style.fontSize = level === 1 ? '24px' : level === 2 ? '20px' : '18px';
      heading.style.color = '#2c3e50';
      heading.textContent = '제목을 입력하세요';
      
      range.deleteContents();
      range.insertNode(heading);
      range.setStart(heading.firstChild, 0);
      range.setEnd(heading.firstChild, heading.textContent.length);
      selection.removeAllRanges();
      selection.addRange(range);
      
      handleEditorChange();
    } catch (error) {
      console.log('제목 삽입 중 오류:', error);
    }
  };

  const insertCodeBlock = () => {
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const codeBlock = document.createElement('pre');
      codeBlock.style.backgroundColor = '#f8f9fa';
      codeBlock.style.border = '1px solid #e9ecef';
      codeBlock.style.borderRadius = '4px';
      codeBlock.style.padding = '12px';
      codeBlock.style.fontFamily = 'Monaco, Consolas, monospace';
      codeBlock.style.fontSize = '14px';
      codeBlock.style.margin = '12px 0';
      codeBlock.textContent = '코드를 입력하세요';
      
      range.deleteContents();
      range.insertNode(codeBlock);
      range.selectNodeContents(codeBlock);
      selection.removeAllRanges();
      selection.addRange(range);
      
      handleEditorChange();
    } catch (error) {
      console.log('코드 블록 삽입 중 오류:', error);
    }
  };

  const insertQuote = () => {
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const quote = document.createElement('blockquote');
      quote.style.borderLeft = '4px solid #3498db';
      quote.style.paddingLeft = '16px';
      quote.style.margin = '16px 0';
      quote.style.color = '#7f8c8d';
      quote.style.fontStyle = 'italic';
      quote.textContent = '인용문을 입력하세요';
      
      range.deleteContents();
      range.insertNode(quote);
      range.selectNodeContents(quote);
      selection.removeAllRanges();
      selection.addRange(range);
      
      handleEditorChange();
    } catch (error) {
      console.log('인용문 삽입 중 오류:', error);
    }
  };

  const nextPage = () => {
    if (currentPage < pdfPages.length - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const goToPage = (pageIndex) => {
    if (pageIndex >= 0 && pageIndex < pdfPages.length) {
      setCurrentPage(pageIndex);
    }
  };

  // 키보드 단축키
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (pdfFile && !editorRef.current?.contains(document.activeElement)) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          prevPage();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          nextPage();
        }
      }
      
      // 에디터 포커스 시 서식 단축키
      if (editorRef.current?.contains(document.activeElement)) {
        if ((e.ctrlKey || e.metaKey)) {
          switch (e.key) {
            case 'b':
              e.preventDefault();
              applyFormat('bold');
              break;
            case 'i':
              e.preventDefault();
              applyFormat('italic');
              break;
            case 'u':
              e.preventDefault();
              applyFormat('underline');
              break;
          }
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
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
        return `${baseUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`;
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
                  <option value="center">페이지 맞춤</option>
                  <option value="fit">전체 맞춤</option>
                  <option value="fill">세로 맞춤</option>
                </select>
              </div>

              {/* 페이지 크기 정보 */}
              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                크기: {Math.round(pageSize.width)} × {Math.round(pageSize.height)} pt
              </div>
            </div>
            
            {/* 분할된 PDF 페이지 뷰어 */}
            {pdfPages[currentPage] && (
              <div style={{ 
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                position: 'relative'
              }}>
                {viewMode === 'center' ? (
                  <div style={{
                    width: viewerSize.width,
                    height: viewerSize.height,
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
          
          {/* 리치 텍스트 에디터 영역 */}
          <div style={{ 
            flex: '1', 
            padding: '20px',
            backgroundColor: 'white',
            borderLeft: '1px solid #dee2e6',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* 에디터 헤더 */}
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
                스마트 노트 - 페이지 {currentPage + 1}
                {noteData[currentPage] && 
                  <span style={{ color: '#28a745', fontSize: '12px', marginLeft: '8px' }}>
                    ✓ 저장됨
                  </span>
                }
              </h4>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  onClick={() => {
                    if (editorRef.current) {
                      editorRef.current.innerHTML = '';
                      setNoteData(prev => ({ ...prev, [currentPage]: '' }));
                    }
                  }}
                  className="btn btn-outline-danger btn-sm"
                >
                  지우기
                </button>
                <button 
                  onClick={() => {
                    pdfPages.forEach(page => {
                      if (page.url) {
                        URL.revokeObjectURL(page.url);
                      }
                    });
                    setPdfFile(null);
                    setPdfPages([]);
                    setNoteData({});
                    setCurrentPage(0);
                    setPageSize({ width: 595, height: 842 });
                  }}
                  className="btn btn-outline-secondary btn-sm"
                >
                  새 파일
                </button>
              </div>
            </div>

            {/* 서식 툴바 */}
            <div style={{
              marginBottom: '15px',
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #dee2e6'
            }}>
              <button 
                onClick={() => applyFormat('bold')}
                className="btn btn-outline-secondary btn-sm"
                title="굵게 (Ctrl+B)"
              >
                <strong>B</strong>
              </button>
              <button 
                onClick={() => applyFormat('italic')}
                className="btn btn-outline-secondary btn-sm"
                title="기울임 (Ctrl+I)"
              >
                <em>I</em>
              </button>
              <button 
                onClick={() => applyFormat('underline')}
                className="btn btn-outline-secondary btn-sm"
                title="밑줄 (Ctrl+U)"
              >
                <u>U</u>
              </button>
              <div style={{ width: '1px', backgroundColor: '#dee2e6', margin: '0 4px' }}></div>
              <button 
                onClick={() => insertHeading(1)}
                className="btn btn-outline-secondary btn-sm"
                title="제목 1"
              >
                H1
              </button>
              <button 
                onClick={() => insertHeading(2)}
                className="btn btn-outline-secondary btn-sm"
                title="제목 2"
              >
                H2
              </button>
              <button 
                onClick={() => insertHeading(3)}
                className="btn btn-outline-secondary btn-sm"
                title="제목 3"
              >
                H3
              </button>
              <div style={{ width: '1px', backgroundColor: '#dee2e6', margin: '0 4px' }}></div>
              <button 
                onClick={insertCodeBlock}
                className="btn btn-outline-secondary btn-sm"
                title="코드 블록"
              >
                {'</>'}
              </button>
              <button 
                onClick={insertQuote}
                className="btn btn-outline-secondary btn-sm"
                title="인용문"
              >
                " 인용
              </button>
            </div>
            
            {/* 리치 텍스트 에디터 */}
            <div
              ref={editorRef}
              contentEditable
              onInput={handleEditorChange}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                padding: '20px',
                backgroundColor: '#fafafa',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                fontSize: '14px',
                lineHeight: '1.6',
                outline: 'none',
                overflow: 'auto',
                fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
                textAlign: 'left'
              }}
              suppressContentEditableWarning={true}
            />
            
            {/* placeholder 효과를 위한 CSS */}
            <style>
              {`
                [contenteditable]:empty::before {
                  content: "여기에 노트를 작성하세요...

자동 변환 예시:
• * 또는 - 입력 후 스페이스 → 불릿 포인트
• -> 입력 → →
• <- 입력 → ←
• ... 입력 → …

서식 단축키:
• Ctrl+B → 굵게
• Ctrl+I → 기울임
• Ctrl+U → 밑줄";
                  color: #999;
                  font-style: italic;
                  white-space: pre-line;
                }
              `}
            </style>
            
            <div style={{ 
              marginTop: '15px', 
              fontSize: '12px', 
              color: '#6c757d',
              textAlign: 'center',
              backgroundColor: '#f8f9fa',
              padding: '10px',
              borderRadius: '4px'
            }}>
              💡 <strong>자동 변환:</strong> 줄 시작에 * 또는 - (불릿), -> (화살표), ... (점선) 등 | 
              <strong>단축키:</strong> Ctrl+B/I/U (서식), ← → (페이지 이동)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Demo;