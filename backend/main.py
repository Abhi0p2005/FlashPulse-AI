import os
import json
import logging
import asyncio
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FlashPulseAI")

# Load environment variables
load_dotenv()

app = FastAPI(title="FlashPulse AI - Flash Sale Copilot", version="1.0.0")

# CORS setup for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Schemas
class CopyRequest(BaseModel):
    product_name: str
    original_price: str
    flash_price: str
    style: str  # "FOMO/Urgent", "Scarcity", "Professional"
    additional_details: Optional[str] = ""

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    product_context: Optional[str] = None

# Semaphore to limit concurrency (Rate Limiting)
# Limiting to 5 concurrent requests to throttle RPM
request_semaphore = asyncio.Semaphore(5)

# Helper to verify LLM keys and get provider
def get_llm_client():
    provider = os.getenv("LLM_PROVIDER", "openai").lower()
    
    if provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key or api_key.strip() == "" or api_key == "your_openai_api_key_here":
            return "openai", None, "OpenAI API Key is missing."
        from openai import AsyncOpenAI
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        return "openai", AsyncOpenAI(api_key=api_key), model
        
    elif provider == "anthropic":
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key or api_key.strip() == "" or api_key == "your_anthropic_api_key_here":
            return "anthropic", None, "Anthropic API Key is missing."
        from anthropic import AsyncAnthropic
        model = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20240620")
        return "anthropic", AsyncAnthropic(api_key=api_key), model
    
    elif provider == "gemini":
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key.strip() == "" or api_key == "your_gemini_api_key_here":
            return "gemini", None, "Gemini API Key is missing."
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        
        # Use a model name that the API will definitely accept, 
        # often just "gemini-1.5-flash" works without "models/"
        model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        
        # Try listing to see what is available
        try:
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    logger.info(f"Available model: {m.name}")
        except Exception as e:
            logger.error(f"Error listing models: {e}")

        model = genai.GenerativeModel(model_name)
        return "gemini", model, model_name
        
    else:
        return "unknown", None, f"Unsupported LLM_PROVIDER '{provider}'."

# Endpoint 1: Copy Generator SSE Stream
@app.post("/api/generate-copy")
async def generate_copy(request: CopyRequest):
    provider, client, model_or_err = get_llm_client()
    if not client:
        # Return a stream that immediately yields the error message
        async def err_generator():
            yield f"data: [ERROR] {model_or_err}\n\n"
        return StreamingResponse(err_generator(), media_type="text/event-stream")

    system_prompt = (
        "You are an expert, world-class growth hacker, copywriter, and marketing psychologist specializing in high-conversion flash sales. "
        "Your task is to write high-impact marketing copy designed to drive immediate impulse purchases. "
        "Create copy for: 1) SMS Blast (max 160 chars), 2) Push Notification (max 80 chars), and 3) A high-urgency Landing Page Hook. "
        "Keep the style extremely punchy, engaging, and action-oriented."
    )

    user_prompt = (
        f"Product Name: {request.product_name}\n"
        f"Original Price: {request.original_price}\n"
        f"Flash Sale Price: {request.flash_price}\n"
        f"Style Tone: {request.style}\n"
    )
    if request.additional_details:
        user_prompt += f"Additional Selling Points/Details: {request.additional_details}\n"

    user_prompt += (
        "\nProvide the output structured clearly with markdown headings, such as:\n"
        "### 📱 SMS Blast\n[copy]\n\n"
        "### 🔔 Push Notification\n[copy]\n\n"
        "### ⚡ Landing Page Micro-Copy\n[copy]\n"
    )

    async def event_stream():
        async with request_semaphore: # Throttle requests
            try:
                if provider == "openai":
                    response = await client.chat.completions.create(
                        model=model_or_err,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        stream=True,
                        temperature=0.85
                    )
                    async for chunk in response:
                        text = chunk.choices[0].delta.content or ""
                        if text:
                            yield f"data: {text}\n\n"
                elif provider == "anthropic":
                    formatted_messages = [{"role": "user", "content": user_prompt}]
                    async with client.messages.stream(
                        model=model_or_err,
                        max_tokens=1024,
                        system=system_prompt,
                        messages=formatted_messages,
                        temperature=0.85
                    ) as stream:
                        async for text in stream.text_stream:
                            yield f"data: {text}\n\n"
                elif provider == "gemini":
                    # For Gemini, we combine system prompt and user prompt
                    full_prompt = f"{system_prompt}\n\n{user_prompt}"
                    response = await client.generate_content_async(full_prompt, stream=True)
                    async for chunk in response:
                        if chunk.text:
                            yield f"data: {chunk.text}\n\n"
            except Exception as e:
                logger.error(f"Stream error: {str(e)}")
                yield f"data: [ERROR] An error occurred while generating copy: {str(e)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# Endpoint 2: Customer Chat Widget SSE Stream
@app.post("/api/chat-stream")
async def chat_stream(request: ChatRequest):
    provider, client, model_or_err = get_llm_client()
    if not client:
        async def err_generator():
            yield f"data: [ERROR] {model_or_err}\n\n"
        return StreamingResponse(err_generator(), media_type="text/event-stream")

    system_prompt = (
        "You are 'PulseAI', an instant support assistant for our online store's high-velocity flash sale. "
        "The store is experiencing extremely high traffic right now. Customers are anxious, excited, and have quick, direct questions. "
        "Be extremely helpful, polite, and reassuring but also quick and punchy in your responses. "
        "Keep answers concise (maximum 3-4 sentences) so they can read and complete their checkout instantly. "
        "Policy: Shipping is absolutely FREE during this 10-minute lightning sale window. "
        "Returns are allowed within 30 days. Stock is highly limited and items in cart are not reserved. "
        "Encourage them to check out immediately!"
    )
    
    if request.product_context:
        system_prompt += f"\nActive Product the user is looking at: {request.product_context}"

    # Build history
    history = [{"role": "system", "content": system_prompt}]
    for msg in request.messages:
        history.append({"role": msg.role, "content": msg.content})

    async def event_stream():
        async with request_semaphore: # Throttle requests
            try:
                if provider == "openai":
                    response = await client.chat.completions.create(
                        model=model_or_err,
                        messages=history,
                        stream=True,
                        temperature=0.7
                    )
                    async for chunk in response:
                        text = chunk.choices[0].delta.content or ""
                        if text:
                            yield f"data: {text}\n\n"
                elif provider == "anthropic":
                    anth_history = []
                    for msg in request.messages:
                        anth_history.append({"role": msg.role, "content": msg.content})
                    
                    async with client.messages.stream(
                        model=model_or_err,
                        max_tokens=800,
                        system=system_prompt,
                        messages=anth_history,
                        temperature=0.7
                    ) as stream:
                        async for text in stream.text_stream:
                            yield f"data: {text}\n\n"
                elif provider == "gemini":
                    # Convert history for Gemini
                    chat = client.start_chat(history=[])
                    # Note: Gemini usually expects alternating roles or specifically formatted history
                    # This is a simplified approach for chat
                    full_history = []
                    # Add system prompt as part of the first message or instruction
                    full_history.append({"role": "user", "parts": [system_prompt]})
                    for msg in request.messages:
                        role = "user" if msg.role == "user" else "model"
                        full_history.append({"role": role, "parts": [msg.content]})
                    
                    chat.history = full_history
                    last_msg = request.messages[-1].content
                    response = await chat.send_message_async(last_msg, stream=True)
                    async for chunk in response:
                        if chunk.text:
                            yield f"data: {chunk.text}\n\n"
            except Exception as e:
                logger.error(f"Stream error: {str(e)}")
                yield f"data: [ERROR] An error occurred in the support stream: {str(e)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# Mount Frontend files at root
current_dir = os.path.dirname(os.path.abspath(__file__))
possible_paths = [
    os.path.join(current_dir, "../frontend"),
    os.path.join(current_dir, "frontend"),
    "C:/College/Project/FlashPulse AI/frontend",
    "frontend"
]

frontend_path = None
for path in possible_paths:
    if os.path.exists(path):
        frontend_path = os.path.abspath(path)
        break

if frontend_path:
    logger.info(f"Serving frontend from: {frontend_path}")
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
else:
    logger.warning("Frontend path not found in any standard locations. Running API-only mode.")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
