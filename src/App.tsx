import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import BookingPage from '@/pages/BookingPage';
import CrmPage from '@/pages/CrmPage';
import ErpPage from '@/pages/ErpPage';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import ScrollToHash from '@/components/ScrollToHash';
import ChatWidget from '@/components/ChatWidget';
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
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Routes>
          <ChatWidget />
        </LayoutProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
