'use strict';
var MongoClient = require('mongodb').MongoClient;

function setUrlDB(urlDB) {
    this._urlDB = urlDB;
    return this;
}

function setCollectionName(name) {
    this._collectionName = name;
    return this;
}

function setFieldName(name) {
    this._queryArray.push({
        field: name,
        value: {},
        negative: false
    });
    return this;
}

function changeNegative() {
    var lastQuery = this._queryArray.pop();
    lastQuery.negative = lastQuery.negative ? false : true;
    this._queryArray.push(lastQuery);
    return this;
}

function setOperation(data, name) {
    var operation = '';
    var lastQuery = this._queryArray.pop();
    switch (name) {
        case 'equal':
            operation = lastQuery.negative ? '$ne' : '$eq';
            break;
        case 'lessThan':
            operation = lastQuery.negative ? '$gte' : '$lt';
            break;
        case 'greatThan':
            operation = lastQuery.negative ? '$lte' : '$gt';
            break;
        case 'include':
            operation = lastQuery.negative ? '$nin' : '$in';
            break;
    }
    var tempQuery = {};
    tempQuery[operation] = data;
    lastQuery.value[lastQuery.field] = tempQuery;
    this._queryArray.push(lastQuery);
    return this;
}

function makeQuery(array) {
    return array.reduce(function (query, current) {
        query['$or'].push(current.value);
        return query;
    }, {$or: []});
}

function dbAction(query, type, callback) {
    MongoClient.connect(this._urlDB, (function (error, db) {
        var collection = db.collection(this._collectionName);
        var method = null;
        switch (type) {
            case 'find':
                method = function (callback) {
                    collection.find(query).toArray(callback);
                };
                break;
            case 'insert':
                method = function (callback) {
                    collection.insertOne(query).then(callback);
                };
                break;
            case 'remove':
                method = function (callback) {
                    collection.deleteMany(query).then(callback);
                };
                break;
        }
        method.call(this, function (error, result) {
            callback(error, result);
            db.close();
        });
    }).bind(this));
    this._queryArray = [];
    return this;
}

module.exports = {
    _urlDB: '',
    _collectionName: '',
    _queryArray: [],

    server: setUrlDB,
    collection: setCollectionName,
    where: setFieldName,
    not: changeNegative,
    equal: function (data) {
        return setOperation.call(this, data, 'equal');
    },
    lessThan: function (data) {
        return setOperation.call(this, data, 'lessThan');
    },
    greatThan: function (data) {
        return setOperation.call(this, data, 'greatThan');
    },
    include: function (data) {
        return setOperation.call(this, data, 'include');
    },
    find: function (callback) {
        return dbAction.call(this, makeQuery(this._queryArray), 'find', callback);
    },
    insert: function (data, callback) {
        return dbAction.call(this, data, 'insert', callback);
    },
    remove: function (callback) {
        return dbAction.call(this, {}, 'remove', callback);
    }
};
