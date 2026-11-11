import sys,os,json,re,requests,concurrent.futures as cf,time
env=open(os.path.expanduser('~/.env')).read()
key=re.search(r'^(?:export )?PERPLEXITY_API_KEY=(.*)$',env,re.M).group(1).strip().strip('"\'')
model=sys.argv[3] if len(sys.argv)>3 else 'anthropic/claude-sonnet-5-5'
def call(r):
    for a in range(5):
        try:
            x=requests.post('https://api.perplexity.ai/v1/agent',headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'},json={'model':model,'instructions':r['system'],'input':r['user'],'max_output_tokens':4000},timeout=120)
            if x.status_code==200:
                j=x.json();t=j.get('output_text') or ''
                if not t:
                    for o in j.get('output',[]):
                        for c in o.get('content',[]) or []:
                            if c.get('type')=='output_text': t+=c.get('text','')
                return {'id':r['id'],'text':t}
            err=f'{x.status_code} {x.text[:200]}'
        except Exception as e: err=str(e)
        time.sleep(10)
    return {'id':r['id'],'text':'','error':err}
rows=[json.loads(l) for l in open(sys.argv[1]) if l.strip()]
with cf.ThreadPoolExecutor(4) as ex: out=list(ex.map(call,rows))
with open(sys.argv[2],'w') as f:
    for o in out: f.write(json.dumps(o)+'\n')
print(len(out),'done',sum(1 for o in out if not o['text']),'empty')
