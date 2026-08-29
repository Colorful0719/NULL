import { PING_REPLIES } from '../views/PhoneView.js?v=ch2phone1';

export class PhoneManager {
  constructor({ gameState, saveManager, view, onOpen, onComplete, onClose, onEchoReaction }) {
    this.gameState = gameState; this.saveManager = saveManager; this.view = view;
    this.onOpen = onOpen; this.onComplete = onComplete; this.onClose = onClose; this.onEchoReaction = onEchoReaction;
    view.bind({ onOpen: () => this.open(), onReply: (reply) => this.selectReply(reply), onClose: () => this.close() });
  }

  presentNotification() {
    if (this.gameState.get('flags.ch2PingCompleted')) return;
    this.gameState.set('flags.ch2PingNotificationShown', true);
    this.saveManager.save(); this.view.showNotification({app:'PING',title:'PING · MIO',message:'「你今天有空嗎？」'});
  }

  presentEchoReactionNotification(message='1 則新通知') {
    if (!this.gameState.get('flags.ch2EchoReactionAvailable') || this.gameState.get('flags.ch2EchoReactionSeen')) return;
    this.gameState.set('flags.ch2EchoReactionNotificationShown', true);
    this.saveManager.save(); this.view.showNotification({app:'ECHO',title:'ECHO',message});
  }

  open() {
    if (this.gameState.get('flags.ch2EchoReactionAvailable') && !this.gameState.get('flags.ch2EchoReactionSeen')) {
      this.view.hideNotification(); this.onOpen?.(); this.onEchoReaction?.(); return;
    }
    if (this.gameState.get('flags.ch2PingCompleted') && !this.gameState.get('flags.ch2OpeningSceneActive')) return;
    this.view.hideNotification();
    this.gameState.set('flags.ch2PingOpened', true);
    this.saveManager.save(); this.onOpen?.();
    this.view.open(this.gameState.get('flags.ch2PingReply') ?? null);
  }

  selectReply(reply) {
    if (!PING_REPLIES[reply] || this.gameState.get('flags.ch2PingCompleted')) return;
    this.gameState.set('flags.ch2PingReply', reply);
    this.gameState.set('flags.ch2PingCompleted', true);
    this.gameState.set('flags.ch2TravelToEventAvailable', true);
    this.saveManager.save(); this.view.open(reply); this.onComplete?.(reply);
  }

  close() {
    this.view.close(); this.onClose?.();
    if (!this.gameState.get('flags.ch2PingCompleted')) this.view.showNotification({app:'PING',title:'PING · MIO',message:'「你今天有空嗎？」'});
  }

  hide() { this.view.hideNotification(); this.view.close(); }
}
