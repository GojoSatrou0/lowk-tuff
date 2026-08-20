from __future__ import annotations
import argparse, http.server, json, os, socket, threading, time, uuid, webbrowser
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parent; os.chdir(ROOT)
LOCK=threading.RLock(); ROOMS={}; CLIENT_TIMEOUT=9.0; MAX_BODY=128*1024

def clean_room_code(value):
    return ''.join(c for c in str(value or '').upper() if c.isalnum() or c=='-')[:12]

def cleanup():
    now=time.monotonic()
    with LOCK:
        for room,clients in list(ROOMS.items()):
            for cid in list(clients):
                if now-clients[cid]['seen']>CLIENT_TIMEOUT: del clients[cid]
            if not clients: ROOMS.pop(room,None)

def snapshot(room):
    cleanup()
    with LOCK:
        return {cid:c['state'] for cid,c in ROOMS.get(room,{}).items() if isinstance(c.get('state'),dict) and isinstance(c['state'].get('p'),list) and len(c['state']['p'])>=3}

def new_client(room):
    cid=uuid.uuid4().hex[:12]
    ROOMS.setdefault(room,{})[cid]={'seen':time.monotonic(),'state':{},'hits':[]}
    return cid

def best_lan_ip():
    candidates=[]
    try:
        for info in socket.getaddrinfo(socket.gethostname(),None,socket.AF_INET):
            ip=info[4][0]
            if ip and not ip.startswith('127.') and ip not in candidates: candidates.append(ip)
    except Exception: pass
    try:
        s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM); s.connect(('8.8.8.8',80)); ip=s.getsockname()[0]; s.close()
        if ip and not ip.startswith('127.') and ip not in candidates: candidates.insert(0,ip)
    except Exception: pass
    return candidates[0] if candidates else 'YOUR-PC-IP'

class LanHandler(http.server.SimpleHTTPRequestHandler):
    server_version='OWPL-LAN/1.0'
    def log_message(self,fmt,*args):
        if '/api/lan/state' not in getattr(self,'path',''): print('[LAN]',fmt%args)
    def end_headers(self):
        if self.path.startswith('/api/lan/'): self.send_header('Cache-Control','no-store')
        super().end_headers()
    def json_response(self,status,data):
        raw=json.dumps(data,separators=(',',':')).encode(); self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Content-Length',str(len(raw))); self.send_header('Cache-Control','no-store'); self.end_headers(); self.wfile.write(raw)
    def read_json(self):
        length=int(self.headers.get('Content-Length','0') or '0')
        if length<0 or length>MAX_BODY: raise ValueError('request too large')
        return json.loads(self.rfile.read(length).decode() or '{}')
    def do_GET(self):
        if urlparse(self.path).path=='/api/lan/status': cleanup(); self.json_response(200,{'lanRelay':True,'rooms':len(ROOMS)}); return
        super().do_GET()
    def do_POST(self):
        path=urlparse(self.path).path
        if not path.startswith('/api/lan/'): self.json_response(404,{'error':'not found'}); return
        try: data=self.read_json()
        except Exception: self.json_response(400,{'error':'invalid request'}); return
        action=path.rsplit('/',1)[-1]; room=clean_room_code(data.get('room')); cleanup()
        if action in ('create','join','auto'):
            if not room: self.json_response(400,{'error':'room code required'}); return
            with LOCK:
                exists=bool(ROOMS.get(room))
                if action=='create' and exists: self.json_response(409,{'error':'room already exists'}); return
                if action=='join' and not exists: self.json_response(404,{'error':'room not found'}); return
                created=not exists; cid=new_client(room); players=snapshot(room)
            self.json_response(200,{'id':cid,'room':room,'created':created,'players':players}); return
        cid=str(data.get('id') or '')
        if not room or not cid: self.json_response(400,{'error':'room and id required'}); return
        if action=='state':
            state=data.get('state')
            if not isinstance(state,dict): self.json_response(400,{'error':'state required'}); return
            with LOCK:
                client=ROOMS.get(room,{}).get(cid)
                if client is None: self.json_response(410,{'error':'session expired'}); return
                client['seen']=time.monotonic(); client['state']=state; hits=client['hits'][:]; client['hits'].clear(); players=snapshot(room)
            self.json_response(200,{'players':players,'hits':hits}); return
        if action=='hit':
            target=str(data.get('target') or '')
            try: amount=max(0.0,min(100.0,float(data.get('amount',0))))
            except Exception: amount=0.0
            source=str(data.get('source') or 'pvp')[:32]
            if not target or amount<=0: self.json_response(400,{'error':'invalid hit'}); return
            with LOCK:
                sender=ROOMS.get(room,{}).get(cid); target_client=ROOMS.get(room,{}).get(target)
                if sender is None: self.json_response(410,{'error':'session expired'}); return
                sender['seen']=time.monotonic()
                if target_client is not None and target!=cid:
                    target_client['hits'].append({'amount':amount,'source':source,'shooter':cid}); target_client['hits']=target_client['hits'][-24:]
            self.json_response(200,{'ok':True}); return
        if action=='leave':
            with LOCK:
                clients=ROOMS.get(room)
                if clients:
                    clients.pop(cid,None)
                    if not clients: ROOMS.pop(room,None)
            self.json_response(200,{'ok':True}); return
        self.json_response(404,{'error':'unknown action'})

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--port',type=int,default=8765); ap.add_argument('--no-browser',action='store_true'); args=ap.parse_args()
    server=None; err=None
    ports=[args.port] if args.port==0 else list(range(args.port,args.port+10))
    for p in ports:
        try: server=http.server.ThreadingHTTPServer(('0.0.0.0',p),LanHandler); break
        except OSError as e: err=e
    if server is None: raise SystemExit(f'Could not open a local port: {err}')
    port=server.server_address[1]; lan_ip=best_lan_ip(); local=f'http://127.0.0.1:{port}/'; share=f'http://{lan_ip}:{port}/'
    print('\n'+'='*61); print(' OPEN WORLD PHYSICS LAB - LAN MULTIPLAYER'); print('='*61); print('This computer:\n ',local); print('\nFRIENDS ON THE SAME WI-FI SHOULD OPEN:\n ',share); print('\nThen everyone chooses MULTIPLAYER and uses the same room code.'); print('Keep this window open while playing.'); print('If Windows asks about network access, only allow it where permitted.'); print('Press Ctrl+C here to stop the server.'); print('='*61,flush=True)
    if not args.no_browser: threading.Timer(.7,lambda:webbrowser.open(local)).start()
    try: server.serve_forever()
    except KeyboardInterrupt: print('\nStopping LAN server...')
    finally: server.server_close()
if __name__=='__main__': main()
