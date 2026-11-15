let ctx = null;

function getContext() {
  if (!ctx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) ctx = new AudioContext();
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export const SOUNDS = {
  shot(pitchMod = 1) {
    const ac = getContext();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const filter = ac.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180 * pitchMod, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ac.currentTime + 0.12);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, ac.currentTime);

    gain.gain.setValueAtTime(0.4, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);

    osc.start();
    osc.stop(ac.currentTime + 0.16);
  },

  reload() {
    const ac = getContext();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ac.currentTime);
    osc.frequency.setValueAtTime(660, ac.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.36);
  },

  hit() {
    const ac = getContext();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ac.currentTime + 0.05);
    gain.gain.setValueAtTime(0.25, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.07);
  },

  explosion() {
    const ac = getContext();
    if (!ac) return;
    const bufferSize = ac.sampleRate * 1.2;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ac.createBufferSource();
    noise.buffer = buffer;

    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, ac.currentTime);
    filter.frequency.linearRampToValueAtTime(50, ac.currentTime + 1.2);

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.8, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 1.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);

    noise.start();
  },

  beep() {
    const ac = getContext();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ac.currentTime);
    gain.gain.setValueAtTime(0.2, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.09);
  },

  stinger(win) {
    const ac = getContext();
    if (!ac) return;
    const notes = win ? [523.25, 659.25, 783.99, 1046.50] : [440, 370, 311, 220];
    notes.forEach((freq, idx) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = win ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, ac.currentTime + idx * 0.15);
      gain.gain.setValueAtTime(0.3, ac.currentTime + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + idx * 0.15 + 0.3);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(ac.currentTime + idx * 0.15);
      osc.stop(ac.currentTime + idx * 0.15 + 0.35);
    });
  }
};
