import { Route, Routes } from 'react-router';
import { ROUTES } from '@/app/routes';
import CalibratePage from '../CalibratePage';

/** The calibration page on its route, with a dashboard stub so Stop has somewhere to go. */
export function CalibrateRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.calibrate} element={<CalibratePage />} />
      <Route path={ROUTES.dashboard} element={<h1>Dashboard stub</h1>} />
    </Routes>
  );
}
