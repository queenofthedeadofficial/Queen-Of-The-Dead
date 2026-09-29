/*:
 * @plugindesc PH Warehouse MetaRules Companion — ensures meta parsing and enforces meta rules (place below PH_Warehouse) 
 * @author Patch
 * @help
 * Companion plugin that:
 *  - replaces populateRules at runtime to parse "meta: Key: Value" lines while rules are built
 *  - normalizes DB meta values
 *  - resolves UI wrapper objects to DB entries by meta or name
 *  - installs lightweight verify/deposit wrappers if needed
 *
 * Install: put this file after PH_Warehouse in the Plugin Manager and restart the editor/game.
 * No plugin commands.
 */

(function(){
  'use strict';

  // Normalize DB meta values (idempotent)
  function normalizeAllDbMeta(){
    try {
      [$dataItems, $dataWeapons, $dataArmors].forEach(function(db){
        if(!db) return;
        for(var i=1;i<db.length;i++){
          var e = db[i];
          if(!e || !e.meta) continue;
          Object.keys(e.meta).forEach(function(k){ e.meta[k] = String(e.meta[k]).trim(); });
        }
      });
    } catch(e){ console.warn('PH_Warehouse_MetaRules_Companion: normalizeAllDbMeta failed', e); }
  }

  // Resolve UI wrapper -> DB entry by meta or exact name
  function resolveToDbObject(candidate){
    if(!candidate) return null;
    if(candidate.meta && (candidate.id || candidate.name)) return candidate;
    var candMeta = {};
    if(candidate.meta && typeof candidate.meta === 'object'){
      Object.keys(candidate.meta).forEach(function(k){ candMeta[k.toLowerCase()] = String(candidate.meta[k]).trim().toLowerCase(); });
    }
    var candName = candidate.name || candidate.itemName || candidate.ename || candidate.description || '';
    var dbs = [$dataArmors, $dataItems, $dataWeapons];
    for(var d=0; d<dbs.length; d++){
      var db = dbs[d];
      if(!db) continue;
      for(var i=1;i<db.length;i++){
        var entry = db[i];
        if(!entry) continue;
        if(Object.keys(candMeta).length > 0){
          var ok = true;
          Object.keys(candMeta).forEach(function(k){
            var ev = entry.meta && (entry.meta[k] !== undefined ? String(entry.meta[k]).trim().toLowerCase() : undefined);
            if(typeof ev === 'undefined' || ev !== candMeta[k]) ok = false;
          });
          if(ok) return entry;
        }
        if(candName){
          if(entry.name === candName) return entry;
          if(entry.description && entry.description === candName) return entry;
        }
      }
    }
    return null;
  }

  // Replace populateRules at runtime to parse meta: lines correctly
  function installPopulatePatch(ph){
    if(!ph || ph._populatePatched) return false;
    ph._populatePatched = true;

    ph.populateRules = function(warehouseVar){
      var str = '';
      var index = -1;
      for (var i = 0; i < warehouseVar.length; i++) {
        if (warehouseVar[i].parameters[0]) {
          str = warehouseVar[i].parameters[0].trim();
          if (this.checkTitle(str)) {
            str = str.slice(1, str.length - 1);
            this._rules[str] = {
              enabledItems: { item: [], weapon: [], armor: [], keyItem: [] },
              disabledItems: { item: [], weapon: [], armor: [], keyItem: [] },
              _meta: []
            };
            index = str;
          } else if (this._rules[index]) {
            var firstColon = str.indexOf(':');
            if (firstColon === -1) continue;
            var head = str.slice(0, firstColon).trim();
            var tail = str.slice(firstColon + 1).trim();
            var cmd = head;
            var arg = tail;

            if (cmd.toLowerCase() === 'meta') {
              var token = arg;
              if (token) {
                var sep = (token.indexOf(':') > -1) ? ':' : (token.indexOf('=') > -1 ? '=' : null);
                if (sep) {
                  var parts = token.split(sep);
