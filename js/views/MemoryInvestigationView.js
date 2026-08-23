export class MemoryInvestigationView {
  constructor(root){
    this.root=root;this.screen=root.querySelector('#memory-investigation-screen');this.author=root.querySelector('#memory-author');
    this.post=root.querySelector('#memory-post-text');this.image=root.querySelector('#memory-photo');this.question=root.querySelector('#memory-question');
    this.options=root.querySelector('#memory-options');this.feedback=root.querySelector('#memory-feedback');this.investigateButton=root.querySelector('#memory-investigate');
    this.submitButton=root.querySelector('#memory-submit');this.nextButton=root.querySelector('#memory-next');this.exitButton=root.querySelector('#memory-exit');
    this.montage=root.querySelector('#memory-montage');this.montageImage=root.querySelector('#memory-montage-image');
  }

  setMemory(memory){this.author.textContent=memory.author;this.post.textContent=memory.postText;this.image.src=memory.image;this.image.alt=memory.alt;}

  openPost(memory,handlers){
    this.setMemory(memory);this.screen.hidden=false;this.screen.dataset.stage='post';this.question.hidden=true;this.options.hidden=true;
    this.question.replaceChildren();this.options.replaceChildren();
    this.feedback.hidden=true;this.investigateButton.hidden=false;this.submitButton.hidden=true;this.nextButton.hidden=true;
    this.bind(this.investigateButton,handlers.onInvestigate);this.bind(this.exitButton,handlers.onExit);
  }

  openQuestion(memory,question,index,total,handlers){
    this.setMemory(memory);this.screen.hidden=false;this.screen.dataset.stage='question';this.question.hidden=false;this.options.hidden=false;
    this.question.replaceChildren(document.createTextNode(`${index+1}／${total}　${question.prompt}`));this.feedback.hidden=true;this.feedback.className='memory-feedback';
    this.options.replaceChildren(...question.options.map((option)=>{const button=document.createElement('button');button.type='button';button.className='memory-option';button.dataset.memoryOption=option.id;button.textContent=option.text;button.setAttribute('aria-pressed','false');button.onclick=()=>handlers.onSelect(option.id);return button;}));
    this.investigateButton.hidden=true;this.submitButton.hidden=false;this.submitButton.disabled=false;this.nextButton.hidden=true;
    this.bind(this.submitButton,handlers.onSubmit);this.bind(this.nextButton,handlers.onNext);this.bind(this.exitButton,handlers.onExit);
  }

  bind(button,handler){button.onclick=handler;}
  setSelected(id){for(const button of this.options.querySelectorAll('[data-memory-option]'))button.setAttribute('aria-pressed',String(button.dataset.memoryOption===id));}
  showFeedback(message,correct){this.feedback.hidden=false;this.feedback.textContent=message;this.feedback.className=`memory-feedback ${correct?'is-success':'is-error'}`;}
  setAdvance(kind){this.submitButton.disabled=true;this.nextButton.hidden=false;this.nextButton.textContent=kind==='next'?'下一題':'完成並返回畫廊';}
  close(){this.screen.hidden=true;this.image.removeAttribute('src');this.question.replaceChildren();this.options.replaceChildren();}

  playMontage(images){
    if(!this.montage||!this.montageImage||!images.length)return;
    this.montage.hidden=false;let index=0;this.montageImage.src=images[index];
    const timer=setInterval(()=>{index+=1;if(index>=images.length){clearInterval(timer);this.montage.hidden=true;this.montageImage.removeAttribute('src');return;}this.montageImage.src=images[index];},420);
  }
}
