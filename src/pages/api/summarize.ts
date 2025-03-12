import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';

type RequestData = {
  content: string;
  targetLanguage: string;
  summaryLength: string;
  sourceLanguage?: string;
  sourceType?: string;
  fileName?: string;
};

type ResponseData = {
  summary: string;
  error?: never;
};

type ErrorResponse = {
  error: string;
  summary?: never;
};

// Initialize Anthropic client
const getAnthropicClient = (): Anthropic => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('Missing Anthropic API key. Please add ANTHROPIC_API_KEY to your environment variables.');
  }
  
  return new Anthropic({ apiKey });
};

// Generate system prompt based on request parameters
const generatePrompt = (data: RequestData): string => {
  // Determine the length parameter
  let length = 'medium-length';
  if (data.summaryLength === 'short') {
    length = 'concise, 1-2 paragraphs';
  } else if (data.summaryLength === 'medium') {
    length = 'balanced, 3-4 paragraphs';
  } else if (data.summaryLength === 'long') {
    length = 'comprehensive, 5+ paragraphs';
  }
  
  // Generate the source language text
  const sourceLanguageText = data.sourceLanguage && data.sourceLanguage !== 'auto' && data.sourceLanguage !== 'unknown'
    ? `The source text is in ${data.sourceLanguage}.`
    : '';
  
  // Generate file-specific context if provided
  const fileContext = data.sourceType && data.fileName
    ? `The content is from a ${data.sourceType} file named "${data.fileName}".`
    : '';
  
  // Construct the system prompt
  return `You are an expert multilingual content summarizer. Your task is to create a ${length} summary of the provided text in ${data.targetLanguage}. ${sourceLanguageText} ${fileContext}
  
Follow these guidelines:
1. Preserve all key information, main arguments, and important details
2. Organize the summary in a logical structure with clear paragraphs
3. Keep the writing style formal and professional
4. Ensure the summary is complete and standalone (readers shouldn't need the original text)
5. Focus on factual information rather than opinions
6. Write in ${data.targetLanguage} regardless of the source language

Provide ONLY the summary without any introductory text, explanations, metadata, or additional commentary.`;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | ErrorResponse>
) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Please use POST.' });
  }
  
  try {
    const data = req.body as RequestData;
    
    // Validate request data
    if (!data.content || !data.content.trim()) {
      return res.status(400).json({ error: 'Content is required.' });
    }
    
    if (!data.targetLanguage) {
      return res.status(400).json({ error: 'Target language is required.' });
    }
    
    if (!data.summaryLength) {
      return res.status(400).json({ error: 'Summary length is required.' });
    }
    
    // Truncate content if it's too long (Claude has a context limit)
    const maxContentLength = 100000; // 100k characters is a safe limit
    const truncatedContent = data.content.length > maxContentLength
      ? `${data.content.substring(0, maxContentLength)}... [Content truncated due to length limitations]`
      : data.content;
    
    // Initialize Anthropic client
    const anthropic = getAnthropicClient();
    
    // Generate the system prompt
    const systemPrompt = generatePrompt(data);
    
    // Make API request to Claude
    const response = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: truncatedContent }
      ],
    });
    
    // Extract and return the summary
    const summary = response.content[0].text;
    
    return res.status(200).json({ summary });
  } catch (error: any) {
    console.error('API error:', error);
    
    // Handle Anthropic API errors
    if (error.name === 'AnthropicError') {
      return res.status(500).json({
        error: `Anthropic API error: ${error.message || 'Unknown error'}`
      });
    }
    
    // Handle missing API key
    if (error.message && error.message.includes('API key')) {
      return res.status(500).json({
        error: `Anthropic API key error: ${error.message}`
      });
    }
    
    // Handle other errors
    return res.status(500).json({
      error: `Failed to generate summary: ${error.message || 'Unknown error'}`
    });
  }
}
