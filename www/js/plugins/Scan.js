/*:
 * @plugindesc PH Scan using YEP InBattleStatus UI with robust Scan wrapper. Shows scanned enemy as a pseudo-actor in Window_InBattleStatus overlay. Place after YEP_InBattleStatus and your Scan plugin. Ensures Scan skills are handled even if other plugins overwrite Game_Action.apply. 
 * @author You
 * @help
 * - Requires YEP InBattleStatus (Window_InBattleStatus).
 * - Place this plugin after YEP_InBattleStatus and after any Scan plugin.
 * - Detects skills with <Scan> in the note (case-insensitive) or item.meta.Scan.
 * - When a Scan skill is used on an enemy, this plugin will show the YEP InBattleStatus overlay
 *   populated with a pseudo-actor built from the enemy's scanned data.
 * - If the overlay cannot be shown immediately, the scan data is queued in $gameTemp for the
 *   existing Scan flow (BattleManager.endAction) to handle.
 * - This plugin is intentionally non-destructive for non-Scan skills and preserves original behavior.
 */

/* eslint-disable no-unused-vars */
(function(){
  'use strict';

  // Safety: require YEP InBattleStatus window
  if (!window.Window_InBattleStatus) {
    console.warn("PH_ScanUseYEPInBattleStatus: Window_InBattleStatus not found. Plugin disabled.");
    return;
  }

  /* -------------------------
   * Pseudo actor for YEP Window_InBattleStatus
   * ------------------------- */
  function PseudoActorFromScan(scanData) {
    this.initialize(scanData);
  }

  PseudoActorFromScan.prototype.initialize = function(data) {
    this._data = data || {};
    this._name = this._data.name || "Unknown";
    this._hp = (this._data.hp && this._data.hp.current) || 0;
    this._mhp = (this._data.hp && this._data.hp.max) || 0;
    this._mp = (this._data.mp && this._data.mp.current) || 0;
    this._mmp = (this._data.mp && this._data.mp.max) || 0;
    this._params = [];
    this._params[0] = this._mhp || 0;
    this._params[1] = this._mmp || 0;
    this._params[2] = (this._data.params && this._data.params.atk) || 0;
    this._params[3] = (this._data.params && this._data.params.def) || 0;
    this._params[4] = (this._data.params && this._data.params.mat) || 0;
    this._params[5] = (this._data.params && this._data.params.mdf) || 0;
    this._params[6] = (this._data.params && this._data.params.agi) || 0;
    this._params[7] = (this._data.params && this._data.params.luk) || 0;
    this._states = (this._data.states || []).map(function(s){ return s && s.id ? s.id : 0; });
    this._iconIndex = (this._data.states && this._data.states[0] && this._data.states[0].iconIndex) || 0;
    this._level = this._data.level || 0;
  };

  // Methods expected by YEP Window_InBattleStatus and related windows
  PseudoActorFromScan.prototype.name = function(){ return this._name; };
  PseudoActorFromScan.prototype.hp = function(){ return this._hp; };
  PseudoActorFromScan.prototype.mhp = function(){ return this._mhp; };
  PseudoActorFromScan.prototype.mp = function(){ return this._mp; };
  PseudoActorFromScan.prototype.mmp = function(){ return this._mmp; };
  PseudoActorFromScan.prototype.param = function(index){ return this._params[index] || 0; };
  PseudoActorFromScan.prototype.isDead = function(){ return this._hp <= 0; };
  PseudoActorFromScan.prototype.isStateAffected = function(stateId){ return this._states.indexOf(stateId) !== -1; };
  PseudoActorFromScan.prototype.traitObjects = function(){ return []; };
  PseudoActorFromScan.prototype.iconIndex = function(){ return this._iconIndex || 0; };
  PseudoActorFromScan.prototype.level = function(){ return this._level || 0; };
  PseudoActorFromScan.prototype.actorId = function(){ return 0; };
  PseudoActorFromScan.prototype._actorId = function(){ return 0; };

  function makePseudoActor(scanData) {
    return new PseudoActorFromScan(scanData);
  }

  /* -------------------------
   * Scene_Battle overlay methods
   * ------------------------- */

  var _ph_scan_scene_battle_createAllWindows = Scene_Battle.prototype.createAllWindows;
  Scene_Battle.prototype.createAllWindows = function() {
    _ph_scan_scene_battle_createAllWindows.call(this);
    this._phScanInBattleWindow = null;
    this._phScanActive = false;
    this._phScanInputBlocked = false;
  };

  Scene_Battle.prototype.showScanInBattleStatus = function(scanData) {
    if (this._phScanActive) return;
    this._phScanActive = true;

    var win;
    try {
      win = new Window_InBattleStatus();
    } catch(e) {
      console.error("PH Scan: failed to construct Window_InBattleStatus:", e);
      this._phScanActive = false;
      return;
    }

    var pseudo = makePseudoActor(scanData || {});
    try {
      if (typeof win.setBattlers === 'function') {
        win.setBattlers([pseudo]);
      } else if (typeof win.setBattler === 'function') {
        // some versions use setBattler for a single battler
        win.setBattler(pseudo);
      } else {
        win._data = [pseudo];
      }
    } catch(e) {
      win._data = [pseudo];
    }

    var w = (typeof win.windowWidth === 'function') ? win.windowWidth() : (win.width || Graphics.boxWidth);
    var h = (typeof win.windowHeight === 'function') ? win.windowHeight() : (win.height || Math.floor(Graphics.boxHeight / 3));
    win.x = Math.max(0, Math.floor((Graphics.boxWidth - w) / 2));
    win.y = Math.max(0, Math.floor((Graphics.boxHeight - h) / 2));

    this.addWindow(win);
    this._phScanInBattleWindow = win;
    this._phScanInputBlocked = true;

    if (typeof SoundManager.playOk === 'function') SoundManager.playOk();
  };

  Scene_Battle.prototype.closeScanInBattleStatus = function() {
    if (!this._phScanInBattleWindow) return;
    try {
      this.removeChild(this._phScanInBattleWindow);
    } catch(e){}
    this._phScanInBattleWindow = null;
    this._phScanActive = false;
    this._phScanInputBlocked = false;
  };

  var _ph_scan_scene_battle_update = Scene_Battle.prototype.update;
  Scene_Battle.prototype.update = function() {
    _ph_scan_scene_battle_update.call(this);
    if (this._phScanActive && this._phScanInBattleWindow) {
      if (Input.isTriggered('ok') || TouchInput.isTriggered()) {
        if (typeof SoundManager.playOk === 'function') SoundManager.playOk();
        this.closeScanInBattleStatus();
      }
      if (this._phScanInputBlocked) {
        return;
      }
    }
  };

  /* -------------------------
   * BattleManager hook: existing queued flow
   * ------------------------- */

  var _ph_scan_endAction = BattleManager.endAction;
  BattleManager.endAction = function() {
    _ph_scan_endAction.call(this);
    if ($gameTemp && $gameTemp._ph_scanPending) {
      $gameTemp._ph_scanPending = false;
      var scanData = $gameTemp._ph_scanData || null;
      var scene = SceneManager._scene;
      if (scene && scene instanceof Scene_Battle) {
        try {
          scene.showScanInBattleStatus(scanData);
        } catch(e) {
          SceneManager.push(Scene_Scan);
        }
      } else {
        SceneManager.push(Scene_Scan);
      }
    }
  };

  /* -------------------------
   * Fallback Scene_Scan (minimal)
   * ------------------------- */

  if (typeof Scene_Scan === 'undefined') {
    function Scene_Scan() { this.initialize.apply(this, arguments); }
    Scene_Scan.prototype = Object.create(Scene_Base.prototype);
    Scene_Scan.prototype.constructor = Scene_Scan;
    Scene_Scan.prototype.initialize = function(){ Scene_Base.prototype.initialize.call(this); };
    Scene_Scan.prototype.create = function(){
      Scene_Base.prototype.create.call(this);
      this._data = $gameTemp._ph_scanData || {};
      this.createBackground();
      this.createWindowLayer();
      this._info = new Window_Base(20, 20, Graphics.boxWidth - 40, Graphics.boxHeight - 120);
      this.addWindow(this._info);
      this._info.drawText("Scan fallback: " + (this._data.name || "Unknown"), 0, 0, this._info.contentsWidth(), 'left');
    };
    Scene_Scan.prototype.createBackground = function(){
      var bmp = new Bitmap(Graphics.width, Graphics.height);
      bmp.fillAll('rgba(0,0,0,0.6)');
      this._bg = new Sprite(bmp);
      this.addChild(this._bg);
    };
    Scene_Scan.prototype.update = function(){
      Scene_Base.prototype.update.call(this);
      if (Input.isTriggered('ok') || TouchInput.isTriggered()) SceneManager.pop();
    };
  }

  /* -------------------------
   * Robust Scan wrapper for Game_Action.apply
   * - Ensures Scan skills are handled even if other plugins overwrite apply.
   * - Detects <Scan> tag or item.meta.Scan.
   * - Shows overlay immediately when possible; otherwise queues data in $gameTemp.
   * ------------------------- */

  if (!window._ph_scan_wrapper_installed) {
    window._ph_scan_wrapper_installed = true;

    var _orig_apply = Game_Action.prototype.apply;
    Game_Action.prototype.apply = function(target) {
      try {
        var itemObj = this.item && this.item();
        var note = itemObj && (itemObj.note || "");
        var isScan = itemObj && (/<\s*scan\s*>/i.test(note) || (itemObj.meta && (itemObj.meta.Scan || itemObj.meta.scan)));
        if (isScan && target && target.isEnemy && target.isEnemy()) {
          // Build scan data using existing builder if available
          var scanData = null;
          if (typeof buildScanData === 'function') {
            try { scanData = buildScanData(target); } catch(e) { scanData = null; }
          }
          if (!scanData) {
            scanData = {
              name: target.name || 'Enemy',
              hp: { current: target.hp, max: target.mhp },
              mp: (target.mp !== undefined) ? { current: target.mp, max: target.mmp } : undefined,
              params: {
                atk: target.param ? target.param(2) : (target.atk || 0),
                def: target.param ? target.param(3) : (target.def || 0),
                mat: target.param ? target.param(4) : (target.mat || 0),
                mdf: target.param ? target.param(5) : (target.mdf || 0),
                agi: target.param ? target.param(6) : (target.agi || 0),
                luk: target.param ? target.param(7) : (target.luk || 0)
              },
              states: (target.states && target.states().map(function(s){ return { id: s.id, name: s.name, iconIndex: s.iconIndex }; })) || [],
              actions: (function(){
                var list = [];
                if (target.actions && Array.isArray(target.actions)) {
                  list = target.actions.map(function(a){
                    var skill = a && a.skillId ? $dataSkills && $dataSkills[a.skillId] : null;
                    return { skillId: a.skillId, name: skill ? skill.name : ('Skill ' + a.skillId), rating: a.rating };
                  });
                } else if (target.enemy && target.enemy && typeof target.enemy === 'function') {
                  var edb = target.enemy();
                  if (edb && edb.actions) {
                    list = edb.actions.map(function(a){
                      var skill = a && a.skillId ? $dataSkills && $dataSkills[a.skillId] : null;
                      return { skillId: a.skillId, name: skill ? skill.name : ('Skill ' + a.skillId), rating: a.rating };
                    });
                  }
                }
                return list;
              })()
            };
          }

          // If in battle and overlay available, show immediately
          var scene = SceneManager._scene;
          if (scene && scene instanceof Scene_Battle && window.Window_InBattleStatus && typeof scene.showScanInBattleStatus === 'function') {
            try {
              scene.showScanInBattleStatus(scanData);
              if ($gameTemp) { $gameTemp._ph_scanPending = false; $gameTemp._ph_scanData = null; }
              return; // informational only; do not call original apply
            } catch(e) {
              // fallback to queueing
              if ($gameTemp) { $gameTemp._ph_scanData = scanData; $gameTemp._ph_scanPending = true; }
              return;
            }
          }

          // Fallback: queue for endAction flow
          if ($gameTemp) { $gameTemp._ph_scanData = scanData; $gameTemp._ph_scanPending = true; }
          return;
        }
      } catch(err) {
        // If wrapper fails, fall back to original apply
        try { return _orig_apply.call(this, target); } catch(e){ console.error("PH Scan wrapper fallback error:", e); return; }
      }
      // Non-scan skills: preserve existing behavior
      return _orig_apply.call(this, target);
    };
  }

})();
