#!/usr/bin/env python3
# Reads each firm's own website (home page plus up to two about or services pages) and writes {token: {text, urls}}.
# usage: python3 scripts/cx-site.py sel.json site.json
import json,re,sys,requests,concurrent.futures as cf
from urllib.parse import urljoin
from bs4 import BeautifulSoup
sel=json.load(open(sys.argv[1]))
H={'User-Agent':'Mozilla/5.0 (compatible; research)'}
def get(u):
    try:
        r=requests.get(u,timeout=8,headers=H,allow_redirects=True)
        if r.status_code==200 and 'html' in r.headers.get('content-type','html'): return r.text[:600000],r.url
    except Exception: pass
    return None,None
def text(html):
    s=BeautifulSoup(html,'html.parser')
    for t in s(['script','style','nav','footer','header','noscript','form','svg']): t.decompose()
    seen=set();out=[]
    for el in s.find_all(['h1','h2','h3','p','li']):
        x=re.sub(r'\s+',' ',el.get_text(' ',strip=True)).strip()
        if len(x.split())<6 or len(x)>400 or x in seen: continue
        if re.search(r'(cookie|privacy policy|all rights reserved|terms of use|copyright|securities offered|investment advisory services offered|form crs|sign up|subscribe)',x,re.I): continue
        seen.add(x);out.append(x)
    return out
def links(html,base):
    s=BeautifulSoup(html,'html.parser');L=[]
    for a in s.find_all('a',href=True):
        h=a['href'];tx=a.get_text(' ',strip=True).lower()
        if re.search(r'(about|who-we-are|our-story|our-firm|philosophy|our-approach|services|retirement)',h.lower()+' '+tx) and not h.startswith(('mailto','tel','#')):
            try:
                u=urljoin(base,h)
                if u.split('/')[2].replace('www.','')==base.split('/')[2].replace('www.',''): L.append(u)
            except Exception: pass
    return list(dict.fromkeys(L))[:3]
def work(r):
    w=r['website'] if r['website'].startswith('http') else 'http://'+r['website']
    h,u=get(w)
    if not h: return r['token'],{'text':'','urls':[]}
    urls=[u];parts=text(h)[:20]
    for l in links(h,u)[:2]:
        h2,u2=get(l)
        if h2: parts+=text(h2)[:12]; urls.append(u2)
    seen=set();res=[]
    for p in parts:
        if p in seen: continue
        seen.add(p);res.append(p)
    return r['token'],{'text':' '.join(res)[:6000],'urls':urls}
with cf.ThreadPoolExecutor(12) as ex: res=dict(ex.map(work,sel))
json.dump(res,open(sys.argv[2],'w'))
print(sum(1 for v in res.values() if len(v['text'])>200),'of',len(res),'have site text')
