"""FastAPI backend for RAG-enabled chat application."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from models import HealthResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s - %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    logger.info("🚀 Starting RAG backend server...")
    logger.info(f"📊 ChromaDB persist dir: {settings.chroma_persist_dir}")
    logger.info(f"🤖 Embedding model: {settings.embedding_model}")
    logger.info(f"🔗 LLM Server URL: {settings.lm_studio_base_url}")

    # Initialize services
    from vectordb import vector_db
    from embeddings import embedding_model

    logger.info(f"✅ VectorDB initialized with {vector_db.count()} documents")
    logger.info(f"✅ Embedding model ready (lazy loading enabled)")

    yield

    logger.info("👋 Shutting down RAG backend server...")


# Create FastAPI app
app = FastAPI(
    title="Spinach RAG Backend",
    description="RAG-enabled backend for Spinach chat application",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Spinach RAG Backend",
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    try:
        from vectordb import vector_db

        # Check ChromaDB connection
        doc_count = vector_db.count()
        chroma_status = f"connected ({doc_count} documents)"

        return HealthResponse(
            status="healthy",
            version="0.1.0",
            chroma_status=chroma_status,
            embedding_model=settings.embedding_model,
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
            },
        )


@app.get("/api/model-status")
async def model_status():
    """Get the current status of the embedding model."""
    try:
        from embeddings import embedding_model

        return embedding_model.get_status()
    except Exception as e:
        logger.error(f"Failed to get model status: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "is_ready": False,
                "error": str(e),
            },
        )


@app.get("/api/llm-info")
async def llm_info():
    """Get LLM model information from llama.cpp server."""
    try:
        from llm import llm_client

        model_data = await llm_client.get_model_info()

        # Extract relevant information
        if model_data.get("data") and len(model_data["data"]) > 0:
            model = model_data["data"][0]
            meta = model.get("meta", {})

            # Format the response
            formatted_info = {
                "model_id": model.get("id", ""),
                "model_name": model.get("id", "").split("/")[-1] if model.get("id") else "",
                "owned_by": model.get("owned_by", ""),
                "created": model.get("created", 0),
                "specs": {
                    "n_params": meta.get("n_params", 0),
                    "n_params_formatted": f"{meta.get('n_params', 0) / 1e9:.1f}B" if meta.get('n_params') else "N/A",
                    "size": meta.get("size", 0),
                    "size_formatted": f"{meta.get('size', 0) / 1e9:.1f} GB" if meta.get('size') else "N/A",
                    "vocab_size": meta.get("n_vocab", 0),
                    "context_length": meta.get("n_ctx_train", 0),
                    "embedding_dim": meta.get("n_embd", 0),
                },
            }

            return formatted_info
        else:
            return JSONResponse(
                status_code=404,
                content={"error": "No model information available"},
            )
    except Exception as e:
        logger.error(f"Failed to get LLM info: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)},
        )


@app.get("/api/settings")
async def get_settings():
    """Get current backend settings."""
    return {
        "backend": {
            "host": settings.backend_host,
            "port": settings.backend_port,
        },
        "llm": {
            "base_url": settings.lm_studio_base_url,
            "model": settings.lm_studio_model,
        },
        "chromadb": {
            "persist_dir": settings.chroma_persist_dir,
            "collection_name": settings.chroma_collection_name,
        },
        "embeddings": {
            "model": settings.embedding_model,
            "device": settings.embedding_device,
        },
        "rag": {
            "top_k": settings.rag_top_k,
            "similarity_threshold": settings.rag_similarity_threshold,
            "chunk_size": settings.chunk_size,
            "chunk_overlap": settings.chunk_overlap,
        },
        "cors": {
            "origins": settings.cors_origins,
        },
    }


@app.put("/api/settings")
async def update_settings(update_data: dict):
    """Update backend settings (runtime only, not persisted to .env)."""
    try:
        updated_fields = []

        # Update LLM settings
        if "llm" in update_data:
            if "base_url" in update_data["llm"]:
                settings.lm_studio_base_url = update_data["llm"]["base_url"]
                updated_fields.append("llm.base_url")
                # Reinitialize LLM client with new URL
                from llm import llm_client
                llm_client.base_url = settings.lm_studio_base_url
                logger.info(f"Updated LLM base URL to: {settings.lm_studio_base_url}")

        # Update RAG settings
        if "rag" in update_data:
            if "top_k" in update_data["rag"]:
                settings.rag_top_k = update_data["rag"]["top_k"]
                updated_fields.append("rag.top_k")
            if "similarity_threshold" in update_data["rag"]:
                settings.rag_similarity_threshold = update_data["rag"]["similarity_threshold"]
                updated_fields.append("rag.similarity_threshold")

        logger.info(f"Settings updated: {', '.join(updated_fields)}")

        return {
            "success": True,
            "updated_fields": updated_fields,
            "message": "設定を更新しました（アプリ再起動時にリセットされます）",
        }
    except Exception as e:
        logger.error(f"Failed to update settings: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)},
        )


# Import and register routers
from routes import documents, rag, chat

app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(rag.router, prefix="/api/rag", tags=["rag"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.backend_host,
        port=settings.backend_port,
        reload=True,
        log_level="info",
    )
