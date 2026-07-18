import { Sprout } from 'lucide-react';

function Header({ modelStatus }) {
  const isModelReady = modelStatus === 'Model AI Siap';

  const percentMatch = modelStatus?.match(/(\d+)%/);
  const loadingPercent = percentMatch ? parseInt(percentMatch[1]) : 0;

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <Sprout size={20} />
          <span>RootFacts</span>
        </div>

        <div className="status-pill">
          <span className={`status-dot ${isModelReady ? 'active' : 'loading'}`}></span>
          <span>{modelStatus}</span>
        </div>
      </div>

      {!isModelReady && (
        <div className="model-loading-bar">
          <div
            className="model-loading-fill"
            style={{ width: `${loadingPercent}%` }}
          />
        </div>
      )}
    </header>
  );
}

export default Header;
