export class MemoryInvestigationManager {
  constructor({definitions,gameState,view,saveManager,onStart,onComplete,onExit}){
    this.definitions=definitions;this.gameState=gameState;this.view=view;this.saveManager=saveManager;
    this.onStart=onStart;this.onComplete=onComplete;this.onExit=onExit;
    this.memory=null;this.context={};this.questionIndex=0;this.selected=null;this.correct=false;this.stage='closed';this.transitioning=false;
  }

  start(id,context={}){
    const memory=this.definitions.find((item)=>item.id===id);
    if(!memory)throw new Error(`找不到回憶照片：${id}`);
    this.memory=memory;this.context={...context,memoryId:id};this.questionIndex=0;this.selected=null;this.correct=false;this.stage='post';this.transitioning=false;
    this.onStart?.(this.context,memory);
    this.view.openPost(memory,{onInvestigate:()=>this.investigate(),onExit:()=>this.exit()});
  }

  investigate(){
    if(!this.memory||this.stage!=='post'||this.transitioning)return;
    this.stage='question';
    this.questionIndex=0;this.selected=null;this.correct=false;this.renderQuestion();
  }

  renderQuestion(){
    const question=this.memory.questions[this.questionIndex];
    this.view.openQuestion(this.memory,question,this.questionIndex,this.memory.questions.length,{
      onSelect:(id)=>this.select(id),onSubmit:()=>this.submit(),onNext:()=>this.next(),onExit:()=>this.exit()
    });
  }

  select(id){this.selected=id;this.correct=false;this.view.setSelected(id);}

  submit(){
    if(this.stage!=='question'||this.correct)return false;
    if(!this.selected){this.view.showFeedback('請先選擇一個答案。',false);return false;}
    const question=this.memory.questions[this.questionIndex];
    this.correct=this.selected===question.correct;
    this.view.showFeedback(this.correct?question.correctFeedback:question.incorrectFeedback,this.correct);
    if(this.correct)this.view.setAdvance(this.questionIndex<this.memory.questions.length-1?'next':'complete');
    return this.correct;
  }

  next(){
    if(!this.correct||this.transitioning)return false;
    this.transitioning=true;
    if(this.questionIndex<this.memory.questions.length-1){this.questionIndex+=1;this.selected=null;this.correct=false;this.transitioning=false;this.renderQuestion();return true;}
    this.complete();return true;
  }

  complete(){
    const flagPath=`flags.${this.memory.completionFlag}`;
    const isNew=!this.gameState.get(flagPath);
    if(isNew){
      this.gameState.set(flagPath,true);
      const flags=['memory01Complete','memory02Complete','memory03Complete'];
      if(flags.every((flag)=>this.gameState.get(`flags.${flag}`)))this.gameState.set('flags.allMemoriesComplete',true);
      this.onComplete?.(this.memory,this.context);
      this.saveManager.save();
    }
    this.exit();
  }

  exit(){
    if(!this.memory)return;
    const memory=this.memory,context=this.context;
    this.view.close();this.memory=null;this.context={};this.questionIndex=0;this.selected=null;this.correct=false;this.stage='closed';this.transitioning=false;
    this.onExit?.(memory,context);
  }
}
