#!/usr/bin/env python3
"""
Servidor HTTP en red local para presentar la animación del Sistema de Apertura
(Cerradura Mortise de 3 Ejes accionada por Actuador Lineal) en otros dispositivos.
"""
import http.server
import json
import os
import socket
import socketserver

PORT = int(os.environ.get("PORT", 8080))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


def get_lan_ips():
    ips = []
    # Intento 1: Conectar socket UDP sin enviar tráfico para detectar la IP de salida LAN
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        primary_ip = s.getsockname()[0]
        s.close()
        if primary_ip and not primary_ip.startswith("127."):
            ips.append(primary_ip)
    except Exception:
        pass

    # Intento 2: Resolver hostname local
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip and not ip.startswith("127.") and ip not in ips:
                ips.append(ip)
    except Exception:
        pass

    return ips or ["127.0.0.1"]


class CommunityPresentationHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        if self.path == "/api/network-info":
            ips = get_lan_ips()
            payload = {
                "port": PORT,
                "ips": ips,
                "urls": [f"http://{ip}:{PORT}" for ip in ips],
            }
            data = json.dumps(payload).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)
            return
        return super().do_GET()


class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    ips = get_lan_ips()
    with ThreadedTCPServer(("0.0.0.0", PORT), CommunityPresentationHandler) as httpd:
        print("=" * 68)
        print(" SERVIDOR DE PRESENTACIÓN COMUNITARIA ACTIVO")
        print("=" * 68)
        print(f" • En este equipo:        http://localhost:{PORT}")
        for ip in ips:
            print(f" • En otros dispositivos: http://{ip}:{PORT}")
        print("=" * 68)
        httpd.serve_forever()
