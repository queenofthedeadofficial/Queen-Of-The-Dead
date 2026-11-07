const _Scene_Battle_commandItem = Scene_Battle.prototype.commandItem;
Scene_Battle.prototype.commandItem = function() {
    _Scene_Battle_commandItem.call(this);
    this._itemWindow.setHandler("ok", this.onItemOk.bind(this));
    this._itemWindow.setHandler("cancel", this.onItemCancel.bind(this));
};

// Modified Item Selection Function
Scene_Battle.prototype.onItemOk = function() {
    selectedItem = this._itemWindow.item();
    this._itemWindow.hide();
    this._itemWindow.deactivate();
    this.processItemUse();
};

Scene_Battle.prototype.processItemUse = function() {
    if (selectedItem && selectedItem.consumable) {
        if (selectedItem.scope === 7) { // "Scope: The User"
            selectedItem.scope = 8; // Convert to "All Allies"
        }

        const party = $gameParty.members();
        party.forEach(member => {
            if (member.isAlive()) {
                const action = new Game_Action($gameParty.leader());
                action.setItem(selectedItem.id);
                action.apply(member);
            }
        });

        $gameParty.consumeItem(selectedItem);
    }
    selectedItem = null;
};
