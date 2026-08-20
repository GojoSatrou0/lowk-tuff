from __future__ import annotations
import http.server,json,os,threading,time,uuid
from urllib.parse import urlparse
HOST=os.environ.get("HOST","0.0.0.0");PORT=int(os.environ.get("PORT","8080"));CLIENT_TIMEOUT=float(os.environ.get("CLIENT_TIMEOUT","15"));ROOM_TIMEOUT=float(os.environ.get("ROOM_TIMEOUT","120"));MAX_ROOMS=int(os.environ.get("MAX_ROOMS","250"));MAX_CLIENTS=int(os.environ.get("MAX_CLIENTS_PER_ROOM","24"));MAX_BODY=131072;LOCK=threading.RLock();ROOMS={}
def code(v):return "".join(c for c in str(v or "").upper() if c.isalnum() or c=="-")[:12]
def cleanup():
 n=time.monotonic()
 with LOCK:
  for r in list(ROOMS):
   q=ROOMS[r]
   for cid in list(q["clients"]):
    if n-q["clients"][cid]["seen"]>CLIENT_TIMEOUT:q["clients"].pop(cid,None)
   if not q["clients"] and n-q["touched"]>ROOM_TIMEOUT:ROOMS.pop(r,None)
def snapshot(r):
 cleanup()
 with LOCK:
  q=ROOMS.get(r);return {} if not q else {cid:c["state"] for cid,c in q["clients"].items() if isinstance(c.get("state"),dict)}
def add(r):
 q=ROOMS.setdefault(r,{"clients":{},"touched":time.monotonic()})
 if len(q["clients"])>=MAX_CLIENTS:raise OverflowError
 cid=uuid.uuid4().hex[:12];q["clients"][cid]={"seen":time.monotonic(),"state":{},"hits":[]};q["touched"]=time.monotonic();return cid
class H(http.server.BaseHTTPRequestHandler):
 def log_message(self,fmt,*a):
  if "/api/state" not in self.path:print("[relay]",fmt%a)
 def cors(self):self.send_header("Access-Control-Allow-Origin","*");self.send_header("Access-Control-Allow-Methods","GET,POST,OPTIONS");self.send_header("Access-Control-Allow-Headers","Content-Type,Accept");self.send_header("Cache-Control","no-store")
 def reply(self,s,o):
  b=json.dumps(o,separators=(",",":")).encode();self.send_response(s);self.send_header("Content-Type","application/json");self.send_header("Content-Length",str(len(b)));self.cors();self.end_headers();self.wfile.write(b)
 def body(self):
  n=int(self.headers.get("Content-Length","0") or 0)
  if n<0 or n>MAX_BODY:raise ValueError
  return json.loads(self.rfile.read(n).decode() or "{}")
 def do_OPTIONS(self):self.send_response(204);self.cors();self.end_headers()
 def do_GET(self):
  p=urlparse(self.path).path
  if p=="/api/status":cleanup();self.reply(200,{"centralRelay":True,"rooms":len(ROOMS)});return
  if p=="/health":self.reply(200,{"ok":True});return
  self.reply(404,{"error":"not found"})
 def do_POST(self):
  p=urlparse(self.path).path
  try:d=self.body()
  except:self.reply(400,{"error":"invalid request"});return
  a=p.rsplit("/",1)[-1];r=code(d.get("room"));cleanup()
  if a in ("create","join","auto"):
   if not r:self.reply(400,{"error":"room code required"});return
   with LOCK:
    exists=r in ROOMS and bool(ROOMS[r]["clients"])
    if a=="create" and exists:self.reply(409,{"error":"room already exists"});return
    if a=="join" and not exists:self.reply(404,{"error":"room not found"});return
    if not exists and len(ROOMS)>=MAX_ROOMS:self.reply(503,{"error":"server full"});return
    created=not exists
    try:cid=add(r)
    except OverflowError:self.reply(429,{"error":"room full"});return
    snap=snapshot(r)
   self.reply(200,{"id":cid,"room":r,"created":created,"players":snap});return
  cid=str(d.get("id") or "")
  if not r or not cid:self.reply(400,{"error":"room and id required"});return
  if a=="state":
   state=d.get("state")
   if not isinstance(state,dict):self.reply(400,{"error":"state required"});return
   with LOCK:
    q=ROOMS.get(r);c=q and q["clients"].get(cid)
    if c is None:self.reply(410,{"error":"session expired"});return
    c["seen"]=time.monotonic();c["state"]=state;q["touched"]=time.monotonic();hits=c["hits"][:];c["hits"].clear();snap=snapshot(r)
   self.reply(200,{"players":snap,"hits":hits});return
  if a=="hit":
   target=str(d.get("target") or "")
   try:amount=max(0.0,min(100.0,float(d.get("amount",0))))
   except:amount=0.0
   source=str(d.get("source") or "pvp")[:32]
   if not target or amount<=0:self.reply(400,{"error":"invalid hit"});return
   with LOCK:
    q=ROOMS.get(r);sender=q and q["clients"].get(cid);victim=q and q["clients"].get(target)
    if sender is None:self.reply(410,{"error":"session expired"});return
    sender["seen"]=time.monotonic();q["touched"]=time.monotonic()
    if victim is not None and target!=cid:victim["hits"].append({"amount":amount,"source":source,"shooter":cid});victim["hits"]=victim["hits"][-24:]
   self.reply(200,{"ok":True});return
  if a=="leave":
   with LOCK:
    q=ROOMS.get(r)
    if q:q["clients"].pop(cid,None);q["touched"]=time.monotonic()
   self.reply(200,{"ok":True});return
  self.reply(404,{"error":"unknown action"})
if __name__=="__main__":print(f"OWPL central relay listening on {HOST}:{PORT}",flush=True);http.server.ThreadingHTTPServer((HOST,PORT),H).serve_forever()
