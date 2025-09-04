// Context for managing task execution state and actions
'use client'

import React, { createContext, useContext, useReducer, ReactNode } from 'react'

// Browser Use API Step structure - updated for v2 API
export interface TaskStep {
  id?: string
  step?: number
  number: number
  memory: string
  evaluation_previous_goal?: string
  evaluationPreviousGoal: string
  next_goal?: string
  nextGoal: string
  url: string
  actions: string[]
  screenshotUrl: string
}

// Chat message structure
export interface ChatMessage {
  id: string
  type: 'user' | 'ai' | 'system'
  content: string
  timestamp: Date
  isTyping?: boolean
  attachments?: {
    type: 'image' | 'link' | 'file'
    url: string
    name?: string
  }[]
}

export interface TaskState {
  isRunning: boolean
  steps: TaskStep[]
  executionSummary: string | null
  startTime: string | null
  endTime: string | null
  taskId: string | null
  sessionId: string | null
  sessionStatus: 'none' | 'creating' | 'active' | 'stopped'
  sessionLiveUrl: string | null
  taskStatus: string | null
  output: any | null
  liveUrl: string | null
  publicShareUrl: string | null
  chatMessages: ChatMessage[]
  currentAction: string | null
}

export type TaskAction =
  | { type: 'START_TASK'; taskId: string; sessionId?: string }
  | { type: 'UPDATE_TASK_STATUS'; taskData: any }
  | { type: 'COMPLETE_TASK'; summary: string }
  | { type: 'STOP_TASK' }
  | { type: 'RESET_TASK' }
  | { type: 'RESET_SESSION' }
  | { type: 'ADD_CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'UPDATE_CURRENT_ACTION'; action: string | null }
  | { type: 'SET_SESSION_ID'; sessionId: string }
  | { type: 'CREATE_SESSION_START' }
  | { type: 'CREATE_SESSION_SUCCESS'; sessionId: string; sessionLiveUrl: string | null }
  | { type: 'CREATE_SESSION_ERROR' }
  | { type: 'STOP_SESSION' }

const initialState: TaskState = {
  isRunning: false,
  steps: [],
  executionSummary: null,
  startTime: null,
  endTime: null,
  taskId: null,
  sessionId: null,
  sessionStatus: 'none',
  sessionLiveUrl: null,
  taskStatus: null,
  output: null,
  liveUrl: null,
  publicShareUrl: null,
  chatMessages: [],
  currentAction: null
}

function taskReducer(state: TaskState, action: TaskAction): TaskState {
  switch (action.type) {
    case 'START_TASK':
      return {
        ...state,
        isRunning: true,
        taskId: action.taskId,
        sessionId: action.sessionId || state.sessionId, // Keep existing sessionId if not provided
        startTime: new Date().toISOString(),
        endTime: null,
        executionSummary: null,
        steps: [],
        taskStatus: 'created',
        output: null,
        liveUrl: null,
        publicShareUrl: null,
        currentAction: null
      }
    case 'UPDATE_TASK_STATUS':
      return {
        ...state,
        taskStatus: action.taskData.taskStatus,
        steps: action.taskData.steps || [],
        output: action.taskData.output,
        liveUrl: action.taskData.liveUrl,
        publicShareUrl: action.taskData.publicShareUrl
      }

    case 'COMPLETE_TASK':
      return {
        ...state,
        isRunning: false,
        executionSummary: action.summary,
        endTime: new Date().toISOString(),
        currentAction: null
      }
    case 'STOP_TASK':
      return {
        ...state,
        isRunning: false,
        taskStatus: 'stopped',
        endTime: new Date().toISOString(),
        currentAction: null
      }
    case 'RESET_TASK':
      return initialState
    case 'RESET_SESSION':
      return {
        ...state,
        sessionId: null,
        sessionStatus: 'none',
        sessionLiveUrl: null,
        isRunning: false,
        taskId: null,
        taskStatus: null,
        steps: [],
        executionSummary: null,
        startTime: null,
        endTime: null,
        output: null,
        liveUrl: null,
        publicShareUrl: null,
        currentAction: null
      }
    case 'ADD_CHAT_MESSAGE':
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.message]
      }
    case 'UPDATE_CURRENT_ACTION':
      return {
        ...state,
        currentAction: action.action
      }
    case 'SET_SESSION_ID':
      return {
        ...state,
        sessionId: action.sessionId
      }
    case 'CREATE_SESSION_START':
      return {
        ...state,
        sessionStatus: 'creating',
        currentAction: 'Creating new session...'
      }
    case 'CREATE_SESSION_SUCCESS':
      return {
        ...state,
        sessionStatus: 'active',
        sessionId: action.sessionId,
        sessionLiveUrl: action.sessionLiveUrl,
        currentAction: null
      }
    case 'CREATE_SESSION_ERROR':
      return {
        ...state,
        sessionStatus: 'none',
        currentAction: null
      }
    case 'STOP_SESSION':
      return {
        ...state,
        sessionStatus: 'stopped',
        sessionId: null,
        sessionLiveUrl: null,
        currentAction: null
      }
    
    default:
      return state
  }
}

interface TaskContextType {
  state: TaskState
  dispatch: React.Dispatch<TaskAction>
}

const TaskContext = createContext<TaskContextType | undefined>(undefined)

export function TaskProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(taskReducer, initialState)

  return (
    <TaskContext.Provider value={{ state, dispatch }}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTask() {
  const context = useContext(TaskContext)
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider')
  }
  return context
} 