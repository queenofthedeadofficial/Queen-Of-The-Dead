/*:
 * @plugindesc PH Warehouse Safe Auto Sorter — robust rule-fit then alphabetical sorting, non-destructive, debugable. Load after PH plugins.
 * @author Copilot (patched final)
 * @help
 * - Sorts by rule-fit (optional comparator) then alphabetically.
 * - Temporarily swaps window._data during refresh so PH's native drawItem runs unchanged.
 * - Resolves wrapper -> DB entry before verify/name comparisons.
 * - Rebuilds map deterministically before refresh and after deposit/withdraw.
 * - Small debug output available via PHW_SafeAuto_Debug = true.
 * - Restore with PHW_SafeAuto_restore().
 */
(function(){
  'use strict';
  var PL = 'PHW_SafeAutoSorter_Final';
  window.PHW_SafeAuto_Debug = window.PHW_SafeAuto_Debug || false;

  /* ---------- helpers ---------- */
  function resolveEntry(e){ return e && (e.item||e.object||e._item) || e; }
  function nameKey(obj){
    try {
      if(!obj) return '';
      var raw = (obj.name || obj.itemName || obj.ename || '').toString().trim();
      // safe regex replacement using RegExp constructors (avoids literal /.../ parsing issues)
      raw = raw.replace(new RegExp('\\x1b\

\[\\d+m', 'g'), '');
      raw = raw.replace(new RegExp('\\\\c\

\[\\d+\\]

', 'g'), '');
      raw = raw.trim();
      if(!raw && (obj.id||obj.itemId||obj._id)) raw = String(obj.id||obj.itemId||obj._id);
      return raw.toUpperCase();
    } catch(e){ return ''; }
  }



  /* ---------- display list builder (rule-fit then alpha) ---------- */
  function buildDisplayList(win){
    var data = Array.isArray(win._data) ? win._data : [];
    var ph = window.PHPlugins && PHPlugins.PHWarehouse;
    var valid = [], invalid = [];
    for(var i=0;i<data.length;i++){
      var wrapper = data[i];
      var db = resolveEntry(wrapper);
      var ok = false;
      try { if(ph && typeof ph.verifyItem === 'function') ok = !!ph.verifyItem(db); } catch(e){ ok = false; }
      if(ok) valid.push(i); else invalid.push(i);
    }

    var ruleCmp = window.PHW_SortRuleComparator;
    var cmp = function(ai,bi){
      var A = resolveEntry(data[ai]), B = resolveEntry(data[bi]);
      try {
        if(typeof ruleCmp === 'function'){
          var r = ruleCmp(A,B);
          if(typeof r === 'number' && r !== 0) return r;
        }
      } catch(e){ if(window.PHW_SafeAuto_Debug) console.warn(PL+': rule comparator threw', e); }
      var na = nameKey(A), nb = nameKey(B);
      if(na === nb) return ai - bi;
      return na.localeCompare(nb);
    };

    valid.sort(cmp);
    invalid.sort(cmp);
    var map = valid.concat(invalid);
    for(var k=0;k<data.length;k++) if(map.indexOf(k) === -1) map.push(k);
    return map;
  }

  /* ---------- DB name map (optional) ---------- */
  var __phw_dbNameMap = null;
  function buildDbNameMap(){
    __phw_dbNameMap = {};
    function add(list){
      if(!Array.isArray(list)) return;
      for(var i=1;i<list.length;i++){
        var it = list[i];
        if(!it) continue;
        var key = nameKey(it);
        __phw_dbNameMap[key] = __phw_dbNameMap[key] || [];
        __phw_dbNameMap[key].push({ id: i, obj: it });
      }
    }
    try { add($dataItems); add($dataWeapons); add($dataArmors); } catch(e){ __phw_dbNameMap = __phw_dbNameMap || {}; }
  }
  if(!__phw_dbNameMap) buildDbNameMap();
  function matchDbByName(key, preferredId){
    var list = __phw_dbNameMap && __phw_dbNameMap[key];
    if(!list || !list.length) return null;
    if(preferredId != null){
      for(var i=0;i<list.length;i++) if(list[i].id === preferredId) return list[i].obj;
    }
    return list[0].obj;
  }

  /* ---------- install on a Warehouse window ---------- */
  function installOnWindow(win){
    try {
      if(!win || !win.constructor) return false;
      var cname = String(win.constructor.name || '');
      if(cname.indexOf('WarehouseItemList') === -1) return false;
      if(win.__phw_installed) return false;

      // backup originals
      win.__phw_orig = win.__phw_orig || {
        refresh: win.refresh,
        loadItems: win.loadItems,
        processOk: win.processOk,
        item: win.item
      };

      // map cache
      win.__phw_map = win.__phw_map || null;
      win.__phw_map_ts = win.__phw_map_ts || 0;
      win.__phw_map_ttl = win.__phw_map_ttl || 120;
      win.__phw_rebuild = function(){ try { this.__phw_map = buildDisplayList(this); this.__phw_map_ts = Date.now(); } catch(e){ this.__phw_map = null; this.__phw_map_ts = Date.now(); } };

      // wrap loadItems to rebuild map and refresh
      if(typeof win.loadItems === 'function' && !win.__phw_load_wrapped){
        win.__phw_load_wrapped = true;
        win.loadItems = function(){
          var res = win.__phw_orig.loadItems.apply(this, arguments);
          try { this.__phw_rebuild(); } catch(e){}
          try { if(typeof this.refresh === 'function') this.refresh(); } catch(e){}
          return res;
        };
      }

      // item(displayIndex) returns mapped wrapper object
      win.item = function(displayIndex){
        try {
          if(!this.__phw_map || (Date.now() - (this.__phw_map_ts||0)) > this.__phw_map_ttl) this.__phw_rebuild();
          var map = this.__phw_map || [];
          var dataIndex = (displayIndex >= 0 && displayIndex < map.length) ? map[displayIndex] : displayIndex;
          return Array.isArray(this._data) ? this._data[dataIndex] : null;
        } catch(e){ return Array.isArray(this._data) ? this._data[displayIndex] : null; }
      };

      // processOk remap: temporary _data swap so original handlers index correctly
      if(typeof win.processOk === 'function' && !win.__phw_processOk_wrapped){
        win.__phw_processOk_wrapped = true;
        win.processOk = function(){
          try {
            if(!this.__phw_map || !Array.isArray(this.__phw_map)) this.__phw_rebuild();
            var map = this.__phw_map || [];
            var n = Math.max((this._data && this._data.length) || 0, map.length || 0);
            var temp = new Array(n);
            for(var i=0;i<n;i++){
              var di = (map && map[i] !== undefined) ? map[i] : i;
              temp[i] = (Array.isArray(this._data) && this._data[di] !== undefined) ? this._data[di] : null;
            }
            var orig = this._data;
            try {
              this._data = temp;
              return win.__phw_orig.processOk.apply(this, arguments);
            } finally {
              this._data = orig;
            }
          } catch(e){
            try { return win.__phw_orig.processOk.apply(this, arguments); } catch(err){ if(window.PHW_SafeAuto_Debug) console.warn(PL+': processOk fallback failed', err); }
          }
        };
      }

      // refresh wrapper: build sorted DB-backed _data according to map, swap, call original refresh, restore
      win.refresh = function(){
        try {
          // rebuild map deterministically before refresh
          this.__phw_rebuild();
          var map = Array.isArray(this.__phw_map) ? this.__phw_map : null;
          if(!map || !Array.isArray(this._data) || map.length === 0) return win.__phw_orig.refresh.apply(this, arguments);

          if(!__phw_dbNameMap) buildDbNameMap();

          var orig = this._data;
          var preferredIds = [];
          for(var i=0;i<map.length;i++){
            var di = map[i];
            var raw = orig[di];
            var resolved = resolveEntry(raw);
            var id = resolved && (resolved.id || resolved.itemId || resolved._id);
            preferredIds.push(id != null ? id : null);
          }

          var sorted = [];
          for(var i=0;i<map.length;i++){
            var di = map[i];
            var raw = orig[di];
            var visibleKey = nameKey(resolveEntry(raw));
            var dbObj = matchDbByName(visibleKey, preferredIds[i]);
            if(dbObj){
              if(raw && raw.item) sorted.push({ item: dbObj });
              else sorted.push(dbObj);
            } else {
              sorted.push(raw);
            }
          }
          if(orig.length > map.length){
            for(var j=map.length;j<orig.length;j++) sorted.push(orig[j]);
          }

          try {
            this._data = sorted;
            return win.__phw_orig.refresh.apply(this, arguments);
          } finally {
            this._data = orig;
          }
        } catch(e){
          if(window.PHW_SafeAuto_Debug) console.warn(PL+': refresh wrapper error', e);
          try { return win.__phw_orig.refresh.apply(this, arguments); } catch(err){ if(window.PHW_SafeAuto_Debug) console.warn(PL+': refresh fallback failed', err); }
        }
      };

      // diagnostic helper
      win.__phw_dump_map = function(limit){
        try {
          var map = this.__phw_map || [];
          var out = [];
          for(var i=0;i<Math.min(limit||20, map.length); i++){
            var di = map[i];
            var raw = this._data && this._data[di];
            var resolved = resolveEntry(raw);
            out.push({ displayIndex: i, dataIndex: di, visible: nameKey(resolveEntry(raw)), dbId: (resolved && (resolved.id||resolved.itemId||resolved._id)) || null, verify: (window.PHPlugins && PHPlugins.PHWarehouse && typeof PHPlugins.PHWarehouse.verifyItem === 'function') ? !!PHPlugins.PHWarehouse.verifyItem(resolved) : null });
          }
          console.log(PL+': map dump', out);
          return out;
        } catch(e){ console.warn(PL+': dump failed', e); return []; }
      };

      win.__phw_installed = true;
      try { win.__phw_rebuild(); } catch(e){}
      try { if(typeof win.refresh === 'function') win.refresh(); } catch(e){}
      if(window.PHW_SafeAuto_Debug) console.log(PL+': installed on', cname);
      return true;
    } catch(e){
      if(window.PHW_SafeAuto_Debug) console.warn(PL+': installOnWindow failed', e);
      return false;
    }
  }

  function patchAllInstances(){
    var s = SceneManager._scene;
    if(!s || !s._windowLayer || !Array.isArray(s._windowLayer.children)) return 0;
    var count = 0;
    s._windowLayer.children.forEach(function(w){ if(installOnWindow(w)) count++; });
    if(window.PHW_SafeAuto_Debug) console.log(PL+': patched instances', count);
    return count;
  }

/* ---------- defensive deposit normalizer ---------- */
function installDepositNormalizer(){
  var ph = window.PHPlugins && PHPlugins.PHWarehouse;
  if(!ph) return false;
  if(ph.__phw_deposit_norm) return false;
  ph.__phw_deposit_norm = true;
  ph.__phw_deposit_orig = ph.deposit;
  ph.deposit = function(item){
    var res;
    try { res = ph.__phw_deposit_orig.apply(this, arguments); } catch(e){ if(window.PHW_SafeAuto_Debug) console.warn(PL+': original deposit threw', e); res = undefined; }
    try {
      this._warehouses = this._warehouses || {};
      var active = this._lastActive, category = this._lastCategory;
      var inst = this._warehouses && this._warehouses[active];
      if(!inst) return res;
      inst.items = inst.items || {}; inst.qtty = inst.qtty || {};
      inst.items[category] = inst.items[category] || []; inst.qtty[category] = inst.qtty[category] || {};
      var cand = item && (item.item||item.object||item._item) || item;
      var id = cand && (cand.id||cand.itemId||cand._id);
      if(id != null){
        var key = String(id);
        inst.qtty[category][key] = Number(inst.qtty[category][key] || 0);
        if(inst.items[category].indexOf(Number(id)) === -1 && inst.items[category].indexOf(key) === -1){
          var usesNumbers = inst.items[category].some(function(x){ return typeof x === 'number'; });
          inst.items[category].push(usesNumbers ? Number(id) : key);
        }
      }
      var total = 0;
      Object.keys(inst.qtty || {}).forEach(function(c){
        Object.keys(inst.qtty[c]||{}).forEach(function(k){
          total += Number(inst.qtty[c][k]||0);
        });
      });
      inst.currentCapacity = total;
      // force rebuild of maps on all windows so sorting reflects new qtty/items
      try {
        var s = SceneManager._scene;
        if(s && s._windowLayer && Array.isArray(s._windowLayer.children)){
          s._windowLayer.children.forEach(function(w){
            if(w && typeof w.__phw_rebuild === 'function'){
              try { w.__phw_rebuild(); } catch(e){}
            }
            if(w && typeof w.refresh === 'function'){
              try { w.refresh(); } catch(e){}
            }
          });
        }
      } catch(e){}
    } catch(e){ if(window.PHW_SafeAuto_Debug) console.warn(PL+': deposit normalizer error', e); }
    return res;
  };
  if(window.PHW_SafeAuto_Debug) console.log(PL+': deposit normalizer installed');
  return true;
}

function restoreDepositNormalizer(){
  var ph = window.PHPlugins && PHPlugins.PHWarehouse;
  if(ph && ph.__phw_deposit_orig){
    ph.deposit = ph.__phw_deposit_orig;
    delete ph.__phw_deposit_orig;
    delete ph.__phw_deposit_norm;
    if(window.PHW_SafeAuto_Debug) console.log(PL+': deposit normalizer restored');
  }
}

/* ---------- draw number override ---------- */
function installDrawNumberOverride(){
  var s = SceneManager._scene;
  if(!s || !s._windowLayer) return false;
  var win = null;
  for(var i=0;i<s._windowLayer.children.length;i++){
    var candidate = s._windowLayer.children[i];
    if(candidate && String((candidate.constructor && candidate.constructor.name) || '').indexOf('WarehouseItemList') !== -1){
      win = candidate;
      break;
    }
  }
  if(!win) return false;
  var proto = win.constructor && win.constructor.prototype;
  if(!proto || !proto.drawWarehouseItemNumber) return false;
  if(proto.__phw_drawnum) return false;
  proto.__phw_drawnum = true;
  proto.__phw_drawnum_orig = proto.drawWarehouseItemNumber;
  proto.drawWarehouseItemNumber = function(item, x, y, width){
    try {
      var cand = item && (item.item||item.object||item._item) || item;
      var id = cand && (cand.id||cand.itemId||cand._id);
      var ph = window.PHPlugins && PHPlugins.PHWarehouse;
      var value = 0;
      if(ph && ph._warehouses){
        var active = (this._activeName || ph._lastActive);
        var category = (this._categoryName || ph._lastCategory);
        var inst = ph._warehouses[active];
        if(inst && inst.qtty && inst.qtty[category]) value = Number(inst.qtty[category][String(id)] || 0);
      }
      if(typeof this.drawNumber === 'function'){
        try { this.drawNumber(value, x, y, width); return; } catch(e){}
      }
      var text = String(value);
      var tw = this.textWidth ? this.textWidth(text) : (text.length * 8);
      if(typeof this.drawText === 'function') this.drawText(text, x + width - tw, y, tw, 'right');
      return;
    } catch(e){ if(window.PHW_SafeAuto_Debug) console.warn(PL+': drawWarehouseItemNumber override error', e); }
    return proto.__phw_drawnum_orig.apply(this, arguments);
  };
  if(window.PHW_SafeAuto_Debug) console.log(PL+': draw number override installed');
  return true;
}

function restoreDrawNumberOverride(){
  var s = SceneManager._scene;
  if(!s || !s._windowLayer) return;
  var win = null;
  for(var i=0;i<s._windowLayer.children.length;i++){
    var candidate = s._windowLayer.children[i];
    if(candidate && String((candidate.constructor && candidate.constructor.name) || '').indexOf('WarehouseItemList') !== -1){
      win = candidate;
      break;
    }
  }
  if(!win) return;
  var proto = win.constructor && win.constructor.prototype;
  if(proto && proto.__phw_drawnum_orig){
    proto.drawWarehouseItemNumber = proto.__phw_drawnum_orig;
    delete proto.__phw_drawnum_orig;
    delete proto.__phw_drawnum;
    if(window.PHW_SafeAuto_Debug) console.log(PL+': draw number override restored');
  }
}

/* ---------- orchestration ---------- */
var _onSceneCreate = SceneManager.onSceneCreate;
SceneManager.onSceneCreate = function(){
  _onSceneCreate.apply(this, arguments);
  try {
    requestAnimationFrame(function(){
      try { setTimeout(function(){ patchAllInstances(); installDepositNormalizer(); installDrawNumberOverride(); }, 0); } catch(e){}
    });
  } catch(e){ try { setTimeout(function(){ patchAllInstances(); installDepositNormalizer(); installDrawNumberOverride(); }, 0); } catch(e){} }
};

try { setTimeout(function(){ patchAllInstances(); installDepositNormalizer(); installDrawNumberOverride(); }, 0); } catch(e){}

function patchAllInstances(){
  var s = SceneManager._scene;
  if(!s || !s._windowLayer || !Array.isArray(s._windowLayer.children)) return 0;
  var c = 0;
  for(var i=0;i<s._windowLayer.children.length;i++){
    try { if(installOnWindow(s._windowLayer.children[i])) c++; } catch(e){}
  }
  if(window.PHW_SafeAuto_Debug) console.log(PL+': patched', c);
  return c;
}

/* ---------- restore ---------- */
window.PHW_SafeAuto_restore = function(){
  try {
    var s = SceneManager._scene;
    if(s && s._windowLayer && Array.isArray(s._windowLayer.children)){
      s._windowLayer.children.forEach(function(w){
        try {
          if(w && w.__phw_installed){
            if(w.__phw_orig && w.__phw_orig.refresh) w.refresh = w.__phw_orig.refresh;
            if(w.__phw_orig && w.__phw_orig.loadItems) w.loadItems = w.__phw_orig.loadItems;
            if(w.__phw_orig && w.__phw_orig.processOk) w.processOk = w.__phw_orig.processOk;
            if(w.__phw_orig && w.__phw_orig.item) w.item = w.__phw_orig.item;
            delete w.__phw_map; delete w.__phw_map_ts; delete w.__phw_rebuild;
            delete w.__phw_installed; delete w.__phw_orig;
          }
        } catch(e){}
      });
    }
    restoreDepositNormalizer(); restoreDrawNumberOverride();
    console.log(PL+': restored all patches. Reload scene to fully reset.');
  } catch(e){ console.warn(PL+': restore failed', e); }
};

if(window.PHW_SafeAuto_Debug) console.log(PL+': final sorter installed');
})();

  