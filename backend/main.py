from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CodeRequest(BaseModel):
    full_code: str
    selected_line: str

class GenerateRequest(BaseModel):
    full_code: str
    title: str
    description: str

async def call_groq_api(messages):
    async with httpx.AsyncClient() as client:
        try:
            logger.info("Making request to Groq API")
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "mixtral-8x7b-32768",
                    "messages": messages,
                    "temperature": 0.5,
                    "max_tokens": 4000,
                    "top_p": 1,
                    "stream": False
                },
                timeout=30.0
            )
            try:
                response_json = response.json()
                logger.info(f"Groq API response status: {response.status_code}")
                logger.debug(f"Groq API response: {response_json}")
            except ValueError as e:
                logger.error(f"Failed to parse JSON response: {e}")
                return JSONResponse(
                    status_code=500,
                    content={"error": str(e)}
                )
            
            if response.status_code != 200:
                logger.error(f"Groq API error: {response_json}")
                return JSONResponse(
                    status_code=response.status_code,
                    content=response_json
                )
            return response_json
        except httpx.HTTPError as e:
            logger.error(f"HTTP error occurred: {str(e)}")
            if hasattr(e, 'response'):
                try:
                    error_json = e.response.json()
                    logger.error(f"Error response from Groq: {error_json}")
                    return JSONResponse(
                        status_code=e.response.status_code,
                        content=error_json
                    )
                except ValueError:
                    logger.error(f"Failed to parse error response")
                    return JSONResponse(
                        status_code=500,
                        content={"error": str(e)}
                    )
            logger.error(f"No response from Groq")
            return JSONResponse(
                status_code=500,
                content={"error": str(e)}
            )

@app.post("/api/suggestions")
async def get_code_suggestions(request: CodeRequest):
    messages = [{
        "role": "user",
        "content": f"""Given this code context:

{request.full_code}

And specifically focusing on this line:
{request.selected_line}

Please suggest 4 possible actions I could take. Format each suggestion as:

Title: [Short action title]
Description: [Code snippet or detailed implementation steps]

Title: [Short action title]
Description: [Code snippet or detailed implementation steps]

Title: [Short action title]
Description: [Code snippet or detailed implementation steps]

Title: [Short action title]
Description: [Code snippet or detailed implementation steps]

Consider refactoring, debugging, extending functionality, and improving performance.
Return ONLY the suggestions with titles and descriptions as shown above.
Do not include any additional explanations, comments, or markdown formatting.
Rules:
1. NO markdown formatting (no backticks, no ```javascript blocks)
2. NO numbered suggestions
3. NO additional explanations or comments
4. Code should be provided as plain text
5. Each suggestion must be exactly two lines: Title and Description
"""
    }]

    try:
        logger.info("Calling Groq API for suggestions")
        response = await call_groq_api(messages)
        logger.info("Received response from Groq API for suggestions")
        
        if isinstance(response, JSONResponse):
            return response
        return {"suggestions": response["choices"][0]["message"]["content"]}
    except Exception as e:
        logger.error(f"Error occurred while getting suggestions: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.post("/api/generate")
async def generate_code(request: GenerateRequest):
    messages = [{
        "role": "user",
        "content": f"""Given this code:
{request.full_code}

{request.title}
{request.description}

Respond with ONLY the complete updated code. No explanations or markdown."""
    }]

    try:
        logger.info("Calling Groq API for code generation")
        response = await call_groq_api(messages)
        logger.info("Received response from Groq API for code generation")
        
        if isinstance(response, JSONResponse):
            return response
        return {"generated_code": response["choices"][0]["message"]["content"]}
    except Exception as e:
        logger.error(f"Error occurred while generating code: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
