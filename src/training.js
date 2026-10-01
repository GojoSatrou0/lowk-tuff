import {createFreePlay,createPlayer,resetPlayer,mapById,cleanInput,stepMatch,eyeHeight,TICK} from './shared.js';

// Local drills use real combat rules and a temporary kit, never account rewards.
export function createTraining(kind='parry',name='Runner'){
  kind=kind==='stun'?'stun':'parry';
  const m=createFreePlay('foundry',name,[kind==='parry'?10:4]);
  const bot=createPlayer('trainer',kind==='parry'?'PARRY COACH':'CLASH COACH',1);bot.loadout=[kind==='parry'?0:4];bot.weapon=bot.loadout[0];m.players.push(bot);
  m.training={kind,charging:false,attempts:0,successes:0,streak:0,best:0,revision:0,cursor:0,botFire:0};resetTraining(m);return m;
}
export function resetTraining(m,{clearStats=false}={}){
  const t=m.training;if(!t)return;
  if(clearStats)Object.assign(t,{attempts:0,successes:0,streak:0,best:0});
  for(const p of m.players){resetPlayer(p,mapById(m.map));p.cooldown=0;p.weapon=p.loadout[0];p.p=[-12,0,p.id==='you'?8:0];p.yaw=p.id==='you'?0:Math.PI;}
  Object.assign(t,{clock:0,fired:false,result:null,resultAge:0,cue:'GET READY',revision:t.revision+1});
  m.events=[];m.projectiles=[];m.hazards=[];t.cursor=m.eventSeq;
}
export function toggleTrainingPace(m){if(m.training?.kind!=='stun')return;m.training.charging=!m.training.charging;resetTraining(m);}
function result(t,success,label,detail){t.attempts++;t.successes+=Number(success);t.streak=success?t.streak+1:0;t.best=Math.max(t.best,t.streak);t.result={success,label,detail};t.resultAge=0;}
export function stepTraining(m,input,dt=TICK){
  const t=m.training,p=m.players[0],bot=m.players[1];if(!t)return;
  t.clock+=dt;
  if(t.result){t.resultAge+=dt;if(t.resultAge>=2){resetTraining(m);return;}}
  const dx=p.p[0]-bot.p[0],dz=p.p[2]-bot.p[2],distance=Math.hypot(dx,dz),yaw=Math.atan2(dx,-dz);
  const control={weapon:bot.weapon,yaw,pitch:Math.atan2(p.p[1]+eyeHeight(p)*.7-bot.p[1]-eyeHeight(bot),distance),ads:true,fireId:t.botFire};
  if(!t.result){
    if(t.kind==='parry'){
      const until=2.5-t.clock;t.cue=until>.65?`SHOT IN ${until.toFixed(1)}s`:until>0?'PARRY NOW · F / RMB':'SHOT FIRED';
      if(until<=0&&!t.fired){t.fired=true;control.fireId=++t.botFire;}
    }else{
      control.pitch=0;control.ads=false;
      t.cue=distance<5?'SWING NOW · LEFT CLICK':t.clock<.3?'GET READY':t.charging?'INCOMING · BUILD SPEED + SWING':'SPRINT IN · SWING AT CLOSE RANGE';
      if(t.clock>=.8&&t.charging&&!t.fired){control.z=1;control.sprint=true;}
      if(distance<3.1&&!t.fired){t.fired=true;t.fireTime=t.clock;control.fireId=++t.botFire;}
    }
  }
  stepMatch(m,{you:cleanInput({...input,weapon:p.loadout[0]}),trainer:cleanInput(control)},dt);
  for(const event of m.events){if(event.id<=t.cursor)continue;t.cursor=event.id;if(t.result)continue;
    if(t.kind==='parry'&&event.type==='parry'&&event.player===p.id)result(t,true,'PARRY LANDED','Good timing. Your katana blocked the shot.');
    else if(t.kind==='stun'&&event.type==='clash'){
      const won=event.winner===p.id,own=event.players.indexOf(p.id),speeds=`${event.speeds[own].toFixed(1)} vs ${event.speeds[1-own].toFixed(1)} m/s`;
      result(t,won,won?'RIVAL STUNNED':event.winner?'YOU WERE STUNNED':'EVEN CLASH',speeds+' · '+(won?'Follow up before recovery.':'Slide or grapple to carry more speed.'));
    }else if(event.type==='hit'&&(event.target===p.id||event.target===bot.id))result(t,false,t.kind==='parry'?'TOO EARLY / TOO LATE':'NO CLASH',t.kind==='parry'?'Press F when the cue turns green.':'Face the trainer and time your swing with theirs.');
  }
  if(!t.result&&((t.kind==='parry'&&t.clock>2.9)||(t.kind==='stun'&&t.fired&&t.clock-t.fireTime>.5)||t.clock>8))result(t,false,'TRY AGAIN',t.kind==='parry'?'Stay in the firing lane and parry the shot.':'Sprint toward the trainer, then swing as you reach them.');
}
