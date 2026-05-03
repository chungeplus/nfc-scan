window.createPlayerPage({
  themeKey: 'minimal'
});

document.addEventListener('DOMContentLoaded', function() {
  const videoPlayBtn = document.getElementById('videoPlayBtn');
  const videoTimeDisplay = document.getElementById('videoTimeDisplay');
  const videoProgressBar = document.getElementById('videoProgressBar');
  const videoFullscreenBtn = document.getElementById('videoFullscreenBtn');
  const videoStage = document.querySelector('.video-stage');
  const videoPlayer = document.getElementById('videoPlayer');
  let hideControlsTimer = null;

  function resetHideTimer() {
    if (hideControlsTimer) {
      clearTimeout(hideControlsTimer);
    }
    if (videoPlayer && !videoPlayer.paused) {
      videoStage.classList.add('show-controls');
      hideControlsTimer = setTimeout(function() {
        videoStage.classList.remove('show-controls');
      }, 3000);
    }
  }

  if (videoFullscreenBtn && videoPlayer) {
    videoFullscreenBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoStage.requestFullscreen().catch(function(err) {
          console.log('Fullscreen error:', err);
        });
      }
    });
  }

  if (videoStage && videoPlayer) {
    videoStage.addEventListener('click', function(e) {
      if (e.target === videoPlayer) {
        videoStage.classList.toggle('show-controls');
        if (!videoPlayer.paused) {
          resetHideTimer();
        }
      }
    });
  }

  if (videoPlayBtn && videoPlayer) {
    videoPlayBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (videoPlayer.paused) {
        videoPlayer.play();
      } else {
        videoPlayer.pause();
      }
    });

    videoPlayer.addEventListener('play', function() {
      if (videoStage) {
        videoStage.classList.add('is-playing');
      }
      resetHideTimer();
    });

    videoPlayer.addEventListener('pause', function() {
      if (videoStage) {
        videoStage.classList.remove('is-playing');
        videoStage.classList.add('show-controls');
      }
      if (hideControlsTimer) {
        clearTimeout(hideControlsTimer);
      }
    });

    videoPlayer.addEventListener('timeupdate', function() {
      const current = videoPlayer.currentTime;
      const duration = videoPlayer.duration || 0;
      
      if (videoTimeDisplay) {
        videoTimeDisplay.textContent = formatTime(current);
      }
      
      if (videoProgressBar && duration > 0) {
        const progress = (current / duration) * 100;
        videoProgressBar.style.width = `${progress}%`;
      }
    });

    videoPlayer.addEventListener('loadedmetadata', function() {
      if (videoTimeDisplay) {
        videoTimeDisplay.textContent = '00:00';
      }
    });
  }

  if (videoProgressBar && videoProgressBar.parentElement && videoPlayer) {
    const progressContainer = videoProgressBar.parentElement;
    progressContainer.style.cursor = 'pointer';
    progressContainer.addEventListener('click', function(e) {
      e.stopPropagation();
      const rect = progressContainer.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const seekTime = percentage * videoPlayer.duration;
      if (Number.isFinite(seekTime)) {
        videoPlayer.currentTime = seekTime;
      }
    });
  }

  function formatTime(seconds) {
    const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    const mins = Math.floor(safeSeconds / 60);
    const secs = Math.floor(safeSeconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
});
