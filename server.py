from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent / "public"
HOST = "localhost"
PORT = 8000


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    handler = partial(Handler, directory=str(ROOT))
    server = ThreadingHTTPServer((HOST, PORT), handler)
    print(f"Simulador listo en http://{HOST}:{PORT}/")
    print("Presiona Ctrl+C para detenerlo.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
