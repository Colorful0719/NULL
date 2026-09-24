// TEMPORARY P0 observation only. Enable with ?bossDebug=1; no gameplay recovery.
export function installCh2BossDiagnostics(game) {
  if (!new URLSearchParams(globalThis.location?.search ?? '').has('bossDebug')) return;
  const records = [], wrapped = new WeakMap();
  let active = false, timer = null, pending = [], lastProgress = performance.now();
  let lastField = null, lastTime = null, lastPhase = null, reported = new Set();
  let callbacks = 0, updates = 0, queued = false, lastCallback = null, lastSample = 0;
  const now = () => performance.now();
  const id = value => typeof value === 'number' ? value : null;
  const snapshot = () => {
    const b = game.nullBossManager, s = game.state, d = game.dialogueManager;
    const rect = b?.view.action?.getBoundingClientRect();
    const actionVisible = Boolean(b && !b.view.screen.hidden && !b.view.action.hidden);
    return {
      timestamp: new Date().toISOString(), monotonicMs: Math.round(now()),
      mode: s.get('mode'), sceneId: s.get('sceneId'), phase: b?.phase ?? 'NOT_ENTERED',
      visualPhase: b?.view.screen.dataset.phase ?? null, round: b?.flow?.round ?? null,
      inputLocked: s.get('playerMovementLocked'), dialogueActive: Boolean(d?.dialogue),
      dialogueId: d?.dialogue?.id ?? null, dialogueLine: d?.lineIndex ?? null,
      dialogueComplete: d?.complete ?? false, narrativePaused: b?.narrativePaused ?? false,
      dialogueTimerId: id(d?.view?.typeTimer),
      narrativePending: b?.flow?.narrative?.pending?.event ?? null,
      actionVisible, actionInViewport: actionVisible && Boolean(rect && rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth),
      actionBounds: actionVisible && rect ? {top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right} : null,
      viewport: {width:innerWidth,height:innerHeight},
      savedDialogueId: s.get('activeFlow.dialogue.id') ?? null,
      savedReflectionId: s.get('activeFlow.reflection.id') ?? null,
      reflectionId: game.reflectionManager?.definition?.id ?? null,
      dodgeActive: b?.phase === 'DODGE' && !b?.narrativePaused,
      fieldTime: b?.field?.time ?? null, rafId: id(b?.frame), rafPending: queued,
      rafCallbacks: callbacks, fieldUpdates: updates, lastCallbackMs: lastCallback,
      collapseRafId: id(b?.collapseFrame), collapseTimerId: id(b?.collapseTimer),
      collapseReady: b?.collapseReady ?? false, watchdogTimerId: id(timer),
      formationTimerIds: [...(api.formationTimers ?? [])],
      battleComplete: Boolean(s.get('flags.ch2NullBossFoundationComplete')),
      profileCollapsed: Boolean(s.get('flags.ch2NullProfileCollapsed')),
      reflectionComplete: Boolean(s.get('flags.ch2ReflectionComplete')),
      chapterComplete: Boolean(s.get('flags.ch2Complete')),
      pendingTransition: pending.at(-1) ?? null, pageHidden: document.hidden,
      mapVisible: !game.root.querySelector('#map-screen')?.hidden,
      dialogueVisible: !game.root.querySelector('#dialogue-scene')?.hidden
    };
  };
  const record = (event, requestedNext = null, detail = {}) => {
    const row = {event, requestedNext, ...snapshot(), ...detail};
    records.push(row); if (records.length > 1500) records.shift();
    console.debug(event === 'WATCHDOG' ? '[CH2-BOSS-WATCHDOG]' : '[CH2-BOSS-DIAGNOSTIC]', row);
    return row;
  };
  const report = reason => {
    if (reported.has(reason)) return;
    reported.add(reason); record('WATCHDOG', null, {reason, stalledMs: Math.round(now() - lastProgress)});
  };
  const check = () => {
    if (!active) return;
    const b = game.nullBossManager, s = snapshot();
    const phaseKey = `${s.mode}/${s.phase}/${s.round}/${s.visualPhase}`;
    if (document.hidden || lastPhase !== phaseKey || lastField !== b?.field || lastTime !== s.fieldTime) {
      lastProgress = now(); reported.clear();
    }
    lastPhase = phaseKey; lastField = b?.field; lastTime = s.fieldTime;
    if (document.hidden) return;
    if (s.phase === 'PLAYER' && s.actionVisible && !s.actionInViewport) report('PENDING_ACTION_OUTSIDE_VIEWPORT');
    if (s.dodgeActive && now() - lastProgress > 3000) report('FIELD_TIME_NOT_ADVANCING');
    if (s.phase === 'COMPLETE' && !s.collapseReady && now() - lastProgress > 5000) report('COLLAPSE_NOT_COMPLETING');
    if (s.inputLocked && s.mode === 'EXPLORATION' && !s.dialogueActive && now() - lastProgress > 5000) report('LOCKED_WITHOUT_PLAYER_ACTION');
    if (s.mode === 'EXPLORATION' && (s.savedReflectionId === 'ch2_data_profile_reflection' || /^ch2_(profile_|post_boss_|final_ending)/.test(s.savedDialogueId ?? ''))) report('SAVED_FINAL_FLOW_NOT_RESTORED');
    // PLAYER, visible dialogue/reflection, and ready-to-return COMPLETE legitimately wait.
  };
  const activate = () => {active = true; if (!timer) timer = setInterval(check, 500);};
  const exception = (stage, error) => {
    // Never include exception messages, arguments, state dumps, posts, or form values.
    record('EXCEPTION', null, {stage, errorName: error?.name ?? 'Error',
      stackLocations: String(error?.stack ?? '').split('\n').slice(1, 7).map(line => line.replace(/\?.*?(?=:\d+:\d+)/g, ''))});
  };
  const wrap = (target, method, next, should = () => active) => {
    if (!target || typeof target[method] !== 'function') return;
    let methods = wrapped.get(target); if (!methods) wrapped.set(target, methods = new Set());
    if (methods.has(method)) return; methods.add(method);
    const original = target[method];
    target[method] = function (...args) {
      if (!should(...args)) return original.apply(this, args);
      const requested = typeof next === 'function' ? next(...args) : next;
      activate(); pending.push(method); record(`${method}:REQUEST`, requested);
      try {const result = original.apply(this, args); record(`${method}:RETURN`, requested, {returnedFalse: result === false}); return result;}
      catch (error) {exception(method, error); throw error;}
      finally {pending.pop(); if (method === 'showCh2Complete' && game.state.get('flags.ch2Complete')) {active = false; clearInterval(timer); timer = null;}}
    };
  };
  const api = {
    records, snapshot, record, check, formationTimers: new Set(),
    timerStarted(timerId) {api.formationTimers.add(timerId); record('FORMATION_TIMER_SCHEDULED', 'FORMATION_BEAT');},
    timerFired(timerId) {api.formationTimers.delete(timerId); record('FORMATION_TIMER_FIRED', 'FORMATION_BEAT');},
    frame(stage, timestamp, done = false) {
      if (stage === 'callback') {queued = false; callbacks++; lastCallback = timestamp;}
      else {updates++; if (timestamp - lastSample >= 1000 || done) {lastSample = timestamp; record(done ? 'FIELD_COMPLETE' : 'FIELD_PROGRESS', done ? 'ROUND_BOUNDARY' : 'DODGE');}}
    },
    queued() {queued = true;},
    attachBoss(b) {
      if (b.diagnostics === api) return; b.diagnostics = api;
      for (const [method, next] of Object.entries({open:flow=>flow.phase==='COMPLETE'?'COMPLETE':'PLAYER',setPhase:phase=>phase,presentNarrative:'PLAYER_INPUT',resumeNarrative:'DODGE',startDodge:'DODGE',beginCollapse:'COLLAPSE',finishCollapse:'RETURN_INPUT',exit:'COLLAPSE_DIALOGUE'})) wrap(b, method, next, () => true);
      const stop = b.stop; b.stop = function (...args) {queued = false; return stop.apply(this, args);};
    }
  };
  game.bossDiagnostics = api; globalThis.__CH2_BOSS_DIAGNOSTICS__ = api;
  for (const [method, next] of Object.entries({startCh2NullEncounter:'FORMATION',revealCh2Null:'REVEAL',startCh2NullDialogue:'ENCOUNTER_DIALOGUE',startNullBossFoundation:'BOSS_ENTRY',openNullBossFoundation:'BOSS_ENTRY',enterCh2FinalDataWorld:'DATA_WORLD',resumeFromState:'RESTORE'})) wrap(game, method, next, () => game.state.get('sceneId') === 'ch2_final_data_world' || game.state.get('flags.ch2FinalDataWorldEntered'));
  for (const [method, next] of Object.entries({beginDialogue:'DIALOGUE',finishDialogue:'DIALOGUE_COMPLETION',startReflection:'REFLECTION',beginReflection:'REFLECTION',finishReflection:'ENDING',startCh2Ending:'ENDING',showCh2Complete:'CH2_COMPLETE'})) wrap(game, method, next);
  const setup = game.setupStep4;
  game.setupStep4 = function (...args) {
    const result = setup.apply(this, args); wrap(game.reflectionManager, 'submit', 'REFLECTION_SUBMITTED'); return result;
  };
  const save = game.saveManager.save;
  game.saveManager.save = function (...args) {
    try {return save.apply(this, args);} catch (error) {if (active) exception('save', error); throw error;}
  };
  window.addEventListener('error', event => {if (active) exception('window.error', event.error);});
  window.addEventListener('unhandledrejection', event => {if (active) exception('unhandledrejection', event.reason);});
  document.addEventListener('visibilitychange', () => {lastProgress = now(); if (active) record('VISIBILITY');});
  window.addEventListener('pagehide', () => {clearInterval(timer); timer = null;});
  window.addEventListener('pageshow', () => {if (active) activate();});
  return api;
}
