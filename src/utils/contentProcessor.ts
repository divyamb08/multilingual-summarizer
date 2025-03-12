'use client';

/**
 * Content processor utility for handling text and file inputs
 * Prepares content for summarization by detecting language and chunking if needed
 */
import { detectLanguage } from './languageDetection';
import { extractTextFromFile } from './fileProcessors';

interface ProcessContentParams {
  content: string;
  file?: File | null;
  targetLanguage: string;
  summaryLength: string;
  sourceLanguage: string;
}

interface ProcessedContent {
  payload: {
    content: string;
    targetLanguage: string;
    summaryLength: string;
    sourceLanguage: string;
    sourceType?: string;
    fileName?: string;
  };
  detectedLanguage: string;
  sourceType?: string;
  fileName?: string;
}

/**
 * Process content from either text input or file upload
 * @param params - The content processing parameters
 * @returns Processed content with payload ready for API request
 */
export async function processContent({
  content, 
  file,
  targetLanguage, 
  summaryLength, 
  sourceLanguage
}: ProcessContentParams): Promise<ProcessedContent> {
  let processedContent = content;
  let sourceType = 'text';
  let fileName = '';
  
  // If file is provided, extract text from it
  if (file) {
    try {
      const extractedData = await extractTextFromFile(file);
      processedContent = extractedData.text;
      sourceType = extractedData.type;
      fileName = extractedData.fileName;
      console.log(`Processed ${sourceType} file: ${fileName}`);
    } catch (error) {
      console.error('File processing error:', error);
      throw new Error(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Check if content is empty after processing
  if (!processedContent || processedContent.trim() === '') {
    throw new Error('No content to summarize. Please enter text or upload a valid file.');
  }
  
  // Auto-detect language if set to 'auto'
  let detectedLanguage = sourceLanguage;
  if (sourceLanguage === 'auto') {
    try {
      // Only detect language on the first 5000 characters for efficiency
      const textSample = processedContent.slice(0, 5000);
      detectedLanguage = await detectLanguage(textSample);
      console.log('Detected language:', detectedLanguage);
    } catch (error) {
      console.error('Language detection failed, using unknown:', error);
      detectedLanguage = 'unknown';
    }
  }
  
  // Prepare the request payload
  const payload = {
    content: processedContent,
    targetLanguage,
    summaryLength,
    sourceLanguage: detectedLanguage,
    sourceType,
    fileName: fileName || undefined
  };
  
  // Return the prepared payload with detected language
  return {
    payload,
    detectedLanguage,
    sourceType,
    fileName
  };
}