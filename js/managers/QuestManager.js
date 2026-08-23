const PARTNER_IDS=Object.freeze(['kai','rin','mio','photo_kid','photo_keeper']);
const PARTNER_NAMES=Object.freeze({kai:'KAI',rin:'RIN',mio:'MIO',photo_kid:'PHOTO KID',photo_keeper:'PHOTO KEEPER'});
const NOTICE_BOARD_DISCOVERY=Object.freeze({
  neighborhood:{first:'看起來只是普通的社區公告，不過照片裡似乎也留下了其他資訊。',second:'另一塊公布欄留下的線索不太一樣。分開看很普通，放在一起卻能知道更多。'},
  photo_street:{first:'同一張照片被放在不同地方，留下的資訊也跟著散了出去。',second:'兩處公告各自只留下片段，合在一起卻慢慢拼出了更完整的輪廓。'},
  school_front:{first:'活動、人物和時間被放在同一塊公布欄上，看起來比單張照片透露得更多。',second:'不同公告留下的片段互相呼應，原本零散的資訊開始連在一起。'},
  school_interior:{first:'走廊裡的照片看起來很日常，卻也留下了人物與活動的線索。',second:'不同公布欄上的照片放在一起後，人物、班級和活動之間的關係變得更清楚。'},
  memory_gallery:{first:'照片牆裡有熟悉的畫面，也有自己完全不記得被拍下的瞬間。',second:'兩面照片牆留下不同片段；放在一起後，回憶的輪廓變得更完整，也更難忽視。'}
});

export class QuestManager {
  constructor({definitions,gameState,saveManager}){this.definitions=definitions;this.gameState=gameState;this.saveManager=saveManager;}
  definition(id){return this.definitions.find((quest)=>quest.id===id);}
  start(id){
    const definition=this.definition(id);if(!definition)throw new Error(`找不到任務：${id}`);
    const current=this.gameState.get(`quests.${id}`);if(current)return current;
    const state={status:'active',stageId:definition.stages?.[0]?.id??null,completedStages:[]};
    this.gameState.set(`quests.${id}`,state);this.saveManager.save();return state;
  }
  advance(id,stageId){
    const definition=this.definition(id);if(!definition)throw new Error(`找不到任務：${id}`);
    const stage=definition.stages?.find((item)=>item.id===stageId);if(!stage)throw new Error(`找不到任務階段：${stageId}`);
    const current=this.gameState.get(`quests.${id}`)??this.start(id);
    const completed=[...new Set([...(current.completedStages??[]),stageId])];
    const state={...current,status:'active',stageId,completedStages:completed};this.gameState.set(`quests.${id}`,state);this.saveManager.save();return state;
  }
  recordNpcTalk(characterId){
    this.gameState.set(`flags.talkedTo.${characterId}`,true);
    let message='';
    const knownPartners=this.gameState.get('partners.knownIds')??[];
    if(PARTNER_IDS.includes(characterId)&&!knownPartners.includes(characterId)){
      this.gameState.set('partners.knownIds',[...knownPartners,characterId]);
      this.gameState.set(`partners.met.${characterId}`,true);
      message=`認識夥伴：${PARTNER_NAMES[characterId]}`;
    }
    if(characterId==='photo_keeper'){this.start('ch1_album_path');this.advance('ch1_album_path','meet_photo_keeper');message='任務已更新：尋找照片留下的隱私線索。';}
    const mainAllies=['kai','mio'];
    if(mainAllies.includes(characterId)&&mainAllies.every((id)=>this.gameState.get(`flags.talkedTo.${id}`))){this.start('ch1_album_path');this.advance('ch1_album_path','meet_album_allies');message='任務已更新：你已聽過兩種不同的分享觀點。';}
    if(this.refreshBossUnlock())message=message||'主線條件完成：相簿房間已解鎖。';
    this.saveManager.save();return message;
  }
  discoverClue(clueId){
    const clues=this.gameState.get('privacyClues')??[];
    if(!clues.includes(clueId))this.gameState.set('privacyClues',[...clues,clueId]);
    this.gameState.set(`flags.privacyClues.${clueId}`,true);
    this.start('ch1_album_path');this.advance('ch1_album_path','find_privacy_clue');this.refreshBossUnlock();this.saveManager.save();
    return !clues.includes(clueId);
  }
  recordMemory(memoryId){
    const aliases={memory_01_home:'family_consent',memory_02_park:'school_identity',memory_03_gym:'sharing_scope'};
    const normalizedId=aliases[memoryId]??memoryId;
    const path=`flags.memoryGalleryInvestigations.${normalizedId}`;
    const isNew=!this.gameState.get(path);this.gameState.set(path,true);
    const ids=['family_consent','school_identity','sharing_scope'];
    const complete=ids.every((id)=>this.gameState.get(`flags.memoryGalleryInvestigations.${id}`));
    this.start('ch1_album_path');
    if(complete){this.gameState.set('flags.memoryGalleryInvestigated',true);this.advance('ch1_album_path','inspect_memory_gallery');}
    this.saveManager.save();
    return {isNew,complete,count:ids.filter((id)=>this.gameState.get(`flags.memoryGalleryInvestigations.${id}`)).length};
  }
  recordNoticeBoard(mapId,boardId,availableBoardCount=1){
    const path=`noticeBoardState.${mapId}`;
    const current=this.gameState.get(path)??{inspectedBoards:[],firstDiscoveryTriggered:false,secondDiscoveryTriggered:false};
    const inspectedBoards=[...(current.inspectedBoards??[])];
    if(inspectedBoards.includes(boardId))return{stage:'repeat',isNew:false,state:current};
    inspectedBoards.push(boardId);
    let stage='additional';
    if(!current.firstDiscoveryTriggered)stage='first';
    else if(!current.secondDiscoveryTriggered&&availableBoardCount>1)stage='second';
    const next={
      inspectedBoards,
      firstDiscoveryTriggered:current.firstDiscoveryTriggered||stage==='first',
      secondDiscoveryTriggered:current.secondDiscoveryTriggered||stage==='second',
      availableBoardCount:Math.max(Number(current.availableBoardCount??0),Number(availableBoardCount??1))
    };
    this.gameState.set(path,next);this.saveManager.save();
    return{stage,isNew:true,state:next,message:NOTICE_BOARD_DISCOVERY[mapId]?.[stage]??''};
  }
  completeGalleryKeeper(){
    this.start('ch1_album_path');
    this.gameState.set('flags.memoryGalleryComplete',true);
    this.gameState.set('flags.photoKeeperFinalDialogueComplete',true);
    this.gameState.set('flags.albumRoomUnlocked',true);
    this.advance('ch1_album_path','meet_gallery_keeper');
    this.advance('ch1_album_path','unlock_album_room');
    this.saveManager.save();
    return '任務已更新：相簿房間的入口已解鎖。';
  }
  refreshBossUnlock(){
    const puzzleDone=Boolean(this.gameState.get('puzzleProgress.photo_check.completed'));
    const clues=(this.gameState.get('privacyClues')??[]).length>=4;
    const mainAllies=['kai','mio'].every((id)=>this.gameState.get(`flags.talkedTo.${id}`));
    const unlocked=puzzleDone&&clues&&mainAllies;
    if(unlocked)this.gameState.set('flags.albumBossUnlocked',true);
    return unlocked;
  }
}
