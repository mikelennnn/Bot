import json, subprocess, os, re
from PIL import Image, ImageDraw, ImageFont
S='/tmp/claude-0/-home-user-Bot/9a8e0860-21df-5217-8442-2391a3447559/scratchpad'
FF=S+'/chk/node_modules/ffmpeg-static/ffmpeg'
SRC='/root/.claude/uploads/9a8e0860-21df-5217-8442-2391a3447559/f095e03a-VID-20261125-WA00921.mp4'
FUENTE='/usr/share/fonts/opentype/inter/InterDisplay-Black.otf'
def run(a): subprocess.run(a,check=True)
G=json.load(open('guion.json'))
W,H=720,1280; VW,VH=500,890; B=8; T=0.25  # borde y duración de transición
CX,CY=110,250
# --- fondo de cuaderno ---
f=Image.new('RGB',(W,H),(246,241,232)); d=ImageDraw.Draw(f)
for y in range(60,H,44): d.line([(0,y),(W,y)],fill=(196,214,236),width=2)
d.line([(64,0),(64,H)],fill=(236,150,150),width=3)
f.save('fondo.png')
# --- sombra dura + borde (la tarjeta) ---
c=Image.new('RGBA',(VW+2*B+16,VH+2*B+16),(0,0,0,0)); dc=ImageDraw.Draw(c)
dc.rectangle([16,16,VW+2*B+15,VH+2*B+15],fill=(17,17,17,255))  # sombra desplazada
dc.rectangle([0,0,VW+2*B-1,VH+2*B-1],fill=(17,17,17,255))      # borde
c.save('tarjeta.png')
# --- insignias de paso ---
fn=ImageFont.truetype(FUENTE,74)
for n in '1234':
    im=Image.new('RGBA',(130,130),(0,0,0,0)); di=ImageDraw.Draw(im)
    di.ellipse([8,8,126,126],fill=(17,17,17,255)); di.ellipse([0,0,118,118],fill=(255,210,77,255),outline=(17,17,17,255),width=6)
    di.text((59,57),n,font=fn,fill=(17,17,17,255),anchor='mm'); im.save(f'paso{n}.png')
# --- pantalla final: QR + link ---
fin=Image.open('fondo.png').convert('RGBA'); df=ImageDraw.Draw(fin)
X0,Y0,X1,Y1=34,250,676,1060
df.rectangle([X0+14,Y0+14,X1+14,Y1+14],fill=(17,17,17)); df.rectangle([X0,Y0,X1,Y1],fill=(255,255,255),outline=(17,17,17),width=8)
qr=Image.open('qr.png').convert('RGB').resize((440,440),Image.NEAREST); fin.paste(qr,(140,290))
LINK='https://chat.whatsapp.com/Fl6oAgZBCtLAZqCod1aOO7?s=cl&p=a&iam=2'
tam=40
while ImageFont.truetype(FUENTE,tam).getlength(LINK)>X1-X0-40: tam-=1
f1=ImageFont.truetype(FUENTE,34); fl=ImageFont.truetype(FUENTE,tam)
df.text((360,790),LINK,font=fl,fill=(17,17,17),anchor='mm')
print('tamaño de letra del link:',tam)
df.rectangle([130,880,590,1010],fill=(255,210,77),outline=(17,17,17),width=5)
df.text((360,925),'TAMBIÉN ESTÁ EN',font=f1,fill=(17,17,17),anchor='mm')
df.text((360,968),'LOS COMENTARIOS',font=f1,fill=(17,17,17),anchor='mm')
fin.convert('RGB').save('final.png')
# --- segmentos ---
os.makedirs('seg',exist_ok=True)
segs=[]; t=0
for i,g in enumerate(G):
    al=json.load(open(f'voz/{g["id"]}.json'))['alignment']
    D=round(al['character_end_times_seconds'][-1]+0.12+0.32+(2.2 if g['id']=='final' else 0),3)
    largo=D+(T if i<len(G)-1 else 0)
    if g['id']=='final':
        run([FF,'-y','-loglevel','error','-loop','1','-i','final.png','-vf','format=yuv420p',
             '-t',str(largo),'-r','30','-c:v','libx264','-preset','veryfast','-crf','16',f'seg/{i}.mp4'])
        segs.append(dict(g=g,ini=t,D=D,al=al)); t+=D; continue
    a,b=g['src']; L=b-a
    vel=max(0.7,min(3.0,L/largo)) if L>0.5 else 1
    ang=(-2.2 if i%2 else 2.0)
    ent=['-ss',str(a),'-t',str(min(L,largo*vel)+0.1),'-i',SRC,'-i','fondo.png','-i','tarjeta.png']
    zoom='crop=270:480:208:370,' if g['id'] in ('gancho','cierre') else ''
    if g['id']=='paso2':  # difumina la barra de dirección (se ve el link)
        zoom='split[za][zb];[zb]crop=478:80:0:0,boxblur=14:3[zc];[za][zc]overlay=0:0,'
    fc=(f"[0:v]{zoom}setpts=(PTS-STARTPTS)/{vel},fps=30,scale={VW}:{VH},setsar=1,tpad=stop_mode=clone:stop_duration={largo+1},trim=duration={largo}[v];"
        f"[2:v][v]overlay={B}:{B}:shortest=1,format=rgba,rotate={ang}*PI/180:c=none:ow=rotw({ang}*PI/180):oh=roth({ang}*PI/180)[card];"
        f"[1:v][card]overlay=x='{CX-8}-(w-{VW+2*B+16})/2':y='{CY-8}-(h-{VH+2*B+16})/2':shortest=1")
    if g['paso']:
        ent+=['-i',f'paso{g["paso"]}.png']
        fc+=f"[f0];[3:v]scale=w='130*min(1,0.4+t*4)':h=-1:eval=frame[bd];[f0][bd]overlay=x='62-(w-130)/2':y='{CY-58}-(h-130)/2':shortest=1"
    fc+=",format=yuv420p[o]"
    run([FF,'-y','-loglevel','error']+['-loop','1' if False else '0']*0+ent[:6]+['-loop','1','-i','fondo.png','-loop','1','-i','tarjeta.png']+(['-loop','1','-i',f'paso{g["paso"]}.png'] if g['paso'] else [])+
        ['-filter_complex',fc,'-map','[o]','-t',str(largo),'-r','30','-c:v','libx264','-preset','veryfast','-crf','16',f'seg/{i}.mp4'])
    segs.append(dict(g=g,ini=t,D=D,al=al)); t+=D
TOT=round(t,3); print('total',TOT)
# --- unir con barridos ---
ent=[]; [ent.extend(['-i',f'seg/{i}.mp4']) for i in range(len(G))]
fc=''; prev='[0:v]'; off=0
for i in range(1,len(G)):
    off+=segs[i-1]['D']
    fc+=f"{prev}[{i}:v]xfade=transition={'slideleft' if i%2 else 'slideup'}:duration={T}:offset={off:.3f}[x{i}];"; prev=f'[x{i}]'
run([FF,'-y','-loglevel','error']+ent+['-filter_complex',fc.rstrip(';'),'-map',prev,'-c:v','libx264','-preset','veryfast','-crf','16','base.mp4'])
# --- textos ---
def ts(x): h=int(x//3600); x-=h*3600; mm=int(x//60); x-=mm*60; return f'{h}:{mm:02d}:{x:05.2f}'
ass=f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Titulo,Inter Display Black,60,&H00111111,&H00111111,&H004DD2FF,&H00000000,-1,0,0,0,100,100,0,0,3,12,0,8,40,40,70,1
Style: Cap,Inter Display ExtraBold,40,&H00111111,&H00111111,&H00FFFFFF,&H00FFFFFF,-1,0,0,0,100,100,0,0,3,12,0,2,80,80,250,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
for s in segs:
    g=s['g']; a=s['ini']; b=a+s['D']
    ass+=f"Dialogue: 1,{ts(a+0.08)},{ts(b)},Titulo,,0,0,0,,{{\\fad(80,0)\\frz{1.5 if segs.index(s)%2 else -1.5}\\t(0,140,\\fscx108\\fscy108)\\t(140,260,\\fscx100\\fscy100)}}{g['titulo']}\n"
    ch=s['al']['characters']; st=s['al']['character_start_times_seconds']
    texto=''.join(ch); piezas=[]; ini=0
    for mt in re.finditer(r'[,.:!?¿¡…]+\s*',texto):
        if mt.end()-ini>8 or mt.end()==len(texto): piezas.append((ini,mt.end())); ini=mt.end()
    if ini<len(texto): piezas.append((ini,len(texto)))
    for k,(p,q) in enumerate(piezas):
        frase=texto[p:q].strip().rstrip(',:')
        if len(frase)<2: continue
        t0=a+0.12+st[p]; t1=a+0.12+(st[piezas[k+1][0]] if k+1<len(piezas) else s['D']-0.12)
        ass+=f"Dialogue: 0,{ts(t0)},{ts(min(t1,b))},Cap,,0,0,0,,{{{'\\an8\\pos(360,300)' if g['id'] in ('gancho','cierre') else '\\an8\\pos(360,165)' if g['id']=='final' else ''}\\fad(50,0)}}{frase}\n"
open('subs.ass','w').write(ass)
run([FF,'-y','-loglevel','error','-i','base.mp4','-vf','subtitles=subs.ass:fontsdir=/usr/share/fonts/opentype/inter,format=yuv420p',
     '-t',f'{TOT:.3f}','-c:v','libx264','-preset','medium','-crf','19','-r','30','video.mp4'])
# --- audio ---
ent=[]; fil=[]; n=0
for s in segs:
    ent+=['-i',f'voz/{s["g"]["id"]}.mp3']; ms=int((s['ini']+0.12)*1000)
    fil.append(f'[{n}:a]aresample=44100,pan=stereo|c0=c0|c1=c0,adelay={ms}|{ms}[a{n}]'); n+=1
    if s['ini']>0:
        ent+=['-i','whoosh.wav']; ms=int(max(0,s['ini']-0.15)*1000)
        fil.append(f'[{n}:a]aresample=44100,pan=stereo|c0=c0|c1=c0,adelay={ms}|{ms}[a{n}]'); n+=1
    if s['g']['paso']:
        ent+=['-i','pop.wav']; ms=int((s['ini']+0.1)*1000)
        fil.append(f'[{n}:a]aresample=44100,pan=stereo|c0=c0|c1=c0,adelay={ms}|{ms}[a{n}]'); n+=1
fil.append(''.join(f'[a{k}]' for k in range(n))+f'amix=inputs={n}:normalize=0,apad,atrim=0:{TOT:.3f},loudnorm=I=-14:TP=-1.5:LRA=11[out]')
run([FF,'-y','-loglevel','error']+ent+['-filter_complex',';'.join(fil),'-map','[out]','-ar','44100','audio.wav'])
run([FF,'-y','-loglevel','error','-i','video.mp4','-i','audio.wav','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart','-shortest','tutorial_v4.mp4'])
for k,x in enumerate([1.5, segs[1]['ini']+1.5, segs[2]['ini']+1.5, segs[3]['ini']+1.5, segs[4]['ini']+1.5, segs[5]['ini']+1.5, TOT-1]):
    run([FF,'-y','-loglevel','error','-ss',str(x),'-i','tutorial_v4.mp4','-frames:v','1',f'r_{k}.png'])
