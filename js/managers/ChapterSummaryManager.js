const STATIC_SLIDES=Object.freeze([
  {id:'opening',eyebrow:'第一章',title:'一開始——',lines:['那只是一張照片。','至少，看起來是這樣。'],tone:'quiet'},
  {id:'journey_path',eyebrow:'走過的地方',title:'從家中，到相簿深處',lines:['在 PLAYER HOME，PARENT 準備分享一張照片。','離開 NEIGHBORHOOD 後，PLAYER 遇見 RIN、KAI、MIO，也看見散落在 PHOTO STREET 與 SCHOOL 的照片。','PHOTO KID 與 PHOTO KEEPER 帶 PLAYER 穿過 MEMORY GALLERY，最後面對 ALBUM。'],image:'assets/images/memories/ch1/memory_parent_home.png'},
  {id:'a_photo',eyebrow:'一張照片',title:'記錄、回憶與分享',lines:['我們拍下照片。','留下回憶。','也把它分享給其他人。','KAI：「我只是發了一張照片。」'],image:'assets/images/memories/ch1/memory_parent_gym.png'},
  {id:'inside_photo',eyebrow:'照片裡有什麼？',title:'我們沒有特別注意的部分',keywords:['人物','制服','背景','活動','時間','地點','生活留下的痕跡'],lines:['很多時候，我們注意的是照片裡想拍的東西。','卻不一定注意到——照片同時拍進了什麼。'],image:'assets/environment/boards/school_interior_board.png'},
  {id:'other_people',eyebrow:'照片裡不只有自己',title:'其他人的生活片段',lines:['朋友、同學、老師，也可能出現在照片裡。','我想分享，不代表照片裡的每個人，都想被分享。'],image:'assets/puzzles/rin_photo_inspection/photo_07_prank.png'},
  {id:'sharer',eyebrow:'SHARER',title:'分享之後',lines:['按下分享之後——','照片不一定只停在原本的地方。','它可以被看到、被保存、被複製，再次被分享。'],effect:'copy'},
  {id:'tracker',eyebrow:'TRACKER',title:'線索',keywords:['制服','活動','時間','街道','交通','背景'],lines:['一張照片裡的資訊，也許不多。','但如果還有另一張呢？','不同地方留下的資訊，可以互相補足。'],effect:'connect'},
  {id:'album',eyebrow:'ALBUM',title:'拼起來',lines:['照片沒有自己說出完整答案。','是我們留下的資訊，一點一點連在了一起。'],effect:'profile'},
  {id:'core',eyebrow:'第一章',title:'分享之前，多看一眼',lines:['一張照片，也許看起來沒有什麼。','但照片裡留下的，不一定只有我們想分享的東西。','想一想照片裡有什麼。','想一想誰會看到。','也想一想，照片裡還有誰。'],tone:'clean'},
  {id:'kai_callback',eyebrow:'KAI',title:'「我只是發了一張照片。」',lines:['PLAYER：「……一張照片。」','真的只有一張照片嗎？'],tone:'quiet'},
  {id:'teaser',eyebrow:'下一章',title:'如果不是照片呢？',lines:['照片的問題，暫時告一段落。','但是——','我們每天留下的資訊，真的只有照片嗎？'],effect:'teaser'},
  {id:'teaser_questions',eyebrow:'新的資料訊號',title:'除了照片之外——',keywords:['文字呢？','搜尋呢？','位置呢？'],lines:['我們每天留下的那些痕跡呢？'],effect:'teaser'},
  {id:'final',eyebrow:'《NULL》',title:'第一章完成',lines:['下一章　敬請期待'],final:true,tone:'clean'}
]);

export class ChapterSummaryManager{
  constructor({gameState,saveManager,view,audioManager,onMenu}){this.gameState=gameState;this.saveManager=saveManager;this.view=view;this.audioManager=audioManager;this.onMenu=onMenu;this.slides=[];this.index=0;}
  buildSlides(){const slides=STATIC_SLIDES.map((slide)=>({...slide,lines:[...(slide.lines??[])],keywords:[...(slide.keywords??[])]}));const journeyIndex=slides.findIndex((slide)=>slide.id==='kai_callback');slides.splice(journeyIndex,0,this.journeySlide());if(this.gameState.get('sideQuests.rinPhotoInspection.completed'))slides.splice(journeyIndex+1,0,{id:'rin_callback',eyebrow:'RIN',title:'照片檢查',lines:['「原來照片裡能看到的東西，比我想的還多。」','「下次發照片之前，我大概會多看一下背景了。」'],image:'assets/puzzles/rin_photo_inspection/photo_02_friends.png'});return slides;}
  journeySlide(){const items=['走過 PLAYER HOME，和 PARENT 談過照片分享','看見照片如何被分享、複製與重新連接','在 SCHOOL 遇見 KAI、MIO，並面對 SHARER 與 TRACKER','穿過 MEMORY GALLERY，面對 ALBUM'];const states=this.gameState.get('noticeBoardState')??{};if(Object.values(states).some((state)=>state?.secondDiscoveryTriggered))items.push('發現不同公告中的資訊可以互相連結');const rinDone=Boolean(this.gameState.get('sideQuests.rinPhotoInspection.completed'));return{id:'journey_review',eyebrow:'你的旅程',title:'第一章留下的片段',checks:items,sideQuest:{completed:rinDone,title:'RIN 的照片檢查',lines:rinDone?['你和 RIN 一起重新看了準備分享的照片。','有些照片沒有明顯問題；有些則值得在分享前多看一眼。']:['尚未完成']}};}
  start({index=null,final=false}={}){this.slides=this.buildSlides();const saved=this.gameState.get('activeFlow.summary.index');this.index=final?this.slides.findIndex((slide)=>slide.final):Math.max(0,Math.min(this.slides.length-1,index??saved??0));this.gameState.set('activeFlow.summary',{index:this.index});this.audioManager?.playBGM('REFLECTION',{fade:900});this.saveManager.save();this.render();}
  render(){const slide=this.slides[this.index];if(slide.id==='teaser'){this.audioManager?.playSFX('phase_transition',{volume:.28});this.audioManager?.stopBGM({fade:1800});this.gameState.set('flags.ch1TeaserSeen',true);}if(slide.final)this.audioManager?.stopBGM({fade:900});this.view.open(slide,{index:this.index,total:this.slides.length,onNext:()=>this.next(),onSkip:()=>this.skip(),onReview:()=>this.review(),onMenu:()=>this.menu()});}
  next(){if(this.index>=this.slides.length-1){this.complete();return;}this.index+=1;this.gameState.set('activeFlow.summary',{index:this.index});this.saveManager.save();this.render();}
  skip(){this.gameState.set('flags.ch1SummarySkipped',true);this.complete();this.index=this.slides.findIndex((slide)=>slide.final);this.render();}
  review(){this.index=this.slides.findIndex((slide)=>slide.id==='journey_review');this.gameState.set('activeFlow.summary',{index:this.index});this.saveManager.save();this.render();}
  complete(){this.gameState.set('flags.ch1SummarySeen',true);this.gameState.set('flags.ch1TeaserSeen',true);this.gameState.set('flags.ch1Complete',true);this.gameState.set('chapter','CH1_COMPLETE');this.gameState.set('activeFlow.summary',null);this.saveManager.save();}
  menu(){this.complete();this.view.close();this.onMenu?.();}
}
