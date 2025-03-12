'use client';

import { useState, useRef } from 'react';
import { extractTextFromFile } from '@/utils/fileProcessors';
import PdfViewer from '@/components/PdfViewer';
import { extractTextFromPdf } from '@/utils/newPdfUtils';

export default function PdfTest() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfArrayBuffer, setPdfArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setExtractedText('');
    setError(null);
    setPdfArrayBuffer(null);
    setShowPdfViewer(false);
    
    if (selectedFile && selectedFile.type === 'application/pdf') {
      try {
        // Read the file as ArrayBuffer for the PDF viewer
        const buffer = await selectedFile.arrayBuffer();
        setPdfArrayBuffer(buffer);
        setShowPdfViewer(true);
      } catch (err) {
        console.error('Error reading PDF file:', err);
        setError('Failed to read PDF file');
      }
    }
  };

  const handleExtract = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (file.type === 'application/pdf' && pdfArrayBuffer) {
        // Use our new PDF extraction utility directly for better results
        console.log('Extracting text using new PDF utility...');
        const text = await extractTextFromPdf(pdfArrayBuffer);
        setExtractedText(text);
        console.log('PDF text extraction complete');
      } else {
        // Use the existing file processor for other file types
        console.log('Extracting text using general file processor...');
        const result = await extractTextFromFile(file);
        setExtractedText(result.text);
      }
    } catch (err) {
      console.error('Text extraction error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">PDF Test Page</h1>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Select PDF File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
            />
          </div>
          
          {file && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Selected file: <span className="font-medium">{file.name}</span> ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            </div>
          )}
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleExtract}
              disabled={!file || isLoading}
              className={`px-4 py-2 rounded-md text-white ${isLoading || !file ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isLoading ? 'Processing...' : 'Extract Text'}
            </button>
            
            <button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
                setFile(null);
                setExtractedText('');
                setError(null);
                setPdfArrayBuffer(null);
                setShowPdfViewer(false);
              }}
              className="px-4 py-2 rounded-md text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Clear
            </button>
          </div>
        </div>
        
        {showPdfViewer && pdfArrayBuffer && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-medium mb-4 text-gray-800 dark:text-white">PDF Preview</h2>
            <div className="pdf-container mb-4 max-h-[600px] overflow-auto">
              <PdfViewer file={pdfArrayBuffer} />
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-md mb-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
        
        {extractedText && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-medium mb-4 text-gray-800 dark:text-white">Extracted Text</h2>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 font-mono text-sm overflow-auto max-h-[600px]">
              <pre className="whitespace-pre-wrap">{extractedText}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
