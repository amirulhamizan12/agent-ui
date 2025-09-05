'use client'

import { useState } from 'react'
import { MessageSquare, ClipboardList } from 'lucide-react'
import ChatInterface from '@/components/ChatInterface'
import BrowserView from '@/components/BrowserView'
import TaskManager from '@/components/TaskManager'
import { TaskProvider } from '@/context/TaskContext'
import { useTaskExecution } from '@/hooks/useTaskExecution'
import { useTaskCleanup } from '@/hooks/useTaskCleanup'
import { useKeepAlive } from '@/hooks/useKeepAlive'

function AppContent() {
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks'>('chat')
  useTaskExecution()
  useTaskCleanup()
  useKeepAlive()

  return (
    <div className="flex h-screen bg-dark-100">
      {/* Left Sidebar Navigation */}
      <div className="flex flex-col bg-dark-200 w-16 flex-shrink-0 relative">
        {/* Server List Container */}
        <div className="flex flex-col items-center py-3 space-y-2">
          {/* Chat Tab */}
          <div className="relative group">
            <button
              onClick={() => setActiveTab('chat')}
              className={`relative w-11 h-11 rounded-2xl transition-all duration-200 flex items-center justify-center group ${
                activeTab === 'chat'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'bg-dark-300 text-gray-400 hover:bg-orange-500 hover:text-white hover:rounded-xl'
              }`}
            >
              <MessageSquare className="w-6 h-6" />
            </button>
          </div>

          {/* Tasks Tab */}
          <div className="relative group">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`relative w-11 h-11 rounded-2xl transition-all duration-200 flex items-center justify-center group ${
                activeTab === 'tasks'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'bg-dark-300 text-gray-400 hover:bg-orange-500 hover:text-white hover:rounded-xl'
              }`}
            >
              <ClipboardList className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Separator */}
        <div className="mx-4 h-px bg-dark-300" />

        {/* Bottom section for future additions */}
        <div className="flex-1 flex flex-col items-center py-3 space-y-2">
          {/* Placeholder for future features */}
        </div>
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