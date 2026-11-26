import json, subprocess, os
S='/tmp/claude-0/-home-user-Bot/9a8e0860-21df-5217-8442-2391a3447559/scratchpad'
FF=f'{S}/chk/node_modules/ffmpeg-static/ffmpeg'
V='/root/.claude/uploads/9a8e0860-21df-5217-8442-2391a3447559/f095e03a-VID-20261125-WA00921.mp4'
G=json.load(open('guion.json'))
FPS=30; RETRASO_VOZ=0.12
def run(a): r=subprocess.run(a,capture_output=True,text=True); assert r.returncode==0, r.stderr[-800:]

# ---------- 1) línea de tiempo según la voz ----------
t=0.0; tl=[]
for g in G:
    al=json.load(open(f'voz/{g["id"]}.json'))['alignment']
    habla=al['character_end_times_seconds'][-1]
    D=round(habla+RETRASO_VOZ+(0.9 if g['id']=='cierre' else 0.35),2)
    tl.append(dict(g, ini=t, dur=D, al=al)); t+=D
TOTAL=round(t,2); print('duración total', TOTAL)

# ---------- 2) cada escena: velocidad + congelado + zoom ----------
os.makedirs('seg',exist_ok=True)
lista=[]
for i,s in enumerate(tl):
    a,b=s['src']; L=b-a; D=s['dur']
    vel=max(0.7,min(2.6,L/D))
    usar=min(L, D*vel)                 # si va muy rápido, usa solo el final del clip
    a2=b-usar
    jugado=usar/vel; congelar=max(0,D-jugado)+0.2
    cx,cy,zt=s['zoom']
    ease=f"(1-pow(1-min(1,in/{int(0.5*FPS)}),3))"
    z=f"1+({zt}-1)*{ease}+0.012*in/{FPS}" if zt>1.01 else f"1+0.02*in/{FPS}"
    x=f"max(0,min(iw-iw/zoom,{cx}*iw-iw/zoom/2))"; y=f"max(0,min(ih-ih/zoom,{cy}*ih-ih/zoom/2))"
    vf=(f"setpts=(PTS-STARTPTS)/{vel:.4f},fps={FPS},tpad=stop_mode=clone:stop_duration={congelar:.2f},"
        f"scale=1080:1920:flags=lanczos,zoompan=z='{z}':x='{x}':y='{y}':d=1:s=720x1280:fps={FPS},setsar=1")
    out=f'seg/{i:02d}.mp4'
    run([FF,'-y','-loglevel','error','-ss',f'{a2:.3f}','-t',f'{usar:.3f}','-i',V,'-vf',vf,'-t',f'{D:.3f}','-an',
         '-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-r',str(FPS),out])
    lista.append(f"file '{os.path.abspath(out)}'")
    print(f"{s['id']:12} {D:5.2f}s  vel {vel:.2f}x  congelado {max(0,D-jugado):.2f}s  zoom {zt}")
open('lista.txt','w').write('\n'.join(lista))
run([FF,'-y','-loglevel','error','-f','concat','-safe','0','-i','lista.txt','-c','copy','base.mp4'])

# ---------- 3) subtítulos palabra por palabra + pasos + cierre ----------
def ts(x): x=max(0,x); h=int(x//3600); m=int(x%3600//60); s_=x%60; return f"{h}:{m:02d}:{s_:05.2f}"
ev=[]
for s in tl:
    al=s['al']; ch=al['characters']; st=al['character_start_times_seconds']; en=al['character_end_times_seconds']
    palabras=[]; cur=''; ci=None
    for k,c in enumerate(ch):
        if c.isspace():
            if cur: palabras.append((cur,st[ci],en[k-1])); cur=''; ci=None
        else:
            if ci is None: ci=k
            cur+=c
    if cur: palabras.append((cur,st[ci],en[len(ch)-1]))
    base=s['ini']+RETRASO_VOZ
    # grupos de hasta 3 palabras, cortando en signos de puntuación
    grupos=[]; g=[]
    for p in palabras:
        g.append(p)
        if len(g)==3 or p[0][-1] in '.,?!:' or sum(len(w[0]) for w in g)>16: grupos.append(g); g=[]
    if g: grupos.append(g)
    for gi,gr in enumerate(grupos):
        fin_grupo=(grupos[gi+1][0][1] if gi+1<len(grupos) else gr[-1][2]+0.3)
        for wi,(w,ws,we) in enumerate(gr):
            fin=(gr[wi+1][1] if wi+1<len(gr) else fin_grupo)
            txt=' '.join(('{\\c&H00D7FF&\\fscx112\\fscy112}'+x[0].upper()+'{\\c&HFFFFFF&\\fscx100\\fscy100}') if j==wi else x[0].upper() for j,x in enumerate(gr))
            ev.append(f"Dialogue: 1,{ts(base+ws)},{ts(base+fin)},Palabra,,0,0,0,,{{\\pos(360,{s.get('capY',930)})}}{txt}")
# pasos (se juntan las escenas seguidas con el mismo paso)
pasos=[]
for s in tl:
    if s['paso'] and pasos and pasos[-1][0]==s['paso']: pasos[-1][2]=s['ini']+s['dur']
    elif s['paso']: pasos.append([s['paso'],s['ini'],s['ini']+s['dur']])
for p,a,b in pasos: ev.append(f"Dialogue: 2,{ts(a+0.05)},{ts(b-0.05)},Paso,,0,0,0,,{{\\fad(150,100)\\pos(360,150)}}{p}")
c=[s for s in tl if s['id']=='cierre'][0]
ev.append(f"Dialogue: 3,{ts(c['ini']+0.1)},{ts(TOTAL)},Grande,,0,0,0,,{{\\fad(200,0)\\pos(360,480)}}LINK EN MI BIO")
ev.append(f"Dialogue: 3,{ts(c['ini']+0.3)},{ts(TOTAL)},Medio,,0,0,0,,{{\\fad(200,0)\\pos(360,570)}}o en los comentarios")
ev.append(f"Dialogue: 3,{ts(c['ini']+0.5)},{ts(TOTAL)},Marca,,0,0,0,,{{\\fad(200,0)\\pos(360,690)}}{{\\fnDejaVu Sans}}♦{{\\fnInter Display Black}} Erza-Bot-MD {{\\fnDejaVu Sans}}♦")
ass=f"""[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Palabra,Inter Display Black,60,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,6,2.5,5,40,40,0,1
Style: Paso,Inter Display ExtraBold,34,&H00FFFFFF,&H00FFFFFF,&H003A24E0,&H003A24E0,0,0,0,0,100,100,1,0,3,12,0,5,40,40,0,1
Style: Grande,Inter Display Black,74,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,6,3,5,40,40,0,1
Style: Medio,Inter Display ExtraBold,44,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,4,2,5,40,40,0,1
Style: Marca,Inter Display Black,42,&H006E5AFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,4,2,5,40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""+'\n'.join(ev)+'\n'
open('subs.ass','w',encoding='utf-8').write(ass)

# ---------- 4) audio: voz + whoosh en cortes + pop en pasos ----------
run([FF,'-y','-loglevel','error','-f','lavfi','-i','anoisesrc=d=0.45:c=pink:a=0.5','-af',
     'highpass=f=400,lowpass=f=6000,afade=t=in:d=0.25:curve=exp,afade=t=out:st=0.25:d=0.2,volume=0.35','whoosh.wav'])
run([FF,'-y','-loglevel','error','-f','lavfi','-i','sine=f=880:d=0.09','-af','afade=t=out:d=0.09,volume=0.3','pop.wav'])
ent=[]; fil=[]; n=0
for s in tl:
    ent+=['-i',f'voz/{s["id"]}.mp3']; ms=int((s['ini']+RETRASO_VOZ)*1000); fil.append(f'[{n}:a]aresample=44100,pan=stereo|c0=c0|c1=c0,adelay={ms}|{ms}[a{n}]'); n+=1
for s in tl[1:]:
    ent+=['-i','whoosh.wav']; ms=int(max(0,s['ini']-0.25)*1000); fil.append(f'[{n}:a]aresample=44100,pan=stereo|c0=c0|c1=c0,adelay={ms}|{ms}[a{n}]'); n+=1
for p,a,b in pasos:
    ent+=['-i','pop.wav']; ms=int((a+0.05)*1000); fil.append(f'[{n}:a]aresample=44100,pan=stereo|c0=c0|c1=c0,adelay={ms}|{ms}[a{n}]'); n+=1
fil.append(''.join(f'[a{k}]' for k in range(n))+f'amix=inputs={n}:normalize=0,acompressor=threshold=-18dB:ratio=3:attack=5:release=120,loudnorm=I=-14:TP=-1.5:LRA=9,apad=whole_dur={TOTAL}[out]')
run([FF,'-y','-loglevel','error',*ent,'-filter_complex',';'.join(fil),'-map','[out]','-t',str(TOTAL),'-ar','44100','audio.wav'])

# ---------- 5) video final ----------
vf=(f"drawbox=x=0:y=0:w=iw:h=ih:color=black@0.62:t=fill:enable='gte(t,{c['ini']:.2f})',"
    f"subtitles=subs.ass:fontsdir=/usr/share/fonts/opentype/inter")
run([FF,'-y','-loglevel','error','-i','base.mp4','-i','audio.wav','-vf',vf,'-map','0:v','-map','1:a','-t',str(TOTAL),
     '-c:v','libx264','-preset','slow','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart','tutorial_v2.mp4'])
json.dump([{k:s[k] for k in ('id','ini','dur')} for s in tl],open('tl.json','w'),indent=1)
print('listo')
