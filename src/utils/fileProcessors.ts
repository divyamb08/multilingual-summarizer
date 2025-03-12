'use client';

/**
 * File processing utilities for Multilingual Summarizer
 * Handles extraction of text from various file formats
 */
import * as mammoth from 'mammoth';
import JSZip from 'jszip';
import Papa from 'papaparse';
import { extractTextFromPdf } from './pdfUtils';

// Maximum file size in bytes (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;



/**
 * Extract text content from various file types
 * @param file File object to process
 * @returns Object containing extracted text and file type
 */
export async function extractTextFromFile(file: File): Promise<{ text: string; type: string; fileName: string }> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size (${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB)`);
  }
  
  // Get file information for detection
  const fileType = file.type || '';
  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.split('.').pop() || '';
  
  try {
    // PDF files - use PDF.js for robust text extraction
    if (fileType === 'application/pdf' || fileExtension === 'pdf') {
      try {
        // Read the PDF as an array buffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Extract text using PDF.js
        const extractedText = await extractTextFromPdf(arrayBuffer);

        if (extractedText && extractedText.trim().length > 50) {  // Ensure we got meaningful text
          return {
            text: extractedText,
            type: 'PDF',
            fileName: file.name
          };
        } else {
          return {
            text: `The PDF '${file.name}' couldn't be fully processed.

Unable to extract meaningful text content from this PDF. It may be:
- A scanned document without embedded text (OCR not applied)
- An image-based PDF
- A PDF with complex formatting or security settings

Alternatives:
1. Try using OCR software to convert it to a text-based PDF
2. Copy and paste the text directly into the text area
3. Try a different PDF file

For the best experience, please provide a searchable PDF file or text content directly.`,
            type: 'PDF (Limited Extraction)',
            fileName: file.name
          };
        }
      } catch (error) {
        console.error('Error processing PDF:', error);
        return {
          text: `There was an error processing the PDF file '${file.name}'.

Error details: ${error instanceof Error ? error.message : 'Unknown error'}

Please try with a different file or copy and paste the text directly.`,
          type: 'PDF (Error)',
          fileName: file.name
        };
      }
    }
    
    // Word documents (DOCX)
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        fileExtension === 'docx') {
      return {...await extractFromDocx(file), fileName: file.name};
    }
    
    // Older Word documents (DOC)
    if (fileType === 'application/msword' || fileExtension === 'doc') {
      return { text: await extractFromDoc(file), type: 'DOC', fileName: file.name };
    }
    
    // Plain text files
    if (fileType === 'text/plain' || fileExtension === 'txt' || fileExtension === 'md' || fileExtension === 'rtf') {
      return { text: await file.text(), type: fileExtension.toUpperCase() || 'TXT', fileName: file.name };
    }
    
    // HTML files
    if (fileType === 'text/html' || fileExtension === 'html' || fileExtension === 'htm') {
      return {...await extractFromHtml(file), fileName: file.name};
    }
    
    // CSV files
    if (fileType === 'text/csv' || fileExtension === 'csv') {
      return {...await extractFromCsv(file), fileName: file.name};
    }
    
    // Excel files (simplified - extracts as CSV)
    if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        fileType === 'application/vnd.ms-excel' ||
        fileExtension === 'xlsx' || 
        fileExtension === 'xls') {
      return { text: 'Excel files are currently converted to text. For best results with spreadsheets, consider exporting to CSV first.\n\n' + 
                await extractFromDoc(file), // Simplified extraction for Excel
              type: fileExtension.toUpperCase(), 
              fileName: file.name };
    }

    // JSON files
    if (fileType === 'application/json' || fileExtension === 'json') {
      return { text: await extractFromJson(file), type: 'JSON', fileName: file.name };
    }
    
    // Try to provide a generic fallback when appropriate
    if (!fileType || fileType.startsWith('text/')) {
      try {
        // Attempt to read as plain text as a fallback
        console.log('Attempting fallback text extraction for:', file.name);
        const content = await file.text();
        if (content && content.trim().length > 0) {
          return { text: content, type: 'TEXT', fileName: file.name };
        }
      } catch (fallbackError) {
        console.error('Failed fallback text reading:', fallbackError);
      }
    }
    
    // Unsupported file type - provide clear error message
    throw new Error(`Unsupported file type: ${fileType || fileExtension.toUpperCase() || 'Unknown'}.\nPlease try with DOCX, TXT, HTML, or CSV files.`);
    
  } catch (error: any) {
    // Enhance error message with more details
    console.error(`Error processing ${file.name}:`, error);
    
    // Provide specific error messages based on error type
    if (error.message.includes('Unsupported file type')) {
      throw new Error(`Unsupported file type: ${fileType || fileExtension.toUpperCase() || 'Unknown'}. Please try with DOCX, TXT, HTML, or CSV files.`);
    } else if (error.message.includes('password')) {
      throw new Error(`The file '${file.name}' appears to be password protected. Please remove the password protection and try again.`);
    } else if (error.message.includes('corrupt') || error.message.includes('invalid')) {
      throw new Error(`The file '${file.name}' appears to be corrupted or invalid. Please check the file and try again.`);
    } else if (error.message.includes('size')) {
      throw new Error(`The file '${file.name}' is too large to process. Please try with a smaller file (under 50MB).`);
    }
    
    // If it's our own error, just rethrow it
    if (error.message && error.message.includes('Unsupported file type')) {
      throw error;
    }
    
    // General error message
    throw new Error(`Failed to process ${fileExtension.toUpperCase() || 'unknown'} file: ${error.message || 'Unknown error'}`);
  }
}

// Helper function to extract text from DOCX
async function extractFromDocx(file: File): Promise<{ text: string; type: string }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return { text: result.value, type: 'DOCX' };
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error('Failed to extract text from DOCX file. The file may be corrupted or incompatible.');
  }
}

// Helper function to extract text from DOC
// Note: This is a simplified version as DOC format is more complex
async function extractFromDoc(file: File): Promise<string> {
  try {
    // Extract as plain text as a fallback solution
    // DOC format is proprietary and harder to extract in browser
    const arrayBuffer = await file.arrayBuffer();
    const zip = new JSZip();
    
    try {
      // Try to unzip if it's actually a DOCX with wrong extension
      await zip.loadAsync(arrayBuffer);
      
      // If we can unzip it, it might be a DOCX with wrong extension
      if (zip.file('word/document.xml')) {
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value || 'Document appears to be a DOCX file with DOC extension. Limited text could be extracted.';
      }
    } catch (zipError) {
      // Not a zip file, ignore and continue with raw text extraction
    }
    
    // Convert buffer to string (will be messy but might get some readable text)
    const textDecoder = new TextDecoder('utf-8');
    const text = textDecoder.decode(arrayBuffer);
    
    // Clean up the text to remove binary artifacts
    // Filter out non-printable characters and keep text segments
    const cleanedText = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g, '')
                           .replace(/[^\x20-\x7E\t\r\n]/g, ' ')
                           .replace(/\s+/g, ' ')
                           .trim();
    
    return cleanedText || 'Limited text could be extracted from this DOC file. Consider converting to DOCX for better results.';
  } catch (error) {
    console.error('DOC extraction error:', error);
    return 'Could not extract text from DOC file. Consider converting to DOCX for better results.';
  }
}

// Extract text from HTML files
async function extractFromHtml(file: File): Promise<{ text: string; type: string }> {
  try {
    const text = await file.text();
    let extractedText = text;
    
    // Parse HTML to extract just the text content
    try {
      // Create a DOM parser
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      
      // Remove script and style elements
      const scripts = doc.getElementsByTagName('script');
      const styles = doc.getElementsByTagName('style');
      
      // Remove scripts (need to work backwards as collection changes)
      for (let i = scripts.length - 1; i >= 0; i--) {
        scripts[i].parentNode?.removeChild(scripts[i]);
      }
      
      // Remove styles (need to work backwards as collection changes)
      for (let i = styles.length - 1; i >= 0; i--) {
        styles[i].parentNode?.removeChild(styles[i]);
      }
      
      // Get the text content
      extractedText = doc.body.textContent || doc.documentElement.textContent || text;
      
      // Clean up the text
      extractedText = extractedText.replace(/\s+/g, ' ').trim();
      
      // Extract title if available
      const title = doc.title;
      if (title) {
        extractedText = `Title: ${title}\n\n${extractedText}`;
      }
      
      // Add minimal metadata if available
      const metaDescription = doc.querySelector('meta[name="description"]');
      if (metaDescription && metaDescription.getAttribute('content')) {
        extractedText = `${extractedText}\n\nDescription: ${metaDescription.getAttribute('content')}`;
      }
    } catch (parseError) {
      console.error('HTML parsing error:', parseError);
      // Fall back to the raw HTML
    }
    
    return { text: extractedText, type: 'HTML' };
  } catch (error) {
    console.error('HTML extraction error:', error);
    throw new Error('Failed to extract text from HTML file.');
  }
}

// Extract text from CSV files using PapaParse
async function extractFromCsv(file: File): Promise<{ text: string; type: string }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (results.errors && results.errors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors);
          }
          
          // Format the CSV data into a readable text format
          const data = results.data;
          let formattedText = '';
          
          // Handle header
          if (results.meta && results.meta.fields && results.meta.fields.length > 0) {
            formattedText += 'Headers: ' + results.meta.fields.join(', ') + '\n\n';
          }
          
          // Handle data rows
          if (data && data.length > 0) {
            formattedText += `${data.length} records found in CSV file:\n\n`;
            
            // Display first 10 rows in detail
            const displayRows = data.slice(0, 10);
            displayRows.forEach((row: any, index: number) => {
              formattedText += `Row ${index + 1}:\n`;
              Object.entries(row).forEach(([key, value]) => {
                formattedText += `  ${key}: ${value}\n`;
              });
              formattedText += '\n';
            });
            
            // Indicate if there are more rows
            if (data.length > 10) {
              formattedText += `... and ${data.length - 10} more rows\n`;
            }
          } else {
            formattedText += 'No data rows found in CSV file.';
          }
          
          resolve({ text: formattedText, type: 'CSV' });
        } catch (error) {
          console.error('Error formatting CSV results:', error);
          reject(new Error('Failed to process CSV data after parsing.'));
        }
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        reject(new Error('Failed to parse CSV file: ' + error.message));
      }
    });
  });
}

// Extract text from JSON files
async function extractFromJson(file: File): Promise<string> {
  try {
    const text = await file.text();
    
    // Parse the JSON to validate and format it
    const data = JSON.parse(text);
    
    // Format based on JSON content
    if (Array.isArray(data)) {
      // It's an array
      let formattedText = `JSON Array with ${data.length} items:\n\n`;
      
      // Display first 5 items in detail
      const displayItems = data.slice(0, 5);
      displayItems.forEach((item, index) => {
        formattedText += `Item ${index + 1}:\n`;
        if (typeof item === 'object' && item !== null) {
          Object.entries(item).forEach(([key, value]) => {
            const valueStr = typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : String(value);
            formattedText += `  ${key}: ${valueStr}${valueStr.length > 100 ? '...' : ''}\n`;
          });
        } else {
          formattedText += `  ${String(item)}\n`;
        }
        formattedText += '\n';
      });
      
      // Indicate if there are more items
      if (data.length > 5) {
        formattedText += `... and ${data.length - 5} more items\n`;
      }
      
      return formattedText;
    } else if (typeof data === 'object' && data !== null) {
      // It's an object
      let formattedText = 'JSON Object:\n\n';
      
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          formattedText += `${key}: ${JSON.stringify(value).substring(0, 100)}${JSON.stringify(value).length > 100 ? '...' : ''}\n`;
        } else {
          formattedText += `${key}: ${value}\n`;
        }
      });
      
      return formattedText;
    } else {
      // It's a primitive value
      return `JSON Content: ${JSON.stringify(data, null, 2)}`;
    }
  } catch (error) {
    console.error('JSON extraction error:', error);
    if (error instanceof SyntaxError) {
      return 'The JSON file contains syntax errors and could not be parsed.';
    }
    return 'Failed to process JSON file.';
  }
}
