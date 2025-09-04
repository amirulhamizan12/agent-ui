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