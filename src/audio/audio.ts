/**
 * Audio Manager for Ragelang
 * Handles music (looping background) and sound effects
 */

export interface AudioOptions {
  masterVolume?: number;
}

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicElement: HTMLAudioElement | null = null;
  private soundCache: Map<string, AudioBuffer> = new Map();
  private activeSounds: Set<AudioBufferSourceNode> = new Set();
  private masterVolume: number;
  private initialized: boolean = false;

  constructor(options: AudioOptions = {}) {
    this.masterVolume = options.masterVolume ?? 1.0;
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  private init(): void {
    if (this.initialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.audioContext.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported, audio disabled');
    }
  }

  /**
   * Resume audio context if suspended (browser autoplay policy)
   */
  private async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Play background music (loops continuously)
   * @param path - Path to audio file
   * @param volume - Volume 0-10 (default 5)
   */
  async music(path: string | null, volume: number = 5): Promise<void> {
    // Stop current music if path is null or different
    if (this.musicElement) {
      this.musicElement.pause();
      this.musicElement.src = '';
      this.musicElement = null;
    }

    if (!path) return;

    // Use HTMLAudioElement for music (better for streaming long files)
    this.musicElement = new Audio(path);
    this.musicElement.loop = true;
    this.musicElement.volume = Math.min(1, Math.max(0, volume / 10));
    
    try {
      await this.musicElement.play();
    } catch (e) {
      console.warn(`Failed to play music: ${path}`, e);
    }
  }

  /**
   * Stop the currently playing music
   */
  stopMusic(): void {
    if (this.musicElement) {
      this.musicElement.pause();
      this.musicElement.src = '';
      this.musicElement = null;
    }
  }

  /**
   * Set music volume
   * @param volume - Volume 0-10
   */
  setMusicVolume(volume: number): void {
    if (this.musicElement) {
      this.musicElement.volume = Math.min(1, Math.max(0, volume / 10));
    }
  }

  /**
   * Play a sound effect (plays once)
   * @param path - Path to audio file
   * @param gain - Volume 0-10 (default 5)
   */
  async sound(path: string, gain: number = 5): Promise<void> {
    this.init();
    
    if (!this.audioContext || !this.masterGain) {
      // Fallback to HTMLAudioElement
      const audio = new Audio(path);
      audio.volume = Math.min(1, Math.max(0, gain / 10));
      try {
        await audio.play();
      } catch (e) {
        console.warn(`Failed to play sound: ${path}`, e);
      }
      return;
    }

    await this.resume();

    try {
      // Check cache first
      let buffer = this.soundCache.get(path);
      
      if (!buffer) {
        // Load the audio file
        const response = await fetch(path);
        const arrayBuffer = await response.arrayBuffer();
        buffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.soundCache.set(path, buffer);
      }

      // Create source and gain nodes
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = buffer;
      gainNode.gain.value = Math.min(1, Math.max(0, gain / 10));
      
      source.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      // Track active sounds for cleanup
      this.activeSounds.add(source);
      source.onended = () => {
        this.activeSounds.delete(source);
      };
      
      source.start(0);
    } catch (e) {
      console.warn(`Failed to play sound: ${path}`, e);
    }
  }

  /**
   * Stop all sounds
   */
  stopAllSounds(): void {
    for (const source of this.activeSounds) {
      try {
        source.stop();
      } catch (e) {
        // Already stopped
      }
    }
    this.activeSounds.clear();
  }

  /**
   * Set master volume
   * @param volume - Volume 0-10
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.min(1, Math.max(0, volume / 10));
    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume;
    }
  }

  /**
   * Clean up audio resources
   */
  dispose(): void {
    this.stopMusic();
    this.stopAllSounds();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.soundCache.clear();
    this.initialized = false;
  }
}

