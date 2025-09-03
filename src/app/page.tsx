'use client'

import ChatInterface from '@/components/ChatInterface'
import BrowserView from '@/components/BrowserView'
import { TaskProvider } from '@/context/TaskContext'
import { useTaskExecution } from '@/hooks/useTaskExecution'
import { useBrowserCloseDetection } from '@/hooks/useBrowserCloseDetection'
import { useKeepAlive } from '@/hooks/useKeepAlive'

function AppContent() {
  useTaskExecution()
  useBrowserCloseDetection()
  useKeepAlive()

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-dark-100">
      <div className="w-full lg:w-[38%]">
        <ChatInterface />
      </div>
      <div className="w-full lg:w-[62%]">
        <BrowserView />
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <TaskProvider>
      <AppContent />
    </TaskProvider>
  )
} 