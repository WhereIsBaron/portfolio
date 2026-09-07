import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import BookingPage from '@/pages/BookingPage';
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
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Routes>
          <ChatWidget />
        </LayoutProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
