import { FreshContext } from "$fresh/server.ts";
import $ from "dax";

interface HealthStatus {
  service: string;
  status: "healthy" | "unhealthy";
  message?: string;
}

interface HealthResponse {
  success: boolean;
  overall: "healthy" | "unhealthy";
  services: HealthStatus[];
  timestamp: string;
}

async function checkService(name: string, checkFn: () => Promise<boolean>): Promise<HealthStatus> {
  try {
    const isHealthy = await checkFn();
    return {
      service: name,
      status: isHealthy ? "healthy" : "unhealthy",
      message: isHealthy ? "OK" : "Service unavailable"
    };
  } catch (error) {
    return {
      service: name,
      status: "unhealthy",
      message: error.message
    };
  }
}

export const handler = {
  async GET(_req: Request, _ctx: FreshContext): Promise<Response> {
    const services = await Promise.all([
      checkService("python_venv", async () => {
        return await $`test -d ../venv`.noThrow() !== null;
      }),
      
      checkService("whisper", async () => {
        const result = await $`../venv/bin/python -c "import whisper; print('OK')"`.noThrow();
        return result !== null;
      }),
      
      checkService("coqui_tts", async () => {
        const result = await $`../venv/bin/python -c "import TTS; print('OK')"`.noThrow();
        return result !== null;
      }),
      
      checkService("ollama", async () => {
        const result = await $`curl -s http://localhost:11434/api/tags`.noThrow();
        return result !== null;
      }),
      
      checkService("ffmpeg", async () => {
        const result = await $`ffmpeg -version`.noThrow();
        return result !== null;
      })
    ]);
    
    const allHealthy = services.every(service => service.status === "healthy");
    
    const response: HealthResponse = {
      success: true,
      overall: allHealthy ? "healthy" : "unhealthy",
      services,
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(response, null, 2), {
      status: allHealthy ? 200 : 503,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
};