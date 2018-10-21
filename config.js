module.exports = {
    domain: "",
    server: {
        host: "0.0.0.0",
        port: 8080
    },
    mongo: {
        ambiento: {
            auth: false,
            host: "127.0.0.1",
            port: 27017,
            data: "", //authentication database admin (data = core database, other required: api)
            username: "",
            password: ""
        }
    },
    services: {
        spotify: {
            client_id: "",
            client_secret: "",
            redirect_uri: ""
        }
    }
};