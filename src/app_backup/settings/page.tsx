'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiSave, FiTarget, FiList, FiMoon, FiSettings } from 'react-icons/fi';
import { UserPreferences, getUserPreferences, saveUserPreferences } from '@/utils/localStorage';
import { Listbox, Switch } from '@headlessui/react';
import { FiCheck, FiChevronDown } from 'react-icons/fi';
import { Fragment } from 'react';
import toast, { Toaster } from 'react-hot-toast';

const languages = [
  'English', 'Spanish', 'French', 'German', 'Italian', 
  'Portuguese', 'Dutch', 'Russian', 'Chinese', 'Japanese', 
  'Korean', 'Arabic', 'Hindi', 'Bengali', 'Turkish', 
  'Thai', 'Vietnamese'
];

const summaryLengths = [
  { id: 'short', name: 'Short (1-2 paragraphs)' },
  { id: 'medium', name: 'Medium (3-4 paragraphs)' },
  { id: 'long', name: 'Long (5+ paragraphs)' },
];

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<UserPreferences>({
    defaultTargetLanguage: 'English',
    defaultSummaryLength: 'medium',
    darkMode: false,
  });

  useEffect(() => {
    setPreferences(getUserPreferences());
  }, []);

  const handleSave = () => {
    saveUserPreferences(preferences);
    toast.success('Preferences saved successfully');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Toaster position="top-right" toastOptions={{
        style: {
          borderRadius: '10px',
          background: '#fff',
          color: '#0f172a',
          boxShadow: '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        },
        success: {
          iconTheme: {
            primary: '#0ea5e9',
            secondary: '#fff',
          },
        },
      }} />

      <div className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-neutral-800 dark:text-neutral-100 mb-2 flex items-center">
          <FiSettings className="mr-2 text-primary-500" />
          Settings
        </h2>
        <p className="text-neutral-600 dark:text-neutral-300">
          Customize your summarization preferences
        </p>
      </div>

      <div className="glass-card rounded-2xl shadow-soft p-6">
        <div className="space-y-8">
          {/* Default Target Language */}
          <div>
            <label className="flex items-center text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
              <FiTarget className="mr-2 text-primary-500" /> 
              Default Target Language
            </label>
            <Listbox 
              value={preferences.defaultTargetLanguage} 
              onChange={(value) => setPreferences({...preferences, defaultTargetLanguage: value})}
            >
              <div className="relative">
                <Listbox.Button className="input-field flex items-center justify-between">
                  <span className="block truncate">{preferences.defaultTargetLanguage}</span>
                  <FiChevronDown className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                </Listbox.Button>
                <Fragment>
                  <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white dark:bg-neutral-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none">
                    {languages.map((language) => (
                      <Listbox.Option
                        key={language}
                        value={language}
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-10 pr-4 ${
                            active ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'text-neutral-800 dark:text-neutral-200'
                          }`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                              {language}
                            </span>
                            {selected && (
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-500">
                                <FiCheck className="h-5 w-5" aria-hidden="true" />
                              </span>
                            )}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Fragment>
              </div>
            </Listbox>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">The language your summaries will be generated in by default.</p>
          </div>
          
          {/* Default Summary Length */}
          <div>
            <label className="flex items-center text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
              <FiList className="mr-2 text-primary-500" />
              Default Summary Length
            </label>
            <Listbox 
              value={preferences.defaultSummaryLength} 
              onChange={(value) => setPreferences({...preferences, defaultSummaryLength: value})}
            >
              <div className="relative">
                <Listbox.Button className="input-field flex items-center justify-between">
                  <span className="block truncate">
                    {summaryLengths.find(l => l.id === preferences.defaultSummaryLength)?.name}
                  </span>
                  <FiChevronDown className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                </Listbox.Button>
                <Fragment>
                  <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white dark:bg-neutral-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none">
                    {summaryLengths.map((length) => (
                      <Listbox.Option
                        key={length.id}
                        value={length.id}
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-10 pr-4 ${
                            active ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'text-neutral-800 dark:text-neutral-200'
                          }`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                              {length.name}
                            </span>
                            {selected && (
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-500">
                                <FiCheck className="h-5 w-5" aria-hidden="true" />
                              </span>
                            )}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Fragment>
              </div>
            </Listbox>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">The default length for your generated summaries.</p>
          </div>
          
          {/* Dark Mode Toggle */}
          <div>
            <div className="flex items-center justify-between py-2">
              <label className="flex items-center text-sm font-medium text-neutral-700 dark:text-neutral-200">
                <FiMoon className="mr-2 text-primary-500" />
                Enable Dark Mode
                <span className="ml-2 text-xs font-normal text-neutral-500 dark:text-neutral-400">(Coming Soon)</span>
              </label>
              <Switch
                checked={preferences.darkMode}
                onChange={(checked) => setPreferences({...preferences, darkMode: checked})}
                className={`${
                  preferences.darkMode ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-700'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    preferences.darkMode ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            </div>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 pl-6">Switch between light and dark theme for the application (functionality coming soon).</p>
          </div>
          
          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              className="btn-primary flex items-center justify-center w-full gap-2"
            >
              <FiSave size={18} />
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}