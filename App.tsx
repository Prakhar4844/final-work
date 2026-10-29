import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SetupWizard } from '../features/setup/SetupWizard';
import { AppLayout } from './AppLayout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { TelemetryExplorerPage } from '../features/telemetry/TelemetryExplorerPage';
import { PlotBuilderPage } from '../features/plots/PlotBuilderPage';
import { SensorsPage } from '../features/sensors/SensorsPage';
import { DataHistoryPage } from '../features/history/DataHistoryPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { useMissionStore } from '../stores/missionStore';
import { useDashboardStore } from '../stores/dashboardStore';
import { telemetryService } from '../services/telemetryService';
import { sensorRegistry } from '../features/sensors/registry';

export function App() {
  const mission = useMissionStore();
  const initDefaultLayout = useDashboardStore(s => s.initDefaultLayout);

  useEffect(() => {
    if (!mission.isSetupComplete) return;

    // Apply sensor selection from mission config
    sensorRegistry.enableSensors(mission.configuredSensorIds);

    // Init default dashboard layout if first time
    initDefaultLayout(mission.configuredSensorIds);

    // Start telemetry service
    telemetryService.configure({
      wsUrl: mission.wsUrl,
      deviceId: mission.deviceId,
      missionId: mission.missionName,
      enabledSensorIds: mission.configuredSensorIds,
    });
    telemetryService.start();

    return () => { telemetryService.stop(); };
  }, [mission.isSetupComplete, mission.wsUrl, mission.deviceId, mission.missionName, mission.configuredSensorIds, initDefaultLayout]);

  if (!mission.isSetupComplete) {
    return <SetupWizard />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="explorer" element={<TelemetryExplorerPage />} />
          <Route path="plots" element={<PlotBuilderPage />} />
          <Route path="sensors" element={<SensorsPage />} />
          <Route path="history" element={<DataHistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
