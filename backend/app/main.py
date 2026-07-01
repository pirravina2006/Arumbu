from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .auth.router import router as auth_router
from .children.router import router as children_router
from .admin.router import router as admin_router
from .growth.router import router as growth_router
from .nutrition.router import router as nutrition_router
from .mealplan.router import router as mealplan_router
from .alerts.router import router as alerts_router
from .reports.router import router as reports_router
from .rate_limit import add_rate_limiting


app = FastAPI(title="Anganwadi Smart Health Monitoring System")


@app.get("/")
async def root():
    return {"message": "Anganwadi API is running"}

# Add rate limiting
limiter = add_rate_limiting(app)
app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"] ,
    allow_headers=["*"] ,
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(children_router, prefix="/children", tags=["children"])
app.include_router(admin_router, prefix="/admin", tags=["admin"])
app.include_router(growth_router, prefix="/growth", tags=["growth"])
app.include_router(nutrition_router, prefix="/nutrition", tags=["nutrition"])
app.include_router(mealplan_router, prefix="/mealplan", tags=["mealplan"])
app.include_router(alerts_router, tags=["alerts"])
app.include_router(reports_router, tags=["reports"])
