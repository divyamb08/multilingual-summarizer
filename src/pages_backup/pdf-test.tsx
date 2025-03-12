import dynamic from 'next/dynamic';
import React from 'react';

// Use Next.js dynamic import with no SSR to avoid server-side loading of PDF.js
// This ensures PDF.js only runs in the browser where Promise.withResolvers polyfill can work
const PdfTestPageContent = dynamic(() => import('../components/PdfTestPageContent'), {
  ssr: false, // Critical: prevents server-side rendering
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center p-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-2"></div>
        <p>Loading PDF component...</p>
      </div>
    </div>
  ),
});

/**
 * PDF Test Page - Client-side only implementation
 * This is a wrapper component that loads the actual PDF test functionality
 * only on the client side, avoiding server-side rendering problems with PDF.js
 */
export default function PdfTestPage() {
  return <PdfTestPageContent />;
}
  const [pdfText, setPdfText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize PDF.js
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Use CDN for the worker
      const pdfjsVersion = '4.0.269'; // Using a specific version
      const workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.js`;
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    }
  }, []);
  
  // Extract text from PDF using PDF.js
  async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
    try {
      // Load the PDF document
      const loadingTask = pdfjs.getDocument(arrayBuffer);
      const pdf = await loadingTask.promise;
      
      // Get the total number of pages
      const numPages = pdf.numPages;
      console.log(`PDF loaded with ${numPages} pages`);
      
      let fullText = '';
      
      // Extract text from each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        try {
          // Get the page
          const page = await pdf.getPage(pageNum);
          
          // Get the text content
          const textContent = await page.getTextContent();
          
          // Process text items
          let pageText = '';
          for (const item of textContent.items) {
            // Type assertion for TextItem
            const textItem = item as TextItem;
            if (textItem.str) {
              pageText += textItem.str + ' ';
            }
          }
          
          // Add a page separator
          fullText += pageText.trim() + '\n\n';
          
        } catch (pageError) {
          console.error(`Error extracting text from page ${pageNum}:`, pageError);
          fullText += `[Error extracting text from page ${pageNum}]\n\n`;
        }
      }
      
      // Clean up the text
      const cleanedText = fullText
        .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
        .replace(/\n\s*\n/g, '\n\n') // Normalize multiple newlines
        .trim();
      
      console.log(`Extracted ${cleanedText.length} characters from PDF`);
      return cleanedText;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw error;
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setFileName(file.name);
    setError('');
    setLoading(true);
    setPdfText('');

    try {
      // Check if it's a PDF file
      if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('Please select a PDF file');
      }

      // Read the file as an ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Extract text from PDF
      const extractedText = await extractTextFromPdf(arrayBuffer);
      
      // Update state with extracted text
      setPdfText(extractedText);
    } catch (err) {
      console.error('PDF processing error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred processing the PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <Head>
        <title>PDF Test - Multilingual Summarizer</title>
        <meta name="description" content="Test PDF text extraction" />
      </Head>

      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">PDF Text Extraction Test</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            Back to Home
          </Link>
        </div>
        <p className="mt-2 text-gray-600">
          This page allows you to test the PDF text extraction functionality independently. 
          Upload a PDF file to see the extracted text content.
        </p>
      </header>

      <main>
        <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg p-6 mb-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select a PDF file
            </label>
            <div className="flex items-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,application/pdf"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md mr-3"
              >
                Choose File
              </button>
              <span className="text-sm text-gray-500">
                {fileName || 'No file selected'}
              </span>
            </div>
          </div>

          {loading && (
            <div className="text-center p-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-2"></div>
              <p>Extracting text from PDF...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
              <p>{error}</p>
            </div>
          )}

          {pdfText && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Extracted Text</h2>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200 min-h-[300px] max-h-[500px] overflow-y-auto">
                <pre className="whitespace-pre-wrap font-sans text-sm">{pdfText}</pre>
              </div>
              <div className="mt-4 flex justify-between items-center">
                <div>
                  <span className="text-sm text-gray-500">
                    Character count: {pdfText.length.toLocaleString()}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(pdfText)
                      .then(() => alert('Text copied to clipboard!'))
                      .catch(err => console.error('Failed to copy text:', err));
                  }}
                  className="py-1 px-3 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm rounded"
                >
                  Copy Text
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-3">About PDF Processing</h2>
          <p className="mb-3">
            This test page demonstrates the PDF text extraction functionality using PDF.js. 
            The extracted text can be used for summarization in the main application.
          </p>
          <p className="mb-3">
            <strong>Supported PDFs:</strong> Text-based PDFs where the text is stored as characters rather than images.
          </p>
          <p>
            <strong>Limitations:</strong> OCR (Optical Character Recognition) is not supported, so scanned documents 
            or image-based PDFs may not extract properly. Complex layouts and certain security settings may also 
            affect extraction quality.
          </p>
        </div>
      </main>
    </div>
  );
}
