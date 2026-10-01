import {ProfileStore} from '../profile-store.js';

const unavailable=()=>Object.assign(new Error('Account storage is unavailable. Reconnect in a moment; your last saved progress is safe.'),{status:503});

export async function openDatabaseProfiles(repository){
  const store=new ProfileStore();
  const saved=await repository.load(store.serialize());
  const migrated=store.restore(saved.data);
  let revision=saved.revision,queued=0,committed=0,pending=null,running=null,error=null;
  // Coalesce bursts (such as two round rewards) into a complete snapshot. Never
  // acknowledge it to a browser until the corresponding database write finishes.
  function run(){
    if(running||error)return;
    running=(async()=>{
      while(pending){
        const item=pending;pending=null;
        revision=await repository.write(revision,item.data);committed=item.seq;
      }
    })().catch(()=>{error=unavailable();pending=null;}).finally(()=>{running=null;if(pending&&!error)run();});
  }
  store.assertHealthy=()=>{if(error)throw error;};
  store.save=()=>{
    store.assertHealthy();
    pending={seq:++queued,data:structuredClone(store.serialize())};
    run();
  };
  store.flush=async()=>{
    const target=queued;
    while(committed<target){store.assertHealthy();if(!running)run();await running;}
    store.assertHealthy();
  };
  Object.defineProperty(store,'settled',{get:()=>!error&&queued===committed});
  if(migrated){store.save();await store.flush();}
  return store;
}
