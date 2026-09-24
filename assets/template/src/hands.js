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
  status(text){if($('#camera-status').textContent!==text)$('#camera-status').textContent=text;const feedback=$('#gesture-feedback');if(feedback){feedback.textContent=text;feedback.hidden=!(this.active||this.starting);}}
  showError(text){$('#camera-error').textContent=text;$('#camera-error').hidden=false;}
  process(hands,timestamp){
    drawHands(this.canvas,hands);
    const detailOpen=!$('#detail').hidden;
    const view=detailOpen?'detail':$('#collection').hidden?'ring':'collection';
    const action=this.engine.update(hands,timestamp,view);
    this.cursor.hidden=true;
    this.gallery.stopMotion?.();
    document.querySelectorAll('.hand-hover').forEach(c=>c.classList.remove('hand-hover'));
    if(action.mode==='back'){
      this.status('双手交叉成 X · 保持片刻返回');
      if(action.activate){const dialog=document.querySelector('dialog[open]');if(dialog)dialog.close();else this.onClose();}
      return;
    }
    if(document.querySelector('dialog[open]'))return;
    if(action.mode==='rotate'&&!detailOpen){this.gallery.velocity=0;this.gallery.rotate(action.delta);this.status(view==='ring'?'张掌左右滑动 · 转动圆环':'张掌左右滑动 · 浏览长卷');}
    else if(action.mode==='zoom'){this.gallery.setZoom(this.gallery.targetZoom*action.ratio);this.status('五指张开 · 靠近放大 / 远离缩小');}
    else if(action.mode==='point'){if(!detailOpen)this.gallery.currentCard()?.classList.add('hand-hover');this.status(action.phase==='ready'?'可以点按 · 把食指弯回即可打开':'已看到食指 · 请短暂停稳');}
    else if(action.mode==='click'&&!detailOpen){const card=this.gallery.currentCard();if(card)this.onActivate(card);this.status('已打开 · 双手交叉成 X 返回');}
    else this.status(hands.length===2?'已看到双手 · 手腕交叉成 X 返回':hands.length===1?'张掌连续滑动 · 手停即停 · 食指点按':'未看到手 · 已停止滚动');

  }

  stop(){
    ++this.token;this.active=false;this.starting=false;cancelAnimationFrame(this.frame);
    this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;
    this.video.pause();this.video.srcObject=null;
    this.detector?.close();this.detector=null;this.engine.reset();this.dwell.reset();this.selectionLocked=false;
    this.canvas.getContext('2d').clearRect(0,0,this.canvas.width,this.canvas.height);
    this.cursor.hidden=true;document.querySelectorAll('.hand-hover').forEach(c=>c.classList.remove('hand-hover'));
    this.button.setAttribute('aria-pressed','false');this.button.setAttribute('aria-busy','false');this.button.querySelector('span').textContent='开启手势控制';
    $('#camera-panel').hidden=true;$('#hand-hint').hidden=true;if($('#gesture-feedback'))$('#gesture-feedback').hidden=true;
  }
}
