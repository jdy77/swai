import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import $ from 'jquery';
import axios from 'axios';

function Home() {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    // jQuery 초기화나 기타 필요한 초기화 코드가 있다면 여기에
  }, []);

  const closePopup = () => {
    setShowPopup(false);
  };

  return (
    <div>
      <nav className="side-menu">
        <ul>
          <li className="hidden active">
            <a className="page-scroll" href="#page-top"></a>
          </li>
          <li>
            <a href="#home" className="page-scroll">
              <span className="menu-title">Home</span>
              <span className="dot"></span>
            </a>
          </li>
          <li>
            <a href="#whats-godnote" className="page-scroll">
              <span className="menu-title">What's GodNote?</span>
              <span className="dot"></span>
            </a>
          </li>
          <li>
            <a href="#faq" className="page-scroll">
              <span className="menu-title">FAQ</span>
              <span className="dot"></span>
            </a>
          </li>
          <li>
            <a href="#demo-section" className="page-scroll">
              <span className="menu-title">Demo</span>
              <span className="dot"></span>
            </a>
          </li>
        </ul>
      </nav>

      <div className="container-fluid" style={{backgroundColor: '#4169E1', minHeight: '100vh', display: 'flex', alignItems: 'center'}}>
        <div className="row hero-header" id="home" style={{width: '100%'}}>
          <div className="col-md-12 text-center">
            <img src="/img/godnote-logo.png" className="logo" alt="logo" style={{width: '30%', maxWidth: '300px', marginBottom: '20px'}} />
            <h3 style={{fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '50px'}}>A Better Way to Take Notes</h3>
            <Link 
              to="/demo" 
              style={{
                backgroundColor: '#FF6B6B',
                color: 'white',
                fontSize: '24px', 
                padding: '15px 40px', 
                fontWeight: 'bold', 
                borderRadius: '12px',
                textDecoration: 'none',
                display: 'inline-block',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                marginTop: '40px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#FF5252';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#FF6B6B';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Get Started <span style={{marginLeft: '8px'}}>→</span>
            </Link>
          </div>
        </div>
      </div>

      <section id="whats-godnote" className="section-padding">
        <div className="container">
          <div className="row">
            <div className="col-md-12 text-center">
              <h1 className="section-title">What's GodNote?</h1>
              <p className="section-subtitle">평소 노트북으로 필기하는 분이라면 주목!</p>
              <p className="section-subtitle" style={{marginTop: '-45px'}}>평소 불편함을 느끼진 않으셨나요?</p>
            </div>
          </div>
          <div className="row">
            <div className="col-md-12 text-center">
              <h3 className="section-title" style={{fontSize: '18px'}}>항상 슬라이드 파일 옆에 노트 띄워놓고...</h3>
              <h3 className="section-title" style={{marginBottom: '40px', fontSize: '18px'}}>페이지 번호도 적어가며 필기하고 있으신가요?</h3>
              <img src="/img/example1.png" className="logo" alt="noteexample" />
            </div>
          </div>
          <div className="row" style={{backgroundColor: 'white'}}>
            <div className="col-md-12 text-center">
              <h2 className="section-title" style={{marginBottom: '-20px', marginTop: '20px', fontSize: '21px', fontWeight: 'bold'}}>파일과 노트를 한 번에 볼 수 없을까?</h2>
              <img src="/img/example2.png" className="logo" alt="questionmark" />
            </div>
          </div>
          <div className="row">
            <div className="col-md-12 text-center">
              <h3 className="section-title" style={{marginBottom: '0px', fontSize: '18px'}}>GodNote는 이러한 생각에서 출발하여,</h3>
              <h3 className="section-title" style={{marginBottom: '40px', fontSize: '18px'}}>여러분에게 더 편리한 노트 환경을 제공합니다.</h3>
              <img src="/img/example3.png" className="logo" alt="godnotedemo" />
            </div>

            <div className="col-md-12 text-center">
              <h3 className="section-title" style={{marginTop: '40px', fontSize: '20px', fontWeight: 'bold'}}>필기의 신세계를 느껴보세요!</h3>
            </div>
            <div className="col-md-6">
              <div className="feature-box">
                <h3>한 눈에 보이는 슬라이드와 필기</h3>
                <p>여러 개의 창을 켤 필요 없이 한 눈에 슬라이드와 나의 필기를 볼 수 있습니다.</p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="feature-box">
                <h3>페이지별로 볼 수 있는 편리함</h3>
                <p>페이지별로 필기 기능을 제공하여 어느 부분에 대한 설명인지 바로 알 수 있습니다.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section id="faq" className="section-padding">
        <div className="container">
          <div className="row">
            <div className="col-md-12 text-center" style={{marginBottom: '20px'}}>
              <h2 className="section-title">FAQs</h2>
              {/* <p className="section-subtitle">GodNote에 대해 자주 들어오는 질문들입니다.</p> */}
            </div>
          </div>
          <div className="row">
            <div className="col-md-6">
              <div className="faq-item">
                <h3>GodNote가 무엇인가요?</h3>
                <p>GodNote는 노트북 사용자들을 위한 필기 서비스로, 기존 앱들의 불편함을 없애고 더 효과적으로 기록하고 정리할 수 있도록 도와드립니다.</p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="faq-item">
                <h3>GodNote는 언제 출시되나요?</h3>
                <p>현재 개발 중이며, 2025년 상반기 내에 출시될 예정입니다. 아래 폼에 이메일을 기입하시면 출시 소식을 가장 먼저 받아보실 수 있습니다.</p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="faq-item">
                <h3>첨부하는 파일의 용량 제한은 없나요?</h3>
                <p>초기 버전에서는 최대 80페이지 크기의 파일만 첨부할 수 있습니다.</p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="faq-item">
                <h3>필기하려는 문서의 형식 제한은 없나요?</h3>
                <p>초기에는 pdf 파일만 지원할 예정입니다.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="demo-section" className="section-padding">
        <div className="container">
          <div className="row">
            <div className="col-md-12 text-center">
              <h2 className="section-title" style={{marginTop: '30px'}}>Demo 사용해보기</h2>
              <p className="section-subtitle">GodNote의 기능을 미리 체험해보세요</p>
            </div>
          </div>
          <div className="row">
            <div className="col-md-12 text-center">
              <Link 
                to="/demo" 
                style={{
                  backgroundColor: '#FF6B6B',
                  color: 'white',
                  fontSize: '20px', 
                  padding: '12px 30px', 
                  fontWeight: 'bold',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  display: 'inline-block',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#FF5252';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#FF6B6B';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Demo 체험하기 <span style={{marginLeft: '8px'}}>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="row">
        <div className="col-md-12 text-center" style={{marginTop: '20px', marginBottom: '50px'}}>
          <p style={{color: '#666', fontSize: '14px'}}>추가 문의사항은 <a href="mailto:juda0707@yonsei.ac.kr" style={{color: '#e74c3c'}}>juda0707@yonsei.ac.kr</a>로 보내주세요</p>
        </div>
      </div>

      {showPopup && (
        <div id="popup">
          <h1>감사합니다.</h1>
          <p>좋은 서비스로 보답하겠습니다.</p>
          <button onClick={closePopup} className="close-popup">×</button>
        </div>
      )}
    </div>
  );
}

export default Home; 
