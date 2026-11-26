import json, subprocess, os, re
from PIL import Image, ImageDraw, ImageFont
S='/tmp/claude-0/-home-user-Bot/9a8e0860-21df-5217-8442-2391a3447559/scratchpad'
FF=S+'/chk/node_modules/ffmpeg-static/ffmpeg'
SRC='/root/.claude/uploads/9a8e0860-21df-5217-8442-2391a3447559/f095e03a-VID-20261125-WA00921.mp4'
FD='/usr/share/fonts/opentype/inter/'
LINK='https://chat.whatsapp.com/BRl3dtRE6km2yguHb0XdJt?s=cl&p=a&iam=2'
ROJO=(224,36,58)
def run(a): subprocess.run(a,check=True)
def F(n,s): return ImageFont.truetype(FD+n,s)
G=json.load(open('guion.json')); W,H=720,1280
os.makedirs('seg',exist_ok=True); os.makedirs('png',exist_ok=True)
# capa: sombra arriba/abajo + etiqueta del paso
def capa(paso):
    im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
    for y in range(0,200): d.line([(0,y),(W,y)],fill=(0,0,0,int(140*(1-y/200)**1.6)))
    for y in range(820,H): d.line([(0,y),(W,y)],fill=(0,0,0,int(190*((y-820)/(H-820))**1.4)))
    if paso:
        t=f'Paso {paso} de 4'; f=F('Inter-Bold.otf',34); w=int(f.getlength(t))+56
        d.rounded_rectangle([(W-w)//2,50,(W+w)//2,112],31,fill=ROJO+(255,))
        d.text((W/2,81),t,font=f,fill=(255,255,255),anchor='mm')
    im.save(f'png/capa{paso}.png')
for p in range(5): capa(p)
# pantalla final
fin=Image.new('RGB',(W,H),(13,7,8)); d=ImageDraw.Draw(fin)
d.text((360,190),'Únete al grupo',font=F('InterDisplay-Black.otf',70),fill=(255,255,255),anchor='mm')
d.rounded_rectangle([130,280,590,740],30,fill=(255,255,255),outline=ROJO,width=6)
fin.paste(Image.open('qr.png').convert('RGB').resize((400,400),Image.NEAREST),(160,310))
tam=34
while F('Inter-Bold.otf',tam).getlength(LINK)>W-44: tam-=1
d.text((360,815),LINK,font=F('Inter-Bold.otf',tam),fill=(255,214,219),anchor='mm')
d.rounded_rectangle([120,875,600,970],48,fill=ROJO)
d.text((360,922),'También está en los comentarios',font=F('Inter-Bold.otf',30),fill=(255,255,255),anchor='mm')
fin.save('png/final.png')
segs=[]; t=0
for i,g in enumerate(G):
    al=json.load(open(f'voz/{g["id"]}.json'))['alignment']
    D=round(al['character_end_times_seconds'][-1]+0.15+0.45+(2.4 if g['id']=='final' else 0),3)
    if g['id']=='final':
        run([FF,'-y','-loglevel','error','-loop','1','-i','png/final.png','-vf','format=yuv420p','-t',str(D),'-r','30','-c:v','libx264','-preset','veryfast','-crf','17',f'seg/{i}.mp4'])
    else:
        a,b=g['src']; L=b-a; vel=max(0.7,min(3.0,L/D)); pre=''
        if g['id']=='paso2': pre='split[za][zb];[zb]crop=478:80:0:0,boxblur=14:3[zc];[za][zc]overlay=0:0,'
        if g['id'] in ('intro','cierre'): pre='crop=320:569:158:281,'
        run([FF,'-y','-loglevel','error','-ss',str(a),'-t',str(min(L,D*vel)+0.1),'-i',SRC,'-i',f'png/capa{g["paso"]}.png','-filter_complex',
             f"[0:v]{pre}setpts=(PTS-STARTPTS)/{vel},fps=30,scale={W}:{H}:flags=lanczos,setsar=1,tpad=stop_mode=clone:stop_duration={D+1},trim=duration={D}[v];[v][1:v]overlay=0:0,format=yuv420p[o]",
             '-map','[o]','-t',str(D),'-r','30','-c:v','libx264','-preset','veryfast','-crf','17',f'seg/{i}.mp4'])
    segs.append(dict(g=g,ini=t,D=D,al=al)); t+=D
TOT=round(t,3); print('total',TOT)
open('lista.txt','w').write(''.join(f"file 'seg/{i}.mp4'\n" for i in range(len(G))))
run([FF,'-y','-loglevel','error','-f','concat','-safe','0','-i','lista.txt','-c','copy','base.mp4'])
def ts(x): h=int(x//3600); x-=h*3600; mm=int(x//60); x-=mm*60; return f'{h}:{mm:02d}:{x:05.2f}'
ass=f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Inter Display Bold,42,&H00FFFFFF,&H00FFFFFF,&H38000000,&H38000000,-1,0,0,0,100,100,0,0,3,14,0,2,70,70,230,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
for s in segs:
    g=s['g']; a=s['ini']; b=a+s['D']
    if g['id']=='final':
        ass+=f"Dialogue: 0,{ts(a+0.15)},{ts(b)},Sub,,0,0,0,,{{\\an2\\pos(360,1130)}}{g['texto']}\n"; continue
    pos='{\\an8\\pos(360,150)}' if g['id'] in ('intro','cierre') else ''
    ass+=f"Dialogue: 0,{ts(a+0.15)},{ts(b-0.05)},Sub,,0,0,0,,{pos}{g['texto']}\n"
open('subs.ass','w').write(ass)
run([FF,'-y','-loglevel','error','-i','base.mp4','-vf','subtitles=subs.ass:fontsdir=/usr/share/fonts/opentype/inter,format=yuv420p','-t',f'{TOT:.3f}','-c:v','libx264','-preset','medium','-crf','19','-r','30','video.mp4'])
ent=[]; fil=[]
for n,s in enumerate(segs):
    ent+=['-i',f'voz/{s["g"]["id"]}.mp3']; ms=int((s['ini']+0.15)*1000)
    fil.append(f'[{n}:a]aresample=44100,pan=stereo|c0=c0|c1=c0,adelay={ms}|{ms}[a{n}]')
fil.append(''.join(f'[a{k}]' for k in range(len(segs)))+f'amix=inputs={len(segs)}:normalize=0,apad,atrim=0:{TOT:.3f},loudnorm=I=-14:TP=-1.5:LRA=11[out]')
run([FF,'-y','-loglevel','error']+ent+['-filter_complex',';'.join(fil),'-map','[out]','-ar','44100','audio.wav'])
run([FF,'-y','-loglevel','error','-i','video.mp4','-i','audio.wav','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart','-shortest','tutorial_v7.mp4'])
for k,s in enumerate(segs):
    run([FF,'-y','-loglevel','error','-ss',str(min(s['ini']+s['D']*0.6,TOT-0.4)),'-i','tutorial_v7.mp4','-frames:v','1',f'r_{k}.png'])
