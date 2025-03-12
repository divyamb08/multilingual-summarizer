import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { FiSettings, FiClock, FiFileText, FiChevronDown, FiGlobe, FiTarget, FiList, FiZap, FiUpload, FiX, FiFile, FiDownload, FiHome } from 'react-icons/fi';
import { Listbox } from '@headlessui/react';
import { Fragment } from 'react';
import toast, { Toaster } from 'react-hot-toast';
// We'll fix these imports once we move the utility files
import { getUserPreferences, saveSummaryToHistory } from '../utils/localStorage';
import { processContent } from '../utils/contentProcessor';

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
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-neutral-900 dark:to-neutral-950 p-4 sm:p-6 md:p-8 flex flex-col">
      <Head>
        <title>Multilingual Content Summarizer</title>
        <meta name="description" content="Summarize content in any language using AI" />
      </Head>

      <header className="sticky top-0 z-10 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-sky-100 dark:border-neutral-800 mb-6">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="" className="flex items-center" aria-label="Multilingual Summarizer Home">
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 transition-all duration-300">
              Multilingual Summarizer
            </span>
          </Link>
          <nav className="hidden md:flex items-center space-x-1">
            <Link href="" className="px-3 py-2 rounded-xl text-neutral-600 hover:text-sky-500 hover:bg-sky-50 dark:text-neutral-200 dark:hover:text-sky-400 dark:hover:bg-sky-900/20 transition-all duration-200">
              <span className="flex items-center"><FiHome className="mr-1.5" /> Home</span>
            </Link>
            <Link href="/history" className="px-3 py-2 rounded-xl text-neutral-600 hover:text-sky-500 hover:bg-sky-50 dark:text-neutral-200 dark:hover:text-sky-400 dark:hover:bg-sky-900/20 transition-all duration-200">
              <span className="flex items-center"><FiClock className="mr-1.5" /> History</span>
            </Link>
            <Link href="/settings" className="px-3 py-2 rounded-xl text-neutral-600 hover:text-sky-500 hover:bg-sky-50 dark:text-neutral-200 dark:hover:text-sky-400 dark:hover:bg-sky-900/20 transition-all duration-200">
              <span className="flex items-center"><FiSettings className="mr-1.5" /> Settings</span>
            </Link>
            <Link href="/pdf-test" className="px-3 py-2 rounded-xl text-neutral-600 hover:text-sky-500 hover:bg-sky-50 dark:text-neutral-200 dark:hover:text-sky-400 dark:hover:bg-sky-900/20 transition-all duration-200">
              <span className="flex items-center"><FiFileText className="mr-1.5" /> PDF Test</span>
            </Link>
          </nav>
          <div className="flex md:hidden gap-2">
            <Link href="" className="p-2 text-neutral-600 hover:text-sky-500 dark:text-neutral-200 dark:hover:text-sky-400 transition-all duration-200" aria-label="Home">
              <FiHome size={22} />
            </Link>
            <Link href="/history" className="p-2 text-neutral-600 hover:text-sky-500 dark:text-neutral-200 dark:hover:text-sky-400 transition-all duration-200" aria-label="History">
              <FiClock size={22} />
            </Link>
            <Link href="/settings" className="p-2 text-neutral-600 hover:text-sky-500 dark:text-neutral-200 dark:hover:text-sky-400 transition-all duration-200" aria-label="Settings">
              <FiSettings size={22} />
            </Link>
            <Link href="/pdf-test" className="p-2 text-neutral-600 hover:text-sky-500 dark:text-neutral-200 dark:hover:text-sky-400 transition-all duration-200" aria-label="PDF Test">
              <FiFileText size={22} />
            </Link>
          </div>
        </div>
      </header>

      <Toaster position="top-right" toastOptions={{
        style: {
          borderRadius: '12px',
          background: '#fff',
          color: '#0f172a',
          boxShadow: '0 8px 30px -2px rgba(0, 0, 0, 0.05), 0 1px 3px -1px rgba(0, 0, 0, 0.04)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          padding: '12px 16px',
        },
        success: {
          iconTheme: {
            primary: '#38bdf8',
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
        <h2 className="text-2xl md:text-3xl font-bold text-neutral-800 dark:text-neutral-100 mb-3">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-blue-600">
            Summarize Content
          </span>
        </h2>
        <p className="text-neutral-600 dark:text-neutral-300 max-w-3xl text-lg leading-relaxed">
          Create concise summaries in multiple languages with our AI-powered summarization tool.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 flex-grow max-w-7xl mx-auto w-full">
        {/* Input Section */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="glass-card p-6 sm:p-7 rounded-2xl shadow-soft mb-6 backdrop-blur-sm border-sky-100/80 dark:border-sky-900/30">
            <div className="mb-6">
              <label htmlFor="content" className="flex items-center text-base font-medium text-neutral-700 dark:text-neutral-100 mb-2.5">
                <FiFileText className="mr-2 text-sky-500" /> Content to Summarize
              </label>
              <div className="relative">
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
                  className="input-field h-56 resize-none text-base focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-700 transition-all duration-200"
                  disabled={!!file}
                />
                {!content && !file && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40 transition-opacity duration-300">
                    <div className="text-center text-neutral-400 dark:text-neutral-500 hidden sm:block">
                      <FiFileText className="mx-auto h-10 w-10 mb-2 text-sky-300/50 dark:text-sky-800/50" />
                      <p className="text-sm">Start typing or upload a file</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* File Upload Section */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <label htmlFor="file-upload" className="flex items-center text-base font-medium text-neutral-700 dark:text-neutral-100">
                    <FiUpload className="mr-2 text-sky-500" /> Or Upload a File
                  </label>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    Supports PDF, DOCX, TXT, HTML, CSV, and more
                  </span>
                </div>
                
                <div className="mt-3 relative">
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
                      e.currentTarget.classList.add('border-sky-400', 'bg-sky-50', 'dark:border-sky-700', 'dark:bg-sky-900/20');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.remove('border-sky-400', 'bg-sky-50', 'dark:border-sky-700', 'dark:bg-sky-900/20');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.remove('border-sky-400', 'bg-sky-50', 'dark:border-sky-700', 'dark:bg-sky-900/20');
                      
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        const droppedFile = e.dataTransfer.files[0];
                        // Use the existing handleFileChange logic by creating a synthetic event
                        const syntheticEvent = {
                          target: { files: e.dataTransfer.files }
                        } as React.ChangeEvent<HTMLInputElement>;
                        handleFileChange(syntheticEvent);
                      }
                    }}
                    className={`cursor-pointer border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all ${file ? 'border-sky-300 bg-sky-50/70 dark:border-sky-800 dark:bg-sky-900/20' : 'border-neutral-200 hover:border-sky-300 hover:bg-sky-50/50 dark:border-neutral-700 dark:hover:border-sky-800 dark:hover:bg-sky-900/10'}`}
                  >
                    {file ? (
                      <div className="flex flex-col items-center w-full">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center">
                            <span className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400 mr-4 shadow-sm">
                              <FiFile size={24} />
                            </span>
                            <div>
                              <span className="text-base font-medium truncate block max-w-[200px]">{fileName}</span>
                              <span className="text-sm text-neutral-500 dark:text-neutral-400">{fileType}</span>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile();
                            }} 
                            className="p-1 text-neutral-500 hover:text-red-500 transition-colors"
                          >
                            <FiX size={18} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="inline-flex items-center justify-center w-14 h-14 mb-3 rounded-full bg-sky-100/50 text-sky-500 dark:bg-sky-900/20 dark:text-sky-400">
                          <FiUpload size={28} />
                        </div>
                        <span className="text-base text-neutral-600 dark:text-neutral-300 mb-2 font-medium">
                          Drag and drop a file here
                        </span>
                        <span className="text-neutral-500 dark:text-neutral-400 text-sm">
                          or <span className="text-sky-500 dark:text-sky-400">browse files</span>
                        </span>
                        <span className="text-xs text-neutral-400 mt-2">Supports PDF, DOCX, TXT and more • Maximum 50MB</span>
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
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
            {/* Source Language */}
            <div>
              <label className="flex items-center text-base font-medium text-neutral-700 dark:text-neutral-100 mb-2.5">
                <FiGlobe className="mr-2 text-sky-500" /> Source Language
              </label>
              <div className="relative">
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  className="input-field appearance-none pr-10"
                >
                  <option value="auto">Auto-detect</option>
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500">
                  <FiChevronDown size={18} />
                </div>
              </div>
            </div>
            
            {/* Target Language */}
            <div>
              <label className="flex items-center text-base font-medium text-neutral-700 dark:text-neutral-100 mb-2.5">
                <FiTarget className="mr-2 text-sky-500" /> Target Language
              </label>
              <div className="relative">
                <select 
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="input-field appearance-none pr-10"
                >
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500">
                  <FiChevronDown size={18} />
                </div>
              </div>
            </div>
            
            {/* Length */}
            <div>
              <label className="flex items-center text-base font-medium text-neutral-700 dark:text-neutral-100 mb-2.5">
                <FiList className="mr-2 text-sky-500" /> Summary Length
              </label>
              <div className="relative">
                <select
                  value={summaryLength}
                  onChange={(e) => setSummaryLength(e.target.value)}
                  className="input-field appearance-none pr-10"
                >
                  {summaryLengths.map((length) => (
                    <option key={length.id} value={length.id}>{length.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500">
                  <FiChevronDown size={18} />
                </div>
              </div>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading || (!content.trim() && !file)}
            className="primary-button flex items-center justify-center text-base mt-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Summary...
              </>
            ) : (
              <>
                <FiZap className="mr-2.5" size={20} /> Generate Summary
              </>
            )}
          </button>
          </div>
        </form>

        {/* Output Section */}
        <div className="flex flex-col h-full">
          <div className={`glass-card p-6 sm:p-7 rounded-2xl shadow-soft mb-4 flex-grow backdrop-blur-sm border-sky-100/80 dark:border-sky-900/30 ${!summary ? 'flex items-center justify-center' : ''}`}>
            <div className="w-full">
              {summary ? (
                <>
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-blue-600">Summary</h3>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(summary);
                        toast.success('Summary copied to clipboard');
                      }}
                      className="text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300 flex items-center text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all duration-200"
                    >
                      <FiDownload className="mr-1.5" size={16} /> Copy
                    </button>
                  </div>
                  <div className="prose prose-sky dark:prose-invert prose-p:text-neutral-700 dark:prose-p:text-neutral-300 prose-p:leading-relaxed prose-p:mb-4 max-w-none">
                    {summary.split('\n').map((paragraph, i) => (
                      paragraph ? <p key={i} className="text-base">{paragraph}</p> : <br key={i} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center text-neutral-500 dark:text-neutral-400">
                  <div className="p-6 bg-sky-50/50 dark:bg-sky-900/10 inline-block rounded-full mb-4">
                    <FiFileText className="mx-auto h-14 w-14 text-sky-400/70 dark:text-sky-500/70" />
                  </div>
                  <p className="text-lg">Your summary will appear here</p>
                  <p className="text-sm mt-2 text-neutral-400 dark:text-neutral-500">Enter text or upload a file and click Generate</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
