/*:
 * @plugindesc Throttled debug helper for Custom Apply Effect and state application
 * @help
 * Controls:
 *  - LOG_EVERY_N: log once every N actions (set to 1 to log every action)
 *  - LOG_THROTTLE_MS: minimum ms between logs (0 to disable time throttle)
 *
 * Install and enable near the top of the plugin list.
 */
(function() {
  'use strict';

  // ====== CONFIGURE ======
  const LOG_EVERY_N = 10;       // Log once every N actions (sampling)
  const LOG_THROTTLE_MS = 1000; // Minimum ms between logs (time throttle)
  // =======================

  let _actionCounter = 0;
  let _lastLogTime = 0;

  function shouldLog() {
    _actionCounter++;
    if (LOG_EVERY_N > 1 && (_actionCounter % LOG_EVERY_N) !== 0) return false;
    if (LOG_THROTTLE_MS > 0) {
      const now = Date.now();
      if (now - _lastLogTime < LOG_THROTTLE_MS) return false;
      _lastLogTime = now;
    }
    return true;
  }

  // Safe wrapper for console.log to avoid errors in odd environments
  function safeLog() {
    try {
      if (typeof console !== 'undefined' && console.log) {
        console.log.apply(console, arguments);
      }
    } catch (e) {}
  }

  // Hook Game_Action.start to occasionally print the note snippet
  const _Game_Action_start = Game_Action.prototype.start;
  Game_Action.prototype.start = function(subject, item) {
    _Game_Action_start.call(this, subject, item);
    try {
      if (!shouldLog()) return;
      if (item && item.note) {
        safeLog('[DBG THROTTLED] Action start item note snippet', (item.note || '').slice(0, 400));
      } else {
        safeLog('[DBG THROTTLED] Action start no note or item');
      }
    } catch (e) {
      safeLog('[DBG THROTTLED] Action start error', e && e.message);
    }
  };

  // Hook Game_Action.apply to occasionally log action context and result
  const _Game_Action_apply = Game_Action.prototype.apply;
  Game_Action.prototype.apply = function(target) {
    try {
      if (shouldLog()) {
        const subject = this.subject ? this.subject() : null;
        const item = this.item ? this.item() : null;
        const id = item && item.id ? item.id : 'unknown';
        const type = item ? (DataManager.isSkill(item) ? 'Skill' : (DataManager.isWeapon(item) ? 'Weapon' : 'Item')) : 'Unknown';
        safeLog('[DBG THROTTLED] Action Apply start', type, id, 'subject', subject ? subject.name() : 'none', 'target', target ? target.name() : 'none');
      }
    } catch (e) {
      safeLog('[DBG THROTTLED] Action Apply start inner error', e && e.message);
    }

    // Call original apply (do not wrap in heavy logging)
    _Game_Action_apply.call(this, target);

    try {
      if (shouldLog()) {
        const res = (target && target.result) ? target.result() : (this._result || null);
        const hp = res && typeof res.hpDamage === 'number' ? res.hpDamage : 'n/a';
        safeLog('[DBG THROTTLED] Action Apply end', 'target', target ? target.name() : 'none', 'hpDamage', hp);
      }
    } catch (e) {
      safeLog('[DBG THROTTLED] Action Apply end inner error', e && e.message);
    }
  };

  // Hook addState with throttled logging
  const _Game_Battler_addState = Game_Battler.prototype.addState;
  Game_Battler.prototype.addState = function(stateId) {
    try {
      if (shouldLog()) {
        safeLog('[DBG THROTTLED] addState called', stateId, 'on', this && this.name ? this.name() : 'unknown', 'alreadyAffected', this.isStateAffected ? this.isStateAffected(stateId) : 'n/a');
      }
    } catch (e) {
      safeLog('[DBG THROTTLED] addState log error', e && e.message);
    }
    return _Game_Battler_addState.call(this, stateId);
  };

  // Hook isStateAffected with minimal logging
  const _Game_Battler_isStateAffected = Game_Battler.prototype.isStateAffected;
  Game_Battler.prototype.isStateAffected = function(stateId) {
    const res = _Game_Battler_isStateAffected.call(this, stateId);
    try {
      if (shouldLog()) {
        safeLog('[DBG THROTTLED] isStateAffected check', stateId, 'on', this && this.name ? this.name() : 'unknown', '=>', res);
      }
    } catch (e) {
      safeLog('[DBG THROTTLED] isStateAffected error', e && e.message);
    }
    return res;
  };

  safeLog('[DBG THROTTLED] Debug plugin initialized with LOG_EVERY_N=' + LOG_EVERY_N + ' LOG_THROTTLE_MS=' + LOG_THROTTLE_MS);
})();
