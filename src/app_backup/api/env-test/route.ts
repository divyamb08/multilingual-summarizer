import { NextResponse } from 'next/server';

export async function GET() {
  // Return all environment variables for debugging purposes
  return NextResponse.json({
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    apiKeyLength: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : 0,
    nodeEnv: process.env.NODE_ENV,
    // Don't expose the actual API key for security reasons
  });
}
