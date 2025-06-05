import { FreshContext } from "$fresh/server.ts";

interface ModelInfo {
  name: string;
  model: string;
  size: number;
  family?: string;
  parameter_size?: string;
}

interface ModelsResponse {
  success: boolean;
  models?: ModelInfo[];
  error?: string;
}

export const handler = {
  async GET(_req: Request, _ctx: FreshContext): Promise<Response> {
    try {
      // Query Ollama for available models
      const response = await fetch("http://localhost:11434/api/tags");
      
      if (!response.ok) {
        throw new Error(`Ollama API failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      const models = data.models || [];
      
      return new Response(JSON.stringify({
        success: true,
        models
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  }
};