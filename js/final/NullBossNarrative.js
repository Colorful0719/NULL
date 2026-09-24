const TYPE_LINES=Object.freeze({
  PHOTO:'一張照片。',
  TIME:'一個時間。',
  LOCATION:'一個位置。',
  TAG:'一個名字。',
  AUDIENCE:'一個分享範圍。',
  SOCIAL_CONNECTION:'人和人之間，也會留下連結。',
  MESSAGE:'一段訊息。',
  BACKGROUND_CLUE:'照片裡，還有別的東西。'
});

const CONNECTION_LINES=Object.freeze({
  PHOTO_TIME:'照片和時間，連起來了。',
  PHOTO_LOCATION:'照片和位置，連起來了。',
  PHOTO_TAG:'照片裡的人，也成了線索的一部分。',
  PHOTO_AUDIENCE:'同一張照片，能被誰看見，也是一部分。',
  PHOTO_BACKGROUND_CLUE:'照片和背景線索，連起來了。',
  TAG_SOCIAL_CONNECTION:'一個名字，也可能連到另一個人。'
});

const keyFor=(a,b)=>{
  const pair=new Set([a,b]);
  const pairs=[['PHOTO','TIME','PHOTO_TIME'],['PHOTO','LOCATION','PHOTO_LOCATION'],['PHOTO','TAG','PHOTO_TAG'],['PHOTO','AUDIENCE','PHOTO_AUDIENCE'],['PHOTO','BACKGROUND_CLUE','PHOTO_BACKGROUND_CLUE'],['TAG','SOCIAL_CONNECTION','TAG_SOCIAL_CONNECTION']];
  for(const [left,right,key] of pairs)if(pair.has(left)&&pair.has(right))return key;
  return[a,b].sort().join('_');
};
const unique=(values)=>[...new Set((values??[]).filter(Boolean))];

export function createNullBossNarrativeState(existing={}){
  return{fired:unique(existing.fired),pending:existing.pending??null};
}

export function supportedRoundOneLines(plan){
  const types=unique((plan?.round1??[]).filter(item=>item.state!=='UNRESOLVED').map(item=>item.type));
  return types.map(type=>TYPE_LINES[type]).filter(Boolean).slice(0,4);
}

export function connectionEventId(pair){
  const state=String(pair?.state??'UNRESOLVED').toLowerCase();
  const semantic=keyFor(pair?.fromType??'',pair?.toType??'');
  return `connection_${state}_${semantic}_${pair?.relation??''}`;
}

export function narrativeEventLines(event,plan,context={}){
  if(event==='round1_start'){
    const list=supportedRoundOneLines(plan);
    return['資料輪廓：\n「這些，看起來都只是分開的資訊。」','PLAYER：\n「我一路留下的東西……？」',...(list.length?['資料輪廓：\n'+list.join('\n')]:[])];
  }
  if(event==='round2_start')return['PLAYER：\n「等等……它們開始連起來了。」','資料輪廓：\n「一個資訊，可能看不出什麼。」','資料輪廓：\n「但它不一定會一直是單獨的。」'];
  if(event==='round3_start')return['PLAYER：\n「越來越多線索聚在一起了。」','靠近圓形連結節點，按 E 或「中斷連結」。依序中斷三個節點，再穿過最後的資料風暴。','中斷的是資訊之間的連結，不是刪除資訊。'];
  if(event==='first_contextual_connection')return['PLAYER：\n「照片背景也算資訊嗎？」','資料輪廓：\n「它可能只是背景，也可能成為另一條線索。」'];
  if(event==='background_without_location')return['PLAYER：\n「我明明沒有寫位置。」','資料輪廓：\n「沒有直接寫出來。」','資料輪廓：\n「不代表照片裡沒有其他線索。」','資料輪廓：\n「但線索，也不一定能得到答案。」'];
  if(event==='first_unresolved_connection')return['PLAYER：\n「這樣就能知道位置嗎？」','資料輪廓：\n「還不能。」','資料輪廓：\n「有線索，不代表有答案。」'];
  if(event==='stability_midpoint')return['資料輪廓：\n「連結斷開了。」','PLAYER：\n「輪廓開始變淡了。」'];
  if(event==='pre_resolution')return['PLAYER：\n「為什麼它越來越像一個人？」','資料輪廓：\n「因為這些資訊，都在描述某個人。」','資料輪廓：\n「不是每一條線都能得到答案。」'];
  if(event==='tag_audience')return['PLAYER：\n「標註一個人，不代表他就是分享對象。」'];
  if(event==='connection_explicit'&&context.pair){
    const key=keyFor(context.pair.fromType,context.pair.toType);
    const line=CONNECTION_LINES[key];
    return line?[`資料輪廓：\n「${line}」`]:[];
  }
  if(event==='fragment_reaction'&&context.type){
    const line=TYPE_LINES[context.type];
    return line?[`資料輪廓：\n「${line}」`]:[];
  }
  return[];
}

export function hasNarrativeFired(state,event){return Boolean(state?.fired?.includes(event));}
