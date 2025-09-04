'use client'

import { useState } from 'react'
import { MessageSquare, Settings } from 'lucide-react'
import ChatInterface from '@/components/ChatInterface'
import BrowserView from '@/components/BrowserView'
import TaskManager from '@/components/TaskManager'
import { TaskProvider } from '@/context/TaskContext'
import { useTaskExecution } from '@/hooks/useTaskExecution'
import { useBrowserCloseDetection } from '@/hooks/useBrowserCloseDetection'
import { useKeepAlive } from '@/hooks/useKeepAlive'

function AppContent() {
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks'>('chat')
  useTaskExecution()
  useBrowserCloseDetection()
  useKeepAlive()

  return (
    <div className="flex h-screen bg-dark-100">
      {/* Left Sidebar Navigation */}
      <div className="flex flex-col border-r border-dark-300 bg-dark-200 w-16 flex-shrink-0">
        <button
          onClick={() => setActiveTab('chat')}
          className={`p-4 transition-colors ${
            activeTab === 'chat'
              ? 'text-white border-r-2 border-blue-500 bg-dark-300'
              : 'text-gray-400 hover:text-white hover:bg-dark-300'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`p-4 transition-colors ${
            activeTab === 'tasks'
              ? 'text-white border-r-2 border-blue-500 bg-dark-300'
              : 'text-gray-400 hover:text-white hover:bg-dark-300'
          }`}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {activeTab === 'chat' ? (
          <div className="flex flex-col lg:flex-row flex-1">
            <div className="w-full lg:w-[38%]">
              <ChatInterface />
            </div>
            <div className="w-full lg:w-[62%]">
              <BrowserView />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <TaskManager />
          </div>
        )}
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