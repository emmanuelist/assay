import json,urllib.request,base64,random,collections,re,concurrent.futures as cf
from keccak import sel
RPC="https://bsc-dataseed.binance.org/"
ID="0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
REP="0x8004BAa17C55a88189AE136b182e5fdA19dE9b63"
MAX=329359
def eth_call(to,data):
    req=urllib.request.Request(RPC,data=json.dumps({"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":to,"data":data},"latest"]}).encode(),headers={"Content-Type":"application/json"})
    return json.load(urllib.request.urlopen(req,timeout=30)).get("result")
def dstr(res):
    if not res or res=="0x": return None
    b=bytes.fromhex(res[2:]); off=int.from_bytes(b[:32],'big'); ln=int.from_bytes(b[off:off+32],'big')
    return b[off+32:off+32+ln].decode('utf8',errors='replace')

def one(i):
    out={"id":i}
    try:
        u=dstr(eth_call(ID,"0xc87b56dd"+format(i,'064x')))
        out["uri"]=u
        if u and u.startswith("data:application/json;base64,"):
            try: out["card"]=json.loads(base64.b64decode(u.split(",",1)[1]+"=="))
            except Exception: out["card"]=None
    except Exception as e: out["err"]=str(e)[:60]
    try:
        r=eth_call(REP,sel("getClients(uint256)")+format(i,'064x'))
        out["fb"]=(int.from_bytes(bytes.fromhex(r[2:])[32:64],"big") if r and r!="0x" else None)
    except Exception: out["fb"]=None
    return out

random.seed(11)
ids=random.sample(range(1,MAX),300)
res=[]
with cf.ThreadPoolExecutor(24) as ex:
    for r in ex.map(one,ids): res.append(r)
json.dump(res,open("audit.json","w"),indent=1)

n=len(res)
have_uri=[r for r in res if r.get("uri")]
inline=[r for r in res if r.get("card")]
http=[r for r in have_uri if r["uri"].startswith("http")]
print(f"sampled            {n}")
print(f"has tokenURI       {len(have_uri)}  ({len(have_uri)/n:.0%})")
print(f"  inline base64    {len(inline)}")
print(f"  http(s) URI      {len(http)}")
print(f"  other/garbage    {len(have_uri)-len(inline)-len(http)}")

# duplicate analysis over inline cards
sigs=collections.Counter()
for r in inline:
    c=r["card"] or {}
    sigs[(str(c.get('name'))[:40], str(c.get('description'))[:70])]+=1
print(f"\n=== DUPLICATE CLUSTERS (inline cards, n={len(inline)}) ===")
top=sigs.most_common(8)
dupd=sum(v for k,v in sigs.items() if v>1)
print(f"cards in a duplicate cluster: {dupd}/{len(inline)} = {dupd/max(len(inline),1):.0%}")
print(f"distinct name+desc pairs:     {len(sigs)}")
for (nm,ds),v in top: print(f"  {v:4d}x  {nm[:36]:<38} | {ds[:60]}")

# http host clusters
hosts=collections.Counter(re.sub(r'^https?://([^/]+).*',r'\1',r["uri"]) for r in http)
print(f"\n=== HTTP AGENT-CARD HOSTS ===")
for h,v in hosts.most_common(8): print(f"  {v:4d}x  {h}")

# services / endpoints presence
svc=0; svct=collections.Counter()
for r in inline:
    c=r["card"] or {}
    s=c.get("services") or c.get("endpoints") or []
    if s:
        svc+=1
        for e in s:
            if isinstance(e,dict): svct[e.get("type","?")]+=1
print(f"\ninline cards declaring services/endpoints: {svc}/{len(inline)}")
for k,v in svct.most_common(): print(f"  {v:4d}  {k}")

# reputation
fbs=[r["fb"] for r in res if isinstance(r.get("fb"),int)]
withfb=[x for x in fbs if x>0]
print(f"\n=== REPUTATION (ReputationRegistry.getClients) ===")
print(f"queried ok        {len(fbs)}/{n}")
print(f"agents with >0 fb {len(withfb)}  ({len(withfb)/max(len(fbs),1):.1%})")
print(f"total feedback    {sum(fbs)}")

# the four required hackathon categories
KW={"rebalancing":["rebalanc","lp range","reset position","concentrated liquidity"],
    "grid trading":["grid"],
    "yield optimisation":["yield","apr","apy","optimi"],
    "health factor":["health factor","liquidat","collateral"]}
blob=[]
for r in res:
    c=r.get("card") or {}
    blob.append((r["id"],(str(c.get("name",""))+" "+str(c.get("description",""))+" "+(r.get("uri") or "")).lower()))
print(f"\n=== FOUR REQUIRED CATEGORIES, found in sample of {n} ===")
for cat,kws in KW.items():
    hit=[i for i,t in blob if any(k in t for k in kws)]
    print(f"  {cat:<20} {len(hit):3d} matches  {hit[:6]}")
