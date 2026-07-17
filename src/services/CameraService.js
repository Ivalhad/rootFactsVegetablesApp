export class CameraService {
  constructor() {
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.config = null;
    this.fps = 30;
    this.cameras = [];
  }

  setVideoElement(videoElement) {
    this.video = videoElement;
  }

  setCanvasElement(canvasElement) {
    this.canvas = canvasElement;
  }

  // TODO [Basic] Tambahkan konfigurasi kamera untuk mendapatkan daftar perangkat input video
  // TODO [Basic] Dapatkan constraints kamera berdasarkan konfigurasi dan kamera yang dipilih
  async loadCameras() {

    await navigator.mediaDevices.getUserMedia({ video: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    this.cameras = devices.filter((d) => d.kind === 'videoinput');
    console.log('kamera ditemukan:', this.cameras.length);
    return this.cameras;
  }

  // TODO [Basic] Memulai kamera dengan perangkat yang dipilih dan menampilkan pada elemen video
  async startCamera(selectedCameraId) {

    this.stopCamera();
    let constraints;
    if (selectedCameraId === 'front') {
      constraints = { video: { facingMode: 'user' } };
    } else if (selectedCameraId && selectedCameraId !== 'default') {
      constraints = { video: { deviceId: { exact: selectedCameraId } } };
    } else {
      constraints = { video: { facingMode: 'environment' } };
    }
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.video.srcObject = this.stream;

    await new Promise((resolve) => {
      this.video.onloadedmetadata = () => resolve();
    });
    console.log('kamera aktif');
  }

  // TODO [Basic] Menghentikan siaran kamera dan membersihkan sumber daya
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
    console.log('kamera dimatikan');
  }

  // TODO [Skilled] Implementasikan metode untuk mengatur FPS kamera
  setFPS(fps) {
    this.fps = fps;
  }

  // TODO [Basic] Periksa apakah kamera sedang aktif
  isActive() {
    return this.stream !== null && this.stream.active;
  }

  // TODO [Basic] Periksa apakah elemen video siap untuk digunakan
  isReady() {
    return (
      this.video !== null &&
      this.video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA &&
      this.video.videoWidth > 0
    );
  }
}