import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { Landing } from "@/pages/Landing"
import { ExpenseTracker } from "@/pages/ExpenseTracker"

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isReady } = useAuth()
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Memuat...</div>
      </div>
    )
  }
  if (!isSignedIn) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isReady } = useAuth()
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Memuat...</div>
      </div>
    )
  }
  if (isSignedIn) {
    return <Navigate to="/tracker" replace />
  }
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicRoute>
            <Landing />
          </PublicRoute>
        }
      />
      <Route
        path="/tracker"
        element={
          <PrivateRoute>
            <ExpenseTracker />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
