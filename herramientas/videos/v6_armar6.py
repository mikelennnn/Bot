import json, subprocess, os, re
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
S='/tmp/claude-0/-home-user-Bot/9a8e0860-21df-5217-8442-2391a3447559/scratchpad'
FF=S+'/chk/node_modules/ffmpeg-static/ffmpeg'
SRC='/root/.claude/uploads/9a8e0860-21df-5217-8442-2391a3447559/f095e03a-VID-20261125-WA00921.mp4'
FD='/usr/share/fonts/opentype/inter/'
LINK='https://chat.whatsapp.com/BRl3dtRE6km2yguHb0XdJt?s=cl&p=a&iam=2'
TEMPO=1.18; PAUSA=0.30; HOLD=1.6; T=0.3
CIAN=(255,90,110); ROSA=(224,36,58); MORADO=(13,7,8)
def run(a): subprocess.run(a,check=True)
def F(n,s): return ImageFont.truetype(FD+n,s)
G=json.load(open('guion.json'))
W,H=720,1280; VW,VH=600,1067; VX,VY=60,170; R=34
os.makedirs('seg',exist_ok=True); os.makedirs('png',exist_ok=True)
# ---- fondo neón ----
def fondo():
    im=Image.new('RGB',(W,H),MORADO); d=ImageDraw.Draw(im)
    for x in range(0,W,48): d.line([(x,0),(x,H)],fill=(42,14,18),width=1)
    for y in range(0,H,48): d.line([(0,y),(W,y)],fill=(42,14,18),width=1)
    glow=Image.new('RGB',(W,H),(0,0,0)); dg=ImageDraw.Draw(glow)
    dg.ellipse([-200,700,500,1500],fill=(110,8,20)); dg.ellipse([300,-300,1000,500],fill=(80,6,16))
    glow=glow.filter(ImageFilter.GaussianBlur(160))
    return ImageChops.add(im,glow)
base=fondo()
# ---- marco con brillo ----
marco=Image.new('RGBA',(W,H),(0,0,0,0))
for col,blur,ancho in ((ROSA,28,10),(CIAN,14,6)):
    capa=Image.new('RGBA',(W,H),(0,0,0,0)); ImageDraw.Draw(capa).rounded_rectangle([VX-6,VY-6,VX+VW+5,VY+VH+5],R+6,outline=col+(255,),width=ancho)
    marco.alpha_composite(capa.filter(ImageFilter.GaussianBlur(blur)))
ImageDraw.Draw(marco).rounded_rectangle([VX-4,VY-4,VX+VW+3,VY+VH+3],R+4,outline=(255,225,228,255),width=3)
mask=Image.new('L',(VW,VH),0); ImageDraw.Draw(mask).rounded_rectangle([0,0,VW-1,VH-1],R,fill=255); mask.save('png/mask.png')
# ---- lista de pasos (arriba) según el paso actual ----
NOMBRES=['Grupo','Video','Recorta','Crear']
def cabecera(actual):
    im=base.copy().convert('RGBA'); im.alpha_composite(marco)
    d=ImageDraw.Draw(im); f=F('Inter-Bold.otf',26)
    pw,ph,gap=156,62,12; x0=(W-(4*pw+3*gap))//2; y0=60
    for k,n in enumerate(NOMBRES,1):
        x=x0+(k-1)*(pw+gap); caja=[x,y0,x+pw,y0+ph]
        if k<actual:   # hecho
            d.rounded_rectangle(caja,31,fill=(55,8,14),outline=ROSA,width=3)
            txt=n; col=(255,190,198)
            cx=x+24; cy=y0+31; d.line([(cx-9,cy),(cx-3,cy+7),(cx+10,cy-8)],fill=ROSA,width=5)
            d.text((x+40,y0+31),txt,font=f,fill=col,anchor='lm')
        elif k==actual:  # activo con brillo
            gl=Image.new('RGBA',(W,H),(0,0,0,0)); ImageDraw.Draw(gl).rounded_rectangle(caja,31,outline=CIAN+(255,),width=8)
            im.alpha_composite(gl.filter(ImageFilter.GaussianBlur(9))); d=ImageDraw.Draw(im)
            d.rounded_rectangle(caja,31,fill=(110,10,24),outline=CIAN,width=3)
            d.text((x+pw/2,y0+31),f'{k}  {n}',font=f,fill=(255,240,242),anchor='mm')
        else:
            d.rounded_rectangle(caja,31,outline=(90,40,46),width=2)
            d.text((x+pw/2,y0+31),f'{k}  {n}',font=f,fill=(150,110,116),anchor='mm')
    return im.convert('RGB')
for k in range(0,6): cabecera(k).save(f'png/cab{k}.png')
# ---- pantalla final ----
fin=base.copy().convert('RGBA'); df=ImageDraw.Draw(fin)
gl=Image.new('RGBA',(W,H),(0,0,0,0)); dgl=ImageDraw.Draw(gl)
dgl.text((360,150),'ÚNETE AL GRUPO',font=F('InterDisplay-Black.otf',70),fill=CIAN+(255,),anchor='mm')
dgl.rounded_rectangle([130,250,590,710],34,outline=ROSA+(255,),width=14)
fin.alpha_composite(gl.filter(ImageFilter.GaussianBlur(14))); df=ImageDraw.Draw(fin)
df.text((360,150),'ÚNETE AL GRUPO',font=F('InterDisplay-Black.otf',70),fill=(255,240,242),anchor='mm')
df.rounded_rectangle([130,250,590,710],34,fill=(255,255,255),outline=ROSA,width=4)
qr=Image.open('qr.png').convert('RGB').resize((400,400),Image.NEAREST); fin.paste(qr,(160,280))
tam=34
while F('Inter-Bold.otf',tam).getlength(LINK)>W-44: tam-=1
df.text((360,790),LINK,font=F('Inter-Bold.otf',tam),fill=(255,214,219),anchor='mm')
df.rounded_rectangle([120,850,600,950],50,fill=(55,8,14),outline=ROSA,width=3)
df.text((360,900),'También está en los comentarios',font=F('Inter-Bold.otf',30),fill=(255,225,228),anchor='mm')
fin.convert('RGB').save('png/final.png'); print('letra del link:',tam)
# ---- voz acelerada ----
for g in G:
    run([FF,'-y','-loglevel','error','-i',f'voz/{g["id"]}.mp3','-af',f'atempo={TEMPO}','-ar','44100',f'voz/{g["id"]}_r.wav'])
# ---- segmentos ----
segs=[]; t=0
for i,g in enumerate(G):
    al=json.load(open(f'voz/{g["id"]}.json'))['alignment']
    st=[x/TEMPO for x in al['character_start_times_seconds']]; fin_v=al['character_end_times_seconds'][-1]/TEMPO
    D=round(fin_v+0.1+PAUSA+(HOLD if g['id']=='final' else 0),3)
    largo=D+(T if i<len(G)-1 else 0)
    if g['id']=='final':
        run([FF,'-y','-loglevel','error','-loop','1','-i','png/final.png','-vf','format=yuv420p','-t',str(largo),'-r','30','-c:v','libx264','-preset','veryfast','-crf','16',f'seg/{i}.mp4'])
    else:
        a,b=g['src']; L=b-a; vel=max(0.7,min(3.0,L/largo))
        pre=''
        if g['id']=='paso2': pre='split[za][zb];[zb]crop=478:80:0:0,boxblur=14:3[zc];[za][zc]overlay=0:0,'
        if g['id'] in ('gancho','cierre'): pre='crop=320:569:158:281,'
        run([FF,'-y','-loglevel','error','-ss',str(a),'-t',str(min(L,largo*vel)+0.1),'-i',SRC,'-loop','1','-i',f'png/cab{g["paso"]}.png','-loop','1','-i','png/mask.png','-filter_complex',
             f"[0:v]{pre}setpts=(PTS-STARTPTS)/{vel},fps=30,scale={VW}:{VH}:flags=lanczos,setsar=1,tpad=stop_mode=clone:stop_duration={largo+1},trim=duration={largo},format=yuva420p[v];"
             f"[2:v]format=gray,scale={VW}:{VH}[m];[v][m]alphamerge[vm];[1:v][vm]overlay={VX}:{VY}:shortest=1,format=yuv420p[o]",
             '-map','[o]','-t',str(largo),'-r','30','-c:v','libx264','-preset','veryfast','-crf','16',f'seg/{i}.mp4'])
    segs.append(dict(g=g,ini=t,D=D,st=st,ch=al['characters'])); t+=D
TOT=round(t,3); print('total',TOT)
ent=[]; [ent.extend(['-i',f'seg/{i}.mp4']) for i in range(len(G))]
fc=''; prev='[0:v]'; off=0
for i in range(1,len(G)):
    off+=segs[i-1]['D']; fc+=f"{prev}[{i}:v]xfade=transition=pixelize:duration={T}:offset={off:.3f}[x{i}];"; prev=f'[x{i}]'
run([FF,'-y','-loglevel','error']+ent+['-filter_complex',fc.rstrip(';'),'-map',prev,'-c:v','libx264','-preset','veryfast','-crf','16','base.mp4'])
# ---- subtítulos karaoke ----
def ts(x): h=int(x//3600); x-=h*3600; mm=int(x//60); x-=mm*60; return f'{h}:{mm:02d}:{x:05.2f}'
ass=f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Kar,Inter Display ExtraBold,42,&H006E5AFF,&H00FFFFFF,&H00080710,&H64080710,-1,0,0,0,100,100,0,0,3,14,0,2,90,90,170,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
for s in segs:
    g=s['g']; a=s['ini']+0.1; texto=''.join(s['ch']); st=s['st']; fin_seg=s['ini']+s['D']
    piezas=[]; ini=0
    for mt in re.finditer(r'[,.:!?¿¡…]+\s*',texto):
        if mt.end()-ini>14 or mt.end()==len(texto): piezas.append((ini,mt.end())); ini=mt.end()
    if ini<len(texto): piezas.append((ini,len(texto)))
    for j,(p,q) in enumerate(piezas):
        t0=a+st[p]; t1=a+st[piezas[j+1][0]] if j+1<len(piezas) else fin_seg-0.05
        palabras=[(m.start()+p,m.group()) for m in re.finditer(r'\S+',texto[p:q])]
        partes=[]
        for w,(pos,pal) in enumerate(palabras):
            sig=(palabras[w+1][0] if w+1<len(palabras) else None)
            dur=((st[sig] if sig is not None else min(st[q-1]+0.35,t1-a)) - st[pos])
            partes.append(f'{{\\k{max(1,int(dur*100))}}}{pal}')
        pos=('\\an8\\pos(360,190)' if g['id'] in ('gancho','cierre') else '')
        if g['id']=='final': pos='\\an2\\pos(360,1130)'
        ass+=f"Dialogue: 0,{ts(t0)},{ts(t1)},Kar,,0,0,0,,{{{pos}\\fad(60,0)}}"+' '.join(partes)+"\n"
open('subs.ass','w').write(ass)
run([FF,'-y','-loglevel','error','-i','base.mp4','-vf','subtitles=subs.ass:fontsdir=/usr/share/fonts/opentype/inter,format=yuv420p','-t',f'{TOT:.3f}','-c:v','libx264','-preset','medium','-crf','19','-r','30','video.mp4'])
# ---- audio ----
ent=[]; fil=[]; n=0
for s in segs:
    ent+=['-i',f'voz/{s["g"]["id"]}_r.wav']; ms=int((s['ini']+0.1)*1000)
    fil.append(f'[{n}:a]aresample=44100,pan=stereo|c0=c0|c1=c0,adelay={ms}|{ms}[a{n}]'); n+=1
    if s['ini']>0:
        ent+=['-i','whoosh.wav']; ms=int(max(0,s['ini']-0.15)*1000)
        fil.append(f'[{n}:a]aresample=44100,pan=stereo|c0=c0|c1=c0,adelay={ms}|{ms}[a{n}]'); n+=1
    if s['g']['paso'] in (1,2,3,4,5) and s['g']['id']!='final':
        ent+=['-i','pop.wav']; ms=int((s['ini']+0.05)*1000)
        fil.append(f'[{n}:a]aresample=44100,pan=stereo|c0=c0|c1=c0,adelay={ms}|{ms}[a{n}]'); n+=1
fil.append(''.join(f'[a{k}]' for k in range(n))+f'amix=inputs={n}:normalize=0,apad,atrim=0:{TOT:.3f},loudnorm=I=-14:TP=-1.5:LRA=11[out]')
run([FF,'-y','-loglevel','error']+ent+['-filter_complex',';'.join(fil),'-map','[out]','-ar','44100','audio.wav'])
run([FF,'-y','-loglevel','error','-i','video.mp4','-i','audio.wav','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart','-shortest','tutorial_v6.mp4'])
for k,s in enumerate(segs):
    x=min(s['ini']+s['D']*0.6, TOT-0.4)
    run([FF,'-y','-loglevel','error','-ss',str(x),'-i','tutorial_v6.mp4','-frames:v','1',f'r_{k}.png'])
