const POSITIONS=[{x:7,y:8},{x:10,y:8},{x:5,y:7},{x:12,y:7},{x:7,y:6},{x:10,y:6},{x:5,y:5},{x:12,y:5},{x:8,y:4},{x:10,y:4}];
const SOURCE_LABEL={photo01:'第一張照片',photo02:'活動貼文',groupPhoto:'團體照',rewardBooth:'獎勵攤位',lookingForMio:'現場辨認'};
const AUDIENCE={PUBLIC:'公開',FRIENDS:'朋友',SELECTED:'指定對象',PRIVATE:'只有自己'};
const LOCATION={CURRENT_LOCATION:'當時所在的位置',GENERAL_AREA:'活動會場的大致區域'};
const TIMING={SHARE_NOW:'拍下後不久',SHARE_LATER:'稍後'};
const REPAIR={CHANGE_AUDIENCE:'改變分享對象',DELETE_POST:'刪除貼文',KEEP_POST:'保留貼文',change_audience:'改變分享對象',delete:'刪除貼文',keep:'保留貼文'};
const disclosure={nickname:'暱稱',ageRange:'年齡範圍',platform:'使用平台',email:'電子郵件',phone:'電話',school:'學校',birthday:'生日',gameId:'遊戲帳號'};

function textFor(fragment){
  const label=SOURCE_LABEL[fragment.source]??'這段資訊';
  if(fragment.type==='PHOTO')return `${label}留在了 ECHO 裡。`;
  if(fragment.type==='LOCATION')return `${label}附上了${LOCATION[fragment.value]??'位置資訊'}。`;
  if(fragment.type==='TIMING')return `${label}在${TIMING[fragment.value]??'選定的時間'}被分享。`;
  if(fragment.type==='TAG')return `${label}旁連著名字「${String(fragment.value).toUpperCase()}」。被標註不等於能看見貼文。`;
  if(fragment.type==='AUDIENCE')return `${label}最後分享給：${AUDIENCE[fragment.value?.mode]??'未指定對象'}。分享對象和照片中的標註是兩件事。`;
  if(fragment.type==='CONSENT')return `拍團體照前，大家${fragment.value?.asked?'先談過':'沒有先談'}是否分享；RIN 希望照片不要公開。`;
  if(fragment.type==='POST_PERSISTENCE')return fragment.value?.deleted?'這則內容曾經發布，後來已被刪除。刪除是現在的狀態，發布紀錄曾經存在。':fragment.value?.posted?'這則內容目前仍保留在 ECHO。':'這則內容目前只是草稿。';
  if(fragment.type==='REPAIR')return `團體照最後的處理是：${REPAIR[fragment.value]??'重新調整分享方式'}。`;
  if(fragment.type==='OPTIONAL_DISCLOSURE')return `為了領取虛構獎勵，曾提供：${fragment.value.map((item)=>disclosure[item]??item).join('、')}。`;
  if(fragment.type==='CONTEXTUAL_INFERENCE')return '有人沒有看到附加地點，仍從照片背景認出了活動現場。這是從情境推測出的資訊。';
  return `${label}形成了一段可辨認的資訊。`;
}

function select(snapshot){
  const all=(snapshot.fragments??[]).filter((fragment)=>fragment.type!=='REWARD');
  const chosen=[];const add=(item)=>{if(item&&!chosen.some((entry)=>entry.id===item.id))chosen.push(item);};
  const find=(source,type)=>all.find((item)=>item.source===source&&item.type===type);
  add(find('photo01','PHOTO'));add(find('photo01','LOCATION')??find('photo01','TIMING'));add(find('photo01','TAG'));
  add(find('photo02','AUDIENCE')??find('photo02','PHOTO'));
  add(find('groupPhoto','CONSENT'));add(find('groupPhoto','POST_PERSISTENCE'));add(find('groupPhoto','REPAIR')??find('groupPhoto','AUDIENCE'));
  add(find('rewardBooth','OPTIONAL_DISCLOSURE'));add(find('lookingForMio','CONTEXTUAL_INFERENCE'));
  for(const fragment of all)if(chosen.length<5)add(fragment);
  return chosen.slice(0,8);
}

export function resolveCh2InformationFragments(snapshot){
  const selected=select(snapshot);
  const fragments=selected.map((fragment,index)=>({...fragment,position:POSITIONS[index],title:SOURCE_LABEL[fragment.source]??'資訊碎片',text:textFor(fragment)}));
  const ids=new Set(fragments.map((item)=>item.id));
  const connections=(snapshot.connections??[]).filter((item)=>ids.has(item.from)&&ids.has(item.to));
  const optionalIds=fragments.filter((item)=>item.optional).map((item)=>item.id);
  const requiredIds=fragments.filter((item)=>!item.optional).map((item)=>item.id);
  return{fragments,connections,requiredIds,optionalIds};
}

export function fragmentEntity(fragment){
  const fronts=[{x:fragment.position.x,y:fragment.position.y+1,facing:'up'},{x:fragment.position.x-1,y:fragment.position.y,facing:'right'},{x:fragment.position.x+1,y:fragment.position.y,facing:'left'},{x:fragment.position.x,y:fragment.position.y-1,facing:'down'}];
  return{id:`ch2_fragment_${fragment.id.replaceAll('.','_')}`,type:'object',displayLabel:'資訊碎片',position:{...fragment.position},nonBlocking:true,fragmentType:fragment.type,interactionRadius:1,interaction:{kind:'ch2_final_fragment',fragmentId:fragment.id,prompt:'按 E 查看資訊碎片',frontPositions:fronts}};
}
