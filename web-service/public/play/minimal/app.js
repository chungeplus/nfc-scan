﻿window.createPlayerPage({
  themeKey: 'minimal'
});

document.addEventListener('DOMContentLoaded', function() {
  const videoStage = document.querySelector('.video-stage');
  const videoPlayer = document.getElementById('videoPlayer');

  if (!videoStage || !videoPlayer) {
    return;
  }

  const videoPlayBtn = document.getElementById('videoPlayBtn');
  const videoTimeDisplay = document.getElementById('videoTimeDisplay');
  const videoProgressBar = document.getElementById('videoProgressBar');
  const videoFullscreenBtn = document.getElementById('videoFullscreenBtn');
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

  if (videoFullscreenBtn) {
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

  videoStage.addEventListener('click', function(e) {
    if (e.target === videoPlayer) {
      videoStage.classList.toggle('show-controls');
      if (!videoPlayer.paused) {
        resetHideTimer();
      }
    }
  });

  if (videoPlayBtn) {
    videoPlayBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (videoPlayer.paused) {
        videoPlayer.play();
      } else {
        videoPlayer.pause();
      }
    });
  }

  videoPlayer.addEventListener('play', function() {
    videoStage.classList.add('is-playing');
    resetHideTimer();
  });

  videoPlayer.addEventListener('pause', function() {
    videoStage.classList.remove('is-playing');
    videoStage.classList.add('show-controls');
    if (hideControlsTimer) {
      clearTimeout(hideControlsTimer);
    }
  });

  videoPlayer.addEventListener('waiting', function() {
    videoStage.classList.add('is-loading');
  });

  videoPlayer.addEventListener('playing', function() {
    videoStage.classList.remove('is-loading');
  });

  videoPlayer.addEventListener('canplay', function() {
    videoStage.classList.remove('is-loading');
  });

  videoPlayer.addEventListener('timeupdate', function() {
    const current = Math.floor(videoPlayer.currentTime);
    const mins = Math.floor(current / 60);
    const secs = current % 60;
    
    if (videoTimeDisplay) {
      videoTimeDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    
    if (videoProgressBar && videoPlayer.duration > 0) {
      const progress = (videoPlayer.currentTime / videoPlayer.duration) * 100;
      videoProgressBar.style.width = `${progress}%`;
    }
  });

  videoPlayer.addEventListener('loadedmetadata', function() {
    if (videoTimeDisplay) {
      videoTimeDisplay.textContent = '00:00';
    }
  });

  if (videoProgressBar && videoProgressBar.parentElement) {
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
});
