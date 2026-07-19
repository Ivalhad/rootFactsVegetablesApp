import { useRef, useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import CameraSection from './components/CameraSection';
import InfoPanel from './components/InfoPanel';
import { useAppState } from './hooks/useAppState';
import { DetectionService } from './services/DetectionService';
import { CameraService } from './services/CameraService';
import { RootFactsService } from './services/RootFactsService';
import { APP_CONFIG, isValidDetection } from './utils/config';

function App() {
  const { state, actions } = useAppState();
  const detectionLoopRef = useRef(null);
  const isRunningRef = useRef(false);
  const servicesRef = useRef(null);
  const [currentTone, setCurrentTone] = useState('normal');
  const hasInitialized = useRef(false);

  // TODO [Basic] Inisialisasi layanan deteksi, kamera, dan generator fakta saat aplikasi dimuat
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const init = async () => {
      const detector = new DetectionService();
      const camera = new CameraService();
      const generator = new RootFactsService();

      servicesRef.current = { detector, camera, generator };
      actions.setServices({ detector, camera, generator });
      try {
        await detector.loadModel((text, pct) => {
          actions.setModelStatus(`${text}${pct < 100 ? ` ${pct}%` : ''}`);
        });

        await generator.loadModel((text, pct) => {
          actions.setModelStatus(`${text}${pct < 100 ? ` ${pct}%` : ''}`);
        });
        actions.setModelStatus('Model AI Siap');
      } catch (err) {
        console.error('gagal memuat model:', err);
        actions.setError('gagal memuat model AI. refresh halaman.');
        actions.setModelStatus('gagal memuat model');
      }
    };
    init();
  }, []);

  // TODO [Basic] Bersihkan sumber daya saat komponen ditinggalkan
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      clearTimeout(detectionLoopRef.current);
      servicesRef.current?.camera?.stopCamera();
    };
  }, []);

  // TODO [Basic] Fungsi untuk memulai loop deteksi
  const startDetectionLoop = useCallback(
    (detector, camera, generator) => {
      const loop = async () => {
        if (!isRunningRef.current) return;
        if (camera.isReady()) {
          const result = await detector.predict(camera.video);
          if (isValidDetection(result)) {

            actions.setAppState('analyzing');
            actions.setDetectionResult(result);
            await new Promise((r) => setTimeout(r, APP_CONFIG.analyzingDelay));
            if (!isRunningRef.current) return;

            actions.setAppState('result');
            actions.setFunFactData(null);
            isRunningRef.current = false;
            actions.setRunning(false);
            if (camera) camera.stopCamera();

            try {
              const fact = await generator.generateFacts(result.className);
              actions.setFunFactData(fact || 'fakta tidak tersedia.');
            } catch {
              actions.setFunFactData('error');
            }

            return;
          }
        }

        const fps = camera.fps || 30;
        detectionLoopRef.current = setTimeout(loop, 1000 / fps);
      };
      loop();
    },
    [actions]
  );

  // TODO [Basic] Fungsi untuk memulai dan menghentikan kamera
  const handleToggleCamera = async () => {
    const { detector, camera, generator } = state.services;
    if (!camera || !detector) return;
    if (state.isRunning) {
      isRunningRef.current = false;
      clearTimeout(detectionLoopRef.current);
      camera.stopCamera();
      actions.setRunning(false);
      actions.resetResults();
    } else {
      try {
        actions.resetResults();
        await camera.loadCameras();
        await camera.startCamera();
        actions.setRunning(true);
        isRunningRef.current = true;
        startDetectionLoop(detector, camera, generator);
      } catch (err) {
        console.error('gagal start kamera:', err);
        actions.setError(err.message || 'gagal mengakses kamera.');
      }
    }
  };

  // TODO [Advance] Fungsi untuk mengubah nada fakta yang dihasilkan
  const handleToneChange = (tone) => {
    setCurrentTone(tone);
    state.services.generator?.setTone(tone);
  };

  // TODO [Skilled] Fungsi untuk menyalin fakta ke clipboard
  const handleCopyFact = async () => {
    if (!state.funFactData || state.funFactData === 'error') return;
    try {
      await navigator.clipboard.writeText(state.funFactData);
      console.log('Fakta disalin ke clipboard');
    } catch (err) {
      console.error('Gagal menyalin:', err);
    }
  };


  return (
    <div className="app-container">
      <Header modelStatus={state.modelStatus} />
      <main className="main-content">
        <CameraSection
          isRunning={state.isRunning}
          onToggleCamera={handleToggleCamera}
          onToneChange={handleToneChange}
          services={state.services}
          modelStatus={state.modelStatus}
          error={state.error}
          currentTone={currentTone}
        />
        <InfoPanel
          appState={state.appState}
          detectionResult={state.detectionResult}
          funFactData={state.funFactData}
          error={state.error}
          onCopyFact={handleCopyFact}
        />
      </main>
      <footer className="footer">
        <p>Powered by TensorFlow.js & Transformers.js</p>
      </footer>
      {state.error && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '380px',
          padding: '0.875rem 1rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          color: '#991b1b',
          fontSize: '0.8125rem',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 1000
        }}>
          <strong>Error:</strong> {state.error}
          <button
            onClick={() => actions.setError(null)}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: '#991b1b',
              padding: 0,
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default App;