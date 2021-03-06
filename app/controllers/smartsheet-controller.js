var passport = require('passport');

var SmartsheetController = function(){
  this.authorize = passport.authenticate('smartsheet');
  this.callback  = passport.authenticate('smartsheet', { failureRedirect: '/design' });
  this.redirectToConfigure = function(req, res){
    res.redirect('/configure?added=SmartSheet');
  };
};

module.exports = SmartsheetController;
