(function() {
  const THEME_LABELS = {
    pixel: 'Pixel',
    minimal: 'Minimal',
    poster: 'Poster',
  };

  function createPlayerPage(options) {
    const settings = Object.assign({
      themeKey: 'pixel',
    }, options || {});

    const app = document.getElementById('app');
    const loadingState = document.getElementById('loadingState');
    const missingState = document.getElementById('missingState');
    const errorState = document.getElementById('errorState');
    const readyState = document.getElementById('readyState');
    const errorMessage = document.getElementById('errorMessage');
    const reloadButton = document.getElementById('reloadButton');
    const primaryButton = document.getElementById('primaryButton');
    const secondaryButton = document.getElementById('secondaryButton');
    const themeBadge = document.getElementById('themeBadge');
    const mediaBadge = document.getElementById('mediaBadge');
    const statusBadge = document.getElementById('statusBadge');
    const currentTimeNode = document.getElementById('currentTime');
    const durationTimeNode = document.getElementById('durationTime');
    const seekBar = document.getElementById('seekBar');
    const audioVisual = document.getElementById('audioVisual');
    const audioPlayer = document.getElementById('audioPlayer');
    const videoPlayer = document.getElementById('videoPlayer');

    if (!app || !loadingState || !missingState || !errorState || !readyState || !audioPlayer || !videoPlayer) {
      return;
    }

    let currentShare = null;
    let isSeeking = false;
    const managedMedia = [audioPlayer, videoPlayer];

    if (reloadButton) {
      reloadButton.addEventListener('click', loadShare);
    }

    if (primaryButton) {
      primaryButton.addEventListener('click', handlePrimary);
    }

    if (secondaryButton) {
      secondaryButton.addEventListener('click', handleSecondary);
    }

    if (seekBar) {
      seekBar.addEventListener('input', handleSeekPreview);
      seekBar.addEventListener('change', handleSeekCommit);
    }

    managedMedia.forEach((media) => {
      media.addEventListener('loadedmetadata', handleLoadedMetadata);
      media.addEventListener('timeupdate', handleTimeUpdate);
      media.addEventListener('play', handlePlay);
      media.addEventListener('pause', handlePause);
      media.addEventListener('ended', handleEnded);
      media.addEventListener('waiting', handleWaiting);
      media.addEventListener('playing', handlePlaying);
    });

    loadShare();

    function isDemoMode() {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.has('demo');
    }

    function getDemoMediaType() {
      const urlParams = new URLSearchParams(window.location.search);
      const demoType = urlParams.get('demo');
      if (demoType === 'video' || demoType === 'v') {
        return 'video';
      }
      return 'audio';
    }

    function getShareId() {
      const segments = window.location.pathname.split('/').filter(Boolean);
      if (segments.length < 3 || segments[0] !== 'play') {
        return '';
      }

      return decodeURIComponent(String(segments[2] || '').trim());
    }

    function getCurrentMediaType() {
      return String(currentShare && currentShare.mediaType || '').toLowerCase() === 'video' ? 'video' : 'audio';
    }

    function getActiveMedia() {
      return getCurrentMediaType() === 'video' ? videoPlayer : audioPlayer;
    }

    function isActiveMedia(target) {
      return target === getActiveMedia();
    }

    function setPageState(state) {
      loadingState.classList.toggle('is-visible', state === 'loading');
      missingState.classList.toggle('is-visible', state === 'missing');
      errorState.classList.toggle('is-visible', state === 'error');
      readyState.classList.toggle('is-visible', state === 'ready');
    }

    function applyTheme() {
      app.className = `player-shell theme-${settings.themeKey} media-${getCurrentMediaType()}`;

      if (themeBadge) {
        themeBadge.textContent = THEME_LABELS[settings.themeKey] || 'Play';
      }

      if (mediaBadge) {
        mediaBadge.textContent = getCurrentMediaType() === 'video' ? '视频播放页' : '音频播放页';
      }
    }

    function setStatus(text) {
      if (statusBadge) {
        statusBadge.textContent = text;
      }
    }

    function setTime(currentTime, duration) {
      if (currentTimeNode) {
        currentTimeNode.textContent = formatTime(currentTime);
      }

      if (durationTimeNode) {
        durationTimeNode.textContent = formatTime(duration);
      }
    }

    function setProgress(currentTime, duration) {
      if (!seekBar) {
        return;
      }

      const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
      const safeCurrentTime = Number.isFinite(currentTime) && currentTime > 0 ? currentTime : 0;
      const ratio = safeDuration > 0 ? Math.min(Math.max(safeCurrentTime / safeDuration, 0), 1) : 0;
      seekBar.value = String(Math.round(ratio * 1000));
      seekBar.style.setProperty('--progress-ratio', `${ratio * 100}%`);
    }

    function resetTimeline() {
      setTime(0, 0);
      setProgress(0, 0);
    }

    function resetControls() {
      if (primaryButton) {
        primaryButton.textContent = '播放';
      }

      if (secondaryButton) {
        secondaryButton.textContent = getCurrentMediaType() === 'video' ? '全屏' : '从头播放';
      }

      setStatus('准备播放');
      resetTimeline();
      syncVisualizer(false);
    }

    function syncVisualizer(isPlaying) {
      if (audioVisual) {
        audioVisual.classList.toggle('is-playing', Boolean(isPlaying));
      }
    }

    async function loadShare() {
      stopAllMedia();

      const shareId = getShareId();

      if (isDemoMode() || !shareId) {
        const demoMediaType = getDemoMediaType();
        currentShare = {
          mediaType: demoMediaType,
          title: demoMediaType === 'video' ? '演示视频 - 点击播放体验效果' : '演示音乐 - 点击播放体验效果'
        };

        applyTheme();

        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
          pageTitle.textContent = currentShare.title;
        }

        resetControls();
        setPageState('ready');
        return;
      }

      currentShare = null;
      applyTheme();
      resetControls();
      setStatus('正在加载');
      setPageState('loading');

      try {
        const response = await fetch(`/api/share/detail?shareId=${encodeURIComponent(shareId)}`, {
          method: 'GET',
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload || !payload.success) {
          if (response.status === 404 || payload.code === 'SHARE_NOT_FOUND' || payload.code === 'FILE_NOT_FOUND') {
            setPageState('missing');
            return;
          }

          throw new Error(String(payload.message || '分享详情请求失败，请稍后重试。'));
        }

        currentShare = payload.share || {};
        if (!currentShare.mediaUrl) {
          throw new Error('媒体地址不可用，请稍后重试。');
        }

        applyTheme();
        configureMediaSource(currentShare.mediaUrl);
        resetControls();
        setPageState('ready');
      } catch (error) {
        console.error('[play-page] load failed:', error);
        if (errorMessage) {
          errorMessage.textContent = error && error.message ? error.message : '分享详情请求失败，请稍后重试。';
        }

        setPageState('error');
      }
    }

    function configureMediaSource(mediaUrl) {
      if (getCurrentMediaType() === 'video') {
        videoPlayer.src = mediaUrl;
        videoPlayer.load();
        audioPlayer.removeAttribute('src');
        audioPlayer.load();
        return;
      }

      audioPlayer.src = mediaUrl;
      audioPlayer.load();
      videoPlayer.removeAttribute('src');
      videoPlayer.load();
    }

    async function handlePrimary() {
      const media = getActiveMedia();
      if (!media || !media.src) {
        return;
      }

      try {
        if (media.paused || media.ended) {
          if (media.ended) {
            media.currentTime = 0;
          }

          await media.play();
          return;
        }

        media.pause();
      } catch (error) {
        console.error('[play-page] playback failed:', error);
        setStatus('无法播放');
      }
    }

    async function handleSecondary() {
      const media = getActiveMedia();
      if (!media || !media.src) {
        return;
      }

      if (getCurrentMediaType() === 'video') {
        if (media.ended) {
          media.currentTime = 0;
          try {
            await media.play();
          } catch (error) {
            console.error('[play-page] replay failed:', error);
          }
          return;
        }

        if (videoPlayer.requestFullscreen) {
          videoPlayer.requestFullscreen().catch(() => {});
          return;
        }

        if (videoPlayer.webkitEnterFullscreen) {
          videoPlayer.webkitEnterFullscreen();
        }
        return;
      }

      media.currentTime = 0;
      if (media.paused) {
        setStatus('准备播放');
        setTime(0, media.duration);
        setProgress(0, media.duration);
      }
    }

    function handleSeekPreview() {
      const media = getActiveMedia();
      if (!media || !seekBar || !Number.isFinite(media.duration) || media.duration <= 0) {
        return;
      }

      isSeeking = true;
      const previewTime = (Number(seekBar.value) / 1000) * media.duration;
      setTime(previewTime, media.duration);
      setProgress(previewTime, media.duration);
    }

    function handleSeekCommit() {
      const media = getActiveMedia();
      if (!media || !seekBar || !Number.isFinite(media.duration) || media.duration <= 0) {
        isSeeking = false;
        return;
      }

      media.currentTime = (Number(seekBar.value) / 1000) * media.duration;
      isSeeking = false;
    }

    function handleLoadedMetadata(event) {
      if (!isActiveMedia(event.currentTarget)) {
        return;
      }

      const media = event.currentTarget;
      setTime(media.currentTime, media.duration);
      setProgress(media.currentTime, media.duration);
    }

    function handleTimeUpdate(event) {
      if (!isActiveMedia(event.currentTarget) || isSeeking) {
        return;
      }

      const media = event.currentTarget;
      setTime(media.currentTime, media.duration);
      setProgress(media.currentTime, media.duration);
    }

    function handlePlay(event) {
      if (!isActiveMedia(event.currentTarget)) {
        return;
      }

      if (primaryButton) {
        primaryButton.textContent = '暂停';
      }

      if (secondaryButton) {
        secondaryButton.textContent = getCurrentMediaType() === 'video' ? '全屏' : '从头播放';
      }

      setStatus('正在播放');
      syncVisualizer(true);
    }

    function handlePause(event) {
      if (!isActiveMedia(event.currentTarget)) {
        return;
      }

      const media = event.currentTarget;
      if (media.ended) {
        return;
      }

      if (primaryButton) {
        primaryButton.textContent = '播放';
      }

      setStatus('已暂停');
      syncVisualizer(false);
    }

    function handleEnded(event) {
      if (!isActiveMedia(event.currentTarget)) {
        return;
      }

      if (primaryButton) {
        primaryButton.textContent = '播放';
      }

      if (secondaryButton) {
        secondaryButton.textContent = getCurrentMediaType() === 'video' ? '重新播放' : '从头播放';
      }

      setStatus('播放结束');
      syncVisualizer(false);
      setProgress(event.currentTarget.duration, event.currentTarget.duration);
      setTime(event.currentTarget.duration, event.currentTarget.duration);
    }

    function handleWaiting(event) {
      if (!isActiveMedia(event.currentTarget)) {
        return;
      }

      setStatus('缓冲中');
    }

    function handlePlaying(event) {
      if (!isActiveMedia(event.currentTarget)) {
        return;
      }

      setStatus('正在播放');
    }

    function stopAllMedia() {
      managedMedia.forEach((media) => {
        media.pause();
        try {
          media.currentTime = 0;
        } catch (error) {
          // Ignore non-seekable state resets.
        }
      });
      syncVisualizer(false);
    }
  }

  function formatTime(value) {
    const totalSeconds = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  window.createPlayerPage = createPlayerPage;
})();
