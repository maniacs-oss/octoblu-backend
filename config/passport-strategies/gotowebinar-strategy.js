'use strict';
var GoToWebinarStrategy = require('passport-citrix').Strategy;
var User                = require('../../app/models/user');
var Channel             = require('../../app/models/channel');
var textCrypt           = require('../../app/lib/textCrypt');

var CONFIG = Channel.syncFindOauthConfigByType('channel:gotowebinar');

CONFIG.passReqToCallback = true;
CONFIG.name = 'gotowebinar';

var goToWebinarStrategy = new GoToWebinarStrategy(CONFIG, function(req, accessToken, refreshToken, profile, done){

  User.addApiAuthorization(req.user, 'channel:gotowebinar', {authtype: 'oauth', token_crypt: textCrypt.encrypt(accessToken)}).then(function () {
    done(null, req.user);
  }).catch(function(error){
    done(error);
  });
});

module.exports = goToWebinarStrategy;
