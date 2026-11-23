# Servidor local do GB Admin: igual ao "python -m http.server", mas
#  - manda o navegador não guardar cópia dos arquivos (evita misturar versões antigas e novas do código);
#  - só serve o app: pastas/arquivos internos (.git, tests, docs, este script...) dão 404;
#  - manda os cabeçalhos de segurança que um site de verdade deve ter (CSP etc.).
# Uso: python servidor.py [porta]   (padrão 8767, só em 127.0.0.1 — ninguém da rede acessa)
import http.server, os, sys, posixpath, urllib.parse

# O que pode ser servido: só o app.
PERMITIDO = ("index.html", "css/", "js/", "img/", "vendor/")

CABECALHOS = {
    "Cache-Control": "no-store, must-revalidate",
    "Content-Security-Policy": "; ".join([
        "default-src 'self'",
        # face-api (rostos na foto da aula) é servida pelo próprio site, em vendor/.
        "script-src 'self' 'wasm-unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob:",
        "connect-src 'self'",
        "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
    ]),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "geolocation=(), camera=(), microphone=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
}


def permitido(caminho_url):
    caminho = posixpath.normpath(urllib.parse.unquote(urllib.parse.urlsplit(caminho_url).path)).lstrip("/")
    if caminho in ("", "."):
        return True  # "/" -> index.html
    partes = caminho.split("/")
    if any(p.startswith(".") for p in partes):  # .git, .env, .gitignore...
        return False
    return caminho == "index.html" or any(caminho.startswith(p) for p in PERMITIDO if p.endswith("/"))


class Seguro(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        for k, v in CABECALHOS.items():
            self.send_header(k, v)
        super().end_headers()

    def do_GET(self):
        if not permitido(self.path):
            return self.send_error(404)
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
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8767
    http.server.ThreadingHTTPServer(("127.0.0.1", porta), Seguro).serve_forever()
