let express                 = require("express"),
    app                     = express(),
    partials                = require('express-partials'),
    http                    = require('http'),
    https                   = require('https'),
    database                = require('./middleware/database'),
    cookieParser            = require('cookie-parser'),
    bodyParser              = require('body-parser'),
    config                  = require("./config"),
    server                  = http.createServer(app);

app.set('view engine', 'ejs');
app.set("strict routing", true);
app.use(partials());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static(__dirname + "/static"));

app.use(require("./routes/spotify"));
app.use(require("./routes/authentication"));
app.use(require("./routes/core"));

database.connect()
    .then(()=>{
        server.listen(config.server.port, config.server.host, function () {
            console.log("[System] Server running on port " + config.server.port);
        });
    }).catch(()=>process.exit(1));