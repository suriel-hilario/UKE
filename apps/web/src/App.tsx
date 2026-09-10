import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { RoleGuard } from './auth/RoleGuard'
import { useAuth } from './auth/useAuth'
import { AdminLayout } from './admin/AdminLayout'
import { UsersPage } from './admin/users/UsersPage'
import { TemporadasPage } from './admin/temporadas/TemporadasPage'
import { EquiposPage } from './admin/equipos/EquiposPage'
import { HistoricoPage } from './admin/historico/HistoricoPage'
import { AppShell } from './catalogo/AppShell'
import { ScopeGuard } from './catalogo/ScopeGuard'
import { EquipoDetailPage } from './catalogo/EquipoDetailPage'
import { PanelPage } from './panel/PanelPage'

function Home() {
  const { user } = useAuth()

  // DEBUG - borra esto después
  console.log('Home render - user:', JSON.stringify(user))

  if (!user) return <div>Cargando usuario...</div>
  if (user.rol === 'admin') return <Navigate to="/admin" replace />
  return <AppShell />
}

function App() {
  return (
    <ProtectedRoute>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/equipos/:id"
          element={
            <ScopeGuard>
              <EquipoDetailPage />
            </ScopeGuard>
          }
        />
        <Route
          path="/panel"
          element={
            <RoleGuard roles={['director', 'coordinador']}>
              <PanelPage />
            </RoleGuard>
          }
        />
        <Route
          path="/admin"
          element={
            <RoleGuard roles={['admin', 'director']}>
              <AdminLayout />
            </RoleGuard>
          }
        >
          <Route
            index
            element={
              <RoleGuard roles={['admin']}>
                <UsersPage />
              </RoleGuard>
            }
          />
          <Route
            path="usuarios"
            element={
              <RoleGuard roles={['admin']}>
                <UsersPage />
              </RoleGuard>
            }
          />
          <Route
            path="temporadas"
            element={
              <RoleGuard roles={['admin']}>
                <TemporadasPage />
              </RoleGuard>
            }
          />
          <Route
            path="equipos"
            element={
              <RoleGuard roles={['admin']}>
                <EquiposPage />
              </RoleGuard>
            }
          />
          <Route path="historico" element={<HistoricoPage />} />
        </Route>
      </Routes>
    </ProtectedRoute>
  )
}

export default App