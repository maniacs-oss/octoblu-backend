var passport = require('passport');

var TwitterController = function(){
  this.authorize = passport.authenticate('twitter', { scope: 'email' });
  this.callback  = passport.authenticate('twitter', { failureRedirect: '/design' });
  this.redirectToDesigner = function(req, res){
    res.redirect('/design');
  };
};

module.exports = TwitterController;
