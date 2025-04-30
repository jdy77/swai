import React, { useEffect, useRef, useState } from 'react';
import $ from 'jquery';
import axios from 'axios';

function Home() {
  const isSubmitting = useRef(false);
  const [showPopup, setShowPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 쿠키에서 값을 가져오는 함수
    function getCookieValue(name) {
      const value = "; " + document.cookie;
      const parts = value.split("; " + name + "=");
      if (parts.length === 2) {
        return parts.pop().split(";").shift();
      }
    }

    // 쿠키에 값을 저장하는 함수
    function setCookieValue(name, value, days) {
      let expires = "";
      if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
      }
      document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }

    function getUVfromCookie() {
      const hash = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existingHash = getCookieValue("user");
      if (!existingHash) {
        setCookieValue("user", hash, 180);
        return hash;
      } else {
        return existingHash;
      }
    }

    function padValue(value) {
      return (value < 10) ? "0" + value : value;
    }

    function getTimeStamp() {
      const date = new Date();
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const seconds = date.getSeconds();
      return `${padValue(year)}-${padValue(month)}-${padValue(day)} ${padValue(hours)}:${padValue(minutes)}:${padValue(seconds)}`;
    }

    // 방문자 데이터 전송
    const data = JSON.stringify({
      id: getUVfromCookie(),
      landingUrl: window.location.href,
      ip: window.ip || 'unknown',
      referer: document.referrer,
      time_stamp: getTimeStamp(),
      utm: new URLSearchParams(window.location.search).get("utm"),
      device: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
    });

    const addrScript = 'https://script.google.com/macros/s/AKfycbwGfbAmUgQ9aka1OMPPGoITHAP34bGuYfQkiBWVi1-EpZdl_5or03LF9K99IfB9SWeI/exec';

    axios.get(addrScript + '?action=insert&table=visitors&data=' + data)
      .then(response => {
        console.log(JSON.stringify(response));
      })
      .catch(error => {
        console.error('Error:', error);
      });

    // 이메일 제출 이벤트 핸들러
    const handleSubmit = function() {
      if (isSubmitting.current) return;
      isSubmitting.current = true;
      setIsLoading(true);

      const email = $('#submit-email').val();
      const advice = $('#submit-advice').val();
      
      function validateEmail(email) {
        const re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
        return re.test(email);
      }
      
      if (email === '' || !validateEmail(email)) {
        alert("이메일이 유효하지 않아 알림을 드릴 수가 없습니다.");
        isSubmitting.current = false;
        setIsLoading(false);
        return;
      }
      
      const finalData = JSON.stringify({
        id: getUVfromCookie(),
        email: email,
        advice: advice
      });
      
      axios.get('https://script.google.com/macros/s/AKfycbwGfbAmUgQ9aka1OMPPGoITHAP34bGuYfQkiBWVi1-EpZdl_5or03LF9K99IfB9SWeI/exec?action=insert&table=tab_final&data=' + finalData)
        .then(response => {
          console.log(response.data.data);
          $('#submit-email').val('');
          $('#submit-advice').val('');
          setIsLoading(false);
          setShowPopup(true);
          isSubmitting.current = false;
        })
        .catch(error => {
          console.error('Error:', error);
          setIsLoading(false);
          isSubmitting.current = false;
        });
    };

    $('#submit').on('click', handleSubmit);

    // Cleanup function
    return () => {
      $('#submit').off('click', handleSubmit);
    };
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
            <a href="#registration" className="page-scroll">
              <span className="menu-title">Registration</span>
              <span className="dot"></span>
            </a>
          </li>
        </ul>
      </nav>

      <div className="container-fluid">
        <div className="row hero-header" id="home">
          <div className="col-md-12 text-center">
            <img src="/img/godnote-logo.png" className="logo" alt="logo" />
            <h3 style={{fontSize: '20px', fontWeight: 'bold'}}>A Better Way to Take Notes</h3>
            <a href="#registration" className="btn btn-lg btn-red">Get Started <span className="ti-arrow-right"></span></a>
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

      <section id="registration" className="section-padding">
        <div className="container">
          <div className="row">
            <div className="col-md-12 text-center">
              <h2 className="section-title" style={{marginTop: '30px'}}>Get Early Access</h2>
              {/* <p className="section-subtitle">Be among the first to experience GodNote</p> */}
            </div>
          </div>
          <div className="row">
            <div className="col-sm-10 col-sm-offset-1 col-md-8 col-md-offset-2">
              <center>
                <p>이메일을 남겨주시면 서비스가 런칭되었을 때 알림을 드리겠습니다.</p>
                <input id="submit-email" type="email" placeholder="알림을 받으실 이메일" /> <br /><br />
                <textarea id="submit-advice" name="Text1" cols="40" rows="5" placeholder="서비스에 대한 조언을 남겨주세요"></textarea><br />
                <button id="submit" disabled={isLoading}>
                  {isLoading ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    '런칭 알림 받기'
                  )}
                </button>
              </center>
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
