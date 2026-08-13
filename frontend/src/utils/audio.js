let currentAudioContext = null;
let currentChannel = '';
let currentSrc = '';
let currentListeners = {
  onPlay: null,
  onPause: null,
  onStop: null,
  onEnded: null,
  onTimeUpdate: null,
};

function clearListeners() {
  currentListeners = {
    onPlay: null,
    onPause: null,
    onStop: null,
    onEnded: null,
    onTimeUpdate: null,
  };
}

function stopCurrentAudio({ emitStop = true } = {}) {
  if (!currentAudioContext) {
    currentChannel = '';
    currentSrc = '';
    return;
  }
  const previous = currentAudioContext;
  const previousChannel = currentChannel;
  try {
    if (typeof previous.pause === 'function') previous.pause();
    if (typeof previous.stop === 'function') previous.stop();
  } catch (error) {
    // ignore platform stop errors
  }
  if (typeof previous.destroy === 'function') {
    previous.destroy();
  }
  currentAudioContext = null;
  currentChannel = '';
  currentSrc = '';
  if (emitStop && typeof currentListeners.onStop === 'function') {
    currentListeners.onStop({ channel: previousChannel });
  }
  clearListeners();
}

function attachWebListeners(audioElement, channel) {
  const element = audioElement;
  element.ontimeupdate = () => {
    if (typeof currentListeners.onTimeUpdate === 'function') {
      currentListeners.onTimeUpdate({
        channel,
        currentTime: element.currentTime || 0,
        duration: element.duration || 0,
      });
    }
  };
  element.onplay = () => {
    if (typeof currentListeners.onPlay === 'function') {
      currentListeners.onPlay({ channel });
    }
  };
  element.onpause = () => {
    if (typeof currentListeners.onPause === 'function') {
      currentListeners.onPause({ channel });
    }
  };
  element.onended = () => {
    if (typeof currentListeners.onEnded === 'function') {
      currentListeners.onEnded({ channel });
    }
    if (currentAudioContext) stopCurrentAudio({ emitStop: false });
  };
  element.onerror = () => {
    uni.showToast({ title: '播放失败', icon: 'none' });
    stopCurrentAudio();
  };
}

/**
 * @param {string} src
 * @param {boolean|object} [warn]
 * @param {object} [options]
 * @param {boolean} [options.warn]
 * @param {'can'|'dictionary'|string} [options.channel]
 * @param {function} [options.onPlay]
 * @param {function} [options.onPause]
 * @param {function} [options.onStop]
 * @param {function} [options.onEnded]
 * @param {function} [options.onTimeUpdate]
 */
export function playAudio(src, warn = true, options = {}) {
  const opts = typeof warn === 'object' ? warn : options;
  const shouldWarn = typeof warn === 'boolean' ? warn : opts.warn !== false;
  const channel = opts.channel || 'can';

  if (!src || src === 'null') {
    if (shouldWarn) {
      uni.showToast({
        title: '不是一个可用文件',
        icon: 'error',
      });
    }
    return null;
  }

  stopCurrentAudio();
  currentListeners = {
    onPlay: opts.onPlay || null,
    onPause: opts.onPause || null,
    onStop: opts.onStop || null,
    onEnded: opts.onEnded || null,
    onTimeUpdate: opts.onTimeUpdate || null,
  };
  currentChannel = channel;
  currentSrc = src;

  if (shouldWarn) {
    uni.showToast({
      title: '正在播放...',
      icon: 'none',
    });
  }

  // #ifdef H5
  const audioElement = new Audio(src);
  let webAudioContext = null;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const resolvedUrl = new URL(src, window.location.href);
    const canUseWebAudio = AudioContextClass
      && (resolvedUrl.origin === window.location.origin || resolvedUrl.protocol === 'blob:');
    if (canUseWebAudio) {
      webAudioContext = new AudioContextClass();
      const source = webAudioContext.createMediaElementSource(audioElement);
      source.connect(webAudioContext.destination);
    }
  } catch (error) {
    webAudioContext = null;
  }
  const webPlayback = {
    pause() {
      audioElement.pause();
    },
    play() {
      return audioElement.play();
    },
    stop() {
      audioElement.pause();
      audioElement.currentTime = 0;
    },
    destroy() {
      audioElement.src = '';
      if (webAudioContext && typeof webAudioContext.close === 'function') {
        webAudioContext.close();
      }
    },
    get currentTime() {
      return audioElement.currentTime || 0;
    },
    get duration() {
      return audioElement.duration || 0;
    },
    get paused() {
      return audioElement.paused;
    },
  };
  currentAudioContext = webPlayback;
  attachWebListeners(audioElement, channel);
  const playPromise = audioElement.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      uni.showToast({ title: '播放失败', icon: 'none' });
      stopCurrentAudio();
    });
  }
  // #endif

  // #ifndef H5
  const innerAudioContext = uni.createInnerAudioContext();
  currentAudioContext = innerAudioContext;
  innerAudioContext.onError(() => {
    uni.showToast({
      title: '播放失败',
      icon: 'none',
    });
    stopCurrentAudio();
  });
  innerAudioContext.onEnded(() => {
    if (typeof currentListeners.onEnded === 'function') {
      currentListeners.onEnded({ channel });
    }
    if (currentAudioContext === innerAudioContext) {
      currentAudioContext = null;
      currentChannel = '';
      currentSrc = '';
      clearListeners();
    }
  });
  innerAudioContext.onPlay(() => {
    if (typeof currentListeners.onPlay === 'function') {
      currentListeners.onPlay({ channel });
    }
  });
  innerAudioContext.onPause(() => {
    if (typeof currentListeners.onPause === 'function') {
      currentListeners.onPause({ channel });
    }
  });
  innerAudioContext.onTimeUpdate(() => {
    if (typeof currentListeners.onTimeUpdate === 'function') {
      currentListeners.onTimeUpdate({
        channel,
        currentTime: innerAudioContext.currentTime || 0,
        duration: innerAudioContext.duration || 0,
      });
    }
  });
  innerAudioContext.src = src;
  innerAudioContext.play();
  // #endif

  return currentAudioContext;
}

export function pauseAudio() {
  if (!currentAudioContext) return;
  if (typeof currentAudioContext.pause === 'function') {
    currentAudioContext.pause();
  } else {
    stopCurrentAudio();
  }
}

export function stopAudio(channel) {
  if (channel && currentChannel && channel !== currentChannel) return;
  stopCurrentAudio();
}

export function stopAudioChannel(channel) {
  if (!channel || currentChannel === channel) stopCurrentAudio();
}

export function getPlayingChannel() {
  return currentChannel;
}

export function getPlayingSrc() {
  return currentSrc;
}

export function isAudioPlaying(channel) {
  if (!currentAudioContext) return false;
  if (channel && currentChannel !== channel) return false;
  if (typeof currentAudioContext.paused === 'boolean') {
    return !currentAudioContext.paused;
  }
  return Boolean(currentChannel);
}

export default {
  getPlayingChannel,
  getPlayingSrc,
  isAudioPlaying,
  pauseAudio,
  playAudio,
  stopAudio,
  stopAudioChannel,
};
