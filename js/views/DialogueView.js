export class DialogueView {
  constructor(root) {
    this.root = root;
    this.scene = root.querySelector('#dialogue-scene');
    this.portraitLayer = root.querySelector('#portrait-layer');
    this.nameElement = root.querySelector('#speaker-name');
    this.textElement = root.querySelector('#dialogue-text');
    this.choiceElement = root.querySelector('#dialogue-choices');
    this.resultElement = root.querySelector('#choice-result');
    this.environmentVisual=root.querySelector('#environment-dialogue-visual');this.environmentImage=root.querySelector('#environment-dialogue-image');
    this.typeTimer = null;
  }

  open(sceneName,{overlay=false,label='事件對話',environment=false}={}) {
    this.overlay=overlay;
    this.root.querySelector('#title-screen').hidden = true;
    if(!overlay)this.root.querySelector('#map-screen').hidden=true;
    this.scene.hidden = false;
    this.scene.classList.toggle('dialogue-scene--overlay',overlay);
    this.scene.classList.toggle('dialogue-scene--environment',environment);
    this.scene.querySelector('[data-dialogue-label]').textContent=label;
    this.scene.querySelector('[data-scene-name]').textContent = sceneName;
    this.choiceElement.hidden = true;
    this.resultElement.hidden = true;
  }

  renderParticipants(participants, characters) {
    this.portraitLayer.replaceChildren(...participants.map((participant) => {
      const character = characters[participant.characterId];
      const figure = document.createElement('figure');
      figure.className = `portrait portrait--${participant.position}`;
      figure.dataset.characterId = participant.characterId;
      const image = document.createElement('img');
      image.src = character.portraits[participant.expression] ?? character.portraits[character.defaultPortrait];
      image.alt = `${character.displayName} 角色立繪`;
      image.addEventListener('error', () => { figure.classList.add('portrait--missing'); image.alt = `${character.displayName} 立繪載入失敗`; }, { once: true });
      figure.append(image);
      return figure;
    }));
  }

  renderEnvironment(dialogue){const source=dialogue.environmentImage??'';if(!this.environmentVisual||!this.environmentImage)return;this.environmentVisual.hidden=!source;this.environmentImage.src=source;this.environmentImage.alt=dialogue.environmentAlt??`${dialogue.label}照片展示`;}

  renderLine(line, character) {
    this.nameElement.textContent = character.displayName;
    clearInterval(this.typeTimer);
    this.textElement.textContent = '';
    this.textElement.dataset.fullText = line.text;
    let index = 0;
    this.typeTimer = setInterval(() => {
      index += 1;
      this.textElement.textContent = line.text.slice(0, index);
      if (index >= line.text.length) { clearInterval(this.typeTimer); this.typeTimer = null; }
    }, 28);
    this.portraitLayer.querySelectorAll('.portrait').forEach((portrait) => {
      const speaking = portrait.dataset.characterId === line.speakerId;
      portrait.classList.toggle('is-speaking', speaking);
      portrait.classList.toggle('is-muted', !speaking);
      if (speaking && line.expression) {
        const image = portrait.querySelector('img');
        image.src = character.portraits[line.expression] ?? character.portraits[character.defaultPortrait];
      }
    });
  }

  isTyping() { return this.typeTimer !== null; }
  revealLine() { clearInterval(this.typeTimer); this.typeTimer = null; this.textElement.textContent = this.textElement.dataset.fullText ?? ''; }

  showChoices(choices, onSelect) {
    this.choiceElement.replaceChildren(...choices.map((choice) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = choice.label;
      button.addEventListener('click', () => onSelect(choice));
      return button;
    }));
    this.choiceElement.hidden = false;
    this.choiceElement.querySelector('button')?.focus();
  }

  showResult(text) {
    this.choiceElement.hidden = true;
    this.resultElement.textContent = text;
    this.resultElement.hidden = false;
    const closeButton = this.root.querySelector('#dialogue-close');
    if (closeButton) closeButton.textContent = '結束對話';
  }

  close() {
    clearInterval(this.typeTimer); this.typeTimer = null;
    this.scene.hidden = true;
    this.scene.classList.remove('dialogue-scene--overlay');
    this.scene.classList.remove('dialogue-scene--environment');
    if(this.environmentVisual)this.environmentVisual.hidden=true;if(this.environmentImage)this.environmentImage.removeAttribute('src');
    if(!this.overlay)this.root.querySelector('#title-screen').hidden = false;
    this.overlay=false;
    const closeButton = this.root.querySelector('#dialogue-close');
    if (closeButton) closeButton.textContent = '返回標題';
  }
}
