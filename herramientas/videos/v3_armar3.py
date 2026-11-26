import json, subprocess, os, re
from PIL import Image, ImageDraw, ImageFilter
S='/tmp/claude-0/-home-user-Bot/9a8e0860-21df-5217-8442-2391a3447559/scratchpad'
FF=S+'/chk/node_modules/ffmpeg-static/ffmpeg'
SRC='/root/.claude/uploads/9a8e0860-21df-5217-8442-2391a3447559/f095e03a-VID-20261125-WA00921.mp4'
def run(a): subprocess.run(a,check=True)
G=json.load(open('guion.json'))
W,H=720,1280; FW,FH=560,996; FX,FY=80,215; R=40
# --- mascara redondeada y marco con sombra ---
m=Image.new('L',(FW,FH),0); ImageDraw.Draw(m).rounded_rectangle([0,0,FW-1,FH-1],R,fill=255); m.save('mask.png')
f=Image.new('RGBA',(W,H),(0,0,0,0)); sh=Image.new('L',(W,H),0)
ImageDraw.Draw(sh).rounded_rectangle([FX-6,FY+4,FX+FW+6,FY+FH+18],R+6,fill=200); sh=sh.filter(ImageFilter.GaussianBlur(18))
f.paste((0,0,0,255),(0,0),sh)
ImageDraw.Draw(f).rounded_rectangle([FX-7,FY-7,FX+FW+6,FY+FH+6],R+7,fill=(255,255,255,255))
f.save('marco.png')
# --- segmentos ---
os.makedirs('seg',exist_ok=True)
segs=[]; t=0
for i,g in enumerate(G):
    al=json.load(open(f'voz/{g["id"]}.json'))['alignment']
    fin=al['character_end_times_seconds'][-1]
    D=round(fin+0.12+0.35+(0.9 if g['id']=='cierre' else 0),3)
    a,b=g['src']; L=b-a
    vel=max(0.7,min(2.6,L/D)) if L>0.5 else 1
    usado=min(L,D*vel)
    run([FF,'-y','-loglevel','error','-ss',str(a),'-t',str(usado+0.1),'-i',SRC,'-an','-vf',
         f'setpts=(PTS-STARTPTS)/{vel},fps=30,scale=478:850,tpad=stop_mode=clone:stop_duration={D+1},trim=duration={D},setsar=1',
         '-c:v','libx264','-preset','veryfast','-crf','16',f'seg/{i}.mp4'])
    segs.append(dict(g=g,ini=t,D=D,al=al)); t+=D
T=t; print('total',round(T,2))
open('lista.txt','w').write(''.join(f"file 'seg/{i}.mp4'\n" for i in range(len(G))))
run([FF,'-y','-loglevel','error','-f','concat','-safe','0','-i','lista.txt','-c','copy','base.mp4'])
# --- subtitulos ASS ---
def ts(x): h=int(x//3600); x-=h*3600; mm=int(x//60); x-=mm*60; return f'{h}:{mm:02d}:{x:05.2f}'
ass=f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Titulo,Inter Display Black,62,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,5,3,8,30,30,38,1
Style: Cap,Inter Display ExtraBold,40,&H00111111,&H00111111,&H00FFFFFF,&H00FFFFFF,-1,0,0,0,100,100,0,0,3,14,0,2,70,70,215,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
for s in segs:
    g=s['g']; a=s['ini']; b=a+s['D']
    ass+=f"Dialogue: 1,{ts(a)},{ts(b)},Titulo,,0,0,0,,{{\\fad(120,0)\\t(0,160,\\fscx112\\fscy112)\\t(160,300,\\fscx100\\fscy100)}}{g['titulo']}\n"
    # frases: cortar el texto en trozos por pausas (, . ...) usando la alineación
    ch=s['al']['characters']; st=s['al']['character_start_times_seconds']; en=s['al']['character_end_times_seconds']
    texto=''.join(ch); piezas=[]; ini=0
    for mt in re.finditer(r'[,.:!?¡…]+\s*|\.\.\.\s*',texto):
        if mt.end()-ini>8 or mt.end()==len(texto): piezas.append((ini,mt.end())); ini=mt.end()
    if ini<len(texto): piezas.append((ini,len(texto)))
    for k,(p,q) in enumerate(piezas):
        frase=texto[p:q].strip().rstrip(',:')
        if not frase: continue
        t0=a+0.12+st[p]; t1=a+0.12+(st[piezas[k+1][0]] if k+1<len(piezas) else s['D']-0.12)
        ass+=f"Dialogue: 0,{ts(t0)},{ts(min(t1,b))},Cap,,0,0,0,,{{{'\\an8\\pos(360,330)' if g['id'] in ('resultado','cierre') else ''}\\fad(60,0)\\t(0,100,\\fscx106\\fscy106)\\t(100,180,\\fscx100\\fscy100)}}{frase}\n"
open('subs.ass','w').write(ass)
# --- video final ---
fc=(f"[0:v]split[a][b];"
    f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=28:2,eq=brightness=-0.22:saturation=1.3,colorbalance=rs=0.35:gs=-0.1:bs=-0.12[fondo];"
    f"[fondo][2:v]overlay=0:0[f2];"
    f"[b]scale={FW}:{FH},format=yuva420p[fg0];[1:v]format=gray,scale={FW}:{FH}[mk];[fg0][mk]alphamerge[fg];"
    f"[f2][fg]overlay={FX}:{FY}:shortest=1[c];"
    f"color=c=0xFF5A6E:s={W}x10:r=30[bar];[c][bar]overlay=x='-w+w*t/{T:.3f}':y=0:shortest=1[c2];"
    f"[c2]subtitles=subs.ass:fontsdir=/usr/share/fonts/opentype/inter,format=yuv420p[v]")
run([FF,'-y','-loglevel','error','-i','base.mp4','-loop','1','-i','mask.png','-loop','1','-i','marco.png',
     '-filter_complex',fc,'-map','[v]','-t',f'{T:.3f}','-c:v','libx264','-preset','medium','-crf','19','-r','30','video.mp4'])
# --- audio ---
ent=[]; fil=[]; n=0
for s in segs:
    ent+=['-i',f'voz/{s["g"]["id"]}.mp3']; ms=int((s['ini']+0.12)*1000)
    fil.append(f'[{n}:a]aresample=44100,pan=stereo|c0=c0|c1=c0,adelay={ms}|{ms}[a{n}]'); n+=1
    if s['ini']>0:
        ent+=['-i','whoosh.wav']; ms=int(max(0,s['ini']-0.2)*1000)
        fil.append(f'[{n}:a]aresample=44100,pan=stereo|c0=c0|c1=c0,adelay={ms}|{ms}[a{n}]'); n+=1
    ent+=['-i','pop.wav']; ms=int((s['ini']+0.03)*1000)
    fil.append(f'[{n}:a]aresample=44100,pan=stereo|c0=c0|c1=c0,adelay={ms}|{ms}[a{n}]'); n+=1
fil.append(''.join(f'[a{k}]' for k in range(n))+f'amix=inputs={n}:normalize=0,apad,atrim=0:{T:.3f},loudnorm=I=-14:TP=-1.5:LRA=11[out]')
run([FF,'-y','-loglevel','error']+ent+['-filter_complex',';'.join(fil),'-map','[out]','-ar','44100','audio.wav'])
run([FF,'-y','-loglevel','error','-i','video.mp4','-i','audio.wav','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart','-shortest','tutorial_v3.mp4'])
for k,x in enumerate([1.0, s0:=segs[1]['ini']+1.5, segs[3]['ini']+2, segs[5]['ini']+1.5, T-1]):
    run([FF,'-y','-loglevel','error','-ss',str(x),'-i','tutorial_v3.mp4','-frames:v','1',f'r_{k}.png'])
