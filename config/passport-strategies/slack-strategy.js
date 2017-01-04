'use strict';
var SlackStrategy     = require('passport-slack').Strategy;
var User              = require('../../app/models/user');
var Channel           = require('../../app/models/channel');
var textCrypt         = require('../../app/lib/textCrypt');

var CONFIG = Channel.syncFindOauthConfigByType('channel:slack');

CONFIG.scope = 'bot'
CONFIG.passReqToCallback = true;
CONFIG.scope = [
  'identity.basic',
  'identity.email',
  'identity.avatar',
  'identity.team',
];

var slackStrategy = new SlackStrategy(CONFIG, function(req, accessToken, refreshToken, profile, done){

  User.addApiAuthorization(req.user, 'channel:slack', {authtype: 'oauth', token_crypt: textCrypt.encrypt(accessToken)}).then(function () {
    done(null, req.user);
  }).catch(function(error){
    done(error);
  });
});

module.exports = slackStrategy;
