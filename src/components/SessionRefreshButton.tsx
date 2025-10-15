'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface SessionRefreshButtonProps {
  className?: string
  showText?: boolean
}

export default function SessionRefreshButton({ 
  className = '', 
  showText = true 
}: SessionRefreshButtonProps) {
  const { refreshSession } = useAuth()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshStatus, setLastRefreshStatus] = useState<'success' | 'error' | null>(null)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setLastRefreshStatus(null)

    try {
      const success = await refreshSession()
      setLastRefreshStatus(success ? 'success' : 'error')
      
      // Clear status after 3 seconds
      setTimeout(() => {
        setLastRefreshStatus(null)
      }, 3000)
    } catch (error) {
      console.error('Session refresh error:', error)
      setLastRefreshStatus('error')
      
      // Clear status after 3 seconds
      setTimeout(() => {
        setLastRefreshStatus(null)
      }, 3000)
    } finally {
      setIsRefreshing(false)
    }
  }

  const getIcon = () => {
    if (isRefreshing) {
      return <RefreshCw className="w-4 h-4 animate-spin" />
    }
    
    if (lastRefreshStatus === 'success') {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    }
    
    if (lastRefreshStatus === 'error') {
      return <XCircle className="w-4 h-4 text-red-500" />
    }
    
    return <RefreshCw className="w-4 h-4" />
  }

  const getText = () => {
    if (isRefreshing) return 'Refreshing...'
    if (lastRefreshStatus === 'success') return 'Refreshed!'
    if (lastRefreshStatus === 'error') return 'Failed'
    return 'Refresh Session'
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border bg-background hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title="Refresh your session to stay logged in"
    >
      {getIcon()}
      {showText && <span>{getText()}</span>}
    </button>
  )
}
