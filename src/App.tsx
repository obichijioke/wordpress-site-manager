import React, { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/Login'
import Dashboard from './pages/Dashboard'
import Sites from './pages/Sites'
import Content from './pages/Content'
import Categories from './pages/Categories'
import Media from './pages/Media'

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [isRegisterMode, setIsRegisterMode] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <LoginPage 
        onToggleMode={() => setIsRegisterMode(!isRegisterMode)}
        isRegisterMode={isRegisterMode}
      />
    )
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'sites':
        return <Sites />
      case 'content':
        return <Content />
      case 'categories':
        return <Categories />
      case 'media':
        return <Media />
      case 'settings':
        return <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <p className="text-gray-600 mt-2">Coming soon...</p>
        </div>
      default:
        return <Dashboard />
    }
  }

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
