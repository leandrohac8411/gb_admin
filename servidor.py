# Servidor local do GB Admin: igual ao "python -m http.server", mas manda o navegador
# não guardar cópia dos arquivos (evita misturar versões antigas e novas do código).
# Uso: python servidor.py [porta]   (padrão 8767, só em 127.0.0.1)
import http.server, os, sys

class SemCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8767
    http.server.ThreadingHTTPServer(("127.0.0.1", porta), SemCache).serve_forever()
