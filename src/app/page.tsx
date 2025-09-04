'use client'

import { useState } from 'react'
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
    <div className="flex flex-col h-screen bg-dark-100">
      {/* Tab Navigation */}
      <div className="flex border-b border-dark-300">
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'chat'
              ? 'text-white border-b-2 border-blue-500 bg-dark-200'
              : 'text-gray-400 hover:text-white hover:bg-dark-200'
          }`}
        >
          Chat Interface
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'tasks'
              ? 'text-white border-b-2 border-blue-500 bg-dark-200'
              : 'text-gray-400 hover:text-white hover:bg-dark-200'
          }`}
        >
          Task Manager (New API)
        </button>
      </div>

      {/* Tab Content */}
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
  )
}

export default function Home() {
  return (
    <TaskProvider>
      <AppContent />
    </TaskProvider>
  )
} 