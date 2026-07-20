import { Navigate, Route, Routes } from 'react-router-dom';
import { ConfiguracionPage } from '@/pages/configuracion-page';
import { DashboardLayout } from '@/layouts/dashboard-layout';
import { HallazgosPage } from '@/pages/hallazgos-page';
import { HistorialPage } from '@/pages/historial-page';
import { HomePage } from '@/pages/home-page';
import { InformesPage } from '@/pages/informes-page';
import { LoginPage } from '@/pages/login-page';
import { SearchEquiposPage } from '@/pages/search-equipos-page';
import { ProtectedRoute } from '@/routes/protected-route';

export function AppRoutes() {
  return (
    <Routes>
      <Route path='/login' element={<LoginPage />} />
      <Route
        element={(
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        )}
      >
        <Route path='/' element={<HomePage />} />
        <Route path='/buscar-equipos' element={<SearchEquiposPage />} />
        <Route path='/hallazgos' element={<HallazgosPage />} />
        <Route path='/informes' element={<InformesPage />} />
        <Route path='/historial' element={<HistorialPage />} />
        <Route path='/configuracion' element={<ConfiguracionPage />} />
      </Route>
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
}
