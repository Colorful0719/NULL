const OPENING_MESSAGES = [
  '你今天有空嗎？',
  '附近有個社區活動',
  '好像滿多東西可以逛的',
  '我等等要過去',
  'RIN 他們好像也會去',
  '你要不要一起來？'
];

export const PING_REPLIES = Object.freeze({
  A: { player: '好啊，我等等過去。', mio: ['好～', '我先去逛一下', '你到了再找我！'] },
  B: { player: '你們已經到了嗎？', mio: ['我剛到～', 'RIN 好像已經跑去逛了', '你到了再找我！'] },
  C: { player: '那邊有什麼？', mio: ['我也還沒逛完 XD', '好像有拍照區跟一些活動攤位', '你自己來看啦', '到了再找我！'] }
});

export class PhoneView {
  constructor(root) {
    this.root = root;
    this.notification = root.querySelector('#phone-notification');
    this.screen = root.querySelector('#phone-screen');
    this.content = root.querySelector('#phone-content');
    this.closeButton = root.querySelector('#phone-close');
    this.onOpen = null; this.onReply = null; this.onClose = null;
    this.boundClick = (event) => this.handleClick(event);
    this.boundKeydown = (event) => { if (event.key === 'Escape' && !this.screen?.hidden) this.onClose?.(); };
    root.addEventListener('click', this.boundClick);
    document.addEventListener('keydown', this.boundKeydown);
  }

  bind({ onOpen, onReply, onClose }) { this.onOpen = onOpen; this.onReply = onReply; this.onClose = onClose; }
  showNotification({app='PING',title='PING · MIO',message='「你今天有空嗎？」'}={}) { if (!this.notification) return;this.notification.querySelector('strong').textContent=title;this.notification.querySelector('small').textContent=message;this.notification.querySelector('.phone-notification-mark').textContent=app==='ECHO'?'E':'P';this.notification.setAttribute('aria-label',`開啟 ${app} 通知`);this.notification.hidden = false; }
  hideNotification() { if (this.notification) this.notification.hidden = true; }
  close() { if (this.screen) this.screen.hidden = true; }

  handleClick(event) {
    const action = event.target.closest('[data-phone-action]')?.dataset.phoneAction;
    if (!action) return;
    if (action === 'open') this.onOpen?.();
    else if (action === 'close') this.onClose?.();
    else if (action.startsWith('reply-')) this.onReply?.(action.slice(-1));
    else if (action === 'ping') this.renderPing(this.reply);
    else if (action === 'echo') this.renderReference('ECHO', '拍完照片後，可以在這裡使用既有的 ECHO 貼文功能。');
    else if (action === 'notifications') this.renderReference('通知', 'MIO 在 PING 傳來了一則訊息。');
  }

  open(reply = null) {
    this.reply = reply;
    if (this.screen) this.screen.hidden = false;
    this.renderPing(reply);
  }

  message(text, side = 'mio') {
    const row = document.createElement('p');
    row.className = `phone-message phone-message--${side}`;
    row.textContent = text;
    return row;
  }

  renderPing(reply = null) {
    this.reply = reply;
    if (!this.content) return;
    const fragment = document.createDocumentFragment();
    const heading = document.createElement('header');
    heading.className = 'phone-conversation-header';
    heading.innerHTML = '<span class="phone-avatar">M</span><div><strong>MIO</strong><small>PING 私人訊息</small></div>';
    fragment.append(heading);
    const thread = document.createElement('div'); thread.className = 'phone-thread';
    OPENING_MESSAGES.forEach((line) => thread.append(this.message(line)));
    if (reply && PING_REPLIES[reply]) {
      const branch = PING_REPLIES[reply];
      thread.append(this.message(branch.player, 'player'));
      branch.mio.forEach((line) => thread.append(this.message(line)));
      thread.append(this.message('等等見～'));
    }
    fragment.append(thread);
    if (!reply) {
      const choices = document.createElement('div'); choices.className = 'phone-replies';
      Object.entries(PING_REPLIES).forEach(([id, branch]) => {
        const button = document.createElement('button'); button.type = 'button';
        button.dataset.phoneAction = `reply-${id}`; button.textContent = branch.player; choices.append(button);
      });
      fragment.append(choices);
    } else {
      const hint = document.createElement('p'); hint.className = 'phone-complete-hint'; hint.textContent = '關閉 NULL PHONE 後，就可以出門前往活動會場。'; fragment.append(hint);
    }
    this.content.replaceChildren(fragment);
    this.setActiveApp('ping');
    queueMicrotask(() => { const threadNode = this.content?.querySelector('.phone-thread'); if (threadNode) threadNode.scrollTop = threadNode.scrollHeight; });
  }

  renderReference(title, text) {
    if (!this.content) return;
    const panel = document.createElement('section'); panel.className = 'phone-reference';
    const heading = document.createElement('h2'); heading.textContent = title;
    const copy = document.createElement('p'); copy.textContent = text;
    panel.append(heading, copy); this.content.replaceChildren(panel); this.setActiveApp(title.toLowerCase());
  }

  setActiveApp(app) {
    this.screen?.querySelectorAll('[data-phone-action="ping"], [data-phone-action="echo"], [data-phone-action="notifications"]').forEach((button) => button.classList.toggle('is-active', button.dataset.phoneAction === app));
  }
}
