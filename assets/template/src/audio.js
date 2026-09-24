// Original, synthesized room tone. No audio is copied from the reference video.
export class AmbientSound {
  constructor(button){this.button=button;this.enabled=false;button.addEventListener('click',()=>this.toggle());document.addEventListener('visibilitychange',()=>{if(this.context){if(document.hidden)this.context.suspend();else if(this.enabled)this.context.resume();}});}
  async toggle(){
    if(!this.context){
      this.context=new (window.AudioContext||window.webkitAudioContext)();
      this.gain=this.context.createGain();this.gain.gain.value=0;this.gain.connect(this.context.destination);
      [130.81,196,261.63].forEach((f,i)=>{const osc=this.context.createOscillator();const gain=this.context.createGain();osc.frequency.value=f;osc.type='sine';gain.gain.value=.024/(i+1);osc.connect(gain);gain.connect(this.gain);osc.start();});
    }
    this.enabled=!this.enabled;
    if(this.enabled)await this.context.resume();
    this.gain.gain.setTargetAtTime(this.enabled?1:0,this.context.currentTime,.3);
    this.button.setAttribute('aria-pressed',String(this.enabled));
    const label=this.enabled?'关闭环境音':'开启环境音';this.button.setAttribute('aria-label',label);this.button.title=label;
  }
}
