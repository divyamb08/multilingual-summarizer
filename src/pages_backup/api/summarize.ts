import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';
import { detectLanguage } from '../../utils/languageDetection';
import { chunkContent } from '../../utils/contentChunker';

// Initialize Anthropic client if API key is available
let anthropic: Anthropic | null = null;

/**
 * Initialize the Anthropic client with API key from environment variables
 * This is wrapped in a function to avoid top-level await and improve error handling
 */
function initAnthropicClient() {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY is not defined in environment variables');
      // Don't throw here, we'll handle this in the POST handler
      return null;
    } else {
      // Initialize Anthropic client with explicit API key
      const client = new Anthropic({
        apiKey,
      });
      
      return client;
    }
  } catch (error) {
    console.error('Error initializing Anthropic client:', error);
    return null;
  }
}

// Initialize client
anthropic = initAnthropicClient();

const MAX_CONTENT_LENGTH = 100000; // Characters that can be processed at once

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if the Anthropic client is available
    if (!anthropic) {
      return res.status(500).json({
        error: 'Anthropic API key is missing or invalid. Check your environment variables.'
      });
    }

    const data = req.body;
    let { content, targetLanguage, summaryLength, sourceLanguage } = data;
    
    // Validate input
    if (!content || !targetLanguage) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }
    
    // Auto-detect language if not specified
    if (sourceLanguage === 'auto') {
      try {
        sourceLanguage = detectLanguage(content);
      } catch (error) {
        console.warn('Language detection failed:', error);
        sourceLanguage = 'unknown';
      }
    }
    
    // Set length parameters
    let lengthDescription;
    switch (summaryLength) {
      case 'short':
        lengthDescription = 'brief, 1-2 paragraphs';
        break;
      case 'long':
        lengthDescription = 'comprehensive, 5+ paragraphs with detailed information';
        break;
      case 'medium':
      default:
        lengthDescription = 'moderate, 3-4 paragraphs covering main points';
        break;
    }

    let summary: string;
    
    // Check if content needs to be chunked
    if (content.length > MAX_CONTENT_LENGTH) {
      // Process large content in chunks
      const chunks = chunkContent(content, MAX_CONTENT_LENGTH);
      const chunkSummaries: string[] = [];
      
      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        try {
          const chunkResponse = await anthropic.messages.create({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 4000,
            system: 'You are an expert content summarizer. Extract the key information from the provided content section.',
            messages: [
              {
                role: 'user',
                content: `Please summarize this section of content (${i+1} of ${chunks.length}) in ${sourceLanguage !== 'unknown' ? sourceLanguage : 'the original language'}. Focus on extracting key points only.

Content section:
${chunks[i]}`
              }
            ]
          });
          
          if (!chunkResponse || !chunkResponse.content || !chunkResponse.content[0]) {
            throw new Error(`Empty or invalid response from Anthropic API for chunk ${i+1}`);
          }
          
          chunkSummaries.push(chunkResponse.content[0].text);
        } catch (chunkError) {
          console.error(`Error processing chunk ${i+1}:`, chunkError);
          // Add a placeholder for this chunk
          chunkSummaries.push(`[Error summarizing section ${i+1}]`);
          // Continue with other chunks rather than failing completely
        }
      }
      
      // Combine the chunk summaries into a final summary
      const combinedChunkSummaries = chunkSummaries.join('\n\n--- NEXT SECTION ---\n\n');
      
      // Create final summary of the combined chunk summaries
      try {
        const finalResponse = await anthropic.messages.create({
          model: 'claude-3-7-sonnet-20250219',
          max_tokens: 4000,
          system: 'You are an expert multilingual content summarizer. Create a cohesive, well-structured summary from the provided section summaries.',
          messages: [
            {
              role: 'user',
              content: `I have a large document that has been summarized in sections. Please create a cohesive final summary in ${targetLanguage} that is ${lengthDescription} in length. Integrate all the section summaries into a single, well-structured summary.

Section summaries:
${combinedChunkSummaries}

Additional instructions:
- Create a single coherent summary, not a list of section summaries
- Maintain the flow and logical structure of the content
- Preserve key facts, figures, conclusions and important context
- Structure the summary with appropriate headings if needed
- The final summary should make sense as a standalone document`
            }
          ]
        });
        
        if (!finalResponse || !finalResponse.content || !finalResponse.content[0]) {
          throw new Error('Empty or invalid response from Anthropic API for final summary');
        }
        
        summary = finalResponse.content[0].text;
      } catch (finalSummaryError) {
        console.error('Error creating final summary:', finalSummaryError);
        // Return a basic combined summary if the final summary fails
        summary = 'Error generating formatted summary. Raw section summaries:\n\n';
        summary += chunkSummaries.join('\n\n---\n\n');
      }
    } else {
      // Process content in a single request
      try {
        const response = await anthropic.messages.create({
          model: 'claude-3-7-sonnet-20250219',
          max_tokens: 4000,
          system: 'You are an expert multilingual content summarizer. Extract the key information from the following content and create a clear, concise summary. Maintain the core meaning and important details while eliminating redundancy.',
          messages: [
            {
              role: 'user',
              content: `Please summarize the following content written in ${sourceLanguage !== 'unknown' ? sourceLanguage : 'the original language'}. Create a summary in ${targetLanguage} that is ${lengthDescription} in length.

Content to summarize:
${content}

Additional instructions:
- Preserve key facts, figures, conclusions and important context
- Maintain the original tone (formal/technical/casual)
- Structure the summary with appropriate headings if the content is long
- Highlight any uncertain translations or interpretations`
            }
          ]
        });
        
        if (!response || !response.content || !response.content[0]) {
          throw new Error('Empty or invalid response from Anthropic API');
        }
        
        summary = response.content[0].text;
      } catch (singleRequestError) {
        console.error('Error in single request summarization:', singleRequestError);
        throw new Error(`Failed to summarize content: ${singleRequestError.message || 'Unknown error'}`);
      }
    }

    // Return the summary
    return res.status(200).json({ 
      summary,
      sourceLanguage
    });
  } catch (error: any) {
    console.error('API Error:', error);
    
    // More detailed error handling with user-friendly messages
    let errorMessage = 'Failed to generate summary';
    let statusCode = 500;
    let errorCode = 'GENERAL_ERROR';
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response error data:', error.response.data);
      console.error('Response error status:', error.response.status);
      
      // Add more specific error codes for client-side handling
      if (error.response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
        errorCode = 'RATE_LIMIT';
        statusCode = 429;
      } else if (error.response.status === 401 || error.response.status === 403) {
        errorMessage = 'API authentication failed. Please check your API key.';
        errorCode = 'AUTH_ERROR';
        statusCode = error.response.status;
      } else {
        errorMessage = `API responded with status ${error.response.status}: ${error.message}`;
        errorCode = 'API_ERROR';
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Request error:', error.request);
      errorMessage = 'No response received from API server. Please check your internet connection.';
      errorCode = 'CONNECTION_ERROR';
      statusCode = 503; // Service Unavailable
    } else if (error.message && error.message.includes('ECONNREFUSED')) {
      errorMessage = 'Connection to API server failed. Please try again later.';
      errorCode = 'CONNECTION_REFUSED';
      statusCode = 503;
    } else if (error.message && error.message.includes('Invalid JSON')) {
      errorMessage = 'Invalid response received from API. Please try again.';
      errorCode = 'INVALID_RESPONSE';
      console.error('Invalid JSON response:', error);
    } else if (error.message && error.message.includes('timeout')) {
      errorMessage = 'Request timed out. The content might be too large or the server is busy.';
      errorCode = 'TIMEOUT';
      statusCode = 504; // Gateway Timeout
    }
    
    return res.status(statusCode).json({
      error: errorMessage, 
      errorCode,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
