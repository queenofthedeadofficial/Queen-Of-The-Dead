(function(){
  var mgr = PHPlugins && PHPlugins.PHWarehouse;
  if (!mgr) { console.error("PH_Warehouse manager not found."); return; }
  var active = mgr._lastActive;
  var wh = mgr._warehouses && mgr._warehouses[active];
  if (!wh) { console.error("Active warehouse not found:", active); return; }

  function dbFor(cat, id) {
    if (cat === 'weapon') return $dataWeapons[id] || null;
    if (cat === 'armor')  return $dataArmors[id]  || null;
    return $dataItems[id] || null;
  }

  function cmpIds(cat) {
    return function(a,b){
      var A = dbFor(cat, a), B = dbFor(cat, b);
      var na = A && A.name ? String(A.name) : '';
      var nb = B && B.name ? String(B.name) : '';
      var c = na.localeCompare(nb);
      return c !== 0 ? c : (a - b);
    };
  }

  ['item','weapon','armor'].forEach(function(cat){
    if (!wh.items || !Array.isArray(wh.items[cat])) return;
    wh.items[cat].sort(cmpIds(cat));
  });

  console.log("Sorted stored ID arrays for warehouse:", active);
  console.log("New item IDs:", wh.items.item);
})();
