/*:
 * @plugindesc PH Warehouse Single-Window Strict Filter — filter and hide nonmatching rows (reversible)
 * @author Patch
 * @help
 * - Place after PH_Warehouse and any PH meta-rules plugins.
 * - Filters Window_WarehouseItemList data and prevents drawing/selection of nonmatching items.
 * - API: PH_Warehouse_SingleFilter.realignNow(), .restoreOriginal(), .setDebug(true)
 */

(function(){
  'use strict';
  var PLUGIN = 'PH_Warehouse_SingleFilter';
  var DEBUG = false;
  function log(){ if(DEBUG) console.log.apply(console, arguments); }

  function ph(){ return window.PHPlugins && PHPlugins.PHWarehouse; }
  function phVerify(obj){ try { var p = ph(); return p && typeof p.verifyItem === 'function' ? !!p.verifyItem(obj) : true; } catch(e){ return true; } }

  function resolveCandidate(entry){
    if(!entry) return null;
    return entry.item || entry.object || entry._item || entry;
  }
  function resolveDB(entry){
    var cand = resolveCandidate(entry);
    if(!cand) return null;
    var id = cand.id || cand.itemId || cand._id;
    if(id != null) return ($dataItems && $dataItems[id]) || ($dataWeapons && $dataWeapons[id]) || ($dataArmors && $dataArmors[id]) || cand;
    return cand;
  }

  // Wait for Window_WarehouseItemList to exist
  var tries = 0, max = 240;
  var id = setInterval(function(){
    tries++;
    if(typeof Window_WarehouseItemList !== 'undefined'){
      clearInterval(id);
      try { install(); } catch(e){ console.warn(PLUGIN + ': install error', e); }
    } else if(tries >= max) clearInterval(id);
  }, 120);

  function install(){
    var W = Window_WarehouseItemList && Window_WarehouseItemList.prototype;
    if(!W) return console.warn(PLUGIN + ': Window_WarehouseItemList not found');

    if(W._ph_singlefilter_installed) return console.log(PLUGIN + ': already installed');

    // backup originals
    W._ph_orig_setData = W._ph_orig_setData || W.setData;
    W._ph_orig_makeItemList = W._ph_orig_makeItemList || W.makeItemList;
    W._ph_orig_item = W._ph_orig_item || W.item;
    W._ph_orig_drawItem = W._ph_orig_drawItem || W.drawItem;
    W._ph_orig_maxItems = W._ph_orig_maxItems || W.maxItems;
    W._ph_orig_refresh = W._ph_orig_refresh || W.refresh;

    // filter helper
    function filterArray(arr){
      try {
        var p = ph();
        if(!p || typeof p.verifyItem !== 'function') return arr;
        var out = [];
        for(var i=0;i<arr.length;i++){
          var entry = arr[i];
          var db = resolveDB(entry) || entry;
          if(phVerify(db)) out.push(entry);
        }
        return out;
      } catch(e){ return arr; }
    }

    // wrap setData (some variants call setData with an array)
    if(typeof W.setData === 'function'){
      W.setData = function(){
        try {
          if(arguments && arguments.length>0 && Array.isArray(arguments[0])){
            arguments[0] = filterArray(arguments[0]);
          }
        } catch(e){ log(PLUGIN + ': setData wrapper error', e); }
        return W._ph_orig_setData.apply(this, arguments);
      };
    }

    // wrap makeItemList: call original then ensure _data is filtered and parallel arrays realigned
    W.makeItemList = function(){
      W._ph_orig_makeItemList.apply(this, arguments);
      try {
        var p = ph();
        if(!p || typeof p.verifyItem !== 'function') return;
        // backup original _data once
        if(!this._ph_singlefilter_backup) this._ph_singlefilter_backup = { _data: (this._data||[]).slice(0), _amounts: Array.isArray(this._amounts) ? this._amounts.slice(0) : null, _itemAmounts: Array.isArray(this._itemAmounts) ? this._itemAmounts.slice(0) : null };
        var orig = this._ph_singlefilter_backup._data.slice(0);
        var kept = [], keptAmounts = [], keptItemAmounts = [];
        for(var i=0;i<orig.length;i++){
          var entry = orig[i];
          var db = resolveDB(entry) || entry;
          if(phVerify(db)){
            kept.push(entry);
            if(Array.isArray(this._amounts)) keptAmounts.push(this._amounts && this._amounts[i]);
            if(Array.isArray(this._itemAmounts)) keptItemAmounts.push(this._itemAmounts && this._itemAmounts[i]);
          }
        }
        if(kept.length === 0){
          this._data = [];
          if(Array.isArray(this._amounts)) this._amounts = [];
          if(Array.isArray(this._itemAmounts)) this._itemAmounts = [];
        } else {
          this._data = kept;
          if(Array.isArray(this._amounts)) this._amounts = keptAmounts;
          if(Array.isArray(this._itemAmounts)) this._itemAmounts = keptItemAmounts;
        }
      } catch(e){ log(PLUGIN + ': makeItemList filter error', e); }
    };

    // item(index): return DB object only if verified
    W.item = function(index){
      try {
        var entry = (this._data || [])[index];
        if(!entry) return null;
        var db = resolveDB(entry) || entry;
        if(!phVerify(db)) return null;
        return db;
      } catch(e){ return null; }
    };

    // drawItem: skip drawing invalid rows
    W.drawItem = function(index){
      try {
        var entry = (this._data || [])[index];
        if(!entry) return;
        var db = resolveDB(entry) || entry;
        if(!phVerify(db)) return;
      } catch(e){}
      return W._ph_orig_drawItem.apply(this, arguments);
    };

    // maxItems: reflect filtered _data length
    W.maxItems = function(){
      try { if(Array.isArray(this._data)) return this._data.length; } catch(e){}
      return W._ph_orig_maxItems.apply(this, arguments);
    };

    // refresh: clear contents and call original refresh to redraw from filtered data
    W.refresh = function(){
      try {
        if(this.contents && typeof this.contents.clear === 'function') this.contents.clear();
        if(typeof this.createContents === 'function') this.createContents();
      } catch(e){}
      try { W._ph_orig_refresh.apply(this, arguments); } catch(e){}
      try { if((!this._data || this._data.length === 0) && typeof this.select === 'function') this.select(0); } catch(e){}
    };

    W._ph_singlefilter_installed = true;
    console.log(PLUGIN + ': installed. Window_WarehouseItemList will only show PH-verified items.');

    // Public API
    window.PH_Warehouse_SingleFilter = {
      setDebug: function(v){ DEBUG = !!v; console.log(PLUGIN + ': DEBUG =', DEBUG); },
      realignNow: function(){
        try {
          var s = SceneManager._scene;
          if(!s || !s._windowLayer || !Array.isArray(s._windowLayer.children)) return console.log(PLUGIN + ': no active scene');
          s._windowLayer.children.forEach(function(c){
            try {
              if(c && c.constructor && c.constructor.name === 'Window_WarehouseItemList'){
                if(typeof c.makeItemList === 'function') c.makeItemList();
                if(typeof c.refresh === 'function') c.refresh();
              }
            } catch(e){}
          });
          console.log(PLUGIN + ': realign attempted.');
        } catch(e){ console.warn(PLUGIN + ': realignNow error', e); }
      },
      restoreOriginal: function(){
        try {
          var P = Window_WarehouseItemList.prototype;
          if(P._ph_orig_setData) P.setData = P._ph_orig_setData;
          if(P._ph_orig_makeItemList) P.makeItemList = P._ph_orig_makeItemList;
          if(P._ph_orig_item) P.item = P._ph_orig_item;
          if(P._ph_orig_drawItem) P.drawItem = P._ph_orig_drawItem;
          if(P._ph_orig_maxItems) P.maxItems = P._ph_orig_maxItems;
          if(P._ph_orig_refresh) P.refresh = P._ph_orig_refresh;
          delete P._ph_orig_setData;
          delete P._ph_orig_makeItemList;
          delete P._ph_orig_item;
          delete P._ph_orig_drawItem;
          delete P._ph_orig_maxItems;
          delete P._ph_orig_refresh;
          delete P._ph_singlefilter_installed;
          console.log(PLUGIN + ': restored prototype methods. Reload scene to fully restore instances.');
        } catch(e){ console.warn(PLUGIN + ': restoreOriginal error', e); }
      }
    };
  } // end install
})();
