'use client'

import { useState, useEffect } from 'react'
import { Monitor, Image, ExternalLink, Play, ChevronRight, X, StopCircle } from 'lucide-react'
import { useTask } from '@/context/TaskContext'
import { useSessionManagement } from '@/hooks/useSessionManagement'

export default function BrowserView() {
  const { state } = useTask()
  const { sessionStatus, sessionId, sessionLiveUrl, stopSession, createSession } = useSessionManagement()
  const [isLive, setIsLive] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [showLiveView, setShowLiveView] = useState(false)
  const [isStepPanelOpen, setIsStepPanelOpen] = useState(false)

  // Use session live URL as primary, fallback to task live URL
  const liveUrl = sessionLiveUrl || state.liveUrl

  useEffect(() => {
    if (liveUrl && (state.isRunning || sessionStatus === 'active')) {
      setIsLive(true)
      setShowLiveView(true)
    } else {
      setIsLive(false)
      // Keep showing live view if we have a URL even if not running
      setShowLiveView(!!liveUrl)
    }
  }, [liveUrl, state.isRunning, sessionStatus])

  // Update current step index when steps change
  useEffect(() => {
    if (state.steps.length > 0) {
      setCurrentStepIndex(state.steps.length - 1)
    }
  }, [state.steps])

  const currentStep = state.steps[currentStepIndex]
  const hasScreenshots = state.steps.some(step => step.screenshotUrl)

  const handleStartSession = async () => {
    try {
      await createSession()
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }


  // Debug logging
  useEffect(() => {
    console.log('BrowserView Debug:', {
      sessionStatus,
      sessionId,
      sessionLiveUrl,
      liveUrl,
      publicShareUrl: state.publicShareUrl,
      stepsLength: state.steps.length,
      currentStepIndex,
      currentStep,
      hasScreenshots,
      isRunning: state.isRunning,
      taskStatus: state.taskStatus,
      taskId: state.taskId
    })
  }, [sessionStatus, sessionId, sessionLiveUrl, liveUrl, state.publicShareUrl, state.steps.length, currentStepIndex, currentStep, hasScreenshots, state.isRunning, state.taskStatus, state.taskId])



  return (
    <div className="w-full bg-dark-100 flex flex-col h-full lg:h-screen">
      {/* Header */}
      <div className="px-6 py-4" style={{ backgroundColor: '#1a1a1a' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Monitor className="w-5 h-5 text-primary" />
            <div>
              <span className="text-white font-medium">
                {liveUrl ? 'Live Browser View' : 'Task Execution View'}
              </span>
              <p className="text-gray-400 text-sm">
                {sessionStatus === 'active' && liveUrl
                  ? 'Continuous browser session - real-time view'
                  : sessionStatus === 'creating'
                    ? 'Creating browser session...'
                    : sessionStatus === 'none'
                      ? 'No active session - start a conversation to begin'
                      : state.steps.length > 0 
                        ? 'Step-by-step automation progress'
                        : 'Start a task to see automation progress'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">

            {/* Stop Session Button */}
            {sessionId && sessionStatus === 'active' && (
              <button
                onClick={stopSession}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                title="Stop and delete current session"
              >
                <StopCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Stop Session</span>
              </button>
            )}
            
            {/* Live URL Link - Prominent in header */}
            {liveUrl && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors"
                title="Open live browser view in new tab"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm font-medium">Open Live View</span>
              </a>
            )}
            
            {liveUrl && state.steps.length > 0 && (
              <button
                onClick={() => setShowLiveView(!showLiveView)}
                className="px-3 py-1 bg-dark-400 hover:bg-dark-500 text-white text-sm rounded transition-colors"
              >
                {showLiveView ? 'Show Steps' : 'Show Live'}
              </button>
            )}
            {state.steps.length > 0 && !showLiveView && (
              <div className="flex items-center space-x-2 bg-orange-500/20 text-orange-400 px-3 py-1 rounded">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                <span className="text-sm">Executing</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4">
        {/* Live Browser View - Full Screen */}
        <div className="h-full bg-dark-200 rounded-lg overflow-hidden border border-dark-300">
          <div className="h-full">
            {showLiveView && liveUrl ? (
              <div className="h-full bg-white overflow-hidden relative">
                <iframe
                  src={liveUrl}
                  className="w-full h-full border-0"
                  title="Live Browser View"
                  allow="clipboard-read; clipboard-write; camera; microphone; geolocation"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
                />

                {/* Live Indicator Overlay */}
                {isLive && (
                  <div className="absolute bottom-4 right-4 flex items-center space-x-2 bg-black/80 text-white px-3 py-2 rounded-lg">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm">Live</span>
                  </div>
                )}

              </div>
            ) : state.steps.length > 0 ? (
              <div className="h-full flex flex-col">
                {/* Step Navigation */}
                <div className="bg-dark-300 px-4 py-3 border-b border-dark-400">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-white text-sm font-medium">
                        Step {currentStepIndex + 1} of {state.steps.length}
                      </span>
                      {currentStep && (
                        <span className="text-gray-400 text-sm truncate max-w-md">
                          {currentStep.evaluationPreviousGoal || currentStep.evaluation_previous_goal || currentStep.nextGoal || currentStep.next_goal || 'Executing action'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                        disabled={currentStepIndex === 0}
                        className="p-1 rounded hover:bg-dark-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Previous step"
                      >
                        <Play className="w-4 h-4 text-gray-400 rotate-180" />
                      </button>
                      <button
                        onClick={() => setCurrentStepIndex(Math.min(state.steps.length - 1, currentStepIndex + 1))}
                        disabled={currentStepIndex === state.steps.length - 1}
                        className="p-1 rounded hover:bg-dark-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Next step"
                      >
                        <Play className="w-4 h-4 text-gray-400" />
                      </button>
                      <div className="w-px h-6 bg-dark-400 mx-2"></div>
                      <button
                        onClick={() => setIsStepPanelOpen(!isStepPanelOpen)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          isStepPanelOpen 
                            ? 'bg-dark-400 text-white' 
                            : 'bg-dark-500 text-gray-400 hover:bg-dark-400 hover:text-white'
                        }`}
                        title={isStepPanelOpen ? 'Hide step details' : 'Show step details'}
                      >
                        {isStepPanelOpen ? 'Hide Details' : 'Show Details'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step Content */}
                <div className="flex-1 relative">
                    {/* Screenshot/Visual Area - Full Background */}
                    <div className="absolute inset-0 bg-white">
                      {currentStep?.screenshotUrl ? (
                        <img
                          src={currentStep.screenshotUrl}
                          alt={`Step ${currentStepIndex + 1} screenshot`}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            console.error('Failed to load screenshot:', currentStep.screenshotUrl)
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center bg-gray-100">
                          <div className="text-center text-gray-500">
                            <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No screenshot available for this step</p>
                            {currentStep && (
                              <p className="text-xs mt-1 text-gray-400">
                                Step: {currentStep.evaluationPreviousGoal || currentStep.evaluation_previous_goal || currentStep.nextGoal || currentStep.next_goal || 'Executing action'}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Toggle Button for Step Panel */}
                    <button
                      onClick={() => setIsStepPanelOpen(!isStepPanelOpen)}
                      className={`absolute top-4 text-white p-2 rounded-lg transition-all duration-200 z-10 shadow-lg hover:shadow-xl ${
                        isStepPanelOpen 
                          ? 'right-4 bg-dark-400 hover:bg-dark-500' 
                          : 'right-4 bg-orange-600 hover:bg-orange-700 animate-pulse'
                      }`}
                      title={isStepPanelOpen ? 'Hide step details' : 'Show step details'}
                    >
                      <div className={`transition-transform duration-200 ${isStepPanelOpen ? 'rotate-180' : ''}`}>
                        {isStepPanelOpen ? <X className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                      {!isStepPanelOpen && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      )}
                    </button>

                    {/* Backdrop */}
                    {isStepPanelOpen && (
                      <div 
                        className="absolute inset-0 bg-black/20 z-10"
                        onClick={() => setIsStepPanelOpen(false)}
                      />
                    )}

                    {/* Step Details Panel - Slides in from right */}
                    <div className={`absolute right-0 top-0 bottom-0 w-80 bg-dark-300/95 backdrop-blur-sm border-l border-dark-400 p-4 overflow-y-auto z-20 transition-all duration-300 ease-in-out shadow-2xl ${
                      isStepPanelOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-white font-medium">Step Details</h4>
                        <button
                          onClick={() => setIsStepPanelOpen(false)}
                          className="text-gray-400 hover:text-white transition-colors"
                          title="Close step details"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {currentStep && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-gray-400 text-xs uppercase tracking-wide">URL</label>
                            <p className="text-white text-sm break-all mt-1">
                              {currentStep.url}
                            </p>
                          </div>

                          {currentStep.actions && currentStep.actions.length > 0 && (
                            <div>
                              <label className="text-gray-400 text-xs uppercase tracking-wide">Actions</label>
                              <div className="mt-1 space-y-1">
                                {currentStep.actions.map((action, index) => (
                                  <div key={index} className="text-white text-sm bg-dark-400 px-2 py-1 rounded">
                                    {action}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {currentStep.memory && (
                            <div>
                              <label className="text-gray-400 text-xs uppercase tracking-wide">Memory</label>
                              <p className="text-white text-sm mt-1 bg-dark-400 p-2 rounded">
                                {currentStep.memory}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
              </div>
            ) : (
              <div className="h-full bg-dark-300 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">
                    {sessionStatus === 'none' ? 'No Active Session' : 
                     sessionStatus === 'creating' ? 'Creating Session...' :
                     'Browser View'}
                  </h3>
                  <p className="text-sm">
                    {sessionStatus === 'none' ? 'Use the "Start Session" button in the header to get started' :
                     sessionStatus === 'creating' ? 'Setting up your browser session...' :
                     'Start a task to see automation progress'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar - Always Visible */}
      <div className="px-4 lg:px-6 pb-3" style={{ backgroundColor: '#1a1a1a' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 lg:space-x-3">
            <div className={`w-2 h-2 rounded-full ${
              state.currentAction
                ? 'bg-primary animate-pulse'
                : sessionStatus === 'active' && state.isRunning
                  ? 'bg-green-500 animate-pulse'
                  : sessionStatus === 'active'
                    ? 'bg-orange-500'
                    : sessionStatus === 'creating'
                      ? 'bg-yellow-500 animate-pulse'
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
               (sessionStatus === 'active' && state.isRunning ? 'Running task in session...' :
                sessionStatus === 'active' ? 'Session active - ready for tasks' :
                sessionStatus === 'creating' ? 'Creating session...' :
                state.taskStatus === 'running' ? 'Running task...' :
                state.taskStatus === 'finished' ? 'Task completed' :
                state.taskStatus === 'failed' || state.taskStatus === 'stopped' ? 'Task failed' :
                'Idle')}
            </span>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center space-x-4">
            {sessionId && (
              <div className="text-gray-400 text-xs lg:text-sm">
                Session: {sessionId.substring(0, 8)}...
              </div>
            )}
            {state.steps.length > 0 && (
              <div className="text-gray-400 text-xs lg:text-sm">
                Step {state.steps.length}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
