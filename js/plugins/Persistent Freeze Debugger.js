/*:
 * @plugindesc Persistent Freeze Debugger — writes ring buffer and freeze snapshots to disk. (MV/NW.js)
 * @author Copilot
 * @help
 * Install and enable. Log file: <game folder>/freeze_debug_log.json
 * Options: AUTO_RELOAD (true/false) and RELOAD_AFTER_MS (ms).
 */

(function() {
  'use strict';

  // --- Configuration ---
  var LOG_FILENAME = 'freeze_debug_log.json'; // placed in project root
  var RING_SIZE = 240;            // number of recent snapshots to keep
  var FRAME_TIMEOUT_MS = 400;     // consider freeze if no frame for this long
  var SNAPSHOT_ON_FREEZE = 8;     // how many immediate snapshots to capture on freeze
  var LONG_CALL_MS = 80;          // log calls longer than this (ms)
  var AUTO_RELOAD = false;        // set true to force reload after long freeze
  var RELOAD_AFTER_MS = 15000;    // if AUTO_RELOAD true, reload after this many ms of freeze

  // --- Node FS setup (NW.js) ---
  var fs = null;
  var path = null;
  try {
    fs = require('fs');
    path = require('path');
  } catch (e) {
    console.warn('FreezeDebug: Node fs/path not available. Plugin requires NW.js (desktop) environment.');
    return;
  }
  var logPath = path.join(process.cwd(), LOG_FILENAME);

  // --- Internal storage ---
  var debug = {
    ring: new Array(RING_SIZE),
    ringIndex: 0,
    lastFrameTime: performance.now(),
    freezeEvents: [],
    enabled: true,
    freezeStartTime: null,
    lastFreezeWrite: 0
  };

  // Helper: safe write append (writes JSON array entries)
  function appendLog(entry) {
    try {
      var text = JSON.stringify(entry, null, 2) + '\n';
      fs.appendFileSync(logPath, text, { encoding: 'utf8' });
    } catch (err) {
      // best effort only
      console.error('FreezeDebug: failed to write log:', err && err.message);
    }
  }

  // Write header on plugin start
  try {
    var header = { time: (new Date()).toISOString(), note: 'Freeze debug log start' };
    fs.appendFileSync(logPath, JSON.stringify(header, null, 2) + '\n', { encoding: 'utf8' });
  } catch (e) {
    console.warn('FreezeDebug: cannot write header to log file', e && e.message);
  }

  // Capture snapshot: stack + minimal game state
  function captureSnapshot(tag) {
    var now = performance.now();
    var stack = (new Error()).stack;
    var scene = SceneManager._scene ? SceneManager._scene.constructor.name : null;
    var party = null, troop = null;
    try {
      if ($gameParty) {
        party = $gameParty.members().map(function(a){ return {id:a.actorId(), hp:a.hp, mp:a.mp, states:a.states().map(s=>s.id)}; });
      }
      if ($gameTroop) {
        troop = $gameTroop.aliveMembers().map(function(e){ return {id:e.enemyId(), hp:e.hp, states:e.states().map(s=>s.id)}; });
      }
    } catch (e) {
      // ignore if game objects not ready
    }
    var entry = { t: Date.now(), perf: now, tag: tag, scene: scene, stack: stack, party: party, troop: troop };
    debug.ring[debug.ringIndex] = entry;
    debug.ringIndex = (debug.ringIndex + 1) % RING_SIZE;
    return entry;
  }

  // Frame capture loop (requestAnimationFrame)
  (function frameCapture(){
    if (!debug.enabled) return;
    captureSnapshot('frame');
    debug.lastFrameTime = performance.now();
    requestAnimationFrame(frameCapture);
  })();

  // Heartbeat monitor: detect stalls
  debug.heartbeat = setInterval(function(){
    var now = performance.now();
    var dt = now - debug.lastFrameTime;
    if (dt > FRAME_TIMEOUT_MS) {
      // freeze detected
      var ev = { detectedAt: Date.now(), dt: Math.round(dt), snapshots: [] };
      for (var i=0;i<SNAPSHOT_ON_FREEZE;i++) ev.snapshots.push(captureSnapshot('freeze-'+i));
      debug.freezeEvents.push(ev);
      // write freeze event to disk immediately
      try {
        appendLog({ type: 'freeze', time: (new Date()).toISOString(), dt: Math.round(dt), snapshots: ev.snapshots });
      } catch (e) { /* best effort */ }
      console.warn('FreezeDebug: freeze detected dt=' + Math.round(dt) + 'ms; wrote to', logPath);
      // mark freeze start
      if (!debug.freezeStartTime) debug.freezeStartTime = Date.now();
      // optionally auto reload after long freeze
      if (AUTO_RELOAD) {
        var elapsed = Date.now() - debug.freezeStartTime;
        if (elapsed > RELOAD_AFTER_MS) {
          try {
            appendLog({ type: 'autoReload', time: (new Date()).toISOString(), elapsed: elapsed });
          } catch (e) {}
          console.warn('FreezeDebug: auto reload triggered after', elapsed, 'ms');
          // force reload (NW.js)
          try {
            location.reload();
          } catch (e) {
            // fallback: process exit
            try { process.exit(1); } catch (e2) {}
          }
        }
      }
    } else {
      // clear freeze start if frames resumed
      debug.freezeStartTime = null;
    }
  }, Math.max(100, Math.floor(FRAME_TIMEOUT_MS/2)));

  // Long-call wrapper helper
  function wrapLongCall(obj, name) {
    if (!obj || !obj[name]) return;
    var orig = obj[name];
    obj[name] = function() {
      var t0 = performance.now();
      try { return orig.apply(this, arguments); }
      finally {
        var dt = performance.now() - t0;
        if (dt > LONG_CALL_MS) {
          var snap = captureSnapshot(name + ' long:' + Math.round(dt));
          var logEntry = { type: 'longcall', name: name, durationMs: Math.round(dt), time: (new Date()).toISOString(), snapshot: snap };
          appendLog(logEntry);
          console.warn('FreezeDebug: long call', name, 'took', Math.round(dt), 'ms; logged to disk');
        }
      }
    };
  }

  // Wrap common suspects
  wrapLongCall(Game_Troop && Game_Troop.prototype, 'setup');
  wrapLongCall(Game_Enemy && Game_Enemy.prototype, 'setup');
  wrapLongCall(Scene_Battle && Scene_Battle.prototype, 'start');
  wrapLongCall(Scene_Battle && Scene_Battle.prototype, 'createAllWindows');
  wrapLongCall(Game_Interpreter && Game_Interpreter.prototype, 'executeCommand');
  wrapLongCall(Game_Interpreter && Game_Interpreter.prototype, 'update');

  // Expose a manual dump function to write the current ring buffer to disk
  window.__freezeDebugDumpToDisk = function() {
    try {
      var dump = { time: (new Date()).toISOString(), ring: [] };
      var idx = debug.ringIndex;
      for (var i=0;i<RING_SIZE;i++) {
        idx = (idx - 1 + RING_SIZE) % RING_SIZE;
        var e = debug.ring[idx];
        if (e) dump.ring.push(e);
      }
      appendLog({ type: 'manualDump', time: dump.time, ringCount: dump.ring.length, ring: dump.ring });
      console.log('FreezeDebug: manual dump written to', logPath);
    } catch (e) {
      console.error('FreezeDebug: manual dump failed', e && e.message);
    }
  };

  // Expose a small status helper
  window.__freezeDebugStatus = function() {
    return { lastFrameTime: debug.lastFrameTime, ringIndex: debug.ringIndex, freezeEvents: debug.freezeEvents.length, logPath: logPath };
  };

  console.log('FreezeDebug plugin active. Log file:', logPath);
  console.log('Call __freezeDebugDumpToDisk() to force a dump, and __freezeDebugStatus() for status.');
})();
