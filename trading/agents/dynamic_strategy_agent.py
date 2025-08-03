"""LLM-powered dynamic strategy agent using Google Agent Development Kit."""
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional

import google.genai as genai


@dataclass
class DynamicStrategyAgent:
    """Adjust behaviour of other agents based on unstructured context."""
    model: str = "gemini-1.5-flash"
    api_key: Optional[str] = None

    def __post_init__(self) -> None:
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None

    def adjust(self, alpha_agent, risk_agent, context: str | None = None) -> None:
        """Use an LLM to modify agent parameters."""
        if not self.client or context is None:
            return
        prompt = (
            "Given the following context, suggest new short/long windows and risk "
            f"limits: {context}"
        )
        response = self.client.models.generate_content(model=self.model, contents=prompt)
        text = response.text or ""
        # Basic parsing of numbers from response text; in a real system this
        # would involve structured outputs or JSON.
        import re
        numbers = [int(n) for n in re.findall(r"\d+", text)]
        if len(numbers) >= 2:
            alpha_agent.short_window, alpha_agent.long_window = numbers[:2]
        if len(numbers) >= 3:
            risk_agent.max_position_size = float(numbers[2])
