"""
Motor estadístico de la Calculadora de Normalidad Gumbel.
Usa scipy.stats y statsmodels para garantizar precisión.
"""

import numpy as np
from scipy import stats
from statsmodels.stats.diagnostic import lilliefors
from statsmodels.stats.stattools import jarque_bera
import warnings


# ============================================================
# UTILIDADES
# ============================================================

def _clean_float(x):
    """Convierte NaN/inf a None para que JSON lo acepte."""
    if x is None:
        return None
    try:
        x = float(x)
    except (TypeError, ValueError):
        return None
    if np.isnan(x) or np.isinf(x):
        return None
    return x


def _safe(fn, *args, **kwargs):
    """Ejecuta una función estadística capturando errores."""
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            return fn(*args, **kwargs)
    except Exception as e:
        return {"error": str(e)}


# ============================================================
# DESCRIPTIVOS
# ============================================================

def descriptive_stats(data):
    arr = np.asarray(data, dtype=float)
    n = len(arr)
    if n == 0:
        return {"error": "Sin datos"}

    mean = float(np.mean(arr))
    median = float(np.median(arr))
    std = float(np.std(arr, ddof=1)) if n > 1 else 0.0
    var = float(np.var(arr, ddof=1)) if n > 1 else 0.0

    try:
        mode_result = stats.mode(arr, keepdims=False)
        mode_value = float(mode_result.mode)
        mode_count = int(mode_result.count)
        if mode_count <= 1:
            modes = None
        else:
            values, counts = np.unique(arr, return_counts=True)
            max_count = counts.max()
            if max_count > 1:
                modes = [float(v) for v in values[counts == max_count]]
            else:
                modes = None
    except Exception:
        modes = None

    return {
        "n": int(n),
        "mean": mean,
        "median": median,
        "modes": modes,
        "std": std,
        "variance": var,
        "min": float(np.min(arr)),
        "max": float(np.max(arr)),
        "range": float(np.max(arr) - np.min(arr)),
        "q1": float(np.percentile(arr, 25)),
        "q3": float(np.percentile(arr, 75)),
        "iqr": float(np.percentile(arr, 75) - np.percentile(arr, 25)),
        "sum": float(np.sum(arr)),
    }


# ============================================================
# ASIMETRÍA Y CURTOSIS CON IC BOOTSTRAP
# ============================================================

def skewness_kurtosis(data, n_bootstrap=2000, ci=0.95):
    arr = np.asarray(data, dtype=float)
    n = len(arr)
    if n < 4:
        return {"error": "Se necesitan al menos 4 valores"}

    skew = float(stats.skew(arr, bias=True))
    kurt = float(stats.kurtosis(arr, bias=True))

    skew_se = float(np.sqrt((6 * n * (n - 1)) / ((n - 2) * (n + 1) * (n + 3))))
    kurt_se = None
    if n > 3:
        kurt_se = float(np.sqrt(
            (24 * n * (n - 1) ** 2) / ((n - 3) * (n - 2) * (n + 3) * (n + 5))
        ))

    rng = np.random.default_rng(seed=42)
    boot_skew = []
    boot_kurt = []
    for _ in range(n_bootstrap):
        sample = rng.choice(arr, size=n, replace=True)
        boot_skew.append(stats.skew(sample, bias=True))
        boot_kurt.append(stats.kurtosis(sample, bias=True))

    alpha = (1 - ci) / 2
    skew_ci = (
        float(np.percentile(boot_skew, 100 * alpha)),
        float(np.percentile(boot_skew, 100 * (1 - alpha))),
    )
    kurt_ci = (
        float(np.percentile(boot_kurt, 100 * alpha)),
        float(np.percentile(boot_kurt, 100 * (1 - alpha))),
    )

    return {
        "skewness": skew,
        "kurtosis": kurt,
        "skewness_se": skew_se,
        "kurtosis_se": kurt_se,
        "skewness_ci": skew_ci,
        "kurtosis_ci": kurt_ci,
        "ci_level": ci,
        "n_bootstrap": n_bootstrap,
    }


# ============================================================
# PRUEBAS DE NORMALIDAD
# ============================================================

def shapiro_wilk(data):
    arr = np.asarray(data, dtype=float)
    n = len(arr)
    if n < 3:
        return {"error": "Shapiro-Wilk requiere n >= 3"}
    if n > 5000:
        return {"error": "Shapiro-Wilk pierde validez con n > 5000"}
    try:
        W, p = stats.shapiro(arr)
        return {"W": float(W), "p": float(p)}
    except Exception as e:
        return {"error": str(e)}


def kolmogorov_smirnov_lilliefors(data):
    arr = np.asarray(data, dtype=float)
    if len(arr) < 4:
        return {"error": "Lilliefors requiere n >= 4"}
    try:
        D, p = lilliefors(arr, dist='norm', pvalmethod='table')
        return {"D": float(D), "p": float(p)}
    except Exception as e:
        return {"error": str(e)}


def anderson_darling(data):
    arr = np.asarray(data, dtype=float)
    if len(arr) < 8:
        return {"error": "Anderson-Darling requiere n >= 8"}
    try:
        result = stats.anderson(arr, dist='norm')
        A2 = float(result.statistic)
        sig_pct = np.array(result.significance_level)
        crit = np.array(result.critical_values)

        # Ordenar por valor crítico ascendente
        order = np.argsort(crit)
        crit_sorted = crit[order]
        sig_sorted = sig_pct[order] / 100.0

        if A2 <= crit_sorted[0]:
            p = sig_sorted[0]
        elif A2 >= crit_sorted[-1]:
            p = sig_sorted[-1] / 2
        else:
            p = float(np.interp(A2, crit_sorted, sig_sorted))

        return {
            "A2": A2,
            "p": float(p),
            "critical_values": crit_sorted.tolist(),
            "significance_levels": (sig_sorted * 100).tolist(),
        }
    except Exception as e:
        return {"error": str(e)}


def dagostino_pearson(data):
    arr = np.asarray(data, dtype=float)
    if len(arr) < 20:
        return {"error": "D'Agostino-Pearson requiere n >= 20"}
    try:
        result = stats.normaltest(arr)
        return {"K2": float(result.statistic), "p": float(result.pvalue)}
    except Exception as e:
        return {"error": str(e)}


def jarque_bera_test(data):
    arr = np.asarray(data, dtype=float)
    if len(arr) < 2:
        return {"error": "Jarque-Bera requiere n >= 2"}
    try:
        jb, p = jarque_bera(arr)[:2]
        return {"JB": float(jb), "p": float(p)}
    except Exception as e:
        return {"error": str(e)}


# ============================================================
# OUTLIERS
# ============================================================

def detect_outliers(data):
    arr = np.asarray(data, dtype=float)
    n = len(arr)
    if n < 4:
        return {"error": "Se necesitan al menos 4 valores"}

    q1 = float(np.percentile(arr, 25))
    q3 = float(np.percentile(arr, 75))
    iqr = q3 - q1
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr
    lower_ext = q1 - 3.0 * iqr
    upper_ext = q3 + 3.0 * iqr

    outliers_iqr = []
    outliers_extreme = []
    for i, v in enumerate(arr):
        if v < lower or v > upper:
            outliers_iqr.append({"index": int(i), "value": float(v)})
            if v < lower_ext or v > upper_ext:
                outliers_extreme.append({"index": int(i), "value": float(v)})

    median = float(np.median(arr))
    mad = float(np.median(np.abs(arr - median)))
    if mad == 0:
        modified_z = [0.0] * n
    else:
        modified_z = [float(0.6745 * (v - median) / mad) for v in arr]
    outliers_modified_z = [
        {"index": int(i), "value": float(arr[i]), "mz": modified_z[i]}
        for i in range(n) if abs(modified_z[i]) > 3.5
    ]

    mean = float(np.mean(arr))
    std = float(np.std(arr, ddof=1)) if n > 1 else 0.0
    if std == 0:
        z_scores = [0.0] * n
    else:
        z_scores = [float((v - mean) / std) for v in arr]
    outliers_z = [
        {"index": int(i), "value": float(arr[i]), "z": z_scores[i]}
        for i in range(n) if abs(z_scores[i]) > 3
    ]

    return {
        "q1": q1, "q3": q3, "iqr": iqr,
        "lower_fence": lower, "upper_fence": upper,
        "lower_fence_extreme": lower_ext, "upper_fence_extreme": upper_ext,
        "outliers_iqr": outliers_iqr,
        "outliers_extreme": outliers_extreme,
        "outliers_z": outliers_z,
        "outliers_modified_z": outliers_modified_z,
        "modified_z_scores": modified_z,
    }


# ============================================================
# TRANSFORMACIONES
# ============================================================

def transform_boxcox(data):
    arr = np.asarray(data, dtype=float)
    if np.any(arr <= 0):
        return {"error": "Box-Cox requiere todos los valores > 0"}

    transformed, lam = stats.boxcox(arr)
    try:
        lam_ci = _boxcox_ci(arr, lam)
    except Exception:
        lam_ci = None

    return {
        "transformed": transformed.tolist(),
        "lambda": float(lam),
        "lambda_ci": lam_ci,
    }


def _boxcox_ci(x, lam_opt):
    llf_opt = stats.boxcox_llf(lam_opt, x)
    threshold = llf_opt - 1.920729

    lam_min, lam_max = lam_opt, lam_opt
    step = 0.01

    lam = lam_opt
    while lam > -5:
        lam -= step
        if stats.boxcox_llf(lam, x) < threshold:
            lam_min = lam + step
            break
    else:
        lam_min = -5

    lam = lam_opt
    while lam < 5:
        lam += step
        if stats.boxcox_llf(lam, x) < threshold:
            lam_max = lam - step
            break
    else:
        lam_max = 5

    return [float(lam_min), float(lam_max)]


def transform_log(data):
    arr = np.asarray(data, dtype=float)
    mask = arr > 0
    omitted = int(np.sum(~mask))
    transformed = np.log(arr[mask])
    return {
        "transformed": transformed.tolist(),
        "omitted": omitted,
        "warning": f"{omitted} valores <= 0 omitidos" if omitted else None,
    }


def transform_sqrt(data):
    arr = np.asarray(data, dtype=float)
    mask = arr >= 0
    omitted = int(np.sum(~mask))
    transformed = np.sqrt(arr[mask])
    return {
        "transformed": transformed.tolist(),
        "omitted": omitted,
        "warning": f"{omitted} valores negativos omitidos" if omitted else None,
    }


def transform_inverse(data):
    arr = np.asarray(data, dtype=float)
    mask = arr != 0
    omitted = int(np.sum(~mask))
    transformed = 1.0 / arr[mask]
    return {
        "transformed": transformed.tolist(),
        "omitted": omitted,
        "warning": f"{omitted} ceros omitidos" if omitted else None,
    }


# ============================================================
# HOMOCEDASTICIDAD
# ============================================================

def levene_test(groups, center='median'):
    arrays = [np.asarray(g, dtype=float) for g in groups if len(g) >= 2]
    if len(arrays) < 2:
        return {"error": "Se necesitan al menos 2 grupos con n >= 2"}
    try:
        W, p = stats.levene(*arrays, center=center)
        return {
            "W": float(W),
            "p": float(p),
            "method": "Brown-Forsythe (mediana)" if center == 'median' else "Levene (media)",
        }
    except Exception as e:
        return {"error": str(e)}


def bartlett_test(groups):
    arrays = [np.asarray(g, dtype=float) for g in groups if len(g) >= 2]
    if len(arrays) < 2:
        return {"error": "Se necesitan al menos 2 grupos con n >= 2"}
    try:
        T, p = stats.bartlett(*arrays)
        return {"T": float(T), "p": float(p)}
    except Exception as e:
        return {"error": str(e)}


# ============================================================
# CORRELACIONES
# ============================================================

def correlation_matrix(data_matrix, method='pearson'):
    arr = np.asarray(data_matrix, dtype=float)
    if arr.ndim != 2:
        return {"error": "Se requiere una matriz 2D"}
    k = arr.shape[0]
    if k < 2:
        return {"error": "Se necesitan al menos 2 variables"}

    mask = ~np.isnan(arr).any(axis=0)
    n_omitted = int(np.sum(~mask))
    arr = arr[:, mask]
    n = arr.shape[1]

    if n < 3:
        return {"error": "Muy pocos casos validos tras eliminar missing"}

    corr = np.eye(k)
    pvals = np.eye(k)

    for i in range(k):
        for j in range(i + 1, k):
            if method == 'pearson':
                r, p = stats.pearsonr(arr[i], arr[j])
            elif method == 'spearman':
                r, p = stats.spearmanr(arr[i], arr[j])
            elif method == 'kendall':
                r, p = stats.kendalltau(arr[i], arr[j])
            else:
                return {"error": f"Metodo {method} no soportado"}
            corr[i, j] = corr[j, i] = float(r)
            pvals[i, j] = pvals[j, i] = float(p)

    return {
        "correlations": corr.tolist(),
        "p_values": pvals.tolist(),
        "n": int(n),
        "n_omitted": n_omitted,
        "method": method,
    }


# ============================================================
# MARDIA (normalidad multivariante)
# ============================================================

def mardia_test(data_matrix):
    X = np.asarray(data_matrix, dtype=float)
    if X.ndim != 2:
        return {"error": "Se requiere matriz 2D"}
    n, p = X.shape
    if n < p + 1 or p < 2:
        return {"error": "Se requiere n > p y p >= 2"}

    X_centered = X - X.mean(axis=0)
    S = np.cov(X_centered, rowvar=False, ddof=1)
    try:
        S_inv = np.linalg.inv(S)
    except np.linalg.LinAlgError:
        return {"error": "Matriz de covarianza singular"}

    D = np.einsum('ij,jk,ik->i', X_centered, S_inv, X_centered)

    b1p = np.mean(D ** 3)
    kappa1 = n * b1p / 6
    df1 = p * (p + 1) * (p + 2) // 6
    p1 = 1 - stats.chi2.cdf(kappa1, df1)

    b2p = np.mean(D ** 2)
    kappa2 = (b2p - p * (p + 2)) / np.sqrt(8 * p * (p + 2) / n)
    p2 = 2 * (1 - stats.norm.cdf(abs(kappa2)))

    return {
        "skewness": {"statistic": float(kappa1), "df": int(df1), "p": float(p1)},
        "kurtosis": {"statistic": float(kappa2), "p": float(p2)},
    }


# ============================================================
# FUNCIÓN MAESTRA
# ============================================================

def analyze_variable(data):
    arr = np.asarray(data, dtype=float)
    arr = arr[~np.isnan(arr)]
    n = len(arr)

    if n < 3:
        return {"error": f"Se necesitan al menos 3 valores (recibidos: {n})"}

    return {
        "n": int(n),
        "descriptive": descriptive_stats(arr),
        "skewness_kurtosis": skewness_kurtosis(arr),
        "normality": {
            "shapiro_wilk": shapiro_wilk(arr),
            "lilliefors": kolmogorov_smirnov_lilliefors(arr),
            "anderson_darling": anderson_darling(arr),
            "dagostino_pearson": dagostino_pearson(arr),
            "jarque_bera": jarque_bera_test(arr),
        },
        "outliers": detect_outliers(arr),
        "recommended_test": _recommend_test(n),
    }


def _recommend_test(n):
    if n < 8:
        return {"test": "shapiro_wilk",
                "reason": "n pequeno; SW es la mas potente (aunque con baja potencia global)"}
    if n <= 5000:
        return {"test": "shapiro_wilk",
                "reason": "SW es la mas potente para 8 <= n <= 5000 (Royston 1995)"}
    return {"test": "anderson_darling",
            "reason": "SW pierde validez con n > 5000; AD es preferible"}