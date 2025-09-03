// 🎯 AUTOMATION TASK CONFIGURATION
// Easy customization for different use cases - just edit the tasks below!

export interface AppConfig {
  title: string
  description: string
  instructions: {
    simple: string
    advanced: string
  }
  examples: string[]
  branding: {
    companyName: string
    tagline: string
  }
}

export interface TaskConfig {
  id: string
  name: string
  description: string
  prompt: string
  allowedDomains?: string[]
  maxSteps?: number
  llmModel?: 'gemini-2.5-flash'
  structuredOutput?: object
}

// 🚀 STARTUP ANALYSIS TASK (Default)
export const STARTUP_ANALYSIS: TaskConfig = {
  id: 'startup-analysis',
  name: 'Startup Analysis',
  description: 'Comprehensive startup analysis including funding, team, and market research',
  prompt: `Analyze the startup company "{companyName}"{websiteContext}. Please conduct comprehensive analysis including:

🔍 **Analysis Steps:**
1. **Company Discovery**: Find basic company information, founding details, and web presence
2. **Funding Analysis**: Research funding rounds, investors, valuations, and financial data from Crunchbase, PitchBook
3. **Team Research**: Analyze leadership team, key personnel, and organizational structure via LinkedIn
4. **Market Position**: Evaluate competitive landscape, market size, and positioning
5. **News & Updates**: Find recent news, press releases, and market mentions
6. **Generate Report**: Compile findings into comprehensive research report

📊 **Data to Collect:**
- Company overview (founded, headquarters, industry, description)
- Funding details (total raised, rounds, investors, valuations)
- Team composition (leadership, key executives, team size)
- Market analysis (competitors, market size, competitive advantage)
- Recent news and developments

💾 **Save Findings To:**
- Company overview and basic info (JSON format)
- Funding data with investor details (CSV/Excel format)
- Team composition and leadership profiles (JSON format)
- Market analysis and competitive data (JSON format)
- Final comprehensive research report (PDF or structured text)
- Screenshots of key findings for documentation

🎯 **Focus Areas:**
- Be thorough and factual
- Cross-reference information from multiple sources
- Include specific numbers, dates, and details when available
- Take screenshots of important data sources`,

  maxSteps: 150,
  llmModel: 'gemini-2.5-flash',
  structuredOutput: {
    type: 'object',
    properties: {
      company_overview: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          founded: { type: 'string' },
          headquarters: { type: 'string' },
          industry: { type: 'string' },
          description: { type: 'string' },
          website: { type: 'string' },
          employee_count: { type: 'string' }
        }
      },
      funding_summary: {
        type: 'object',
        properties: {
          total_funding: { type: 'string' },
          last_round: { type: 'string' },
          last_round_amount: { type: 'string' },
          investors: { type: 'array', items: { type: 'string' } },
          valuation: { type: 'string' },
          funding_date: { type: 'string' }
        }
      },
      team_summary: {
        type: 'object',
        properties: {
          team_size: { type: 'string' },
          leadership: { type: 'array', items: { type: 'string' } },
          key_executives: { type: 'array', items: { type: 'string' } },
          founders: { type: 'array', items: { type: 'string' } }
        }
      },
      market_analysis: {
        type: 'object',
        properties: {
          market_size: { type: 'string' },
          competitors: { type: 'array', items: { type: 'string' } },
          competitive_advantage: { type: 'string' },
          market_position: { type: 'string' }
        }
      }
    }
  }
}



// 🎯 DEFAULT TASK (what gets used if no specific task is selected)
export const DEFAULT_TASK = STARTUP_ANALYSIS



// 🎨 APP CONFIGURATION
// Customize your app's branding, title, and instructions here!
export const APP_CONFIG: AppConfig = {
  title: "Browser Use Studio",
  description: "AI-powered browser automation for any task",
  instructions: {
    simple: "Enter any task or prompt and watch AI automate it in real-time",
    advanced: "Describe what you want to accomplish and let AI handle the browser automation"
  },
  examples: [
    "Research the latest AI trends",
    "Book a flight to Paris", 
    "Find the best restaurants in NYC",
    "Analyze competitor pricing",
    "Sign up for a newsletter"
  ],
  branding: {
    companyName: "Browser Use Studio",
    tagline: "AI Automation Made Simple"
  }
}



export function getAppConfig(): AppConfig {
  return APP_CONFIG
} 