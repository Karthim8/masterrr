/**
 * Simple synthesized sound effects using Web Audio API
 */

class SoundService {
  private ctx: AudioContext | null = null;

  private getCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  playCorrect() {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  playIncorrect() {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  playPop() {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  playConfetti() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    
    // Two notes: G4 then C5 (Tada!)
    [392, 523.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + (i * 0.15));
      
      gain.gain.setValueAtTime(0.05, now + (i * 0.15));
      gain.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.15) + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + (i * 0.15));
      osc.stop(now + (i * 0.15) + 0.3);
    });
  }

  playStreak() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    
    // Arpeggio C4, E4, G4, C5
    [261.63, 329.63, 392, 523.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + (i * 0.08));
      
      gain.gain.setValueAtTime(0.05, now + (i * 0.08));
      gain.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.08) + 0.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + (i * 0.08));
      osc.stop(now + (i * 0.08) + 0.2);
    });
  }

  playLoss() {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    
    // Sad descending notes
    [440, 392, 349.23].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + (i * 0.2));
      osc.frequency.linearRampToValueAtTime(freq * 0.8, now + (i * 0.2) + 0.2);
      
      gain.gain.setValueAtTime(0.03, now + (i * 0.2));
      gain.gain.linearRampToValueAtTime(0.001, now + (i * 0.2) + 0.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + (i * 0.2));
      osc.stop(now + (i * 0.2) + 0.2);
    });
  }
}

export const sounds = new SoundService();
