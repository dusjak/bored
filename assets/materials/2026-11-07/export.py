import sys,json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageCms
SRC=Path('/workspace/design/onboarding/klumpen-a-bli-kjent-2026-11-07/_src')
sys.path.insert(0,str(SRC))
import build as b
import material
OUT=Path(__file__).parent
icc=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
def save(a,p):Image.fromarray(np.uint8(np.clip(np.round(a),0,255))).save(p,icc_profile=icc)
rows=[];report={}
for k in b.ORDER:
 ref=np.array(Image.open(SRC/'cache'/f'v2-{k}-240-rest-light.png').convert('RGB'))
 mask=b.local_mask(240,k,'rest');m=mask[...,None]
 if k=='gummi':
  rows.append((k,ref,None,None));report[k]={'status':'BLOCKED: approved source is warped prelit raster, not material.py rubber'};continue
 mat=dict(material.MATERIALS[k])
 if k=='emalje':mat.update(box=.40,box_w=.17,det=.00002)
 c={}
 def trace(frame,event,arg):
  if frame.f_code is material.render_object.__code__ and event=='return':
   for key in ('alb','col','R','D','x0','y0','x1','y1'):c[key]=frame.f_locals[key]
  return trace
 sys.settrace(trace)
 material.render_object(np.broadcast_to(material.rgb(b.BG),(1200,1200,3)).copy(),mask,mat,seed=47)
 sys.settrace(None)
 assert (c['x0'],c['y0'],c['x1'],c['y1'])==(0,0,1200,1200)
 alb=c['alb'];col=c['col'].copy()
 col+=np.random.default_rng(100).uniform(-.7,.7,mask.shape)[...,None]
 col=np.clip(col,0,255)
 mul=np.minimum(col/np.maximum(alb,.00001),1);under=alb*mul
 light=np.clip((col-under)/np.maximum(255-under,.00001),0,1)
 folder=OUT/k;folder.mkdir(exist_ok=True)
 save(alb,folder/'base.png');save(mul*255,folder/'shade-multiply.png');save(light*255,folder/'light-screen.png')
 aq=np.round(np.clip(alb,0,255));mq=np.round(mul*255)/255;lq=np.round(light*255)/255
 recon=255-(255-aq*mq)*(1-lq)
 bg=np.broadcast_to(material.rgb(b.BG),(1200,1200,3))
 comp=np.round(recon*m+bg*(1-m));baseview=np.round(alb*m+bg*(1-m))
 err=np.abs(comp-ref)[mask>.999]
 report[k]={'parameters':mat,'seed':47,'grain_seed':100,'R':c['R'],'D':c['D'],'interior_MAE_8bit':float(err.mean()),'interior_max_8bit':float(err.max()),'size':[1200,1200],'tileable':False}
 rows.append((k,ref,baseview,comp))
(OUT/'parameters-and-drift.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
sheet=Image.new('RGB',(1200,1500),'#F8F6F2');d=ImageDraw.Draw(sheet)
d.text((12,8),'Materiale / godkjent cache | ren base, klippet | base + lys, klippet',fill='black')
for i,(k,ref,base,comp) in enumerate(rows):
 y=35+i*290;d.text((10,y),k,fill='black')
 for j,a in enumerate((ref,base,comp)):
  if a is None:d.text((j*400+20,y+120),'STOPP: ren gummikilde mangler',fill='black');continue
  im=Image.fromarray(np.uint8(np.clip(a,0,255))).crop((180,180,1020,1020)).resize((270,270),Image.Resampling.LANCZOS)
  sheet.paste(im,(j*400+55,y+18))
sheet.save(OUT/'kontaktark-materialer.jpg',quality=94,icc_profile=icc)
print(json.dumps(report,indent=2,ensure_ascii=False))
