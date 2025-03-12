'use client';

/**
 * PDF text extraction utilities for Multilingual Summarizer
 */
import * as pdfjs from 'pdfjs-dist';

// Keep track of worker initialization
let workerInitialized = false;

/**
 * Initialize PDF.js worker with proper configuration
 */
function initPdfJsWorker() {
  if (workerInitialized || typeof window === 'undefined') return;
  
  try {
    // Use the CDN worker source with the specific version
    const workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    
    // Set the worker source for PDF.js
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    
    console.log('PDF.js worker initialized successfully with version:', pdfjs.version);
    workerInitialized = true;
  } catch (error) {
    console.error('Failed to initialize PDF.js worker:', error);
  }
}

/**
 * Extract text from a PDF file using PDF.js
 * This provides more reliable text extraction than the previous basic approach
 * @param arrayBuffer PDF file as an array buffer
 * @returns Extracted text from the PDF
 */
export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Initialize the PDF.js worker
    initPdfJsWorker();
    
    // Load the PDF document using PDF.js
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    
    // Add error handling for the loading process
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('PDF loading timeout after 15 seconds')), 15000);
    });
    
    // Race between the loading task and timeout
    const pdfDocument = await Promise.race([loadingTask.promise, timeoutPromise]) as pdfjs.PDFDocumentProxy;
    
    console.log(`PDF loaded successfully with ${pdfDocument.numPages} pages`);
    let extractedText = '';
    const numPages = pdfDocument.numPages;
    
    // Add metadata if available
    try {
      const metadata = await pdfDocument.getMetadata();
      if (metadata && metadata.info) {
        const info = metadata.info as Record<string, any>;
        extractedText += `Document Title: ${info.Title || 'Unknown'}
`;
        extractedText += `Document Author: ${info.Author || 'Unknown'}
`;
        extractedText += `Pages: ${numPages}

`;
      }
    } catch (metadataError) {
      console.warn('Could not extract PDF metadata:', metadataError);
    }
    
    // Process each page with a timeout to avoid hanging on problematic pages
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        // Get the page
        const page = await pdfDocument.getPage(pageNum);
        
        // Try to extract text content with a timeout
        const pageTextPromise = page.getTextContent();
        const pageTextTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout extracting text from page ${pageNum}`)), 5000);
        });
        
        const textContent = await Promise.race([pageTextPromise, pageTextTimeoutPromise]);
        
        // Concatenate the text items
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        // Add page marker if this is a multi-page document
        if (numPages > 1) {
          extractedText += `[Page ${pageNum}]\n`;
        }
        
        extractedText += pageText + '\n\n';
      } catch (pageError) {
        console.error(`Error extracting text from page ${pageNum}:`, pageError);
        extractedText += `[Error extracting text from page ${pageNum}]\n\n`;
        
        // Try simpler fallback for this page
        try {
          const page = await pdfDocument.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.0 });
          
          // Get page as text using a simpler method if available
          if (page.getTextContent) {
            try {
              const simpleTextContent = await page.getTextContent({ disableCombineTextItems: true });
              const simplePageText = simpleTextContent.items
                .map((item: any) => item.str)
                .join(' ');
                
              if (simplePageText && simplePageText.length > 20) { // If we got meaningful text
                extractedText += `[Recovered text from page ${pageNum}]
${simplePageText}

`;
              }
            } catch (e) {
              // Silent failure for the fallback method
            }
          }
        } catch (fallbackError) {
          // Silent failure for the page fallback
        }
      }
    }
    
    // Check if we got meaningful text
    if (!extractedText || extractedText.trim().length < 50) {
      // Try the basic extraction as a fallback
      const basicText = extractBasicTextFromPdf(arrayBuffer);
      if (basicText && basicText.trim().length > 100) {
        return basicText;
      }
      
      // If both methods failed to get meaningful text, it's probably a scanned document
      if (!extractedText || extractedText.trim().length < 100) {
        return `This appears to be a scanned PDF without embedded text content or a PDF with complex security settings. The document contains ${numPages} page(s) but no extractable text was found.

Options:
1. Try using OCR software to extract text
2. Copy and paste content manually if possible
3. Try a different file format`;
      }
    }
    
    // Clean up the text
    return extractedText
      .replace(/\s+/g, ' ')  // Replace multiple spaces with a single space
      .replace(/\n\s*\n/g, '\n\n')  // Normalize multiple newlines
      .trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    
    // Try basic extraction as fallback
    try {
      const basicExtractedText = extractBasicTextFromPdf(arrayBuffer);
      if (basicExtractedText && basicExtractedText.trim().length > 50) {
        return basicExtractedText + '\n\n[Note: Text extracted using fallback method due to error with main PDF processor]';
      }
    } catch (fallbackError) {
      console.error('Fallback PDF extraction also failed:', fallbackError);
    }
    
    // If all methods fail, provide a helpful error
    return `Unable to extract text from this PDF document. Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nThis may be because:\n- The PDF contains scanned images without OCR text\n- The PDF has security restrictions preventing text extraction\n- The PDF uses uncommon font encodings\n\nPlease try a different file format or copy the text manually.`;
  }
}

/**
 * Basic fallback function to extract text from PDF binary data
 * This is a simplified approach that will work for some PDFs even if PDF.js fails
 */
export function extractBasicTextFromPdf(arrayBuffer: ArrayBuffer): string {
  let extractedText = '';
  
  try {
    // Convert array buffer to string
    const decoder = new TextDecoder('utf-8');
    const pdfData = decoder.decode(arrayBuffer);
    
    // Look for text in the binary data using common PDF text markers
    const textMarkers = [
      /\(([^\)]{3,})\)/g,   // Text in parentheses (3+ chars)
      /\<([0-9A-F]{6,})\>/g  // Hex-encoded text in angle brackets
    ];
    
    // Extract text using markers
    textMarkers.forEach(marker => {
      let match;
      while ((match = marker.exec(pdfData)) !== null) {
        if (match[1]) {
          // For hex encoded text, convert to ASCII if it's the second pattern
          if (marker.source.includes('0-9A-F') && /^[0-9A-F]+$/.test(match[1])) {
            // Convert hex pairs to characters if they seem valid
            try {
              const hexString = match[1];
              let decoded = '';
              
              // Process pairs of hex characters
              for (let i = 0; i < hexString.length; i += 2) {
                if (i + 1 < hexString.length) {
                  const hexPair = hexString.substring(i, i + 2);
                  const charCode = parseInt(hexPair, 16);
                  
                  // Only include printable ASCII characters
                  if (charCode >= 32 && charCode <= 126) {
                    decoded += String.fromCharCode(charCode);
                  }
                }
              }
              
              // Only add if we have a meaningful sequence of characters
              if (decoded.length >= 3 && /[a-zA-Z]/.test(decoded)) {
                extractedText += decoded + ' ';
              }
            } catch (err) {
              // Ignore conversion errors and continue
            }
          } else {
            // For regular text in parentheses, check if it looks like actual text
            const text = match[1];
            if (
              (text.includes(' ') || /[a-zA-Z]{3,}/.test(text)) &&
              !/^[0-9\s\-\.]+$/.test(text) // Avoid sequences of just numbers
            ) {
              extractedText += text + ' ';
            }
          }
        }
      }
    });
    
    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\r\n|\r|\n\n+/g, '\n') // Normalize line breaks
      .replace(/\s+/g, ' ')         // Remove excessive whitespace
      .trim();
    
    if (extractedText.length > 0) {
      return extractedText;
    }
    
    // If we still couldn't extract meaningful text, try pattern matching for words
    const wordPattern = /[A-Za-z]{3,}[\s][A-Za-z]{3,}/g;
    let words = [];
    let wordMatch;
    while ((wordMatch = wordPattern.exec(pdfData)) !== null) {
      words.push(wordMatch[0]);
    }
    
    if (words.length > 0) {
      return words.join(' ');
    }
    
    return 'No readable text content could be extracted from this PDF.';
  } catch (error) {
    console.error('Error in basic PDF text extraction:', error);
    return `Failed to extract text from PDF using basic methods: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}
