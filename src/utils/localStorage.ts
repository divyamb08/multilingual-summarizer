// Types for summary history
export interface SummaryHistoryItem {
    id: string;
    date: string;
    sourceLanguage: string;
    targetLanguage: string;
    summaryLength: string;
    contentPreview: string;
    summary: string;
    sourceType?: string; // 'text', 'PDF', 'DOCX', etc.
    fileName?: string;  // Original filename if applicable
  }
  
  export interface UserPreferences {
    defaultTargetLanguage: string;
    defaultSummaryLength: string;
    darkMode: boolean;
  }
  
  const HISTORY_KEY = 'summary_history';
  const PREFERENCES_KEY = 'user_preferences';
  
  // Save summary to history
  export function saveSummaryToHistory(item: Omit<SummaryHistoryItem, 'id' | 'date'>): SummaryHistoryItem {
    // Check if localStorage is available (client-side only)
    if (typeof window === 'undefined') {
      // Return a dummy item in case this is called server-side
      return {
        ...item,
        id: 'server-side',
        date: new Date().toISOString(),
      };
    }
    
    const history = getSummaryHistory();
    
    const newItem: SummaryHistoryItem = {
      ...item,
      id: generateId(),
      date: new Date().toISOString(),
    };
    
    // Add to beginning of array, limit to 20 items
    const updatedHistory = [newItem, ...history].slice(0, 20);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    
    return newItem;
  }
  
  // Get summary history
  export function getSummaryHistory(): SummaryHistoryItem[] {
    try {
      // Check if localStorage is available (client-side only)
      if (typeof window === 'undefined') {
        return [];
      }
      
      const history = localStorage.getItem(HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Failed to parse summary history:', error);
      return [];
    }
  }
  
  // Delete summary from history
  export function deleteSummaryFromHistory(id: string): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    
    const history = getSummaryHistory();
    const updatedHistory = history.filter(item => item.id !== id);
    
    if (updatedHistory.length !== history.length) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
      return true;
    }
    
    return false;
  }
  
  // Get user preferences
  export function getUserPreferences(): UserPreferences {
    try {
      if (typeof window === 'undefined') {
        return {
          defaultTargetLanguage: 'English',
          defaultSummaryLength: 'medium',
          darkMode: false,
        };
      }
      
      const preferences = localStorage.getItem(PREFERENCES_KEY);
      return preferences ? JSON.parse(preferences) : {
        defaultTargetLanguage: 'English',
        defaultSummaryLength: 'medium',
        darkMode: false,
      };
    } catch (error) {
      console.error('Failed to parse user preferences:', error);
      return {
        defaultTargetLanguage: 'English',
        defaultSummaryLength: 'medium',
        darkMode: false,
      };
    }
  }
  
  // Save user preferences
  export function saveUserPreferences(preferences: UserPreferences): void {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  }
  
  // Helper function to generate a unique ID
  function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }