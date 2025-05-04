import { Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Eliza configuration
const ELIZA_API_URL = process.env.ELIZA_API_URL || 'http://localhost:3000';
const ELIZA_AGENT_NAME = process.env.ELIZA_AGENT_NAME || 'HederaBot';

/**
 * @api {get} /api/HederaBot/status Check Eliza status
 * @apiName GetElizaStatus
 * @apiGroup Eliza
 * @apiDescription Check if the Eliza service is available
 * 
 * @apiSuccess {Boolean} available Whether Eliza is available
 * @apiSuccess {String} url The Eliza API URL
 * @apiSuccess {String} agent The Eliza agent name
 * @apiError {String} error Error message
 */
export const getElizaStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Construct the Eliza endpoint URL
    const encodedAgentName = encodeURIComponent(ELIZA_AGENT_NAME);
    const elizaStatusEndpoint = `${ELIZA_API_URL}/status`;
    
    // Try to reach Eliza
    const response = await axios.get(elizaStatusEndpoint, {
      timeout: 5000 // 5 second timeout
    });
    
    // Check if the response indicates Eliza is available
    const isAvailable = response.status === 200;
    
    return res.status(200).json({
      success: true,
      available: isAvailable,
      url: ELIZA_API_URL,
      agent: ELIZA_AGENT_NAME,
      details: response.data
    });
  } catch (error) {
    console.error('Error checking Eliza status:', error);
    
    // Return a status indicating Eliza is unavailable
    return res.status(200).json({
      success: true,
      available: false,
      url: ELIZA_API_URL,
      agent: ELIZA_AGENT_NAME,
      error: 'Could not connect to Eliza service'
    });
  }
}; 