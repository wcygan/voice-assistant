#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-net
import $ from "https://deno.land/x/dax@0.39.2/mod.ts";

console.log("🧠 Setting up Ollama LLM...");

// Check if running on macOS
const os = Deno.build.os;
if (os !== "darwin") {
  console.error("❌ This script is designed for macOS. Please adapt for your platform.");
  Deno.exit(1);
}

try {
  // Install Ollama via Homebrew
  console.log("📦 Installing Ollama via Homebrew...");
  await $`brew install ollama`;
  
  // Check if Ollama service is running
  const isRunning = await $`pgrep ollama`.noThrow();
  
  if (!isRunning) {
    console.log("🚀 Starting Ollama service...");
    // Start Ollama in background
    const ollamaProcess = $`ollama serve`.spawn();
    
    // Wait a moment for service to start
    await $`sleep 3`;
    
    console.log("✅ Ollama service started");
  } else {
    console.log("✅ Ollama service already running");
  }
  
  // Test Ollama installation
  console.log("🧪 Testing Ollama installation...");
  const version = await $`ollama --version`.text();
  console.log("Ollama version:", version);
  
  // List available models
  console.log("📋 Currently installed models:");
  await $`ollama list`.noThrow();
  
  // Suggest model installation
  console.log("💡 Recommended models to install:");
  console.log("   • ollama pull mistral        (7B general purpose)");
  console.log("   • ollama pull llama3.2       (3B efficient)");
  console.log("   • ollama pull deepseek-r1    (reasoning model - if available)");
  console.log("   • ollama pull qwen2.5        (good multilingual support)");
  
  // Check if any model is installed
  const modelList = await $`ollama list`.text().catch(() => "");
  if (!modelList.includes("NAME") || modelList.split('\n').length <= 2) {
    console.log("⚠️  No models installed yet. Install a model to get started:");
    console.log("   ollama pull mistral");
  }
  
  console.log("✅ Ollama LLM setup complete!");
  console.log("💡 Usage:");
  console.log("   • Start service: ollama serve (in background)");
  console.log("   • Install model: ollama pull mistral");
  console.log("   • Chat: ollama run mistral");
  console.log("   • API: curl http://localhost:11434/api/generate -d '{\"model\":\"mistral\",\"prompt\":\"Hello\"}'");
  
} catch (error) {
  console.error("❌ Ollama setup failed:", error.message);
  Deno.exit(1);
}