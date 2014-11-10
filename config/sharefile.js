'use strict';
var ShareFileStrategy = require('passport-sharefile').Strategy;
var User              = require('../app/models/user');
var Channel           = require('../app/models/channel');

var CONFIG = Channel.syncFindByType('channel:sharefile').oauth[process.env.NODE_ENV];

CONFIG.passReqToCallback = true;

var sharefileStrategy = new ShareFileStrategy(CONFIG, function(req, accessToken, refreshToken, profile, done){

  User.addApiAuthorization(req.user, 'channel:sharefile', {authtype: 'oauth', token: accessToken}).then(function () {
    done(null, req.user);
  }).catch(function(error){
    done(error);
  });
});

module.exports = sharefileStrategy;
