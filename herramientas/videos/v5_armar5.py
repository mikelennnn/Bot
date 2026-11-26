import json, subprocess, os, re
from PIL import Image, ImageDraw, ImageFont, ImageFilter
S='/tmp/claude-0/-home-user-Bot/9a8e0860-21df-5217-8442-2391a3447559/scratchpad'
FF=S+'/chk/node_modules/ffmpeg-static/ffmpeg'
SRC='/root/.claude/uploads/9a8e0860-21df-5217-8442-2391a3447559/f095e03a-VID-20261125-WA00921.mp4'
FD='/usr/share/fonts/opentype/inter/'
LINK='https://chat.whatsapp.com/Fl6oAgZBCtLAZqCod1aOO7?s=cl&p=a&iam=2'
def run(a): subprocess.run(a,check=True)
def F(n,s): return ImageFont.truetype(FD+n,s)
G=json.load(open('guion.json'))
W,H=720,1280; T=0.2
os.makedirs('seg',exist_ok=True); os.makedirs('png',exist_ok=True)
# degradado inferior para que se lean las burbujas
g=Image.new('RGBA',(W,H),(0,0,0,0)); dg=ImageDraw.Draw(g)
for y in range(700,H): dg.line([(0,y),(W,y)],fill=(0,0,0,int(170*((y-700)/(H-700))**1.3)))
for y in range(0,260): dg.line([(0,y),(W,y)],fill=(0,0,0,int(120*(1-y/260)**1.5)))
g.save('png/degradado.png')
# ---- notificación tipo WhatsApp ----
def notificacion(texto,paso,arch):
    im=Image.new('RGBA',(680,150),(0,0,0,0)); d=ImageDraw.Draw(im)
    sh=Image.new('RGBA',(680,150),(0,0,0,0)); ImageDraw.Draw(sh).rounded_rectangle([6,10,674,146],30,fill=(0,0,0,120)); sh=sh.filter(ImageFilter.GaussianBlur(8))
    im.alpha_composite(sh)
    d.rounded_rectangle([0,0,672,138],30,fill=(31,44,52,245))
    d.ellipse([22,28,98,104],fill=(224,36,58,255))
    d.polygon([(60,44),(80,66),(60,88),(40,66)],fill=(255,255,255,255))
    d.text((118,30),'Erza-Bot  ·  ahora',font=F('Inter-Medium.otf',24),fill=(160,175,182,255))
    t=(f'Paso {paso}  ·  ' if paso else '')+texto
    f=F('Inter-Bold.otf',34)
    while f.getlength(t)>530: f=F('Inter-Bold.otf',f.size-1)
    d.text((118,64),t,font=f,fill=(240,244,245,255))
    im.save(arch)
# ---- burbuja de chat verde ----
def burbuja(texto,arch):
    f=F('Inter-SemiBold.otf',36); maxw=520
    pal=texto.split(); lineas=[]; act=''
    for p in pal:
        prueba=(act+' '+p).strip()
        if f.getlength(prueba)>maxw and act: lineas.append(act); act=p
        else: act=prueba
    lineas.append(act)
    ancho=max(f.getlength(l) for l in lineas); w=int(ancho)+120; h=len(lineas)*46+42
    im=Image.new('RGBA',(w+20,h+10),(0,0,0,0)); d=ImageDraw.Draw(im)
    d.rounded_rectangle([0,0,w,h],24,fill=(0,92,75,250))
    d.polygon([(w-28,h-24),(w+16,h+6),(w-60,h)],fill=(0,92,75,250))
    for k,l in enumerate(lineas): d.text((24,18+k*46),l,font=f,fill=(255,255,255,255))
    # palomitas azules
    x0,y0=w-58,h-30
    for dx in (0,12): d.line([(x0+dx,y0+8),(x0+dx+6,y0+14),(x0+dx+18,y0)],fill=(83,189,235,255),width=4)
    im.save(arch); return im.size
# ---- pantalla final ----
fin=Image.new('RGB',(W,H),(11,20,26)); df=ImageDraw.Draw(fin)
df.text((360,170),'Únete al grupo',font=F('InterDisplay-Black.otf',72),fill=(255,255,255),anchor='mm')
df.text((360,240),'Escanea el código con WhatsApp',font=F('Inter-Medium.otf',30),fill=(160,175,182),anchor='mm')
df.rounded_rectangle([110,300,610,800],36,fill=(255,255,255))
qr=Image.open('qr.png').convert('RGB').resize((420,420),Image.NEAREST); fin.paste(qr,(150,340))
tam=34
while F('Inter-Bold.otf',tam).getlength(LINK)>W-50: tam-=1
df.text((360,875),LINK,font=F('Inter-Bold.otf',tam),fill=(83,189,235),anchor='mm')
df.rounded_rectangle([110,940,610,1050],28,fill=(0,92,75))
df.text((360,995),'También está en los comentarios',font=F('Inter-Bold.otf',30),fill=(255,255,255),anchor='mm')
fin.save('png/final.png'); print('letra del link:',tam)
# ---- segmentos ----
segs=[]; t=0
for i,gq in enumerate(G):
    al=json.load(open(f'voz/{gq["id"]}.json'))['alignment']
    D=round(al['character_end_times_seconds'][-1]+0.12+0.32+(2.4 if gq['id']=='final' else 0),3)
    largo=D+(T if i<len(G)-1 else 0)
    if gq['id']=='final':
        run([FF,'-y','-loglevel','error','-loop','1','-i','png/final.png','-vf','format=yuv420p','-t',str(largo),'-r','30','-c:v','libx264','-preset','veryfast','-crf','16',f'seg/{i}.mp4'])
    else:
        a,b=gq['src']; L=b-a; vel=max(0.7,min(3.0,L/largo))
        pre=''
        if gq['id']=='paso2': pre='split[za][zb];[zb]crop=478:80:0:0,boxblur=14:3[zc];[za][zc]overlay=0:0,'
        if gq['id'] in ('gancho','cierre'): pre='crop=320:569:158:281,'
        run([FF,'-y','-loglevel','error','-ss',str(a),'-t',str(min(L,largo*vel)+0.1),'-i',SRC,'-i','png/degradado.png','-filter_complex',
             f"[0:v]{pre}setpts=(PTS-STARTPTS)/{vel},fps=30,scale={W}:{H}:flags=lanczos,setsar=1,tpad=stop_mode=clone:stop_duration={largo+1},trim=duration={largo}[v];[v][1:v]overlay=0:0,format=yuv420p[o]",
             '-map','[o]','-t',str(largo),'-r','30','-c:v','libx264','-preset','veryfast','-crf','16',f'seg/{i}.mp4'])
    segs.append(dict(g=gq,ini=t,D=D,al=al)); t+=D
TOT=round(t,3); print('total',TOT)
ent=[]; [ent.extend(['-i',f'seg/{i}.mp4']) for i in range(len(G))]
fc=''; prev='[0:v]'; off=0
for i in range(1,len(G)):
    off+=segs[i-1]['D']; fc+=f"{prev}[{i}:v]xfade=transition=fadewhite:duration={T}:offset={off:.3f}[x{i}];"; prev=f'[x{i}]'
run([FF,'-y','-loglevel','error']+ent+['-filter_complex',fc.rstrip(';'),'-map',prev,'-c:v','libx264','-preset','veryfast','-crf','16','base.mp4'])
# ---- superposiciones: notificaciones y burbujas ----
capas=[]  # (png, a, b, tipo)
for k,s in enumerate(segs):
    gq=s['g']; a=s['ini']; b=a+s['D']
    if gq['aviso']:
        arch=f'png/aviso{k}.png'; notificacion(gq['aviso'],gq['paso'],arch); capas.append((arch,a+0.1,b-0.05,'aviso'))
    if gq['id']=='final': continue
    ch=s['al']['characters']; st=s['al']['character_start_times_seconds']; texto=''.join(ch)
    piezas=[]; ini=0
    for mt in re.finditer(r'[,.:!?¿¡…]+\s*',texto):
        if mt.end()-ini>10 or mt.end()==len(texto): piezas.append((ini,mt.end())); ini=mt.end()
    if ini<len(texto): piezas.append((ini,len(texto)))
    for j,(p,q) in enumerate(piezas):
        frase=texto[p:q].strip().rstrip(',:')
        if len(frase)<2: continue
        t0=a+0.12+st[p]; t1=a+0.12+(st[piezas[j+1][0]] if j+1<len(piezas) else s['D']-0.12)
        arch=f'png/burbuja{k}_{j}.png'; burbuja(frase,arch); capas.append((arch,t0,min(t1,b),'arriba' if gq['id'] in ('gancho','cierre') else 'burbuja'))
ent=['-i','base.mp4']; fc=''; prev='[0:v]'
for n,(arch,a,b,tipo) in enumerate(capas,1):
    ent+=['-i',arch]
    if tipo=='aviso':
        pos=f"x=20:y='if(lt(t-{a:.3f},0.28),-170+(t-{a:.3f})/0.28*210,40)'"
    elif tipo=='arriba':
        pos=f"x=W-w-26:y='230+max(0,0.12-(t-{a:.3f}))*350'"
    else:
        pos=f"x=W-w-26:y='1090-h+max(0,0.12-(t-{a:.3f}))*350'"
    fc+=f"{prev}[{n}:v]overlay={pos}:enable='between(t,{a:.3f},{b:.3f})'[o{n}];"; prev=f'[o{n}]'
run([FF,'-y','-loglevel','error']+ent+['-filter_complex',fc.rstrip(';'),'-map',prev,'-t',f'{TOT:.3f}','-c:v','libx264','-preset','medium','-crf','19','-r','30','-pix_fmt','yuv420p','video.mp4'])
# ---- audio ----
ent=[]; fil=[]; n=0
for s in segs:
    ent+=['-i',f'voz/{s["g"]["id"]}.mp3']; ms=int((s['ini']+0.12)*1000)
    fil.append(f'[{n}:a]aresample=44100,pan=stereo|c0=c0|c1=c0,adelay={ms}|{ms}[a{n}]'); n+=1
    if s['ini']>0:
        ent+=['-i','whoosh.wav']; ms=int(max(0,s['ini']-0.12)*1000)
        fil.append(f'[{n}:a]aresample=44100,pan=stereo|c0=c0|c1=c0,adelay={ms}|{ms}[a{n}]'); n+=1
    if s['g']['aviso']:
        ent+=['-i','pop.wav']; ms=int((s['ini']+0.12)*1000)
        fil.append(f'[{n}:a]aresample=44100,pan=stereo|c0=c0|c1=c0,adelay={ms}|{ms}[a{n}]'); n+=1
fil.append(''.join(f'[a{k}]' for k in range(n))+f'amix=inputs={n}:normalize=0,apad,atrim=0:{TOT:.3f},loudnorm=I=-14:TP=-1.5:LRA=11[out]')
run([FF,'-y','-loglevel','error']+ent+['-filter_complex',';'.join(fil),'-map','[out]','-ar','44100','audio.wav'])
run([FF,'-y','-loglevel','error','-i','video.mp4','-i','audio.wav','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart','-shortest','tutorial_v5.mp4'])
for k,s in enumerate(segs):
    x=min(s['ini']+1.6, TOT-0.5)
    run([FF,'-y','-loglevel','error','-ss',str(x),'-i','tutorial_v5.mp4','-frames:v','1',f'r_{k}.png'])
