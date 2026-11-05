"""Analisa os 50 livros mais vendidos da Amazon por ano (2009 a 2019) e gera resumo.json para o site.

Uso: .venv\\Scripts\\python.exe analisar.py
Dados: "Amazon Top 50 Bestselling Books 2009-2019" (Kaggle), em dados/bestsellers.csv.
"""
import json
from pathlib import Path

import pandas as pd

PASTA = Path(__file__).parent
df = pd.read_csv(PASTA / "dados" / "bestsellers.csv")
df["Genre"] = df["Genre"].map({"Fiction": "Ficção", "Non Fiction": "Não ficção"})

# O mesmo livro pode aparecer em vários anos: para "livros únicos", conta pelo nome
unicos = df.drop_duplicates("Name")

por_ano = (
    df.groupby(["Year", "Genre"]).size().unstack(fill_value=0)
    .join(df.groupby("Year")["Price"].mean().rename("preco_medio"))
    .reset_index()
)

autores = (
    df.groupby("Author").agg(vezes=("Name", "size"), livros=("Name", "nunique"))
    .sort_values(["vezes", "livros"], ascending=False).head(10).reset_index()
)

mais_avaliados = unicos.sort_values("Reviews", ascending=False).head(10)[["Name", "Author", "Reviews", "User Rating", "Genre"]]

# Preço x nota: correlação de Pearson (perto de 0 = uma coisa não depende da outra)
correlacao = df["Price"].corr(df["User Rating"])

resumo = {
    "total_linhas": int(len(df)),
    "livros_unicos": int(len(unicos)),
    "anos": [int(df["Year"].min()), int(df["Year"].max())],
    "genero_total": {g: int(n) for g, n in df["Genre"].value_counts().items()},
    "nota_media": round(float(df["User Rating"].mean()), 2),
    "preco_mediano": float(df["Price"].median()),
    "gratis": int((df["Price"] == 0).sum()),
    "correlacao_preco_nota": round(float(correlacao), 3),
    "por_ano": [
        {"ano": int(r.Year), "ficcao": int(r["Ficção"]), "nao_ficcao": int(r["Não ficção"]), "preco_medio": round(float(r.preco_medio), 2)}
        for _, r in por_ano.iterrows()
    ],
    "autores": autores.rename(columns={"Author": "autor"}).to_dict("records"),
    "mais_avaliados": [
        {"nome": r.Name, "autor": r.Author, "avaliacoes": int(r.Reviews), "nota": float(r["User Rating"]), "genero": r.Genre}
        for _, r in mais_avaliados.iterrows()
    ],
}

# Conferências: cada ano tem exatamente 50 livros
assert all(a["ficcao"] + a["nao_ficcao"] == 50 for a in resumo["por_ano"]), "algum ano não tem 50 livros"

(PASTA / "resumo.json").write_text(json.dumps(resumo, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"{resumo['total_linhas']} linhas, {resumo['livros_unicos']} livros únicos, correlação preço x nota = {resumo['correlacao_preco_nota']}")
