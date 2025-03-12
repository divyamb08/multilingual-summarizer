'use client';

import { useState } from 'react';
import { FiCopy, FiCheck, FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface SummaryResultProps {
  summary: string;
  isLoading: boolean;
}

export function SummaryResult({ summary, isLoading }: SummaryResultProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast.success('Summary copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };
  
  const handleDownload = () => {
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summary-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Summary downloaded');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Summary Result</h2>
        
        {!isLoading && summary && (
          <div className="flex space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              {copied ? (
                <FiCheck className="mr-1 text-green-600" />
              ) : (
                <FiCopy className="mr-1" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
            
            <button
              onClick={handleDownload}
              className="flex items-center px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <FiDownload className="mr-1" />
              Download
            </button>
          </div>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Generating summary...</p>
          <p className="text-gray-500 text-sm mt-1">This may take a minute for longer content</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-md p-4 min-h-[200px] whitespace-pre-line">
          {summary || "No summary generated yet"}
        </div>
      )}
    </div>
  );
}