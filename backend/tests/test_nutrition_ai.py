from app.nutrition.openrouter_client import OpenRouterClient


def test_fallback_analysis_uses_diet_context_for_recommendations():
    client = OpenRouterClient()

    analysis = client._build_fallback_analysis(
        child_name="Asha",
        age_months=24,
        status="MAM",
        diet_log=[{"name": "Rice", "quantity_g": 150}, {"name": "Porridge", "quantity_g": 100}],
    )

    assert analysis["meal_plan"]
    assert analysis["summary"].lower().find("balanced") >= 0
    assert any(deficiency["nutrient"] == "Protein" for deficiency in analysis["deficiencies"])
