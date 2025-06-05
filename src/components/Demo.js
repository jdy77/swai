import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import axios from 'axios';

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
  const [leftWidth, setLeftWidth] = useState(50); // 왼쪽 패널 너비 (%)
  const [isResizing, setIsResizing] = useState(false); // 리사이징 상태
  
  // 팝업 관련 상태 추가
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
  const [showThankYouPopup, setShowThankYouPopup] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackAdvice, setFeedbackAdvice] = useState('');
  const [wantUse, setWantUse] = useState(''); // 사용 의향 상태 추가
  
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const pdfContainerRef = useRef(null);
  const containerRef = useRef(null); // 전체 컨테이너 참조
  const isSubmitting = useRef(false);
  const [forceUpdate, setForceUpdate] = useState(0); // 강제 업데이트용 state 추가

  // 쿠키 관련 함수들 (MVT.js에서 가져옴)
  const getCookieValue = (name) => {
    const value = "; " + document.cookie;
    const parts = value.split("; " + name + "=");
    if (parts.length === 2) {
      return parts.pop().split(";").shift();
    }
  };

  const setCookieValue = (name, value, days) => {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
  };

  const getUVfromCookie = () => {
    const hash = Math.random().toString(36).substring(2, 8).toUpperCase();
    const existingHash = getCookieValue("user");
    if (!existingHash) {
      setCookieValue("user", hash, 180);
      return hash;
    } else {
      return existingHash;
    }
  };

  // 피드백 제출 핸들러
  const handleFeedbackSubmit = async () => {
    if (isSubmitting.current || isSubmittingFeedback) return;
    
    isSubmitting.current = true;
    setIsSubmittingFeedback(true);

    const validateEmail = (email) => {
      const re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
      return re.test(email);
    };
    
    if (feedbackEmail === '' || !validateEmail(feedbackEmail)) {
      alert("이메일이 유효하지 않아 알림을 드릴 수가 없습니다.");
      isSubmitting.current = false;
      setIsSubmittingFeedback(false);
      return;
    }
    
    if (wantUse === '') {
      alert("사용 의향에 대한 답변을 선택해주세요.");
      isSubmitting.current = false;
      setIsSubmittingFeedback(false);
      return;
    }
    
    const finalData = JSON.stringify({
      id: getUVfromCookie(),
      email: feedbackEmail,
      wantUse: wantUse,
      advice: feedbackAdvice
    });
    
    try {
      const response = await axios.get(
        'https://script.google.com/macros/s/AKfycbwGfbAmUgQ9aka1OMPPGoITHAP34bGuYfQkiBWVi1-EpZdl_5or03LF9K99IfB9SWeI/exec?action=insert&table=tab_final&data=' + finalData
      );
      
      console.log(response.data.data);
      setFeedbackEmail('');
      setFeedbackAdvice('');
      setWantUse('');
      setShowFeedbackPopup(false);
      setShowThankYouPopup(true);
    } catch (error) {
      console.error('Error:', error);
      alert('제출 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmittingFeedback(false);
      isSubmitting.current = false;
    }
  };

  // 현재 페이지의 노트 내용
  const currentNote = noteData[currentPage] || '';

  // HTML을 PDF로 변환하는 함수
  const exportToPdf = async () => {
    try {
      const fileName = pdfFile ? pdfFile.name.replace('.pdf', '') : 'notes';
      
      // 임시 HTML 요소 생성
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '210mm'; // A4 너비
      tempDiv.style.padding = '20mm';
      tempDiv.style.fontFamily = 'Malgun Gothic, 맑은 고딕, Arial, sans-serif';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.fontSize = '14px';
      tempDiv.style.lineHeight = '1.6';
      
      // HTML 내용 생성
      let htmlContent = `
        <div style="text-align: center; font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 3px solid #3498db;">
          ${fileName} - GodNote
        </div>
      `;
      
      // 각 페이지의 노트 추가
      const pageKeys = Object.keys(noteData).sort((a, b) => parseInt(a) - parseInt(b));
      
      pageKeys.forEach((pageIndex) => {
        const pageNum = parseInt(pageIndex) + 1;
        const content = noteData[pageIndex];
        
        if (content && content.trim()) {
          htmlContent += `
            <div style="margin: 30px 0 20px 0; font-size: 18px; font-weight: bold; color: #2c3e50; padding: 10px 0; border-left: 5px solid #3498db; padding-left: 15px; background-color: #f8f9fa;">
              페이지 ${pageNum}
            </div>
            <div style="margin-bottom: 25px; padding: 15px; border: 1px solid #e9ecef; border-radius: 8px; background-color: #fafafa;">
              ${content}
            </div>
          `;
        }
      });
      
      // 생성 정보 추가
      htmlContent += `
        <div style="text-align: center; color: #7f8c8d; font-size: 12px; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e9ecef;">
          생성일: ${new Date().toLocaleString('ko-KR')}<br>
          생성 도구: GodNote 앱
        </div>
      `;
      
      tempDiv.innerHTML = htmlContent;
      document.body.appendChild(tempDiv);
      
      // HTML을 캔버스로 변환
      const canvas = await html2canvas(tempDiv, {
        scale: 2, // 고해상도
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      // 캔버스를 PDF로 변환
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 너비 (mm)
      const pageHeight = 297; // A4 높이 (mm)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      // 첫 페이지
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // 추가 페이지가 필요한 경우
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // 임시 요소 제거
      document.body.removeChild(tempDiv);
      
      // PDF 저장
      pdf.save(`${fileName}_GodNote.pdf`);
      
    } catch (error) {
      console.error('PDF 내보내기 오류:', error);
      alert('PDF 내보내기 중 오류가 발생했습니다.');
    }
  };

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
    
    const containerWidth = pdfContainerRef.current.offsetWidth - 40; // 패딩 제외
    const containerHeight = pdfContainerRef.current.offsetHeight - 120; // 네비게이션 영역 제외
    
    const aspectRatio = pageSize.height / pageSize.width;
    
    // 패딩을 고려한 실제 사용 가능한 공간 계산 (뷰어 컨테이너의 패딩 40px 추가 고려)
    const availableWidth = containerWidth - 40; // 뷰어 컨테이너 패딩 20px * 2
    const availableHeight = containerHeight - 40; // 뷰어 컨테이너 패딩 20px * 2
    
    // 사용 가능한 공간에 맞춰 조정
    let viewerWidth = availableWidth;
    let viewerHeight = viewerWidth * aspectRatio;
    
    // 높이가 사용 가능한 공간을 넘으면 높이 기준으로 조정
    if (viewerHeight > availableHeight) {
      viewerHeight = availableHeight;
      viewerWidth = viewerHeight / aspectRatio;
    }
    
    // 최소 크기는 실제 사용 가능한 공간을 넘지 않도록 제한
    const minWidth = Math.min(200, availableWidth);
    const minHeight = Math.min(150, availableHeight);
    
    return {
      width: Math.round(Math.max(viewerWidth, minWidth)),
      height: Math.round(Math.max(viewerHeight, minHeight))
    };
  };

  const viewerSize = calculateViewerSize();

  // PDF 로드 및 페이지 변경, 리사이징 시 레이아웃 재계산
  useLayoutEffect(() => {
    if (pdfPages.length > 0) {
      // 레이아웃이 완료된 후 크기 재계산
      setForceUpdate(prev => prev + 1);
    }
  }, [pdfPages.length, currentPage, leftWidth]); // leftWidth 변경 시에도 재계산

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
        // 불릿으로 변환 (띄어쓰기 1개)
        const newText = currentLineStart.replace(/[\*\-]/, '•'); // bullet + 기존 공백 1개 유지
        
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

  // 현재 커서가 어떤 요소 안에 있는지 확인하는 함수
  const getCurrentElement = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    let node = selection.getRangeAt(0).startContainer;
    
    // 텍스트 노드면 부모 요소 찾기
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement;
    }
    
    // 에디터 내의 블록 요소 찾기
    while (node && node !== editorRef.current) {
      const tagName = node.tagName?.toLowerCase();
      if (tagName && ['blockquote', 'h1', 'h2', 'h3', 'pre', 'p', 'div'].includes(tagName)) {
        return node;
      }
      node = node.parentElement;
    }
    
    return editorRef.current;
  };

  // 키 입력 핸들러 (HTML 구조 고려)
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
    
    // Enter 키 처리 (HTML 구조 고려)
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      try {
        const currentElement = getCurrentElement();
        const range = selection.getRangeAt(0);
        
        // 현재 요소가 서식 요소인지 확인
        const tagName = currentElement?.tagName?.toLowerCase();
        const isFormattedElement = ['blockquote', 'h1', 'h2', 'h3', 'pre'].includes(tagName);
        
        // 텍스트 내용으로 bullet 확인
        const textContent = currentElement?.textContent || '';
        const isBulletLine = /^\s*•\s/.test(textContent);
        
        if (isBulletLine) {
          // Bullet 처리
          const bulletMatch = textContent.match(/^(\s*•\s)/);
          const contentAfterBullet = textContent.substring(bulletMatch[0].length).trim();
          
          if (!contentAfterBullet) {
            // 빈 불릿이면 Enter를 막고 불릿 제거하되 줄은 유지
            e.preventDefault();
            
            // 일반 p 태그로 변경하되 빈 줄 유지를 위해 최소 내용 추가
            const newP = document.createElement('p');
            newP.style.margin = '0';
            newP.style.lineHeight = '1.6';
            
            // 빈 줄이 사라지지 않도록 보이지 않는 공백 추가
            newP.innerHTML = '<br>'; // 또는 '&nbsp;' 사용 가능
            
            // 현재 요소를 새 p 태그로 교체
            currentElement.replaceWith(newP);
            
            // 커서를 새 p 태그의 시작으로 이동
            const newRange = document.createRange();
            newRange.setStart(newP, 0);
            newRange.collapse(true);
            
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            console.log('빈 bullet 제거, 빈 줄 유지됨'); // 디버깅용
            handleEditorChange();
          } else {
            // 내용이 있는 불릿이면 Enter 후에 새 불릿 추가 (확실한 띄어쓰기 보장)
            const indent = bulletMatch[1].match(/^\s*/)[0]; // 들여쓰기만 추출
            const bulletText = `${indent}•&nbsp;`; // 들여쓰기 + bullet + non-breaking space
            
            setTimeout(() => {
              try {
                const newSelection = window.getSelection();
                if (!newSelection || newSelection.rangeCount === 0) return;
                
                const newElement = getCurrentElement();
                if (newElement) {
                  // HTML을 직접 조작하여 공백 확실히 보장
                  if (newElement.tagName?.toLowerCase() !== 'p') {
                    const newP = document.createElement('p');
                    newP.style.margin = '0';
                    newP.style.lineHeight = '1.6';
                    
                    // innerHTML을 사용해서 공백 확실히 보장
                    newP.innerHTML = `${indent}•&nbsp;`; // non-breaking space 사용
                    
                    newElement.replaceWith(newP);
                    
                    // 커서를 맨 끝으로 이동
                    const finalRange = document.createRange();
                    finalRange.selectNodeContents(newP);
                    finalRange.collapse(false);
                    
                    newSelection.removeAllRanges();
                    newSelection.addRange(finalRange);
                  } else {
                    // 기존 p 태그의 경우도 innerHTML 사용
                    newElement.innerHTML = `${indent}•&nbsp;`; // non-breaking space 사용
                    
                    // 커서를 맨 끝으로 이동
                    const finalRange = document.createRange();
                    finalRange.selectNodeContents(newElement);
                    finalRange.collapse(false);
                    
                    newSelection.removeAllRanges();
                    newSelection.addRange(finalRange);
                  }
                  
                  console.log(`새 bullet 생성: "${bulletText}" (HTML: ${newElement.innerHTML})`); // 디버깅용
                  handleEditorChange();
                }
              } catch (error) {
                console.log('새 불릿 생성 중 오류:', error);
              }
            }, 10);
          }
        } else if (isFormattedElement) {
          // 서식 요소에서 Enter 처리
          const isEmpty = !textContent.trim() || textContent.trim() === '제목을 입력하세요' || textContent.trim() === '인용문을 입력하세요' || textContent.trim() === '코드를 입력하세요';
          
          if (isEmpty) {
            // 빈 서식 요소면 일반 p 태그로 변경하되 줄 위치 유지
            e.preventDefault();
            
            const newP = document.createElement('p');
            newP.style.margin = '0';
            newP.style.lineHeight = '1.6';
            
            // 줄의 위치를 유지하기 위해 <br> 태그 추가
            newP.innerHTML = '<br>';
            
            currentElement.replaceWith(newP);
            
            // 커서를 새 p 태그의 시작으로 이동
            const newRange = document.createRange();
            newRange.setStart(newP, 0);
            newRange.collapse(true);
            
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            handleEditorChange();
          } else {
            // 내용이 있으면 다음 줄을 일반 p 태그로 생성
            setTimeout(() => {
              try {
                const newSelection = window.getSelection();
                if (!newSelection || newSelection.rangeCount === 0) return;
                
                const newElement = getCurrentElement();
                if (newElement && newElement.tagName?.toLowerCase() !== 'p') {
                  const newP = document.createElement('p');
                  newP.style.margin = '0';
                  newP.style.lineHeight = '1.6';
                  
                  newElement.replaceWith(newP);
                  
                  // 커서를 새 p 태그로 이동
                  const newRange = document.createRange();
                  newRange.setStart(newP, 0);
                  newRange.collapse(true);
                  
                  newSelection.removeAllRanges();
                  newSelection.addRange(newRange);
                  
                  handleEditorChange();
                }
              } catch (error) {
                console.log('서식 해제 중 오류:', error);
              }
            }, 10);
          }
        }
        // 일반 요소면 기본 Enter 동작 유지
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

  // 커서가 에디터 영역 내에 있는지 확인하는 함수
  const isSelectionInEditor = () => {
    if (!editorRef.current) return false;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // 선택 영역이 에디터 내부에 있는지 확인
    return editorRef.current.contains(container) || editorRef.current === container;
  };

  // 에디터로 포커스 이동하는 함수
  const focusEditor = () => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    
    // 커서를 에디터 끝으로 이동
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  // 서식 버튼 함수들
  const applyFormat = (command, value = null) => {
    try {
      // 에디터 영역에 커서가 없으면 포커스 이동
      if (!isSelectionInEditor()) {
        focusEditor();
      }
      
      document.execCommand(command, false, value);
      editorRef.current?.focus();
      handleEditorChange();
    } catch (error) {
      console.log('서식 적용 중 오류:', error);
    }
  };

  const insertHeading = (level) => {
    try {
      // 에디터 영역에 커서가 없으면 포커스 이동
      if (!isSelectionInEditor()) {
        focusEditor();
      }
      
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
      // 에디터 영역에 커서가 없으면 포커스 이동
      if (!isSelectionInEditor()) {
        focusEditor();
      }
      
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
      // 에디터 영역에 커서가 없으면 포커스 이동
      if (!isSelectionInEditor()) {
        focusEditor();
      }
      
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

  // 리사이저 드래그 핸들러
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e) => {
    if (!isResizing || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // 최소/최대 크기 제한 (20% ~ 80%)
    if (newLeftWidth >= 20 && newLeftWidth <= 80) {
      setLeftWidth(newLeftWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  // 마우스 이벤트 리스너 등록/해제
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      {/* 헤더 추가 - 높이를 45px로 축소 */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '45px',
        backgroundColor: '#4169E1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 1000,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          color: 'white', 
          margin: 0, 
          fontSize: '20px',
          fontWeight: 'bold'
        }}>
          GodNote
        </h1>
        
        <button
          onClick={() => setShowFeedbackPopup(true)}
          style={{
            backgroundColor: 'white',
            color: '#4169E1',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '5px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#f0f0f0';
            e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'white';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          사용자 경험을 공유해주세요!
        </button>
      </div>

      {/* 메인 컨텐츠 영역 - 헤더 높이에 맞춰 조정 */}
      <div style={{ marginTop: '45px', height: 'calc(100vh - 45px)' }}>
        {pdfPages.length === 0 ? (
          // 파일 업로드 화면
          <div style={{ 
            height: '100%', 
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
          <div ref={containerRef} style={{ display: 'flex', height: '100%' }}>
            {/* PDF 페이지 영역 */}
            <div 
              ref={pdfContainerRef}
              style={{ 
                width: `${leftWidth}%`,
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
                  position: 'relative',
                  padding: '20px'
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
                        width: 'calc(100% - 40px)',
                        height: 'calc(100% - 40px)',
                        border: 'none',
                        borderRadius: '4px',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.1)'
                      }}
                      title={`페이지 ${currentPage + 1}`}
                    />
                  )}
                  
                  {/* 페이지 정보 오버레이 */}
                  <div style={{
                    position: 'absolute',
                    top: '35px',
                    right: '35px',
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
            
            {/* 리사이저 */}
            <div
              onMouseDown={handleMouseDown}
              style={{
                width: '4px',
                backgroundColor: '#dee2e6',
                cursor: 'col-resize',
                position: 'relative',
                zIndex: 10,
                borderLeft: '1px solid #adb5bd',
                borderRight: '1px solid #adb5bd',
                transition: isResizing ? 'none' : 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isResizing) {
                  e.target.style.backgroundColor = '#6c757d';
                }
              }}
              onMouseLeave={(e) => {
                if (!isResizing) {
                  e.target.style.backgroundColor = '#dee2e6';
                }
              }}
            >
              {/* 리사이저 핸들 표시 */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '20px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(108, 117, 125, 0.8)',
                borderRadius: '10px',
                opacity: isResizing ? 1 : 0,
                transition: 'opacity 0.2s'
              }}>
                <div style={{
                  width: '2px',
                  height: '20px',
                  backgroundColor: 'white',
                  marginRight: '2px'
                }}></div>
                <div style={{
                  width: '2px',
                  height: '20px',
                  backgroundColor: 'white'
                }}></div>
              </div>
            </div>
            
            {/* 리치 텍스트 에디터 영역 */}
            <div style={{ 
              width: `${100 - leftWidth}%`,
              padding: '20px',
              backgroundColor: 'white',
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
                  노트 - 페이지 {currentPage + 1}
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
                  
                  {/* PDF 내보내기 버튼 */}
                  <button 
                    onClick={exportToPdf}
                    disabled={Object.keys(noteData).length === 0}
                    className="btn btn-outline-success btn-sm"
                    title="필기 내용을 PDF로 내보내기"
                  >
                    📄 PDF 저장
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
              
              <div style={{ 
                marginTop: '15px', 
                fontSize: '12px', 
                color: '#6c757d',
                textAlign: 'center',
                backgroundColor: '#f8f9fa',
                padding: '10px',
                borderRadius: '4px'
              }}>
                💡 <strong>자동 변환:</strong> 줄 시작에 * 또는 - (불릿), {'->'} (화살표), ... (점선) 등 | 
                <strong>단축키:</strong> Ctrl+B/I/U (서식), ← → (페이지 이동)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 피드백 팝업 */}
      {showFeedbackPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '12px',
            maxWidth: '580px',  // 500px에서 580px로 증가
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowFeedbackPopup(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6c757d',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#f8f9fa'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              ×
            </button>
            
            <h2 style={{ 
              marginBottom: '20px', 
              color: '#2c3e50',
              textAlign: 'center',
              fontSize: '24px'
            }}>
              사용자 경험 공유하기
            </h2>
            
            <p style={{ 
              marginBottom: '25px', 
              color: '#6c757d',
              textAlign: 'center',
              fontSize: '16px'
            }}>
              GodNote 사용 경험을 공유해주세요!<br/>
              더 나은 서비스를 만드는데 큰 도움이 됩니다.
            </p>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold',
                color: '#495057',
                fontSize: '16px'
              }}>
                이메일 주소
                <span style={{ color: '#dc3545', marginLeft: '4px' }}>*</span>
              </label>
              <input
                type="email"
                value={feedbackEmail}
                onChange={(e) => setFeedbackEmail(e.target.value)}
                placeholder="연락 가능한 이메일을 입력해주세요"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4169E1'}
                onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
              />
            </div>

            {/* 사용 의향 질문 추가 */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '15px', 
                fontWeight: 'bold',
                color: '#495057',
                fontSize: '16px'
              }}>
                해당 서비스를 정식 출시할 경우 사용하실 의향이 있으신가요? 
                <span style={{ color: '#dc3545', marginLeft: '4px' }}>*</span>
              </label>
              
              <div style={{ 
                display: 'flex', 
                flexDirection: 'row',
                justifyContent: 'center',
                gap: '30px',
                flexWrap: 'wrap'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#495057'
                }}>
                  <input
                    type="radio"
                    name="wantUse"
                    value="yes"
                    checked={wantUse === 'yes'}
                    onChange={(e) => setWantUse(e.target.value)}
                    style={{
                      marginRight: '8px',
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer'
                    }}
                  />
                  네, 사용하고 싶습니다
                </label>
                
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#495057'
                }}>
                  <input
                    type="radio"
                    name="wantUse"
                    value="no"
                    checked={wantUse === 'no'}
                    onChange={(e) => setWantUse(e.target.value)}
                    style={{
                      marginRight: '8px',
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer'
                    }}
                  />
                  아니요, 사용하지 않겠습니다
                </label>
              </div>
            </div>
            
            <div style={{ marginBottom: '30px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold',
                color: '#495057',
                fontSize: '16px'
              }}>
                사용 경험 및 의견
              </label>
              <textarea
                value={feedbackAdvice}
                onChange={(e) => setFeedbackAdvice(e.target.value)}
                placeholder="GodNote를 사용해보신 경험이나 개선사항, 의견 등을 자유롭게 작성해주세요"
                rows="6"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                  lineHeight: '1.5'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4169E1'}
                onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowFeedbackPopup(false)}
                style={{
                  padding: '12px 24px',
                  border: '2px solid #6c757d',
                  backgroundColor: 'transparent',
                  color: '#6c757d',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#6c757d';
                  e.target.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#6c757d';
                }}
              >
                취소
              </button>
              
              <button
                onClick={handleFeedbackSubmit}
                disabled={isSubmittingFeedback || !feedbackEmail.trim() || !wantUse}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  backgroundColor: isSubmittingFeedback || !feedbackEmail.trim() || !wantUse ? '#ccc' : '#4169E1',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: isSubmittingFeedback || !feedbackEmail.trim() || !wantUse ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isSubmittingFeedback ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #ffffff',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    제출 중...
                  </>
                ) : (
                  '의견 제출하기'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 감사 메시지 팝업 */}
      {showThankYouPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '20px'
            }}>
              🙏
            </div>
            
            <h2 style={{ 
              marginBottom: '15px', 
              color: '#2c3e50',
              fontSize: '24px'
            }}>
              감사합니다!
            </h2>
            
            <p style={{ 
              marginBottom: '30px', 
              color: '#6c757d',
              fontSize: '16px',
              lineHeight: '1.5'
            }}>
              소중한 의견을 주셔서 감사합니다.
            </p>
            
            <button
              onClick={() => setShowThankYouPopup(false)}
              style={{
                padding: '12px 30px',
                border: 'none',
                backgroundColor: '#4169E1',
                color: 'white',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#365abd'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#4169E1'}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 스피너 애니메이션 CSS */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
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
    </div>
  );
}

export default Demo;
