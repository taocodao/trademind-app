#!/usr/bin/env python3
# Fills in website text for firms whose site blocks plain page reads (403, scripts only), using the Perplexity Search API
# limited to the firm's own domain. Run where the key lives. usage: python3 cx-search.py sel.json site.json  (updates site.json)
import json,os,re,sys,requests,concurrent.futures as cf
env=open(os.path.expanduser('~/.env')).read()
key=re.search(r'^(?:export )?PERPLEXITY_API_KEY=(.*)$',env,re.M).group(1).strip().strip('"\'')
sel=json.load(open(sys.argv[1])); site=json.load(open(sys.argv[2]))
def dom(w): return re.sub(r'^https?://(www\.)?','',w.strip().lower()).split('/')[0]
def work(r):
    if len(site.get(r['token'],{}).get('text',''))>=200: return r['token'],None
    d=dom(r['website'])
    best={'text':'','urls':[]}
    for q in (f"{r['firm']} services and approach for clients", f"{r['firm']} about us"):
        try:
            x=requests.post('https://api.perplexity.ai/search',headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'},json={'query':q,'max_results':6,'max_tokens_per_page':1200,'search_domain_filter':[d]},timeout=40)
            if x.status_code!=200: continue
            parts=[];urls=[]
            for it in x.json().get('results',[]):
                t=re.sub(r'\s+',' ',(it.get('snippet') or '')).strip()
                if len(t)>80: parts.append(t); urls.append(it.get('url'))
            txt=' '.join(parts)
            if len(txt)>len(best['text']): best={'text':txt[:6000],'urls':list(dict.fromkeys(urls))[:4]}
            if len(best['text'])>=600: break
        except Exception: pass
    return r['token'],best
with cf.ThreadPoolExecutor(6) as ex:
    for t,b in ex.map(work,sel):
        if b and len(b['text'])>len(site.get(t,{}).get('text','')): site[t]=b
json.dump(site,open(sys.argv[2],'w'))
print(sum(1 for v in site.values() if len(v['text'])>=200),'of',len(site),'have text')
