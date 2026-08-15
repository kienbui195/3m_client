// Tiếng "pip" khi nhận thông báo mới từ hệ thống - dùng Web Audio API tạo tone
// trực tiếp, không cần file âm thanh. Browser chặn autoplay nên AudioContext chỉ
// mở được sau tương tác đầu tiên của người dùng; ta đăng ký sẵn listener unlock
// ngay khi module load, sau đó các lần pip về sau đều chạy được.

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null;
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function unlock() {
  const ctx = getAudioCtx();
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });
}

export function playNotificationSound() {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();

    const now = ctx.currentTime;

    const playTone = (frequency: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    };

    // Pip kép, tần số tăng dần cho cảm giác "có thông báo mới".
    playTone(740, now, 0.12);
    playTone(988, now + 0.12, 0.18);
  } catch {
    // Không có audio / bị chặn -> im lặng, không làm hỏng luồng.
  }
}
