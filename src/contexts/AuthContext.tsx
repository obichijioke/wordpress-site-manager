/**
 * Authentication Context for WordPress Dashboard
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { apiClient } from '../lib/api'

interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const response = await apiClient.getCurrentUser()
        if (response.success && response.data?.user) {
          setUser(response.data.user)
        } else {
          // Invalid token, remove it
          localStorage.removeItem('auth_token')
          apiClient.setToken(null)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('auth_token')
        apiClient.setToken(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password)
      
      if (response.success && response.data?.token && response.data?.user) {
        apiClient.setToken(response.data.token)
        setUser(response.data.user)
        return { success: true }
      } else {
        return { 
          success: false, 
          error: response.error || 'Login failed' 
        }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      }
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await apiClient.register(name, email, password)
      
      if (response.success && response.data?.token && response.data?.user) {
        apiClient.setToken(response.data.token)
        setUser(response.data.user)
        return { success: true }
      } else {
        return { 
          success: false, 
          error: response.error || 'Registration failed' 
        }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    apiClient.setToken(null)
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext