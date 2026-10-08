/* ============================================================
   CONFIGURACIÓN DE LA CALCULADORA DE NORMALIDAD GUMBEL
   ============================================================ */

const CONFIG = {
  // URL del backend (motor estadístico en Python)
  // En local:    'http://127.0.0.1:8000'
  // En Render:   'https://calculadora-gumbel-api.onrender.com'
    API_BASE_URL: 'https://calculadora-gumbel.onrender.com',

  // Metadatos de la herramienta
  TOOL_NAME: 'Calculadora de Normalidad Gumbel',
  TOOL_VERSION: '1.0.0',
  TOOL_YEAR: 2026,
  AUTHOR_NAME: 'Castro Mattos, Miguel Angel',
  AUTHOR_SHORT: 'Castro, M. A.',        // Para APA, Harvard (con puntos y coma)
  AUTHOR_VANCOUVER: 'Castro MA',         // Para Vancouver (sin puntos)
  INSTITUTION: 'Centro de Investigación El Poliedro',
  INSTITUTE: 'Instituto de Estadística Gumbel',
  URL: 'https://calculadora-psicometrica-elpoliedro.netlify.app/',
  DOI: null,

  // Parámetros estadísticos por defecto
  ALPHA: 0.05,
  N_BOOTSTRAP: 2000,
  CI_LEVEL: 0.95
};