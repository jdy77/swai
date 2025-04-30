import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import Home from './components/Home';
import axios from 'axios';

function App() {
  const referrer = useRef(document.referrer);  // 컴포넌트 마운트 전에 referrer 저장

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

    // IP 주소를 가져오는 Promise 함수
    const getIPAddress = () => {
      return new Promise((resolve) => {
        window.getIP = function(json) {
          try {
            resolve(json.ip);
          } catch (e) {
            resolve('unknown');
          }
        };
        
        const script = document.createElement('script');
        script.src = 'https://jsonip.com?format=jsonp&callback=getIP';
        document.body.appendChild(script);
      });
    };

    // 방문자 데이터 전송 함수
    const sendVisitorData = async () => {
      const ip = await getIPAddress();
      
      const dataObj = {
        id: getUVfromCookie(),
        landingUrl: window.location.href,
        ip: ip,
        referer: referrer.current,  // 저장된 referrer 사용
        time_stamp: getTimeStamp(),
        utm: new URLSearchParams(window.location.search).get("utm"),
        device: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
      };
      console.log('방문자 데이터:', dataObj);

      const addrScript = 'https://script.google.com/macros/s/AKfycbwGfbAmUgQ9aka1OMPPGoITHAP34bGuYfQkiBWVi1-EpZdl_5or03LF9K99IfB9SWeI/exec';

      try {
        const response = await axios.get(addrScript, {
          params: {
            action: 'insert',
            table: 'visitors',
            data: JSON.stringify(dataObj)
          }
        });
        console.log('서버 응답:', response);
      } catch (err) {
        console.error('에러:', err);
      }
    };

    // 방문자 데이터 전송 실행
    sendVisitorData();
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          {/* 여기에 새로운 라우트를 추가할 수 있습니다 */}
          {/* 예: <Route path="/about" element={<About />} /> */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
