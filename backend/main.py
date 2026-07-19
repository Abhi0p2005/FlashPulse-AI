import os
import json
import logging
import asyncio
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from google.genai import types
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FlashPulseAI")

# Load environment variables
load_dotenv()

app = FastAPI(title="FlashPulse AI - Flash Sale Copilot", version="1.0.0")

@app.on_event("startup")
async def startup():
    provider = os.getenv("LLM_PROVIDER", "").lower()
    if provider == "gemini":
        try:
            from google import genai
            client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
            for m in client.models.list():
                logger.info(f"Available Gemini model: {m.name}")
            client.close()
        except Exception as e:
            logger.warning(f"Could not list Gemini models on startup: {e}")

# CORS — allow specific origins in production, all in development
cors_origins_env = os.getenv("CORS_ORIGINS", "*")
cors_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
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

# Health check endpoint (required by AWS App Runner)
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "FlashPulse AI"}

@app.get("/api/health")
async def api_health_check():
    return {"status": "healthy", "service": "FlashPulse AI"}

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
        from google import genai
        client = genai.Client(api_key=api_key)

        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
        return "gemini", client, model_name
        
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
                    async for chunk in await client.aio.models.generate_content_stream(
                        model=model_or_err,
                        contents=f"{system_prompt}\n\n{user_prompt}",
                    ):
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
        "You are 'PulseAI', an intelligent instant support assistant for our online store's high-velocity flash sale. "
        "The store is experiencing extremely high traffic right now. Customers are anxious, excited, and have quick, direct questions. "
        "Be extremely helpful, polite, and reassuring but also quick and punchy in your responses. "
        "Keep answers concise (maximum 3-4 sentences) so they can read and complete their checkout instantly.\n\n"
        "YOUR CAPABILITIES:\n"
        "1. ORDER TRACKING: Ask for their order ID/number and provide simulated tracking info (order received, processing, shipped, out for delivery, delivered). Give typical shipping timelines (express 1-2 days, standard 3-5 days).\n"
        "2. PRODUCT RECOMMENDATIONS: Based on the current active product, suggest complementary items, cross-sells, and upsells. Mention popular accessories, similar trending items, or higher-tier versions.\n"
        "3. CART MANAGEMENT: Help users add items to cart, explain cart reservation policies (items in cart are NOT reserved during flash sales), guide through checkout steps, explain payment methods accepted (credit/debit cards, PayPal, Apple Pay, Google Pay).\n"
        "4. MULTI-LANGUAGE SUPPORT: Detect if the user writes in a language other than English (Spanish, French, German, etc.) and respond in that same language. You are fluent in all major languages.\n"
        "5. PROACTIVE SUGGESTIONS: After answering a question, occasionally suggest what else you can help with (order tracking, recommendations, cart help, shipping info, return policy, payment options).\n\n"
        "POLICIES:\n"
        "- Shipping is absolutely FREE during this 10-minute lightning sale window.\n"
        "- Returns are allowed within 30 days of purchase.\n"
        "- Stock is highly limited — first come, first served.\n"
        "- Items in cart are NOT reserved during flash sales.\n"
        "- Express shipping (1-2 business days) is available.\n"
        "- Payment methods: All major credit/debit cards, PayPal, Apple Pay, Google Pay.\n"
        "- Encourage them to check out immediately!"
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
                    contents = [
                        types.Content(
                            role="user" if msg.role == "user" else "model",
                            parts=[types.Part.from_text(text=msg.content)]
                        ) for msg in request.messages
                    ]

                    async for chunk in await client.aio.models.generate_content_stream(
                        model=model_or_err,
                        contents=contents,
                        config=types.GenerateContentConfig(
                            system_instruction=system_prompt,
                        ),
                    ):
                        if chunk.text:
                            yield f"data: {chunk.text}\n\n"
            except Exception as e:
                logger.error(f"Stream error: {str(e)}")
                yield f"data: [ERROR] An error occurred in the support stream: {str(e)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# Serve Frontend files with no-cache headers
current_dir = os.path.dirname(os.path.abspath(__file__))
repo_root = os.path.abspath(os.path.join(current_dir, ".."))
possible_paths = [
    os.path.join(current_dir, "../frontend"),         # dev: backend/../frontend
    os.path.join(current_dir, "frontend"),             # alternate layout
    os.path.join(repo_root, "frontend"),               # repo root /frontend
    os.path.join("/app", "frontend"),                  # Docker: /app/frontend
]

frontend_path = None
for path in possible_paths:
    if os.path.exists(path):
        frontend_path = os.path.abspath(path)
        break

FRONTEND_CACHE_HEADERS = {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
}

if frontend_path:
    logger.info(f"Serving frontend from: {frontend_path}")

    FRONTEND_DIR = frontend_path

    FRONTEND_MIME = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "text/javascript",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
        ".json": "application/json",
        ".woff2": "font/woff2",
    }

    import mimetypes
    mimetypes.init()

    def _get_mime(path: str) -> str:
        ext = os.path.splitext(path)[1].lower()
        return FRONTEND_MIME.get(ext) or mimetypes.guess_type(path)[0] or "application/octet-stream"

    @app.get("/{path:path}", include_in_schema=False)
    async def serve_frontend(path: str):
        if not path or path == "":
            path = "index.html"

        full_path = os.path.normpath(os.path.join(FRONTEND_DIR, path))

        if not full_path.startswith(FRONTEND_DIR):
            raise HTTPException(status_code=404)

        if not os.path.isfile(full_path):
            index_path = os.path.join(FRONTEND_DIR, "index.html")
            if os.path.isfile(index_path):
                return FileResponse(index_path, media_type="text/html", headers=FRONTEND_CACHE_HEADERS)
            raise HTTPException(status_code=404)

        return FileResponse(full_path, media_type=_get_mime(full_path), headers=FRONTEND_CACHE_HEADERS)
else:
    logger.warning("Frontend path not found in any standard locations. Running API-only mode.")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
