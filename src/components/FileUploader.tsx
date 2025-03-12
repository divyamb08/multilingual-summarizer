'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiFile } from 'react-icons/fi';
import { extractTextFromFile } from '@/utils/fileProcessors';
import toast from 'react-hot-toast';

interface FileUploaderProps {
  onFileContent: (text: string, fileType: string) => void;
}

export function FileUploader({ onFileContent }: FileUploaderProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    const maxSize = parseInt(process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE || '10485760'); // 10MB default
    
    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`);
      return;
    }
    
    setFileName(file.name);
    setIsProcessing(true);
    
    try {
      const { text, type } = await extractTextFromFile(file);
      onFileContent(text, type);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process file. Unsupported format or corrupted file.');
    } finally {
      setIsProcessing(false);
    }
  }, [onFileContent]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'text/html': ['.html', '.htm'],
    },
    maxFiles: 1,
  });

  return (
    <div 
      {...getRootProps()} 
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
      }`}
    >
      <input {...getInputProps()} />
      
      {isProcessing ? (
        <div className="flex flex-col items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-gray-600">Processing file...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-4">
          {fileName ? (
            <>
              <FiFile className="text-blue-600 text-3xl mb-2" />
              <p className="text-gray-800 font-medium">{fileName}</p>
              <p className="text-gray-500 text-sm mt-1">Click or drag to replace</p>
            </>
          ) : (
            <>
              <FiUpload className="text-gray-400 text-3xl mb-2" />
              <p className="text-gray-800 font-medium">
                {isDragActive ? 'Drop the file here' : 'Click or drag file to upload'}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Supports PDF, DOCX, DOC, TXT, HTML (max 10MB)
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}