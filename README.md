# Calculadora de Normalidad Gumbel

Herramienta estadística web para evaluación de normalidad, homocedasticidad y correlaciones.

**Desarrollado por:** Dr. Miguel Angel Castro Mattos
**Centro de Investigación El Poliedro · Instituto de Estadística Gumbel**
**Versión:** 1.0.0

## Estructura

- `backend/` — Motor estadístico en Python (FastAPI + scipy + statsmodels)
- `frontend/` — Interfaz web (HTML + CSS + JavaScript + Plotly)

## Pruebas estadísticas incluidas

- Shapiro-Wilk
- Anderson-Darling
- Kolmogorov-Smirnov con corrección de Lilliefors
- D'Agostino-Pearson
- Jarque-Bera
- Levene / Brown-Forsythe
- Bartlett
- Correlaciones Pearson, Spearman, Kendall
- Mardia multivariante
- Box-Cox con intervalo de confianza

## Licencia

© 2026 Centro de Investigación El Poliedro.
Publicado bajo licencia CC BY-NC-SA 4.0.