export const STATUS_DEFINITIONS=Object.freeze({
  EXPOSED:{displayName:'曝光',duration:3,stackable:false,effects:{incomingMultiplier:1.2}},
  TRACKED:{displayName:'被追蹤',duration:3,stackable:false,effects:{incomingMultiplier:1.1}},
  OVERWHELMED:{displayName:'不堪負荷',duration:2,stackable:false,effects:{outgoingMultiplier:.75}},
  CONFUSED:{displayName:'混亂',duration:2,stackable:false,effects:{outgoingMultiplier:.8}},
  PROTECTED:{displayName:'受保護',duration:2,stackable:false,effects:{incomingMultiplier:.75}},
  REFLECTING:{displayName:'反思中',duration:2,stackable:false,effects:{outgoingMultiplier:1.1}},
  PRESSURED:{displayName:'受壓迫',duration:2,stackable:true,effects:{outgoingMultiplier:.9}},
  DEFINED:{displayName:'被定義',duration:3,stackable:false,effects:{incomingMultiplier:1.25}}
});
export class StatusSystem {
  static add(statuses,id){ const definition=STATUS_DEFINITIONS[id]; if(!definition)throw new Error(`未知狀態：${id}`); const existing=statuses.find((s)=>s.id===id); if(existing){existing.duration=definition.duration;if(definition.stackable)existing.stacks+=1;return statuses;} statuses.push({id,duration:definition.duration,stacks:1}); return statuses; }
  static tick(statuses){ return statuses.map((s)=>({...s,duration:s.duration-1})).filter((s)=>s.duration>0); }
  static multiplier(statuses,key){ return statuses.reduce((total,status)=>total*(STATUS_DEFINITIONS[status.id]?.effects[key]??1),1); }
  static describe(statuses){ return statuses.map((s)=>`${STATUS_DEFINITIONS[s.id]?.displayName}（${s.duration}）`); }
}
