import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Login from './pages/Login';
import TestResults from './pages/TestResults';
import Incidents from './pages/Incidents';
import AIAnalysis from './pages/AIAnalysis';
import SystemHealth from './pages/SystemHealth';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes wrapped in layout */}
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="test-results" element={<TestResults />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="ai-analysis" element={<AIAnalysis />} />
        <Route path="system-health" element={<SystemHealth />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
