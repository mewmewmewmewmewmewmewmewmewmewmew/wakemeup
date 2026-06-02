(() => {
  const DEFAULT_VIDEO_URL = 'https://www.youtube.com/watch?v=KkaNJPRoJhQ';
  const DEFAULT_VIDEO_ID = 'KkaNJPRoJhQ';
  const STORAGE_KEY = 'ytLinkWMU';
  const CLOCK_INTERVAL_MS = 1000;
  const SNOOZE_MINUTES = 5;

  let alarmTime = null;
  let player = null;
  let isRinging = false;
  let clockTimerId = null;

  const elements = {};

  function padTime(value) {
    return String(value).padStart(2, '0');
  }

  function formatCountdown(milliseconds) {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

    return `${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)}`;
  }

  function showAlarmControls(show) {
    elements.alarmControls.hidden = !show;
    elements.countdown.hidden = show;
  }

  function setRingingState(ringing) {
    isRinging = ringing;
    document.body.classList.toggle('alarm-ringing', ringing);
    document.body.style.backgroundColor = ringing ? '#121212' : '';
  }

  function showOverlay(show) {
    elements.overlay.classList.toggle('is-visible', show);
    elements.overlay.setAttribute('aria-hidden', String(!show));
  }

  function saveYouTubeLink(ytLink) {
    localStorage.setItem(STORAGE_KEY, ytLink);
  }

  function loadYouTubeLink() {
    return localStorage.getItem(STORAGE_KEY);
  }

  function extractYouTubeVideoId(input) {
    if (!input) {
      return DEFAULT_VIDEO_ID;
    }

    const trimmedInput = input.trim();

    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmedInput)) {
      return trimmedInput;
    }

    try {
      const url = new URL(trimmedInput);

      if (url.hostname.includes('youtu.be')) {
        return url.pathname.split('/').filter(Boolean)[0] || DEFAULT_VIDEO_ID;
      }

      if (url.searchParams.has('v')) {
        return url.searchParams.get('v') || DEFAULT_VIDEO_ID;
      }

      const pathParts = url.pathname.split('/').filter(Boolean);
      const embedIndex = pathParts.findIndex((part) => ['embed', 'shorts', 'live'].includes(part));

      if (embedIndex >= 0 && pathParts[embedIndex + 1]) {
        return pathParts[embedIndex + 1];
      }
    } catch (error) {
      return DEFAULT_VIDEO_ID;
    }

    return DEFAULT_VIDEO_ID;
  }

  function getConfiguredVideoId() {
    return extractYouTubeVideoId(elements.ytLink.value);
  }

  function updatePlayerVideo() {
    const videoId = getConfiguredVideoId();
    saveYouTubeLink(elements.ytLink.value);

    if (!player || typeof player.loadVideoById !== 'function') {
      return;
    }

    player.loadVideoById({ videoId, suggestedQuality: 'small' });
    player.pauseVideo();
  }

  function setDefaultAlarmTime() {
    const now = new Date();
    elements.alarmInput.value = `${padTime(now.getHours())}:${padTime(now.getMinutes())}`;
  }

  function updateCountdown() {
    if (!alarmTime) {
      elements.countdown.textContent = '';
      document.title = 'WakeMeUp.at - Online Alarm Clock';
      return;
    }

    const timeRemaining = alarmTime.getTime() - Date.now();

    if (timeRemaining <= 0) {
      elements.countdown.textContent = '';
      document.title = 'WakeMeUp.at - Alarm Ringing';
      return;
    }

    const countdown = formatCountdown(timeRemaining);
    elements.countdown.textContent = countdown;
    document.title = countdown;
  }

  function updateClock() {
    const now = new Date();
    const hours = padTime(now.getHours());
    const minutes = padTime(now.getMinutes());
    const seconds = padTime(now.getSeconds());

    elements.timer.textContent = now.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    elements.timerMilitary.textContent = `${hours}:${minutes}:${seconds}`;

    if (alarmTime && now >= alarmTime) {
      ringAlarm();
    } else if (!alarmTime) {
      showAlarmControls(false);
    }

    updateCountdown();
  }

  function startClock() {
    if (clockTimerId) {
      clearInterval(clockTimerId);
    }

    updateClock();
    clockTimerId = setInterval(updateClock, CLOCK_INTERVAL_MS);
  }

  function ringAlarm() {
    if (player && typeof player.playVideo === 'function') {
      player.setVolume(100);
      player.playVideo();
    }

    showAlarmControls(true);

    if (!isRinging) {
      setRingingState(true);
    }
  }

  function stopAlarm() {
    if (player && typeof player.pauseVideo === 'function') {
      player.pauseVideo();
    }

    alarmTime = null;
    elements.alarmTime.textContent = '';
    elements.setTime.textContent = '';
    showAlarmControls(false);
    setRingingState(false);
    updateCountdown();
    history.pushState({}, '', window.location.origin + getBasePathname());
  }

  function snoozeAlarm() {
    if (player && typeof player.pauseVideo === 'function') {
      player.pauseVideo();
    }

    const snoozeTime = new Date();
    snoozeTime.setMinutes(snoozeTime.getMinutes() + SNOOZE_MINUTES);
    setAlarmFromDate(snoozeTime);
  }

  function getBasePathname() {
    const basePathname = window.location.pathname.replace(/\/?\d{1,4}\/?$/, '/');
    return basePathname.endsWith('/') ? basePathname : `${basePathname}/`;
  }

  function parsePathTime() {
    const timeMatch = window.location.pathname.match(/\/(\d{1,4})\/?$/);

    if (!timeMatch) {
      return null;
    }

    const timeDigits = timeMatch[1];
    let hours;
    let minutes;

    if (timeDigits.length <= 2) {
      hours = Number(timeDigits);
      minutes = 0;
    } else {
      hours = Number(timeDigits.slice(0, -2));
      minutes = Number(timeDigits.slice(-2));
    }

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }

    return `${padTime(hours)}:${padTime(minutes)}`;
  }

  function setAlarmFromDate(date) {
    const time = `${padTime(date.getHours())}:${padTime(date.getMinutes())}`;
    setAlarm(time);
  }

  function setAlarm(time, isFromURL = false) {
    if (!time) {
      return;
    }

    const [hours, minutes] = time.split(':').map(Number);

    if (Number.isNaN(hours) || Number.isNaN(minutes) || hours > 23 || minutes > 59) {
      return;
    }

    setRingingState(false);
    showAlarmControls(false);

    alarmTime = new Date();
    alarmTime.setHours(hours, minutes, 0, 0);

    if (alarmTime <= new Date()) {
      alarmTime.setDate(alarmTime.getDate() + 1);
    }

    const formattedPathTime = `${padTime(hours)}${padTime(minutes)}`;
    const alarmTimeString = alarmTime.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    elements.alarmInput.value = `${padTime(hours)}:${padTime(minutes)}`;
    elements.setTime.textContent = 'T-MINUS';
    elements.headerTime.textContent = formattedPathTime;
    elements.alarmTime.textContent = alarmTimeString;

    if (isFromURL) {
      elements.confirmationText.textContent = `Alarm set for: ${alarmTimeString}`;
      showOverlay(true);
    } else {
      history.pushState({}, '', `${window.location.origin}${getBasePathname()}${formattedPathTime}`);
    }

    updatePlayerVideo();
    updateCountdown();
  }

  function cacheElements() {
    elements.alarmControls = document.getElementById('alarm-controls');
    elements.alarmInput = document.getElementById('alarmTime');
    elements.alarmTime = document.getElementById('alarm-time');
    elements.confirmAlarm = document.getElementById('confirm-alarm');
    elements.confirmationText = document.getElementById('confirmation-text');
    elements.controls = document.getElementById('controls');
    elements.countdown = document.getElementById('countdown');
    elements.headerTime = document.getElementById('header-time');
    elements.overlay = document.getElementById('overlay');
    elements.setTime = document.getElementById('set-time');
    elements.snooze = document.getElementById('snooze');
    elements.stop = document.getElementById('stop');
    elements.timer = document.getElementById('timer');
    elements.timerMilitary = document.getElementById('timer-military');
    elements.ytLink = document.getElementById('ytLink');
  }

  function bindEvents() {
    elements.controls.addEventListener('submit', (event) => {
      event.preventDefault();
      setAlarm(elements.alarmInput.value);
    });

    elements.snooze.addEventListener('click', snoozeAlarm);
    elements.stop.addEventListener('click', stopAlarm);
    elements.confirmAlarm.addEventListener('click', () => showOverlay(false));
    elements.ytLink.addEventListener('change', updatePlayerVideo);
  }

  function initialize() {
    cacheElements();

    const savedYouTubeLink = loadYouTubeLink();
    if (savedYouTubeLink) {
      elements.ytLink.value = savedYouTubeLink;
    } else {
      elements.ytLink.value = DEFAULT_VIDEO_URL;
    }

    bindEvents();
    setDefaultAlarmTime();
    startClock();

    const pathTime = parsePathTime();
    if (pathTime) {
      setAlarm(pathTime, true);
    }
  }

  window.onYouTubeIframeAPIReady = function onYouTubeIframeAPIReady() {
    const videoId = getConfiguredVideoId();

    player = new YT.Player('player', {
      height: '360',
      width: '640',
      videoId,
      playerVars: {
        loop: 1,
        playlist: videoId,
      },
      events: {
        onReady(event) {
          event.target.pauseVideo();
          event.target.setVolume(100);
        },
        onStateChange(event) {
          if (event.data === YT.PlayerState.ENDED && isRinging) {
            event.target.playVideo();
          }
        },
      },
    });
  };

  document.addEventListener('DOMContentLoaded', initialize);
})();
