import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { GamePage } from './pages/GamePage';
import { HomePage } from './pages/HomePage';
import { ResultPage } from './pages/ResultPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/play" element={<GamePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
