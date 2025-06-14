module.exports = {
    jwt: {
        secret: process.env.JWT_SECRET || 'nebula-runner-secret',
        expiresIn: '24h'
    },
    database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nebula-runner'
    },
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    }
};
