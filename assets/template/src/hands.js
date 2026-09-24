import { GestureEngine, DwellSelection } from './gesture-engine.js';
const $=selector=>document.querySelector(selector);
const connections=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
export async function createHandDetector(){
  const {FilesetResolver,HandLandmarker}=await import('@mediapipe/tasks-vision');
  const fileset=await FilesetResolver.forVisionTasks('/vision');
  return HandLandmarker.createFromOptions(fileset,{
    baseOptions:{modelAssetPath:'/models/hand_landmarker.task',delegate:'CPU'},
    runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.6,minHandPresenceConfidence:.6,minTrackingConfidence:.6,
  });
}
export function drawHands(canvas,hands){
  const ctx=canvas.getContext('2d');const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
  hands.forEach(hand=>{
    ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=1.3;ctx.beginPath();
    connections.forEach(([a,b])=>{ctx.moveTo(hand[a].x*w,hand[a].y*h);ctx.lineTo(hand[b].x*w,hand[b].y*h);});ctx.stroke();
    ctx.fillStyle='#fff';ctx.shadowBlur=9;ctx.shadowColor='#fff';ctx.beginPath();
    hand.forEach((p,i)=>{const r=[0,4,8,12,16,20].includes(i)?4.4:2.7;ctx.moveTo(p.x*w+r,p.y*h);ctx.arc(p.x*w,p.y*h,r,0,Math.PI*2);});ctx.fill();ctx.shadowBlur=0;
  });
}
export class HandController {
  constructor({gallery,onOpen,onClose,onActivate}){
    this.gallery=gallery;this.onOpen=onOpen;this.onClose=onClose;this.onActivate=onActivate||((card)=>card.click());
    this.engine=new GestureEngine();this.dwell=new DwellSelection();this.token=0;this.active=false;
    this.video=$('#camera-video');this.canvas=$('#hand-overlay');this.button=$('#gesture-toggle');this.cursor=$('#hand-cursor');
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.active)this.stop();});
  }
  async toggle(){if(this.active||this.starting){this.stop();return;}await this.start();}
  async start(){
    const token=++this.token;this.starting=true;$('#camera-error').hidden=true;
    this.button.querySelector('span').textContent='取消开启';this.button.setAttribute('aria-busy','true');
    $('#camera-panel').hidden=false;this.status('请允许摄像头访问');
    try{
      if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('INSECURE');
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
      if(token!==this.token){stream.getTracks().forEach(t=>t.stop());return;}
      this.stream=stream;this.video.srcObject=stream;await this.video.play();
      if(token!==this.token)return;
      this.status('正在加载手势识别…');
      const detector=await createHandDetector();
      if(token!==this.token){detector.close();return;}
      this.detector=detector;this.active=true;this.starting=false;
      this.button.setAttribute('aria-busy','false');this.button.setAttribute('aria-pressed','true');this.button.querySelector('span').textContent='关闭手势控制';
      $('#hand-hint').hidden=false;this.status('将手掌放在镜头前');this.lastVideoTime=-1;this.lastRun=0;
      const track=this.stream.getVideoTracks()[0];track.addEventListener('ended',()=>{if(this.active){this.stop();this.showError('摄像头已断开。重新连接后可再次开启，鼠标和触控仍可使用。');}});
      this.loop=timestamp=>{
        if(!this.active)return;
        if(timestamp-this.lastRun>=65&&this.video.readyState>=2&&this.video.currentTime!==this.lastVideoTime){
          this.lastRun=timestamp;this.lastVideoTime=this.video.currentTime;
          try{const result=this.detector.detectForVideo(this.video,timestamp);this.process(result.landmarks,timestamp);}
          catch(error){console.warn('Hand tracking stopped:',error.message);this.stop();this.showError('手势识别暂时不可用，请重新开启。鼠标和触控仍可使用。');return;}
        }
        this.frame=requestAnimationFrame(this.loop);
      };
      this.frame=requestAnimationFrame(this.loop);
    }catch(error){
      if(token!==this.token)return;
      this.stop();
      const message=error.name==='NotAllowedError'?'未获得摄像头权限。你仍可拖动、滚轮缩放和点击作品；允许摄像头后可重试。':
        error.name==='NotFoundError'?'未找到摄像头。连接摄像头后重试，或直接用鼠标和触控浏览。':
        error.name==='NotReadableError'?'摄像头可能被其他应用占用。关闭占用后重试。':
        error.message==='INSECURE'?'手势控制需要 HTTPS 或 localhost 环境。当前可使用鼠标和触控。':
        '手势识别加载失败，请稍后重试。鼠标和触控仍可正常使用。';
      this.showError(message);
    }
  }
  status(text){if($('#camera-status').textContent!==text)$('#camera-status').textContent=text;}
  showError(text){$('#camera-error').textContent=text;$('#camera-error').hidden=false;}
  process(hands,timestamp){
    drawHands(this.canvas,hands);
    const action=this.engine.update(hands,timestamp);
    this.cursor.hidden=action.mode!=='point';
    document.querySelectorAll('.hand-hover').forEach(c=>c.classList.remove('hand-hover'));
    if(action.mode==='rotate'&&document.querySelector('#detail').hidden){this.gallery.velocity=0;this.gallery.rotate(action.delta);this.status(document.querySelector('#collection').hidden?'手掌左右移动 · 旋转圆环':'手掌左右移动 · 滑动长卷');}
    else if(action.mode==='zoom'&&document.querySelector('#detail').hidden){this.gallery.velocity=0;this.gallery.setZoom(this.gallery.targetZoom*action.ratio);this.status('双手拉开 / 靠近 · 缩放');}
    else if(action.mode==='point'){
      const x=action.cursor.x*innerWidth,y=action.cursor.y*innerHeight;
      this.cursor.style.transform=`translate(${x}px,${y}px)`;
      const hit=document.elementFromPoint(x,y);const card=hit?.closest('[data-hand-action]');
      const detailOpen=!document.querySelector('#detail').hidden;
      const target=card&&(!detailOpen||card.id==='detail-close')?card.dataset.handAction:null;
      if(target)card.classList.add('hand-hover');
      const dwell=this.dwell.update(target,timestamp,action.select);
      this.cursor.querySelector('.cursor-progress').style.strokeDashoffset=100.53*(1-dwell.progress);
      if(dwell.activate&&target)this.onActivate(card);
      this.status(target===null?'食指指向作品 · 停留打开':dwell.activate?'已选中作品':'保持指向 · 即将打开');
    }else this.status(action.mode==='none'?'将手掌放在镜头前':'张开手掌，或伸出食指');
    if(action.mode!=='point'){this.dwell.reset();this.cursor.querySelector('.cursor-progress').style.strokeDashoffset=100.53;}
  }
  stop(){
    ++this.token;this.active=false;this.starting=false;cancelAnimationFrame(this.frame);
    this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;
    this.video.pause();this.video.srcObject=null;
    this.detector?.close();this.detector=null;this.engine.reset();this.dwell.reset();
    this.canvas.getContext('2d').clearRect(0,0,this.canvas.width,this.canvas.height);
    this.cursor.hidden=true;document.querySelectorAll('.hand-hover').forEach(c=>c.classList.remove('hand-hover'));
    this.button.setAttribute('aria-pressed','false');this.button.setAttribute('aria-busy','false');this.button.querySelector('span').textContent='开启手势控制';
    $('#camera-panel').hidden=true;$('#hand-hint').hidden=true;
  }
}
