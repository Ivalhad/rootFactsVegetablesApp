import { pipeline } from '@huggingface/transformers';
import { TONE_CONFIG } from '../utils/config.js';

export class RootFactsService {
  constructor() {
    this.generator = null;
    this.isModelLoaded = false;
    this.isGenerating = false;
    this.config = null;
    this.currentBackend = null;
    this.currentTone = TONE_CONFIG.defaultTone;
  }

  // TODO [Basic] Muat model dan inisialisasi pipeline text2text-generation
  // TODO [Advance] Implementasikan strategi Backend Adaptive
  async #getDevice() {
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          this.currentBackend = 'webgpu';
          console.log('transformers.js pakai WebGPU');
          return 'webgpu';
        }
      } catch (e) {
        console.warn('webGPU tidak tersedia ', e);
      }
    }
    this.currentBackend = 'wasm';
    console.log('transformers.js pakai WASM');
    return 'wasm';
  }

  async loadModel(onProgress) {
    onProgress?.('mendeteksi hardware untuk AI...', 10);
    const device = await this.#getDevice();
    onProgress?.('mengunduh model...', 30);

    this.generator = await pipeline(
      'text2text-generation',
      'Xenova/flan-t5-small',
      {
        dtype: 'q4',
        device,
        progress_callback: (progress) => {
          if (progress.status === 'downloading') {
            const pct = Math.round((progress.loaded / progress.total) * 60) + 30;
            onProgress?.('mengunduh model...', pct);
          }
        },
      }
    );
    this.isModelLoaded = true;
    onProgress?.('Model AI Siap', 100);
    console.log('model bahasa siap digunakan');
  }

  // TODO [Advance] Konfigurasi tone fakta yang dihasilkan
  setTone(tone) {
    this.currentTone = tone;
  }

  #buildPrompt(vegetableName) {
    const prompts = {
      normal: `Provide exactly one true and interesting fact specifically about the vegetable ${vegetableName}. Do not talk about anything else.`,
      funny: `Provide exactly one true and hilarious fact specifically about the vegetable ${vegetableName}. Do not talk about anything else.`,
      professional: `Provide exactly one true and scientific fact specifically about the vegetable ${vegetableName}. Do not talk about anything else.`,
      casual: `Provide exactly one true and casual fact specifically about the vegetable ${vegetableName}. Do not talk about anything else.`,
    };
    return prompts[this.currentTone] || prompts.normal;
  }

  // TODO [Basic] Lakukan prediksi pada elemen gambar yang diberikan dan kembalikan hasilnya
  // TODO [Skilled] Konfigurasikan parameter generasi berdasarkan kebutuhan
  // TODO [Advance] Implemenasikan parameter tone untuk mengatur nada fakta yang dihasilkan
  async generateFacts(vegetableName) {
    if (!this.isReady() || this.isGenerating) return null;
    this.isGenerating = true;
    try {
      const prompt = this.#buildPrompt(vegetableName);
      const output = await this.generator(prompt, {
        max_new_tokens: 150,
        temperature: 0.3,
        top_p: 0.8,
        do_sample: true,
      });
      return output[0]?.generated_text || null;
    } finally {

      this.isGenerating = false;
    }
  }

  // TODO [Basic] Periksa apakah model sudah dimuat dan siap digunakan
  isReady() {
    return this.generator !== null && this.isModelLoaded;
  }
}
