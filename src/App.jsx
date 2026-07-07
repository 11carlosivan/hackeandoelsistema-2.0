import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import ArticleDetail from './pages/ArticleDetail';
import OpinionDetail from './pages/OpinionDetail';
import CategoryPage from './pages/CategoryPage';
import SecureContact from './pages/SecureContact';
import ProfilePage from './pages/ProfilePage';
import SearchResults from './pages/SearchResults';
import CmsDashboard from './pages/CmsDashboard';

// WordPress migration pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import SubmitPostPage from './pages/SubmitPostPage';
import PlansPage from './pages/PlansPage';
import CheckoutPage from './pages/CheckoutPage';
import StaticPage from './pages/StaticPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/articulo/:id" element={<ArticleDetail />} />
          <Route path="/opinion/:id" element={<OpinionDetail />} />
          <Route path="/categoria/:id" element={<CategoryPage />} />
          <Route path="/contacto-seguro" element={<SecureContact />} />
          <Route path="/perfil/:id" element={<ProfilePage />} />
          <Route path="/buscar" element={<SearchResults />} />
          <Route path="/cms" element={<CmsDashboard />} />
          
          {/* WordPress migration and auth routes */}
          <Route path="/iniciar-sesion" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/password-recover" element={<ForgotPasswordPage />} />
          <Route path="/crear-publicacion" element={<SubmitPostPage />} />
          <Route path="/planes" element={<PlansPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/pagina/:slug" element={<StaticPage />} />
          
          {/* Fallback 404 handler */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}
