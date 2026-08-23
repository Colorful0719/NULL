export const EMOTIONS = Object.freeze({
  IMPULSE:{id:'IMPULSE',displayName:'衝動'}, RESTRAINT:{id:'RESTRAINT',displayName:'克制'}, AWARENESS:{id:'AWARENESS',displayName:'覺察'}
});
const ADVANTAGE={IMPULSE:'RESTRAINT',RESTRAINT:'AWARENESS',AWARENESS:'IMPULSE'};
export class EmotionSystem {
  static multiplier(attacker, defender){ if(attacker===defender)return 1; return ADVANTAGE[attacker]===defender?1.25:.8; }
  static label(id){ return EMOTIONS[id]?.displayName ?? '未知'; }
  static next(id){ const order=['AWARENESS','RESTRAINT','IMPULSE']; return order[(order.indexOf(id)+1)%order.length]; }
}
