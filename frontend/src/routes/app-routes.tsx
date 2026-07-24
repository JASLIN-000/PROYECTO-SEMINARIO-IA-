import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/routes/protected-route';

const DashboardLayout = lazy(() => import('@/layouts/dashboard-layout').then((module) => ({ default: module.DashboardLayout })));
const LoginPage = lazy(() => import('@/pages/login-page').then((module) => ({ default: module.LoginPage })));
const HomePage = lazy(() => import('@/pages/home-page').then((module) => ({ default: module.HomePage })));
const SearchEquiposPage = lazy(() => import('@/pages/search-equipos-page').then((module) => ({ default: module.SearchEquiposPage })));
const HallazgosPage = lazy(() => import('@/pages/hallazgos-page').then((module) => ({ default: module.HallazgosPage })));
const InformesPage = lazy(() => import('@/pages/informes-page').then((module) => ({ default: module.InformesPage })));
const HistorialPage = lazy(() => import('@/pages/historial-page').then((module) => ({ default: module.HistorialPage })));
const ConfiguracionPage = lazy(() => import('@/pages/configuracion-page').then((module) => ({ default: module.ConfiguracionPage })));

export function AppRoutes() {
  return (
    <Suspense fallback={<div className='p-6 text-sm text-[#6B7280]'>Cargando modulo...</div>}>
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
    </Suspense>
  );
}
