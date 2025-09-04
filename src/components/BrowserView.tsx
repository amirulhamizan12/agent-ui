'use client'

import { useState, useEffect } from 'react'
import { Monitor } from 'lucide-react'
import { useTask } from '@/context/TaskContext'

export default function BrowserView() {
  const { state } = useTask()
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    if (state.liveUrl && state.isRunning) {
      setIsLive(true)
    } else {
      setIsLive(false)
    }
  }, [state.liveUrl, state.isRunning])



  return (
    <div className="w-full bg-dark-100 flex flex-col h-full lg:h-screen">
      {/* Header */}
      <div className="bg-dark-200 border-b border-dark-300 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Monitor className="w-5 h-5 text-primary" />
            <div>
              <span className="text-white font-medium">Live Browser View</span>
              <p className="text-gray-400 text-sm">Real-time automation in progress</p>
            </div>
          </div>
          {isLive && (
            <div className="flex items-center space-x-2 bg-black/50 text-white px-3 py-1 rounded">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm">Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4">
        {/* Live Browser View - Full Screen */}
        <div className="h-full bg-dark-200 rounded-lg overflow-hidden border border-dark-300">
          <div className="h-full">
            {state.liveUrl ? (
              <div className="h-full bg-white overflow-hidden relative">
                <iframe
                  src={state.liveUrl}
                  className="w-full h-full border-0"
                  title="Live Browser View"
                />

                {/* Live Indicator Overlay */}
                {isLive && (
                  <div className="absolute bottom-4 right-4 flex items-center space-x-2 bg-black/80 text-white px-3 py-2 rounded-lg">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm">Live</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full bg-dark-300 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Active Session</h3>
                  <p className="text-sm">Start a conversation to see the AI assistant in action</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar - Always Visible */}
      <div className="border-t border-dark-300 bg-dark-200 px-4 lg:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 lg:space-x-3">
            <div className={`w-2 h-2 rounded-full ${
              state.currentAction
                ? 'bg-primary animate-pulse'
                : state.taskStatus === 'running'
                  ? 'bg-green-500 animate-pulse'
                  : state.taskStatus === 'finished'
                    ? 'bg-green-500'
                    : state.taskStatus === 'failed' || state.taskStatus === 'stopped'
                      ? 'bg-red-500'
                      : 'bg-gray-500'
            }`}></div>
            <span className="text-gray-300 text-xs lg:text-sm truncate">
              {state.currentAction ||
               (state.taskStatus === 'running' ? 'Running task...' :
                state.taskStatus === 'finished' ? 'Task completed' :
                state.taskStatus === 'failed' || state.taskStatus === 'stopped' ? 'Task failed' :
                'Idle')}
            </span>
          </div>

          {/* Progress Indicator */}
          {state.steps.length > 0 && (
            <div className="text-gray-400 text-xs lg:text-sm">
              Step {state.steps.length} of {state.steps.length + 1}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
