import asyncio
import json
import logging
from typing import Any

import httpx

from ..config import settings

logger = logging.getLogger(__name__)


class OpenRouterClient:
    def __init__(self):
        self.base_url = settings.openrouter_base_url
        self.api_key = settings.openrouter_api_key
        self.primary_model = settings.openrouter_primary_model
        self.fallback_model = settings.openrouter_fallback_model

    def _headers(self) -> dict:
        if not self.api_key:
            raise RuntimeError("OPENROUTER_API_KEY is not configured")
        return {"Authorization": f"Bearer {self.api_key}"}

    async def _chat(self, prompt: str, model: str) -> str:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self._headers(),
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7,
                },
            )
            if response.status_code >= 400:
                raise RuntimeError(f"OpenRouter error {response.status_code}: {response.text}")
            return response.json()["choices"][0]["message"]["content"]

    async def _with_fallback(self, prompt: str) -> tuple[str, str]:
        """Returns (content, model_used)."""
        for attempt, model in enumerate([self.primary_model, self.fallback_model]):
            try:
                content = await self._chat(prompt, model)
                return content, model
            except Exception:
                if attempt == 1:
                    raise
                await asyncio.sleep(2 ** attempt)

    async def analyze_nutrition(
        self,
        child_name: str,
        age_months: int,
        weight_kg: float,
        height_cm: float,
        muac_cm: float,
        status: str,
        diet_log: list[dict],
    ) -> dict:
        prompt = self._build_analysis_prompt(
            child_name, age_months, weight_kg, height_cm, muac_cm, status, diet_log
        )
        if not self.api_key:
            logger.info("No OpenRouter API key configured; using built-in nutrition fallback")
            return self._build_fallback_analysis(
                child_name=child_name,
                age_months=age_months,
                status=status,
                diet_log=diet_log,
            )

        try:
            content, model = await self._with_fallback(prompt)
            clean = content.strip()
            if clean.startswith("```"):
                clean = clean.split("```")[1]
                if clean.startswith("json"):
                    clean = clean[4:]
                clean = clean.strip()
            try:
                analysis = json.loads(clean)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON from AI: {content}") from exc
            analysis["model_used"] = model
            return analysis
        except Exception as exc:
            logger.warning("OpenRouter analysis unavailable; using fallback: %s", exc)
            return self._build_fallback_analysis(
                child_name=child_name,
                age_months=age_months,
                status=status,
                diet_log=diet_log,
            )

    async def ask_question(
        self,
        child_name: str,
        age_months: int,
        analysis_summary: str,
        question: str,
    ) -> str:
        if not self.api_key:
            age_years = age_months // 12
            age_str = f"{age_months} months" if age_years == 0 else f"{age_years} year{'s' if age_years > 1 else ''} {age_months % 12} months"
            return (
                f"{child_name or 'The child'} ({age_str}) should receive a balanced diet with local Tamil Nadu foods such as ragi, moringa, horsegram, sesame, and drumstick. "
                f"For this question, focus on regular meals, protein-rich foods, and a small amount of healthy fat while keeping the diet affordable and practical."
            )

        age_years = age_months // 12
        age_str = f"{age_months} months" if age_years == 0 else f"{age_years} year{'s' if age_years > 1 else ''} {age_months % 12} months"
        context = f"Recent AI nutrition analysis: {analysis_summary}" if analysis_summary else "No prior nutrition analysis available."
        prompt = f"""You are a pediatric nutritionist supporting Anganwadi workers in Tamil Nadu, India under the ICDS programme.

Child: {child_name}, {age_str} old.
{context}

Worker's question: {question}

Answer in 2-3 practical sentences. Recommend locally available Tamil Nadu foods (ragi, moringa, horsegram, sesame, tamarind, drumstick, etc.) and follow ICDS guidelines. Be direct and actionable."""
        content, _ = await self._with_fallback(prompt)
        return content.strip()

    def _build_fallback_analysis(
        self,
        child_name: str,
        age_months: int,
        status: str,
        diet_log: list[dict],
    ) -> dict[str, Any]:
        diet_names = [str(item.get("name", "")).lower() for item in diet_log if item.get("name")]
        has_staple = any(name in {"rice", "porridge", "upma", "idli", "dosa"} for name in diet_names)
        deficiencies = [
            {
                "nutrient": "Energy",
                "severity": "moderate",
                "foods": ["Ragi porridge", "Banana", "Groundnut chutney"],
            },
            {
                "nutrient": "Protein",
                "severity": "moderate" if has_staple else "mild",
                "foods": ["Dal", "Egg", "Groundnut"],
            },
            {
                "nutrient": "Iron",
                "severity": "mild",
                "foods": ["Moringa leaves", "Horsegram", "Sesame seeds"],
            },
        ]
        diet_context = ", ".join(item.get("name", "") for item in diet_log if item.get("name")) or "a simple home diet"
        return {
            "deficiencies": deficiencies,
            "meal_plan": [
                {
                    "day": "Monday",
                    "breakfast": "Ragi porridge with milk and banana",
                    "lunch": "Rice, dal, and seasonal vegetables",
                    "snack": "Curd with fruit",
                    "dinner": "Soft egg or dal with rice",
                }
            ],
            "referral_needed": False,
            "referral_reason": None,
            "summary": (
                f"{child_name or 'The child'} appears to need a balanced, locally available diet with more protein and micronutrients. "
                f"Based on the logged foods ({diet_context}), a simple protein-rich plan with ragi, dal, eggs, and leafy vegetables would help. "
                f"Current growth status: {status or 'monitor'}"
            ),
            "score": 7,
            "caloric_adequacy_pct": 78,
            "model_used": "fallback-local",
        }

    def _build_analysis_prompt(
        self,
        child_name: str,
        age_months: int,
        weight_kg: float,
        height_cm: float,
        muac_cm: float,
        status: str,
        diet_log: list[dict],
    ) -> str:
        age_years = age_months // 12
        diet_str = "\n".join(
            [f"- {item['name']}: {item.get('quantity_g', 0)}g" for item in diet_log]
        )
        return f"""You are a pediatric nutritionist supporting ICDS (Integrated Child Development Services) workers in Tamil Nadu, India.

Child Profile:
- Name: {child_name}
- Age: {age_months} months ({age_years} years)
- Weight: {weight_kg} kg | Height: {height_cm} cm
- MUAC: {muac_cm} cm
- Current Growth Status: {status}
- Diet logged today:
{diet_str}
- Region: Tamil Nadu, India

Tasks:
1. Identify the top 3 nutrient deficiencies with severity (mild/moderate/severe)
2. For each deficiency, suggest 3 locally available, affordable Tamil Nadu foods
3. Generate a 7-day meal plan using ICDS supplementary nutrition guidelines (ragi, moringa, horsegram, tamarind, sesame, drumstick)
4. Flag if child needs immediate medical referral (true/false with reason)
5. Score the overall diet quality from 0 to 10
6. Estimate caloric adequacy as a percentage of daily age-appropriate requirements

Respond ONLY in the following JSON format with no additional text or markdown:
{{
  "deficiencies": [
    {{ "nutrient": "Iron", "severity": "moderate", "foods": ["Moringa leaves", "Sesame seeds", "Horsegram"] }}
  ],
  "meal_plan": [
    {{ "day": "Monday", "breakfast": "...", "lunch": "...", "snack": "...", "dinner": "..." }}
  ],
  "referral_needed": false,
  "referral_reason": null,
  "summary": "Brief 2-sentence summary for the Anganwadi worker",
  "score": 6,
  "caloric_adequacy_pct": 75
}}
"""


openrouter_client = OpenRouterClient()
