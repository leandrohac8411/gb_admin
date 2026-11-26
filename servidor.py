# Servidor local do GB Admin: igual ao "python -m http.server", mas
#  - manda o navegador não guardar cópia dos arquivos (evita misturar versões antigas e novas do código);
#  - só serve o app: pastas/arquivos internos (.git, tests, docs, este script...) dão 404;
#  - manda os mesmos cabeçalhos de segurança do site publicado (lidos do vercel.json).
# Uso: python servidor.py [porta]   (padrão 8767, só em 127.0.0.1 — ninguém da rede acessa)
import http.server, json, os, sys, posixpath, urllib.parse

# O que pode ser servido: só o app.
PERMITIDO = ("index.html", "css/", "js/", "img/", "vendor/", "aluno/")

def cabecalhos_da_vercel():
    # Os mesmos cabeçalhos de segurança do site publicado (vercel.json), para o teste local
    # ser fiel à produção. Só tira o que não faz sentido em http://localhost.
    with open("vercel.json", encoding="utf-8") as f:
        regras = json.load(f)["headers"]
    h = {x["key"]: x["value"] for x in next(r for r in regras if r["source"] == "/(.*)")["headers"]}
    h.pop("Strict-Transport-Security", None)
    h["Content-Security-Policy"] = "; ".join(
        p.strip() for p in h["Content-Security-Policy"].split(";") if p.strip() != "upgrade-insecure-requests")
    h["Cache-Control"] = "no-store, must-revalidate"
    return h


def permitido(caminho_url):
    caminho = posixpath.normpath(urllib.parse.unquote(urllib.parse.urlsplit(caminho_url).path)).lstrip("/")
    if caminho in ("", "."):
        return True  # "/" -> index.html
    partes = caminho.split("/")
    if any(p.startswith(".") for p in partes):  # .git, .env, .gitignore...
        return False
    return caminho in ("index.html", "aluno") or any(caminho.startswith(p) for p in PERMITIDO if p.endswith("/"))


class Seguro(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        aluno = urllib.parse.urlsplit(self.path).path.startswith("/aluno")
        for k, v in CABECALHOS.items():
            # Portal do aluno: o GPS do check-in é liberado só no /aluno (igual ao vercel.json).
            if aluno and k == "Permissions-Policy":
                v = v.replace("geolocation=()", "geolocation=(self)")
            self.send_header(k, v)
        super().end_headers()

    def do_GET(self):
        if not permitido(self.path):
            return self.send_error(404)
        if urllib.parse.urlsplit(self.path).path == "/aluno":  # igual ao rewrite da Vercel
            self.path = "/aluno/index.html"
        return super().do_GET()

    def do_HEAD(self):
        if not permitido(self.path):
            return self.send_error(404)
        return super().do_HEAD()

    def list_directory(self, path):  # nunca lista o conteúdo das pastas
        self.send_error(404)
        return None

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    CABECALHOS = cabecalhos_da_vercel()
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8767
    http.server.ThreadingHTTPServer(("127.0.0.1", porta), Seguro).serve_forever()
