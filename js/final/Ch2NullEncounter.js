const EXAMPLES={PHOTO:'照片',TIMING:'時間',LOCATION:'地點',TAG:'標記的人',AUDIENCE:'分享對象',CONSENT:'一起入鏡的人',POST_PERSISTENCE:'留下的貼文',REPAIR:'後來的處理方式',OPTIONAL_DISCLOSURE:'填過的資料類型',CONTEXTUAL_INFERENCE:'照片背景留下的線索'};

export function buildNullRouteExamples(fragmentModel){
  const types=new Set((fragmentModel?.fragments??[]).map((fragment)=>fragment.type));const ordered=['PHOTO','TIMING','LOCATION','TAG','AUDIENCE','CONSENT','POST_PERSISTENCE','REPAIR','OPTIONAL_DISCLOSURE','CONTEXTUAL_INFERENCE'];
  const values=ordered.filter((type)=>types.has(type)).map((type)=>EXAMPLES[type]);
  if(types.has('CONTEXTUAL_INFERENCE')&&!types.has('LOCATION')){const index=values.indexOf(EXAMPLES.CONTEXTUAL_INFERENCE);if(index>3)values.splice(3,0,...values.splice(index,1));}
  return values.slice(0,4);
}

export function buildNullFirstDialogue(fragmentModel){
  const examples=buildNullRouteExamples(fragmentModel);const list=examples.length?`${examples.join('、')}……`:'留在這裡的資訊……';
  return{id:'ch2_null_first_encounter',label:'聚集起來的資訊',participants:[{characterId:'player',position:'left',expression:'surprised'},{characterId:'photo_keeper',position:'right',expression:'thinking'}],lines:[
    {speakerId:'player',expression:'surprised',text:'那些資訊……怎麼都聚在一起了？'},
    {speakerId:'photo_keeper',expression:'neutral',text:'它們原本只是分散的資訊。'},
    {speakerId:'player',expression:'thinking',text:list},
    {speakerId:'player',expression:'surprised',text:'剛才還散在不同的地方。'},
    {speakerId:'photo_keeper',expression:'thinking',text:'但當不同的資訊開始互相連起來，看起來就不一樣了。'},
    {speakerId:'player',expression:'surprised',text:'那個影子是什麼？'},
    {speakerId:'photo_keeper',expression:'neutral',text:'像是資訊慢慢拼出的一個輪廓。'},
    {speakerId:'player',expression:'thinking',text:'有點像人……可是還看不清楚。'},
    {speakerId:'photo_keeper',expression:'thinking',text:'……再靠近看看。'},
    {speakerId:'player',expression:'neutral',text:'嗯。'}
  ],choices:[],endText:'那個尚未完整的輪廓，安靜地留在資料之中。'};
}
