# Browser Use API v2 Integration

This document describes the integration of the new Browser Use API v2 methods into the agent-ui application.

## Overview

The application has been updated to use the new Browser Use API v2 endpoints while maintaining backward compatibility with the existing chat interface. The new API provides enhanced task management capabilities including:

- **List Tasks**: Get paginated list of tasks with filtering options
- **Create Task**: Create new automation tasks with advanced configuration
- **Get Task**: Retrieve detailed task information including steps and outputs
- **Update Task**: Control task execution (stop, pause, resume, stop task and session)

## API Endpoints

### 1. List Tasks
- **Endpoint**: `GET /api/v2/tasks`
- **Method**: `browserUseApi.listTasks(params)`
- **Parameters**:
  - `pageSize` (optional): Number of items per page (1-100, default: 10)
  - `pageNumber` (optional): Page number (default: 1)
  - `sessionId` (optional): Filter by session ID
  - `filterBy` (optional): Filter by status ('started', 'paused', 'finished', 'stopped')
  - `after` (optional): Filter tasks after this date
  - `before` (optional): Filter tasks before this date

### 2. Create Task
- **Endpoint**: `POST /api/v2/tasks`
- **Method**: `browserUseApi.createTask(requestData)`
- **Parameters**:
  - `task` (required): Task prompt/instruction
  - `llm` (optional): LLM model to use
  - `startUrl` (optional): URL to start the task from
  - `maxSteps` (optional): Maximum number of steps (1-200, default: 30)
  - `structuredOutput` (optional): JSON schema for structured output
  - `sessionId` (optional): Session ID to run task in
  - `metadata` (optional): Additional metadata
  - `secrets` (optional): Secrets for the task
  - `allowedDomains` (optional): Allowed domains for the task
  - `highlightElements` (optional): Highlight interactive elements (default: false)
  - `flashMode` (optional): Enable flash mode (default: false)
  - `thinking` (optional): Enable thinking mode (default: false)
  - `vision` (optional): Enable vision capabilities (default: true)
  - `systemPromptExtension` (optional): Extension to system prompt

### 3. Get Task
- **Endpoint**: `GET /api/v2/tasks/:taskId`
- **Method**: `browserUseApi.getTask(taskId)`
- **Returns**: Complete task details including steps, outputs, and metadata

### 4. Update Task
- **Endpoint**: `PATCH /api/v2/tasks/:taskId`
- **Method**: `browserUseApi.updateTask(taskId, requestData)`
- **Actions**:
  - `stop`: Stop the task
  - `pause`: Pause the task (can be resumed)
  - `resume`: Resume a paused task
  - `stop_task_and_session`: Stop task and session

## New Components

### TaskManager Component
A new React component (`/src/components/TaskManager.tsx`) that demonstrates the new API capabilities:

- **Task List**: Displays all tasks with status, creation time, and basic info
- **Task Details**: Shows detailed information for selected tasks
- **Task Actions**: Provides buttons to stop, pause, or resume tasks
- **Real-time Updates**: Refreshes task list after actions

### useBrowserUseApi Hook
A custom React hook (`/src/hooks/useBrowserUseApi.ts`) that provides:

- **Loading States**: Track API call loading states
- **Error Handling**: Centralized error management
- **Convenience Methods**: Easy-to-use methods for all API operations
- **Type Safety**: Full TypeScript support

## Usage Examples

### Basic Task Creation
```typescript
import { useBrowserUseApi } from '@/hooks/useBrowserUseApi'

function MyComponent() {
  const { createTask, loading, error } = useBrowserUseApi()

  const handleCreateTask = async () => {
    try {
      const result = await createTask({
        task: "Search for the latest news about AI",
        startUrl: "https://news.google.com",
        maxSteps: 10,
        highlightElements: true,
        vision: true
      })
      console.log('Task created:', result.id)
    } catch (err) {
      console.error('Failed to create task:', err)
    }
  }

  return (
    <button onClick={handleCreateTask} disabled={loading}>
      {loading ? 'Creating...' : 'Create Task'}
    </button>
  )
}
```

### Task Management
```typescript
import { useBrowserUseApi } from '@/hooks/useBrowserUseApi'

function TaskList() {
  const { listTasks, stopTask, pauseTask, resumeTask } = useBrowserUseApi()
  const [tasks, setTasks] = useState([])

  const loadTasks = async () => {
    const response = await listTasks({ 
      pageSize: 20, 
      filterBy: 'started' 
    })
    setTasks(response.items)
  }

  const handleStopTask = async (taskId: string) => {
    await stopTask(taskId)
    loadTasks() // Refresh the list
  }

  // ... rest of component
}
```

## Backward Compatibility

The existing chat interface continues to work unchanged. The legacy methods (`startTask`, `getTaskStatus`, `stopTask`) have been updated to use the new API internally while maintaining the same interface.

## Configuration

The API client automatically uses the `NEXT_PUBLIC_BROWSER_USE_API_KEY` environment variable for authentication. Make sure this is set in your `.env.local` file:

```env
NEXT_PUBLIC_BROWSER_USE_API_KEY=your_api_key_here
```

## Error Handling

All API methods include comprehensive error handling:

- **Network Errors**: Automatic retry logic and user-friendly error messages
- **API Errors**: Detailed error information from the API response
- **Validation Errors**: Clear messages for invalid parameters

## Type Safety

The integration includes full TypeScript support with:

- **Interface Definitions**: Complete type definitions for all API requests and responses
- **Generic Types**: Flexible typing for different use cases
- **IntelliSense**: Full autocomplete support in your IDE

## Testing

The application includes a tabbed interface where you can:

1. **Chat Interface**: Use the original chat-based task creation
2. **Task Manager**: Explore the new API capabilities with a visual interface

Switch between tabs to test both the legacy and new functionality.

## Migration Guide

If you're migrating from the old API:

1. **No Breaking Changes**: Existing code continues to work
2. **New Features**: Use the new `useBrowserUseApi` hook for enhanced functionality
3. **Gradual Migration**: Migrate components one at a time to use the new API
4. **Enhanced Capabilities**: Take advantage of new features like task pausing, session management, and advanced filtering

## API Response Changes

The new API provides more detailed responses:

- **Enhanced Step Information**: Steps now include memory, actions, and screenshot URLs
- **Better Status Tracking**: More granular status information
- **Metadata Support**: Additional metadata and configuration options
- **File Management**: Improved handling of output files

## Live View Changes

**Important Note**: The Browser Use API v2 does not provide live browser viewing URLs like the previous version. Instead, the application now provides:

- **Step-by-Step View**: Navigate through automation steps with screenshots
- **Step Details**: View detailed information about each step including actions and memory
- **Screenshot Navigation**: Browse through screenshots captured during task execution
- **Real-time Updates**: Steps are updated in real-time as the task progresses

The Browser View component automatically switches between:
1. **Live Browser View** (if available from API)
2. **Step-based Execution View** (default for API v2)
3. **No Active Session** (when no task is running)

## Performance Improvements

- **Pagination**: Efficient handling of large task lists
- **Filtering**: Server-side filtering reduces data transfer
- **Caching**: Better caching strategies for improved performance
- **Real-time Updates**: More efficient polling and update mechanisms
