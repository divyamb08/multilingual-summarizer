'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiTrash2, FiCalendar, FiGlobe, FiTarget, FiList, FiClock } from 'react-icons/fi';
import { SummaryHistoryItem, getSummaryHistory, deleteSummaryFromHistory } from '@/utils/localStorage';
import toast, { Toaster } from 'react-hot-toast';

export default function HistoryPage() {
  const [history, setHistory] = useState<SummaryHistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SummaryHistoryItem | null>(null);

  useEffect(() => {
    setHistory(getSummaryHistory());
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (deleteSummaryFromHistory(id)) {
      setHistory(history.filter(item => item.id !== id));
      
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
      
      toast.success('Summary deleted from history');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="max-w-6xl mx-auto">
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
    
      <div className="mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-neutral-800 dark:text-neutral-100 mb-2 flex items-center">
          <FiClock className="mr-2 text-primary-500" />
          Summary History
        </h2>
        <p className="text-neutral-600 dark:text-neutral-300">
          View and manage your previously generated summaries
        </p>
      </div>

      {history.length === 0 ? (
        <div className="glass-card rounded-2xl shadow-soft p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full w-16 h-16 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
              <FiClock className="text-neutral-400 dark:text-neutral-500" size={32} />
            </div>
          </div>
          <p className="text-neutral-600 dark:text-neutral-300 mb-4">No summaries in history yet.</p>
          <Link href="/" className="btn-primary inline-flex items-center">
            Create your first summary
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 glass-card rounded-2xl shadow-soft p-5">
            <h3 className="text-md font-semibold mb-4 flex items-center text-neutral-800 dark:text-neutral-100">
              <span className="mr-2 text-primary-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zM12.75 12a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V18a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V12z" clipRule="evenodd" />
                  <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
                </svg>

              </span>
              Recent Summaries
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    selectedItem?.id === item.id 
                      ? 'bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-900/50' 
                      : 'bg-white/50 dark:bg-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 border border-neutral-200/50 dark:border-neutral-700/30'
                  }`}
                >
                  <div className="flex justify-between">
                    <div className="w-full">
                      <div className="font-medium truncate text-neutral-800 dark:text-neutral-200">
                        {item.contentPreview.substring(0, 50)}...
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center flex-wrap">
                        <span className="flex items-center mr-1" title="Date created">
                          <FiCalendar className="mr-1" size={12} /> {formatDate(item.date).split(", ")[0]}
                        </span>
                        <span className="mx-1" title="Time">
                          {formatDate(item.date).split(", ")[1]}
                        </span>
                        <div className="w-full flex items-center mt-1">
                          <span className="flex items-center" title="Source language">
                            <FiGlobe className="mr-1" size={12} /> {item.sourceLanguage}
                          </span>
                          <span className="mx-1">→</span>
                          <span className="flex items-center" title="Target language">
                            <FiTarget className="mr-1" size={12} /> {item.targetLanguage}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="text-neutral-400 hover:text-red-500 p-1 h-fit"
                      aria-label="Delete"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="md:col-span-2 glass-card rounded-2xl shadow-soft p-5 h-fit">
            {selectedItem ? (
              <div>
                <div className="mb-4 pb-3 border-b border-neutral-200/50 dark:border-neutral-700/50">
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center flex-wrap gap-2">
                    <span className="flex items-center">
                      <FiCalendar className="mr-1.5" size={14} />
                      {formatDate(selectedItem.date)}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center text-neutral-600 dark:text-neutral-300">
                      <FiGlobe className="mr-1.5 text-primary-500" size={16} />
                      <span className="font-medium mr-1.5">Source:</span> {selectedItem.sourceLanguage}
                    </div>
                    <div className="flex items-center text-neutral-600 dark:text-neutral-300">
                      <FiTarget className="mr-1.5 text-primary-500" size={16} />
                      <span className="font-medium mr-1.5">Target:</span> {selectedItem.targetLanguage}
                    </div>
                    <div className="flex items-center text-neutral-600 dark:text-neutral-300">
                      <FiList className="mr-1.5 text-primary-500" size={16} />
                      <span className="font-medium mr-1.5">Length:</span> {selectedItem.summaryLength}
                    </div>
                  </div>
                </div>
                
                <div className="whitespace-pre-line text-neutral-700 dark:text-neutral-200 p-2">
                  {selectedItem.summary}
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-4 text-neutral-300 dark:text-neutral-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                </svg>
                <p>Select a summary from the left to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}