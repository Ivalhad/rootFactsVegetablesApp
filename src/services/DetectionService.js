export class DetectionService {
  constructor() {
    this.model = null;
    this.labels = [];
    this.config = null;
  }

  // TODO [Basic] Muat model dan metadata secara bersamaan, lalu simpan ke instance
  // TODO [Advance] Implementasikan strategi Backend Adaptive
  async #setupBackend() {
    const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
    if (hasWebGPU) {
      try {
        await import('@tensorflow/tfjs-backend-webgpu');
        await tf.setBackend('webgpu');
        await tf.ready();
        this.currentBackend = 'webgpu';
        console.log('TF.js menggunakan WebGPU');
        return;
      } catch (e) {
        console.warn('WebGPU gagal:', e);
      }
    }
    await tf.setBackend('webgl');
    await tf.ready();
    this.currentBackend = 'webgl';
    console.log('TF.js menggunakan WebGL');
  }

  async loadModel(onProgress) {
    onProgress?.('Mendeteksi hardware...', 10);
    await this.#setupBackend();
    onProgress?.('Memuat metadata...', 30);
    const metaResponse = await fetch('/model/metadata.json');
    const metadata = await metaResponse.json();
    this.labels = metadata.labels;
    this.config = metadata;

    onProgress?.('Memuat model....', 60);
    this.model = await tf.loadLayersModel('/model/model.json');

    onProgress?.('Memproses model..', 90);
    const dummyInput = tf.zeros([1, 224, 224, 3]);
    const warmup = this.model.predict(dummyInput);
    warmup.dispose();
    dummyInput.dispose();

    onProgress?.('Model AI Siap', 100);
    console.log(`Model dimuat. Labels: ${this.labels.length} kelas`);
  }

  // TODO [Basic] Lakukan prediksi pada elemen gambar yang diberikan dan kembalikan hasilnya
  async predict(imageElement) {
    if (!this.isLoaded()) return null;

    const result = tf.tidy(() => {
      const imageTensor = tf.browser.fromPixels(imageElement);
      const imageSize = this.config?.imageSize ?? 224;
      const resized = tf.image.resizeBilinear(imageTensor, [imageSize, imageSize]);
      const normalized = resized.div(tf.scalar(255.0));
      const batched = normalized.expandDims(0);
      const predictions = this.model.predict(batched);
      return predictions.dataSync();
    });

    const maxScore = Math.max(...result);
    const maxIndex = result.indexOf(maxScore);
    const confidence = Math.round(maxScore * 100);
    return {
      className: this.labels[maxIndex],
      score: maxScore,
      confidence,
      allScores: Array.from(result),
      isValid: maxScore > 0,
    };
  }


  // TODO [Basic] Periksa apakah model sudah dimuat dan siap digunakan
  isLoaded() {
    return this.model !== null && this.labels.length > 0;
  }
}
