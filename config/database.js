var config = {
    development: {
        // url : 'mongodb://[user]:[password]@dharma.mongohq.com:10040/meshines'
        url : process.env.OCTOBLU_DB || 'mongodb://54.186.148.255:27017/meshines',
        skynetUrl: process.env.SKYNET_DB || 'mongodb://54.186.148.255:27017/skynet'
    },
    test: {
        url: 'mongodb://localhost:27017/meshines',
        skynetUrl: 'mongodb://localhost:27017/skynet-test'
    },
    production: {
        // url : 'mongodb://[user]:[password]@dharma.mongohq.com:10040/meshines'
        url : 'mongodb://54.186.148.255:27017/meshines',
        skynetUrl: 'mongodb://54.186.148.255:27017/skynet'
    }
};

module.exports = function (environment) {
    console.log(environment);
    return config[environment];
};
