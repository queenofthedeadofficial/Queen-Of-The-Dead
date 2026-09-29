(function() {

const alias = Game_Switches.prototype.setValue;

Game_Switches.prototype.setValue = function(id, value) {

    if (id === 350) {
        console.log("===== SWITCH 350 CHANGED =====");
        console.log("New value:", value);
        console.log(new Error().stack);
    }

    alias.call(this, id, value);
};

})();