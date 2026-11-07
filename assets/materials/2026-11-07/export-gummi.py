import sys,json
from pathlib import Path
import numpy as np
from scipy import ndimage as ndi
from PIL import Image,ImageCms,ImageDraw
O=Path(__file__).parent
sys.path.insert(0,'/workspace/design/icon/v5-2026-11-03')
from skjermer import Stone,render,HR,T
import hires
N=2520; S=6;CX=CY=1260
mat=dict(HR['gummi'],grain=[[.0022,.0011,.00055],[4*2.2e-05,4*1.4e-05,4*8e-06]],alb_var=[[.02,.003],[.03,.035]])
st=Stone(N,N,1440,CX,CY,env=dict(floor=T['bg']))
albfull=np.zeros((N,N,3),np.float32);colfull=albfull.copy()
def trace(f,event,arg):
 if f.f_code is hires.render.__code__ and event=='line' and f.f_lineno==190:
  a=f.f_locals;tx,ty,tw,th,M=[a[x] for x in ('tx','ty','tw','th','M')]
  albfull[ty:ty+th,tx:tx+tw]=a['alb'][M:M+th,M:M+tw]
  colfull[ty:ty+th,tx:tx+tw]=a['col'][M:M+th,M:M+tw]
 return trace
sys.settrace(trace)
k=np.asarray(render(st,mat,0,0,N,N,bg='#000000',bg_amp=0,room=0.),np.float32)
sys.settrace(None)
z=np.load('/workspace/design/varighet/v2-2026-11-04/C-motion/_src/_cache/stone-home@6x.npz')
err=np.abs(k-z['P']);print('P reproduction',float(err.mean()),float(err.max()),flush=True)
if err.max()!=0:raise RuntimeError('Exact source P reproduction failed; do not export')
m=z['M'];ys,xs=np.nonzero(m>.5);bw=240;bh=int(np.ceil(max(CY-ys.min(),ys.max()-CY)*2/6))+2
# Same crop and downsample geometry as export_assets.py, without silhouette premultiplication.
hw=bw*3;hh=bh*3
arrays=[]
for full in (albfull,colfull):
 cropped=full[CY-hh:CY+hh,CX-hw:CX+hw]
 small=np.stack([np.asarray(Image.fromarray(cropped[:,:,i],'F').resize((720,bh*3),Image.Resampling.LANCZOS)) for i in range(3)],-1)
 arrays.append(small)
sys.path.insert(0,'/workspace/design/onboarding/klumpen-a-bli-kjent-2026-11-07/_src')
import build as b
w=240;yy,xx=np.mgrid[0:1200,0:1200].astype(np.float32);xx=xx/3-200;yy=yy/3-200
ang=np.arctan2(yy,xx)
br=np.interp(ang,np.r_[b.TH,np.pi],np.r_[b.BASE_R*w,b.BASE_R[0]*w]);ar=b.radii(w,'gummi','rest');target=np.interp(ang,np.r_[b.TH,np.pi],np.r_[ar,ar[0]])
rat=br/np.maximum(target,.001);sy=(yy*rat+.423*w)*3;sx=(xx*rat+.5*w)*3
alb,col=[np.stack([ndi.map_coordinates(a[:,:,i],[sy,sx],order=1,mode='nearest') for i in range(3)],-1) for a in arrays]
col+=np.random.default_rng(100).uniform(-.7,.7,(1200,1200))[...,None];col=np.clip(col,0,255)
shade=np.minimum(col/np.maximum(alb,.00001),1);light=np.clip((col-alb*shade)/np.maximum(255-alb*shade,.00001),0,1)
icc=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes();folder=O/'gummi'
for name,a in [('base',alb),('shade-multiply',shade*255),('light-screen',light*255)]:Image.fromarray(np.uint8(np.round(np.clip(a,0,255)))).save(folder/(name+'.png'),icc_profile=icc)
aq=np.round(alb);sq=np.round(shade*255)/255;lq=np.round(light*255)/255;recon=255-(255-aq*sq)*(1-lq)
mask=b.local_mask(240,'gummi','rest');ref=np.asarray(Image.open('/workspace/design/onboarding/klumpen-a-bli-kjent-2026-11-07/_src/cache/v2-gummi-240-rest-light.png').convert('RGB'))
err=np.abs(np.round(recon)-ref)[mask>.999]
# Deep interior removes any support touched by old silhouette antialias/downsample.
deep=ndi.distance_transform_edt(mask>.5)>12;de=np.abs(np.round(recon)-ref)[deep]
report={'parameters':mat,'seed':7,'GA':4,'AV':.035,'SS':6,'N':2520,'OW':1440,'floor':T['bg'],'P_reproduction_max':0,'size':[1200,1200],'tileable':False,'interior_MAE_8bit':float(err.mean()),'interior_max_8bit':float(err.max()),'deep_interior_MAE_8bit':float(de.mean()),'deep_interior_max_8bit':float(de.max()),'note':'Captured albedo and col before premultiplication; same crop, resize and radial warp. No silhouette in master; edge differs from approved premultiplied raster.'}
p=O/'parameters-and-drift.json';r=json.loads(p.read_text());r['gummi']=report;p.write_text(json.dumps(r,indent=2,ensure_ascii=False))
sheet=Image.open(O/'kontaktark-materialer.jpg').convert('RGB');d=ImageDraw.Draw(sheet);d.rectangle((0,35,1199,324),fill='#F8F6F2');d.text((10,35),'gummi',fill='black');bg=np.array([248,246,242])
for j,a in enumerate((ref,alb*mask[...,None]+bg*(1-mask[...,None]),recon*mask[...,None]+bg*(1-mask[...,None]))):
 im=Image.fromarray(np.uint8(np.clip(np.round(a),0,255))).crop((180,180,1020,1020)).resize((270,270),Image.Resampling.LANCZOS);sheet.paste(im,(j*400+55,53))
sheet.save(O/'kontaktark-materialer.jpg',quality=94,icc_profile=icc)
print(json.dumps(report,indent=2),flush=True)
