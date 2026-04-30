import { config } from "dotenv";
config();

export const BASE_URL = process.env.INSIGHTA_API_URL || 'http://localhost:3004';
export const {
  GITHUB_CALLBACK_URL,
  GITHUB_OAUTH_URL,
  GITHUB_CLIENT_ID
} = process.env;