import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getUserPreferences, saveUserPreferences, UserPreferences } from '../utils/localStorage';

export default function SettingsPage() {
  // State for user preferences
  const [preferences, setPreferences] = useState<UserPreferences>({
    defaultTargetLanguage: 'English',
    defaultSummaryLength: 'medium',
    darkMode: false,
  });

  // State for save confirmation
  const [saveConfirmation, setSaveConfirmation] = useState<string>('');

  // Language options for selection
  const languageOptions = [
    'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
    'Dutch', 'Russian', 'Chinese', 'Japanese', 'Korean', 'Arabic',
    'Hindi', 'Bengali', 'Turkish', 'Thai', 'Vietnamese'
  ];

  // Summary length options
  const summaryLengthOptions = [
    { value: 'short', label: 'Short (1-2 paragraphs)' },
    { value: 'medium', label: 'Medium (3-4 paragraphs)' },
    { value: 'long', label: 'Long (5+ paragraphs)' }
  ];

  // Load user preferences on mount
  useEffect(() => {
    const savedPreferences = getUserPreferences();
    setPreferences(savedPreferences);
  }, []);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox (dark mode toggle)
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setPreferences(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      // Handle select inputs
      setPreferences(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Save preferences
  const saveSettings = () => {
    saveUserPreferences(preferences);
    setSaveConfirmation('Settings saved successfully!');
    
    // Apply dark mode if changed
    if (preferences.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Clear confirmation message after a delay
    setTimeout(() => {
      setSaveConfirmation('');
    }, 3000);
  };

  return (
    <div className="min-h-screen p-6">
      <Head>
        <title>Settings - Multilingual Summarizer</title>
        <meta name="description" content="Configure your preferences for the Multilingual Summarizer" />
      </Head>

      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Settings</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            Back to Home
          </Link>
        </div>
      </header>

      <main>
        <div className="max-w-2xl mx-auto bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">User Preferences</h2>
          
          {/* Default Target Language */}
          <div className="mb-4">
            <label htmlFor="defaultTargetLanguage" className="block text-sm font-medium text-gray-700 mb-1">
              Default Target Language
            </label>
            <select
              id="defaultTargetLanguage"
              name="defaultTargetLanguage"
              value={preferences.defaultTargetLanguage}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {languageOptions.map(language => (
                <option key={language} value={language}>{language}</option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">This will be the default language for your summaries</p>
          </div>
          
          {/* Default Summary Length */}
          <div className="mb-4">
            <label htmlFor="defaultSummaryLength" className="block text-sm font-medium text-gray-700 mb-1">
              Default Summary Length
            </label>
            <select
              id="defaultSummaryLength"
              name="defaultSummaryLength"
              value={preferences.defaultSummaryLength}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {summaryLengthOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">This will be the default length for your summaries</p>
          </div>
          
          {/* Dark Mode Toggle */}
          <div className="mb-6">
            <label htmlFor="darkMode" className="inline-flex items-center cursor-pointer">
              <input
                id="darkMode"
                name="darkMode"
                type="checkbox"
                checked={preferences.darkMode}
                onChange={handleInputChange}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">Dark Mode</span>
            </label>
          </div>
          
          {/* Save Button */}
          <button
            onClick={saveSettings}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
          >
            Save Settings
          </button>
          
          {/* Save Confirmation */}
          {saveConfirmation && (
            <div className="mt-3 p-2 text-center text-green-700 bg-green-100 rounded">
              {saveConfirmation}
            </div>
          )}
        </div>
        
        <div className="max-w-2xl mx-auto bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">About Multilingual Summarizer</h2>
          <p className="text-gray-700 mb-2">
            Multilingual Summarizer uses advanced AI to generate concise summaries of text in multiple languages.
          </p>
          <p className="text-gray-700 mb-2">
            Your settings are saved locally on your device and are not sent to any server.
          </p>
          <p className="text-gray-700">
            Version: 1.0.0
          </p>
        </div>
      </main>
    </div>
  );
}
