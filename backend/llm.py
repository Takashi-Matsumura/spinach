"""LM Studio LLM client."""

import logging
from typing import List, Dict, Any, AsyncGenerator
import httpx

from config import settings
from models import Message

logger = logging.getLogger(__name__)

# Default system prompt for general AI chat
DEFAULT_SYSTEM_PROMPT = """あなたは親切で知識豊富なAIアシスタントです。
ユーザーの質問に対して、正確で分かりやすい回答を提供してください。
提供された参考資料がある場合は、それを活用して回答してください。"""


class LLMClient:
    """Client for LM Studio OpenAI-compatible API."""

    def __init__(self):
        """Initialize LLM client."""
        self.base_url = settings.lm_studio_base_url
        self.model = settings.lm_studio_model
        self.timeout = httpx.Timeout(120.0, connect=10.0)

    async def get_model_info(self) -> Dict[str, Any]:
        """
        Get model information from llama.cpp server.

        Returns:
            Model information dictionary
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/models")
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"❌ Failed to get model info: {e}")
            raise

    async def chat_completion(
        self,
        messages: List[Message],
        stream: bool = True,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """
        Generate chat completion using LM Studio.

        Args:
            messages: Conversation history
            stream: Whether to stream the response
            temperature: Sampling temperature

        Yields:
            Response chunks (if streaming)
        """
        try:
            logger.info(f"🤖 Calling LM Studio API (model: {self.model})")

            # Convert messages to dict format
            messages_dict = [
                {"role": msg.role, "content": msg.content}
                for msg in messages
            ]

            # Add system prompt if not present
            if not messages_dict or messages_dict[0].get("role") != "system":
                messages_dict.insert(0, {"role": "system", "content": DEFAULT_SYSTEM_PROMPT})

            payload = {
                "model": self.model,
                "messages": messages_dict,
                "temperature": temperature,
                "stream": stream,
            }

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                if stream:
                    # Streaming response
                    async with client.stream(
                        "POST",
                        f"{self.base_url}/chat/completions",
                        json=payload,
                    ) as response:
                        response.raise_for_status()

                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                data = line[6:]  # Remove "data: " prefix

                                if data == "[DONE]":
                                    break

                                yield data

                else:
                    # Non-streaming response
                    response = await client.post(
                        f"{self.base_url}/chat/completions",
                        json=payload,
                    )
                    response.raise_for_status()
                    yield response.text

        except httpx.HTTPError as e:
            logger.error(f"❌ LM Studio API HTTP error: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ LM Studio API error: {e}")
            raise


def create_rag_prompt(context: List[Dict[str, Any]], question: str) -> str:
    """
    Create a prompt with RAG context.

    Args:
        context: List of context items from RAG search
        question: User's question

    Returns:
        Formatted prompt with context
    """
    if not context:
        return question

    # Build context section
    context_parts = []
    for i, item in enumerate(context, 1):
        content = item["content"]
        metadata = item.get("metadata", {})
        filename = metadata.get("filename", "不明")

        context_parts.append(
            f"[参考資料 {i}: {filename}]\n{content}"
        )

    context_text = "\n\n".join(context_parts)

    # Create simple prompt - let system prompt handle the knowledge base
    prompt = f"""{question}

参考資料:
{context_text}"""

    return prompt


# Global LLM client instance
llm_client = LLMClient()
