import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import Home from './pages/Home';
import SignInPage from './pages/SignInPage';
import BrowsePage from './pages/BrowsePage';
import AnimePage from './pages/AnimePage';
import WatchPage from './pages/WatchPage';
import WatchlistPage from './pages/WatchlistPage';
import SchedulePage from './pages/SchedulePage';
import CommunityPage from './pages/CommunityPage';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <img
            src="https://media.base44.com/images/public/69eaec00027d7dc32aaa376a/43ed0279b_ChatGPTImageApr24202612_30_57AM.png"
            alt="AkiraPlus"
            className="w-20 h-20 object-contain mx-auto mb-4 animate-pulse"
          />
          <p className="text-violet-400/60 text-xs tracking-widest font-mono">LOADING...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // For auth_required, allow browsing — sign-in is surfaced in Navbar
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/browse" element={<BrowsePage />} />
      <Route path="/anime/:id" element={<AnimePage />} />
      <Route path="/watch/:id" element={<WatchPage />} />
      <Route path="/watchlist" element={<WatchlistPage />} />
      <Route path="/schedule" element={<SchedulePage />} />
      <Route path="/community" element={<CommunityPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App