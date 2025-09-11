// Action Parser Service
// Extracts browser actions from AI responses

export interface ParsedAction {
  type: 'browser' | 'idle' | 'none'
  command: string | null
  originalText: string
  cleanedText: string
}

export function parseActionFromText(text: string): ParsedAction {
  // Look for <action>browser("...")</action> pattern
  const actionRegex = /<action>browser\("([^"]*)"\)<\/action>/g
  const match = actionRegex.exec(text)
  
  if (match) {
    const command = match[1].trim()
    const cleanedText = text.replace(actionRegex, '').trim()
    
    return {
      type: command.toLowerCase() === 'idle' ? 'idle' : 'browser',
      command: command.toLowerCase() === 'idle' ? null : command,
      originalText: text,
      cleanedText: cleanedText
    }
  }
  
  // No action found
  return {
    type: 'none',
    command: null,
    originalText: text,
    cleanedText: text
  }
}

export function hasBrowserAction(text: string): boolean {
  const actionRegex = /<action>browser\("([^"]*)"\)<\/action>/
  return actionRegex.test(text)
}
