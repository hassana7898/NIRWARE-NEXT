import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { OrdersPage } from './pages/OrdersPage';
import { LogisticsPage } from './pages/LogisticsPage';
import { FarmersPage } from './pages/FarmersPage';
import { FlocksPage } from './pages/FlocksPage';
import { QuotasPage } from './pages/QuotasPage';
import { ProductsPage } from './pages/ProductsPage';
import { FormulasPage } from './pages/FormulasPage';
import { ProductionPage } from './pages/ProductionPage';
import { InventoryPage } from './pages/InventoryPage';
import { InboundPage } from './pages/InboundPage';
import { ReportsPage } from './pages/ReportsPage';
import { AiAssistantPage } from './pages/AiAssistantPage';
import { AuditPage } from './pages/AuditPage';

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export const App: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="logistics" element={<LogisticsPage />} />
        <Route path="farmers" element={<FarmersPage />} />
        <Route path="flocks" element={<FlocksPage />} />
        <Route path="quotas" element={<QuotasPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="formulas" element={<FormulasPage />} />
        <Route path="production" element={<ProductionPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="inbound" element={<InboundPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="ai" element={<AiAssistantPage />} />
        <Route path="audit" element={<AuditPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
export default App;
