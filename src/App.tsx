import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import BookingPage from '@/pages/BookingPage';
import CrmPage from '@/pages/CrmPage';
import ErpPage from '@/pages/ErpPage';
import PayPage from '@/pages/PayPage';
import PayReturn from '@/pages/PayReturn';
import ProductionPage from '@/pages/ProductionPage';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TimetablePage from '@/pages/TimetablePage';
import FamilyTreePage from '@/pages/FamilyTreePage';
import NotFound from '@/pages/NotFound';
import ScrollToHash from '@/components/ScrollToHash';
import ChatWidget from '@/components/ChatWidget';
import CookieBanner from '@/components/CookieBanner';
import { AuthProvider } from '@/context/AuthContext';
import { LayoutProvider } from '@/context/LayoutContext';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LayoutProvider>
          <ScrollToHash />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/crm" element={<CrmPage />} />
            <Route path="/erp" element={<ErpPage />} />
            <Route path="/pay" element={<PayPage />} />
            <Route path="/pay/return" element={<PayReturn />} />
            <Route path="/production" element={<ProductionPage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/timetable" element={<TimetablePage />} />
            <Route path="/family-tree" element={<FamilyTreePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ChatWidget />
          <CookieBanner />
        </LayoutProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
