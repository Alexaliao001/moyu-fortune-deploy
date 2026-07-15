import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { ThemeProvider } from "./contexts/ThemeContext";

// Initialize i18n
import './lib/i18n';

// 懒加载页面组件 - 优化首屏加载速度
const Home = lazy(() => import("./pages/Home"));
const Membership = lazy(() => import("./pages/Membership"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./pages/PaymentCancel"));
const History = lazy(() => import("./pages/History"));
const Invite = lazy(() => import("./pages/Invite"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminFeedback = lazy(() => import("./pages/AdminFeedback"));
const GoldenTime = lazy(() => import("./pages/GoldenTime"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));

// 页面加载骨架屏
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{
      background: 'linear-gradient(175deg, #2D1B0E 0%, #1A0F06 35%, #0F0804 70%, #0A0503 100%)'
    }}>
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          {/* 铜钱加载动画 */}
          <div className="absolute inset-0 rounded-full border-4 animate-spin" 
               style={{ borderColor: 'rgba(255,200,100,0.3)', borderTopColor: 'transparent' }} />
          <div className="absolute inset-2 rounded-full flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, #C8963E 0%, #A67C32 50%, #8B6528 100%)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.2)'
          }}>
            <div className="w-3 h-3 rounded-sm" style={{ background: '#5C3D1A' }} />
          </div>
        </div>
        <p className="text-sm animate-pulse" style={{ color: 'rgba(255,200,100,0.5)' }}>加载中...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/membership"} component={Membership} />
        <Route path={"/payment/success"} component={PaymentSuccess} />
        <Route path={"/payment/cancel"} component={PaymentCancel} />
        <Route path={"/history"} component={History} />
        <Route path={"/invite"} component={Invite} />
        <Route path={"/404"} component={NotFound} />
        <Route path={"/admin/feedback"} component={AdminFeedback} />
        <Route path={"/golden-time"} component={GoldenTime} />
        <Route path={"/leaderboard"} component={Leaderboard} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <PWAInstallPrompt />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
