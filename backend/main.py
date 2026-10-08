"""
API de la Calculadora de Normalidad Gumbel.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

from stats_engine import (
    analyze_variable,
    levene_test,
    bartlett_test,
    correlation_matrix,
    mardia_test,
    transform_boxcox,
    transform_log,
    transform_sqrt,
    transform_inverse,
)


class VariableInput(BaseModel):
    name: str
    data: List[float]

class VisitInput(BaseModel):
    visitor_id: str

class MultipleVariablesInput(BaseModel):
    variables: List[VariableInput]


class GroupsInput(BaseModel):
    groups: List[List[float]]


class CorrelationInput(BaseModel):
    matrix: List[List[float]]
    method: str = "pearson"


class MardiaInput(BaseModel):
    matrix: List[List[float]]


class TransformInput(BaseModel):
    data: List[float]
    method: str


app = FastAPI(
    title="Calculadora de Normalidad Gumbel API",
    version="1.0.0",
    description="Motor estadistico basado en scipy y statsmodels",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "name": "Calculadora de Normalidad Gumbel API",
        "version": "1.0.0",
        "status": "ok",
    }


@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"status": "healthy"}
# ============================================================
# CONTADOR DE VISITAS (en memoria, se resetea al reiniciar)
# ============================================================
import time

visit_count = 0
unique_visitors = set()
last_visits = []


@app.post("/visits/increment")
def increment_visits(payload: VisitInput):
    """
    Suma una visita. Si el visitor_id no está registrado,
    también suma a únicos.
    """
    global visit_count, unique_visitors, last_visits

    visitor_id = payload.visitor_id.strip()
    if not visitor_id:
        raise HTTPException(400, "Falta visitor_id")

    visit_count += 1
    is_new = visitor_id not in unique_visitors
    if is_new:
        unique_visitors.add(visitor_id)

    now = time.time()
    last_visits.append((visitor_id, now))

    cutoff = now - 86400
    last_visits = [(vid, ts) for vid, ts in last_visits if ts > cutoff]

    unique_24h = len(set(vid for vid, ts in last_visits))

    return {
        "total_visits": visit_count,
        "unique_visitors": len(unique_visitors),
        "last_24h_visits": len(last_visits),
        "last_24h_unique": unique_24h,
        "is_new_visitor": is_new,
    }


@app.get("/visits")
def get_visits():
    """Devuelve las estadísticas actuales sin incrementar."""
    now = time.time()
    cutoff = now - 86400
    recent = [(vid, ts) for vid, ts in last_visits if ts > cutoff]
    unique_24h = len(set(vid for vid, ts in recent))

    return {
        "total_visits": visit_count,
        "unique_visitors": len(unique_visitors),
        "last_24h_visits": len(recent),
        "last_24h_unique": unique_24h,
    }


@app.post("/analyze/variable")
def analyze_one(variable: VariableInput):
    if len(variable.data) < 3:
        raise HTTPException(400, "Se necesitan al menos 3 valores")
    result = analyze_variable(variable.data)
    return {"name": variable.name, **result}


@app.post("/analyze/multiple")
def analyze_multiple(payload: MultipleVariablesInput):
    results = {}
    for var in payload.variables:
        results[var.name] = analyze_variable(var.data)
    return {"results": results}


@app.post("/levene")
def levene(payload: GroupsInput):
    return {
        "levene": levene_test(payload.groups, center='mean'),
        "brown_forsythe": levene_test(payload.groups, center='median'),
    }


@app.post("/bartlett")
def bartlett(payload: GroupsInput):
    return bartlett_test(payload.groups)


@app.post("/correlation")
def correlation(payload: CorrelationInput):
    return correlation_matrix(payload.matrix, method=payload.method)


@app.post("/mardia")
def mardia(payload: MardiaInput):
    return mardia_test(payload.matrix)


@app.post("/transform")
def transform(payload: TransformInput):
    method = payload.method.lower()
    if method == "log":
        return transform_log(payload.data)
    elif method == "sqrt":
        return transform_sqrt(payload.data)
    elif method == "inverse":
        return transform_inverse(payload.data)
    elif method == "boxcox":
        return transform_boxcox(payload.data)
    else:
        raise HTTPException(400, f"Metodo {method} no soportado")