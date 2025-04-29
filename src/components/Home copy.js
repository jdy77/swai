import React, { useEffect, useRef } from 'react';
import $ from 'jquery';
import axios from 'axios';

function Home() {
  const isSubmitting = useRef(false);

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

      const email = $('#submit-email').val();
      const advice = $('#submit-advice').val();
      
      function validateEmail(email) {
        const re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
        return re.test(email);
      }
      
      if (email === '' || !validateEmail(email)) {
        alert("이메일이 유효하지 않아 알림을 드릴 수가 없습니다.");
        isSubmitting.current = false;
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
          $('#popup').show();
          isSubmitting.current = false;
        })
        .catch(error => {
          console.error('Error:', error);
          isSubmitting.current = false;
        });
    };

    $('#submit').on('click', handleSubmit);

    // Cleanup function
    return () => {
      $('#submit').off('click', handleSubmit);
    };
  }, []);

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
            <a href="#mvt" className="page-scroll">
              <span className="menu-title">MVT</span>
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
          <div className="col-md-7">
            <img src="/img/meetup-logo.png" className="logo" alt="logo" />
            <h1>GodNote</h1>
            <h3>Your Personal Note Taking Assistant</h3>
            <h4>Coming Soon</h4>
            <a href="#registration" className="btn btn-lg btn-red">Get Started <span className="ti-arrow-right"></span></a>
          </div>
          <div className="col-md-5 hidden-xs">
            <img src="/img/rocket.png" className="rocket animated bounce" alt="rocket" />
          </div>
        </div>
      </div>

      <section id="mvt" className="section-padding">
        <div className="container">
          <div className="row">
            <div className="col-md-12 text-center">
              <h2 className="section-title">Mission, Vision, and Technology</h2>
              <p className="section-subtitle">Our commitment to revolutionizing note-taking</p>
            </div>
          </div>
          <div className="row">
            <div className="col-md-4">
              <div className="mvt-box">
                <h3>Mission</h3>
                <p>To make note-taking more efficient and enjoyable for everyone, helping users capture and organize their thoughts seamlessly.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="mvt-box">
                <h3>Vision</h3>
                <p>To become the most intuitive and powerful note-taking platform that adapts to each user's unique needs and preferences.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="mvt-box">
                <h3>Technology</h3>
                <p>Leveraging cutting-edge AI and machine learning to provide smart suggestions, automatic organization, and seamless integration.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="section-padding">
        <div className="container">
          <div className="row">
            <div className="col-md-12 text-center">
              <h2 className="section-title">Frequently Asked Questions</h2>
              <p className="section-subtitle">Find answers to common questions about GodNote</p>
            </div>
          </div>
          <div className="row">
            <div className="col-md-6">
              <div className="faq-item">
                <h3>What is GodNote?</h3>
                <p>GodNote is an AI-powered note-taking assistant that helps you capture, organize, and retrieve your notes more effectively.</p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="faq-item">
                <h3>When will GodNote be available?</h3>
                <p>We're currently in development and plan to launch soon. Sign up for our newsletter to be notified when we go live.</p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="faq-item">
                <h3>How much will it cost?</h3>
                <p>We're finalizing our pricing structure. Stay tuned for updates on our pricing plans.</p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="faq-item">
                <h3>What platforms will be supported?</h3>
                <p>Initially, we'll launch with web and mobile support, with desktop applications coming soon after.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="registration" className="section-padding">
        <div className="container">
          <div className="row">
            <div className="col-md-12 text-center">
              <h2 className="section-title">Get Early Access</h2>
              <p className="section-subtitle">Be among the first to experience GodNote</p>
            </div>
          </div>
          <div className="row">
            <div className="col-md-8 col-md-offset-2">
              <center>
                <p>이메일을 남겨주시면 서비스가 런칭되었을 때 알림을 드리겠습니다.</p>
                <input id="submit-email" type="email" placeholder="알림을 받으실 이메일" /> <br /><br />
                <p>서비스가 이렇게 되었으면 좋겠다는 조언을 해 주세요</p>
                <textarea id="submit-advice" name="Text1" cols="40" rows="5" placeholder="서비스에 대한 조언을 남겨주세요"></textarea><br />
                <button style={{ width: '350px' }} id="submit">지금 제출!</button>
              </center>
            </div>
          </div>
        </div>
      </section>

      <div id="popup" style={{ display: 'none' }}>
        <h1>감사합니다.</h1>
        <p>이제는 우리는 같은 배를 탔습니다.</p>
      </div>
    </div>
  );
}

export default Home; 