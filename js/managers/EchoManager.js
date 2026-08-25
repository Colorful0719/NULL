import { resolveEchoPhoto } from '../echo/EchoAssets.js';

const LOCATION_VALUES = ['CURRENT_LOCATION', 'GENERAL_AREA', 'NO_LOCATION'];
const TIMING_VALUES = ['SHARE_NOW', 'SHARE_LATER'];
const AUDIENCE_VALUES = ['PUBLIC', 'FRIENDS', 'SELECTED', 'PRIVATE'];
const clone = (value) => structuredClone(value);

export class EchoManager {
  constructor({ gameState, saveManager, view, onOpen, onClose, onCommit }) {
    this.gameState=gameState;this.saveManager=saveManager;this.view=view;this.onOpen=onOpen;this.onClose=onClose;this.onCommit=onCommit;this.session=null;
  }
  open(config={}) {
    const mode=config.mode==='STORY'?'STORY':'POST';
    this.session={
      id:config.id??`echo-${Date.now()}`,mode,photo:resolveEchoPhoto(config.photo),caption:config.caption??'',
      location:this.#initial(config.location,LOCATION_VALUES,'NO_LOCATION'),timing:this.#initial(config.timing,TIMING_VALUES,'SHARE_NOW'),
      audience:this.#initial(config.audience,AUDIENCE_VALUES,'FRIENDS'),selectedAudience:[...(config.selectedAudience??[])],
      selectedOptions:[...(config.selectedOptions??[])],controls:this.#controls(config.controls),audienceOptions:clone(config.audienceOptions??{}),
      contacts:clone(config.contacts??[]),sourceEventId:config.sourceEventId??null
    };
    this.gameState.set('activeFlow.echo',{id:this.session.id,config:clone(config)});this.onOpen?.(this.session);this.#render();return clone(this.session);
  }
  close(){if(!this.session)return false;this.view.close();this.gameState.set('activeFlow.echo',null);this.session=null;this.saveManager.save();this.onClose?.();return true;}
  select(kind,value){if(!this.session)return false;const allowed=kind==='location'?LOCATION_VALUES:kind==='timing'?TIMING_VALUES:kind==='audience'?AUDIENCE_VALUES:null;if(!allowed?.includes(value))return false;const rule=this.session.controls[kind];if(rule&&!rule.enabled||rule?.locked)return false;this.session[kind]=value;if(kind==='audience'&&value!=='SELECTED')this.session.selectedAudience=[];this.#render();return true;}
  toggleSelected(id){if(!this.session||this.session.audience!=='SELECTED'||!this.session.contacts.some((item)=>item.id===id))return false;const list=this.session.selectedAudience;this.session.selectedAudience=list.includes(id)?list.filter((value)=>value!==id):[...list,id];this.#render();return true;}
  publish(){return this.#commit('POSTED');}
  saveForLater(){this.session.timing='SHARE_LATER';return this.#commit('DRAFT');}
  changeAudience(postId,audience,selectedAudience=[]){if(!AUDIENCE_VALUES.includes(audience))return false;const updated=this.#updateHistory(postId,(post)=>({...post,audience,selectedAudience:audience==='SELECTED'?[...selectedAudience]:[]}));if(updated)this.#notify('分享對象已更新。',postId);return updated;}
  deletePost(postId){const updated=this.#updateHistory(postId,(post)=>({...post,deleted:true,status:'DELETED'}));if(updated)this.#notify('貼文已刪除。',postId);return updated;}
  history(){const state=this.gameState.get('echo')??{};return [...(state.posts??[]),...(state.drafts??[])].sort((a,b)=>a.order-b.order);}
  notifications(){return this.gameState.get('echo.notifications')??[];}
  #initial(config,values,fallback){const value=typeof config==='string'?config:config?.value;return values.includes(value)?value:fallback;}
  #controls(controls={}){const normalize=(value)=>({visible:value?.visible!==false,enabled:value?.enabled!==false,locked:Boolean(value?.locked)});return {location:normalize(controls.location),timing:normalize(controls.timing),audience:normalize(controls.audience)};}
  #record(status){const echo=this.gameState.get('echo')??{drafts:[],posts:[],notifications:[],nextOrder:1};const order=echo.nextOrder??1;const record={id:this.session.id,contentId:this.session.photo?.id??null,type:this.session.mode,location:this.session.location,timing:this.session.timing,audience:this.session.audience,selectedAudience:[...this.session.selectedAudience],status,posted:status==='POSTED',deleted:false,timestamp:new Date().toISOString(),order,sourceEventId:this.session.sourceEventId};const key=status==='POSTED'?'posts':'drafts';echo[key]=[...(echo[key]??[]),record];echo.nextOrder=order+1;this.gameState.set('echo',echo);return record;}
  #commit(status){if(!this.session)return null;if(this.session.audience==='SELECTED'&&!this.session.selectedAudience.length){this.view.notify('請至少選擇一位觀看對象。');return null;}const record=this.#record(status);this.#notify(status==='POSTED'?'已發布到 ECHO。':'已儲存，之後可以再發布。',record.id);this.onCommit?.(clone(record),clone(this.session));this.saveManager.save();this.close();return record;}
  #updateHistory(id,updater){const echo=this.gameState.get('echo');let found=false;for(const key of ['posts','drafts'])echo[key]=(echo[key]??[]).map((post)=>{if(post.id!==id)return post;found=true;return updater(post);});if(found){this.gameState.set('echo',echo);this.saveManager.save();}return found;}
  #notify(message,postId=null){const items=this.gameState.get('echo.notifications')??[];this.gameState.set('echo.notifications',[...items,{id:`echo-notice-${items.length+1}`,message,postId,order:items.length+1}]);this.view.notify(message);}
  #render(){this.view.open(this.session,{onClose:()=>this.close(),onSelect:(kind,value)=>this.select(kind,value),onToggleSelected:(id)=>this.toggleSelected(id),onPost:()=>this.publish(),onSave:()=>this.saveForLater()});}
}
