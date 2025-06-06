#!/usr/bin/env python3
"""Check Chatterbox model download status"""

import os
import time
from pathlib import Path

# Model cache location
cache_dir = Path.home() / ".cache" / "huggingface" / "hub" / "models--ResembleAI--chatterbox"

print("🔍 Checking Chatterbox model status...\n")

if cache_dir.exists():
    # Get total size
    total_size = sum(f.stat().st_size for f in cache_dir.rglob('*') if f.is_file())
    size_mb = total_size / (1024 * 1024)
    size_gb = size_mb / 1024
    
    print(f"📁 Cache directory: {cache_dir}")
    print(f"💾 Current size: {size_gb:.2f} GB ({size_mb:.0f} MB)")
    
    # Expected size is around 2GB
    expected_gb = 2.0
    progress = (size_gb / expected_gb) * 100
    
    print(f"📊 Estimated progress: {progress:.1f}%")
    
    if progress >= 95:
        print("✅ Model appears to be fully downloaded!")
        print("\nTry running:")
        print("  deno task demo:chatterbox --text 'Hello!' --emotion happy")
    else:
        print(f"⏳ Still downloading... (~{expected_gb - size_gb:.1f} GB remaining)")
        print("\nYou can:")
        print("  1. Wait for download to complete")
        print("  2. Try running anyway (it will resume)")
        
    # Show recent files (to see if actively downloading)
    print("\n📝 Recent activity:")
    recent_files = []
    for f in cache_dir.rglob('*'):
        if f.is_file():
            mtime = f.stat().st_mtime
            recent_files.append((mtime, f.name))
    
    recent_files.sort(reverse=True)
    for mtime, name in recent_files[:5]:
        age = time.time() - mtime
        if age < 300:  # Files modified in last 5 minutes
            print(f"  • {name} (modified {int(age)}s ago)")
            
else:
    print("❌ Model cache not found. Run a Chatterbox command to start download.")

print("\n💡 Quick test command:")
print("./venv/bin/python -c \"from chatterbox.tts import ChatterboxTTS; model = ChatterboxTTS.from_pretrained(); print('Model loaded!')\"")