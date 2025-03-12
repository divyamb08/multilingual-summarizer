'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FiSettings, FiClock, FiFileText, FiChevronDown, FiGlobe, FiTarget, FiList, FiZap, FiUpload, FiX, FiFile, FiDownload } from 'react-icons/fi';
import { Listbox } from '@headlessui/react';
import { Fragment } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { getUserPreferences, saveSummaryToHistory } from '@/utils/localStorage';
import { processContent } from '@/utils/contentProcessor';

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

export default function Home() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [summaryLength, setSummaryLength] = useState('medium');
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [processingError, setProcessingError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load user preferences
  useEffect(() => {
    const prefs = getUserPreferences();
    setTargetLanguage(prefs.defaultTargetLanguage);
    setSummaryLength(prefs.defaultSummaryLength);
  }, []);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setProcessingError(null);
    
    if (selectedFile) {
      // Check file size (max 50MB)
      const maxSizeInBytes = 50 * 1024 * 1024;
      if (selectedFile.size > maxSizeInBytes) {
        setProcessingError(`File size exceeds the maximum allowed (50MB)`);
        toast.error(`File size exceeds the maximum allowed (50MB)`);
        setFile(null);
        setFileName('');
        setFileType('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      setFile(selectedFile);
      setFileName(selectedFile.name);
      
      // Determine file type category for display
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      if (['pdf'].includes(fileExt)) {
        setFileType('PDF');
      } else if (['docx', 'doc'].includes(fileExt)) {
        setFileType('Word');
      } else if (['txt', 'md', 'rtf'].includes(fileExt)) {
        setFileType('Text');
      } else if (['html', 'htm'].includes(fileExt)) {
        setFileType('HTML');
      } else if (['csv'].includes(fileExt)) {
        setFileType('CSV');
      } else if (['xlsx', 'xls'].includes(fileExt)) {
        setFileType('Excel');
      } else if (['json'].includes(fileExt)) {
        setFileType('JSON');
      } else {
        setFileType(fileExt.toUpperCase() || 'File');
      }
      
      // Clear text content when file is selected
      if (content.trim()) {
        setContent('');
      }
    } else {
      // Reset file state if no file selected
      setFile(null);
      setFileName('');
      setFileType('');
    }
  };
  
  // Handle removing the selected file
  const handleRemoveFile = () => {
    setFile(null);
    setFileName('');
    setFileType('');
    setProcessingError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if we have content or a file to process
    if (!content.trim() && !file) {
      toast.error('Please enter content or upload a file to summarize');
      return;
    }
    
    setIsLoading(true);
    setSummary('');
    setProcessingError(null);
    
    try {
      // Use the processContent utility to get the payload with detected language
      let result;
      try {
        result = await processContent({
          content,
          file,
          targetLanguage,
          summaryLength,
          sourceLanguage
        });
      } catch (error) {
        console.error('Error processing content:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to process content';
        setProcessingError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }
      
      // Make API call to summarize content
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result.payload),
      });
      
      if (!response.ok) {
        // Clone the response before trying to read its body
        const responseClone = response.clone();
        
        try {
          const errorData = await response.json();
          // Handle specific error cases
          if (errorData.error && errorData.error.includes('Anthropic API key')) {
            throw new Error(`API key error: The Anthropic API key is missing or invalid in the server configuration.`);
          } else {
            throw new Error(errorData.error || `API error: ${response.status}`);
          }
        } catch (jsonError) {
          try {
            // Use the cloned response to read as text if JSON parsing fails
            const text = await responseClone.text();
            if (text.includes('<!DOCTYPE html>')) {
              throw new Error(`Received HTML instead of JSON. API may be down or returning an error page. Status: ${response.status}`);
            } else if (response.status === 500) {
              throw new Error(`Server error: The API key might be missing or invalid. Please check your environment configuration.`);
            } else {
              throw new Error(`Failed to generate summary. Status: ${response.status}`);
            }
          } catch (textError) {
            // If both attempts fail, return a more specific error
            if (response.status === 500) {
              throw new Error(`Server error: The API key might be missing or invalid. Please check your environment configuration.`);
            } else {
              throw new Error(`Failed to generate summary. Status: ${response.status}`);
            }
          }
        }
      }
      
      let data;
      try {
        data = await response.json();
        if (!data || !data.summary) {
          throw new Error('Incomplete response from API');
        }
        setSummary(data.summary);
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error('Invalid or incomplete response from API');
      }
      
      // Save to history
      try {
        const sourceContent = result.fileName || content;
        const contentPreview = typeof sourceContent === 'string' ? 
          sourceContent.substring(0, 200) : 
          'File: ' + result.fileName;
          
        saveSummaryToHistory({
          sourceLanguage: result.detectedLanguage === 'auto' || result.detectedLanguage === 'unknown' ? 
            'Detected' : result.detectedLanguage,
          targetLanguage,
          summaryLength,
          contentPreview,
          summary: data.summary,
          sourceType: result.sourceType || 'text',
          fileName: result.fileName || undefined
        });
        
        toast.success('Summary generated successfully');
      } catch (historyError) {
        console.error('Error saving to history:', historyError);
        // Still consider this a successful summarization even if history saving fails
        toast.success('Summary generated successfully, but could not save to history');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate summary');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 flex flex-col">
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
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }} />
      
      {/* Main Content */}
      <div className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-neutral-800 dark:text-neutral-100 mb-2">Summarize Content</h2>
        <p className="text-neutral-600 dark:text-neutral-300 max-w-3xl">
          Create concise summaries in multiple languages with our AI-powered summarization tool.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 flex-grow">
        {/* Input Section */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="glass-card p-5 sm:p-6 rounded-2xl shadow-soft mb-6">
            <div className="mb-5">
              <label htmlFor="content" className="flex items-center text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
                <FiFileText className="mr-2 text-primary-500" /> Content to Summarize
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  // Clear file input if text is entered
                  if (e.target.value.trim() && file) {
                    handleRemoveFile();
                  }
                  setProcessingError(null);
                }}
                placeholder={file ? `File selected: ${fileName}` : "Paste your text here or upload a file..."}
                className="input-field h-48 resize-none"
                disabled={!!file}
              />
              
              {/* File Upload Section */}
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="file-upload" className="flex items-center text-sm font-medium text-neutral-700 dark:text-neutral-200">
                    <FiUpload className="mr-2 text-primary-500" /> Or Upload a File
                  </label>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    Supports PDF, DOCX, TXT, HTML, CSV, and more
                  </span>
                </div>
                
                <div className="mt-2 relative">
                  {/* Custom file upload button with drag and drop */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.add('border-primary-400', 'bg-primary-50', 'dark:border-primary-700', 'dark:bg-primary-900/40');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.remove('border-primary-400', 'bg-primary-50', 'dark:border-primary-700', 'dark:bg-primary-900/40');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.remove('border-primary-400', 'bg-primary-50', 'dark:border-primary-700', 'dark:bg-primary-900/40');
                      
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        const droppedFile = e.dataTransfer.files[0];
                        // Use the existing handleFileChange logic by creating a synthetic event
                        const syntheticEvent = {
                          target: { files: e.dataTransfer.files }
                        } as React.ChangeEvent<HTMLInputElement>;
                        handleFileChange(syntheticEvent);
                      }
                    }}
                    className={`cursor-pointer border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-colors ${file ? 'border-primary-300 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/30' : 'border-neutral-300 hover:border-primary-300 dark:border-neutral-700 dark:hover:border-primary-800'}`}
                  >
                    {file ? (
                      <div className="flex flex-col items-center w-full">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center">
                            <span className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400 mr-3">
                              <FiFile size={20} />
                            </span>
                            <div>
                              <span className="text-sm font-medium truncate block max-w-[200px]">{fileName}</span>
                              <span className="text-xs text-neutral-500 dark:text-neutral-400">{fileType}</span>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile();
                            }} 
                            className="text-neutral-500 hover:text-red-500 transition-colors"
                            aria-label="Remove file"
                          >
                            <FiX size={18} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <FiUpload className="h-8 w-8 text-neutral-500 mb-2" />
                        <span className="text-sm text-neutral-600 dark:text-neutral-300 mb-1">Drag and drop a file here, or click to browse</span>
                        <span className="text-xs text-neutral-500">Maximum file size: 50MB</span>
                      </>
                    )}
                  </div>
                  
                  {/* Actual file input (hidden) */}
                  <input
                    ref={fileInputRef}
                    id="file-upload"
                    type="file"
                    onChange={handleFileChange}
                    className="sr-only"
                    accept=".pdf,.doc,.docx,.txt,.md,.rtf,.html,.htm,.csv,.xlsx,.xls,.json"
                  />
                </div>
                
                {/* Error message */}
                {processingError && (
                  <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {processingError}
                  </div>
                )}
              </div>
            </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            {/* Source Language */}
            <div>
              <label className="flex items-center text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
                <FiGlobe className="mr-2 text-primary-500" /> Source Language
              </label>
              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                className="input-field"
              >
                <option value="auto">Auto-detect</option>
                {languages.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
            
            {/* Target Language */}
            <div>
              <label className="flex items-center text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
                <FiTarget className="mr-2 text-primary-500" /> Target Language
              </label>
              <Listbox value={targetLanguage} onChange={setTargetLanguage}>
                <div className="relative">
                  <Listbox.Button className="input-field flex items-center justify-between">
                    <span className="block truncate">{targetLanguage}</span>
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
                          {({ selected, active }) => (
                            <>
                              <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                {language}
                              </span>
                              {selected && (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-500">
                                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
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
            </div>
            
            {/* Summary Length */}
            <div>
              <label className="flex items-center text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
                <FiList className="mr-2 text-primary-500" /> Summary Length
              </label>
              <select
                value={summaryLength}
                onChange={(e) => setSummaryLength(e.target.value)}
                className="input-field"
              >
                {summaryLengths.map((length) => (
                  <option key={length.id} value={length.id}>{length.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <FiZap size={18} />
            {isLoading ? 'Generating Summary...' : 'Generate Summary'}
          </button>
          </div>
        </form>
        
        {/* Output Section */}
        <div className="flex flex-col">
          <div className="glass-card p-5 sm:p-6 rounded-2xl shadow-soft h-[500px] flex flex-col">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-200/50 dark:border-neutral-700/50">
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 flex items-center">
                <span className="mr-2 text-primary-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M14.447 3.027a.75.75 0 01.527.92l-4.5 16.5a.75.75 0 01-1.448-.394l4.5-16.5a.75.75 0 01.921-.526zM16.72 6.22a.75.75 0 011.06 0l5.25 5.25a.75.75 0 010 1.06l-5.25 5.25a.75.75 0 11-1.06-1.06L21.44 12l-4.72-4.72a.75.75 0 010-1.06zm-9.44 0a.75.75 0 010 1.06L2.56 12l4.72 4.72a.75.75 0 11-1.06 1.06L.97 12.53a.75.75 0 010-1.06l5.25-5.25a.75.75 0 011.06 0z" clipRule="evenodd" />
                  </svg>
                </span>
                Generated Summary
              </h2>
              {summary && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center">
                  <span className="flex items-center mr-1">
                    <FiTarget className="mr-1" /> {targetLanguage}
                  </span>
                  •
                  <span className="flex items-center ml-1">
                    <FiList className="mx-1" /> {summaryLengths.find(l => l.id === summaryLength)?.name}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex-grow overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="relative h-12 w-12">
                    <div className="absolute top-0 left-0 right-0 bottom-0 animate-ping rounded-full bg-primary-400 opacity-75"></div>
                    <div className="relative rounded-full h-12 w-12 bg-primary-500 flex items-center justify-center">
                      <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              ) : summary ? (
                <div className="whitespace-pre-line text-neutral-700 dark:text-neutral-200 p-2">{summary}</div>
              ) : (
                <div className="text-neutral-500 dark:text-neutral-400 flex flex-col items-center justify-center h-40 p-6 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-4 text-neutral-300 dark:text-neutral-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  Generated summary will appear here
                  <p className="mt-2 text-sm">Enter your content and click Generate Summary</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="mt-12 mb-8">
        <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-6">Key Features</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-xl shadow-soft">
            <div className="rounded-full w-10 h-10 flex items-center justify-center bg-primary-100 text-primary-600 mb-3">
              <FiGlobe size={20} />
            </div>
            <h4 className="font-medium text-neutral-800 dark:text-neutral-100 mb-1">Multilingual</h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Support for 17+ languages with auto-detection</p>
          </div>
          
          <div className="glass-card p-4 rounded-xl shadow-soft">
            <div className="rounded-full w-10 h-10 flex items-center justify-center bg-primary-100 text-primary-600 mb-3">
              <FiZap size={20} />
            </div>
            <h4 className="font-medium text-neutral-800 dark:text-neutral-100 mb-1">AI-Powered</h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Claude AI for accurate and contextual summaries</p>
          </div>
          
          <div className="glass-card p-4 rounded-xl shadow-soft">
            <div className="rounded-full w-10 h-10 flex items-center justify-center bg-primary-100 text-primary-600 mb-3">
              <FiList size={20} />
            </div>
            <h4 className="font-medium text-neutral-800 dark:text-neutral-100 mb-1">Customizable</h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Choose summary length and output language</p>
          </div>
          
          <div className="glass-card p-4 rounded-xl shadow-soft">
            <div className="rounded-full w-10 h-10 flex items-center justify-center bg-primary-100 text-primary-600 mb-3">
              <FiClock size={20} />
            </div>
            <h4 className="font-medium text-neutral-800 dark:text-neutral-100 mb-1">History</h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Save and access your past summaries</p>
          </div>
        </div>
      </div>
    </div>
  );
}
