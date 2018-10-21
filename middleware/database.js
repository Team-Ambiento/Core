/**
 * Created by Luca on 14.01.2017.
 */
var mongoDB                 = require('mongodb'),
    mongoClient             = mongoDB.MongoClient,
    config                  = require("../config"),
    database                = null,
    connected               = false;

function connect() {
    return new Promise((resolve,reject)=>{
        if(connected) return resolve(database);
        mongoClient.connect(config.mongo.ambiento.auth?'mongodb://'+config.mongo.ambiento.username+':'+config.mongo.ambiento.password+"@"+config.mongo.ambiento.host+':'+config.mongo.ambiento.port+"?authSource=admin":'mongodb://'+config.mongo.ambiento.host+':'+config.mongo.ambiento.port, { useNewUrlParser: true }, (error, _database)=>{
            if (error) return reject();

            database = _database;

            connected = true;
            _database.on('close', function () {
                connected = false;
            });

            resolve(_database);
        })
    });
}

function insertOne(collection, insert, callback,_database=config.mongo.ambiento.data) {
    connect()
        .then((database)=>{
            database.db(_database).collection(collection).insertOne(insert, function(error, result) {
                callback(error, result);
            });
        }).catch(()=>callback(true));
}

function insertMany(collection, insert, callback,_database=config.mongo.ambiento.data) {
    connect()
        .then((database)=>{
            database.db(_database).collection(collection).insertMany(insert, function(error, result) {
                callback(error, result);
            });
        }).catch(()=>callback(true));
}

function update(collection, find, update, callback,_database=config.mongo.ambiento.data) {
    connect()
        .then((database)=>{
            database.db(_database).collection(collection).updateOne(find, update, function(error, numUpdated) {
                callback(error, numUpdated);
            });
        }).catch(()=>callback(true));
}

function updateMany(collection, find, update, callback,_database=config.mongo.ambiento.data) {
    connect()
        .then((database)=>{
            database.db(_database).collection(collection).updateMany(find, update, function(error, numUpdated) {
                callback(error, numUpdated);
            });
        }).catch(()=>callback(true));
}

function find(collection, find, callback,_database=config.mongo.ambiento.data) {
    connect()
        .then((database)=>{
            database.db(_database).collection(collection).find(find,{}).toArray(function(error, result) {
                if(result == null) error = true;
                callback(error, error?null:result);
            });
        }).catch(()=>callback(true));
}

function deleteOne(collection, find, callback, _database=config.mongo.ambiento.data) {
    connect()
        .then((database)=>{
            database.db(_database).collection(collection).deleteOne(find, function(error, result) {
                callback(error, error?null:result);
            });
        }).catch(()=>callback(true));
}

function count(collection, find, callback,_database=config.mongo.ambiento.data) {
    connect()
        .then((database)=>{
            database.db(_database).collection(collection).countDocuments(find, function(error, result) {
                callback(error, error?0:result);
            });
        }).catch(()=>callback(true));
}

function findParams(collection, find, params, callback,_database=config.mongo.ambiento.data) {
    connect()
        .then((database)=>{
            database.db(_database).collection(collection).find(find, params).toArray(function(error, result) {
                if(result == null) error = true;
                callback(error, error?null:result);
            });
        }).catch(()=>callback(true));
}

function findOne(collection, find, callback,_database=config.mongo.ambiento.data) {
    connect()
        .then((database)=>{
            database.db(_database).collection(collection).findOne(find, function(error, result) {
                if(result == null) error = true;
                callback(error, error?null:result);
            });
        }).catch(()=>callback(true));
}

function findOneParams(collection, find, params, callback,_database=config.mongo.ambiento.data) {
    connect()
        .then((database)=>{
            database.db(_database).collection(collection).findOne(find, {}, params,function(error, result) {
                if(result == null) error = true;
                callback(error, error?null:result);
            });
        }).catch(()=>callback(true));
}


module.exports = {
    database      : database,
    insertOne     : insertOne,
    insertMany    : insertMany,
    update        : update,
    updateMany    : updateMany,
    count         : count,
    find          : find,
    deleteOne     : deleteOne,
    deleteMany    : deleteOne,
    findParams    : findParams,
    findOne       : findOne,
    findOneParams : findOneParams,
    connect       : connect
};