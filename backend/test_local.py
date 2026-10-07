"""
Prueba local del motor estadistico.
Ejecuta: python test_local.py
"""

import numpy as np
from stats_engine import (
    analyze_variable,
    levene_test,
    bartlett_test,
    correlation_matrix,
    mardia_test,
    transform_boxcox,
)


def sep(titulo):
    print("\n" + "=" * 60)
    print(titulo)
    print("=" * 60)


rng = np.random.default_rng(42)
normal_data = rng.normal(loc=100, scale=15, size=50).tolist()

sep("1. ANALISIS DE VARIABLE NORMAL (n=50)")
res = analyze_variable(normal_data)
print(f"N: {res['n']}")
print(f"Media: {res['descriptive']['mean']:.4f}")
print(f"Mediana: {res['descriptive']['median']:.4f}")
print(f"DE: {res['descriptive']['std']:.4f}")
print(f"Asimetria: {res['skewness_kurtosis']['skewness']:.4f} "
      f"IC95%: {res['skewness_kurtosis']['skewness_ci']}")
print(f"Curtosis: {res['skewness_kurtosis']['kurtosis']:.4f} "
      f"IC95%: {res['skewness_kurtosis']['kurtosis_ci']}")
print("\nPruebas de normalidad:")
for name, r in res['normality'].items():
    if 'error' in r:
        print(f"  {name}: {r['error']}")
    else:
        stat = r.get('W') or r.get('D') or r.get('A2') or r.get('K2') or r.get('JB')
        print(f"  {name}: stat={stat:.4f}, p={r['p']:.4f}")
print(f"\nRecomendada: {res['recommended_test']['test']}")
print(f"Razon: {res['recommended_test']['reason']}")
print(f"\nOutliers IQR: {len(res['outliers']['outliers_iqr'])}")
print(f"Outliers modified-Z: {len(res['outliers']['outliers_modified_z'])}")


sep("2. DATOS NO NORMALES (exponencial)")
exp_data = rng.exponential(scale=1.0, size=50).tolist()
res2 = analyze_variable(exp_data)
print(f"Asimetria: {res2['skewness_kurtosis']['skewness']:.4f}")
print(f"Shapiro-Wilk p: {res2['normality']['shapiro_wilk']['p']:.6f}")
print(f"Anderson-Darling p: {res2['normality']['anderson_darling']['p']:.6f}")


sep("3. HOMOCEDASTICIDAD")
g1 = rng.normal(0, 1, 30).tolist()
g2 = rng.normal(0, 1, 30).tolist()
g3 = rng.normal(0, 2, 30).tolist()

print("Grupos con varianzas iguales (g1 vs g2):")
print(f"  Levene: {levene_test([g1, g2], center='mean')}")
print(f"  Brown-Forsythe: {levene_test([g1, g2], center='median')}")

print("\nGrupos con varianzas distintas (g1 vs g3):")
print(f"  Levene: {levene_test([g1, g3], center='mean')}")
print(f"  Bartlett: {bartlett_test([g1, g3])}")


sep("4. CORRELACIONES")
x = rng.normal(0, 1, 50)
y = 0.7 * x + rng.normal(0, 1, 50)
z = rng.normal(0, 1, 50)

mat = [x.tolist(), y.tolist(), z.tolist()]
print("Pearson:")
print(correlation_matrix(mat, method='pearson')['correlations'])
print("\nSpearman:")
print(correlation_matrix(mat, method='spearman')['correlations'])


sep("5. MARDIA MULTIVARIANTE")
data_mv = rng.multivariate_normal(
    mean=[0, 0, 0],
    cov=[[1, 0.5, 0.3], [0.5, 1, 0.2], [0.3, 0.2, 1]],
    size=100,
).tolist()
print(mardia_test(data_mv))


sep("6. BOX-COX")
positive_data = rng.lognormal(mean=0, sigma=1, size=50).tolist()
bc = transform_boxcox(positive_data)
print(f"Lambda optimo: {bc['lambda']:.4f}")
print(f"IC 95%: {bc['lambda_ci']}")


print("\nTodas las pruebas ejecutadas sin errores.")