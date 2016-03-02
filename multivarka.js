'use strict';
var MongoClient = require('mongodb').MongoClient;

function setUrlDB(urlDB) {
    this.urlDB = urlDB;
    return this;
}

function setCollectionName(name) {
    this.collectionName = name;
    return this;
}

function setFieldName(name) {
    this.queryArray.push({
        field: name,
        value: {},
        negative: false
    });
    return this;
}

function changeNegative() {
    var lastQuery = this.queryArray.pop();
    lastQuery.negative = lastQuery.negative ? false : true;
    this.queryArray.push(lastQuery);
    return this;
}

function setQueryOperation(data, name) {
    var operation = '';
    var lastQuery = this.queryArray.pop();
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
    lastQuery.value[operation] = data;
    this.queryArray.push(lastQuery);
}

function findQuery(callback) {
    var finalQuery = this.queryArray.reduce(function (query, current) {
        query[current.field] = current.value;
        return query;
    }, {});
    MongoClient.connect(this.urlDB, (function (error, db) {
        var collection = db.collection(this.collectionName);
        collection.find(finalQuery).toArray(function (error, data) {
            callback(error, data);
            db.close();
        });
    }).bind(this));
    this.queryArray = [];
    return this;
}

module.exports = {
    urlDB: '',
    collectionName: '',
    queryArray: [],

    server: setUrlDB,
    collection: setCollectionName,
    where: setFieldName,
    not: changeNegative,
    equal: function (data) {
        setQueryOperation.call(this, data, 'equal');
        return this;
    },
    lessThan: function (data) {
        setQueryOperation.call(this, data, 'lessThan');
        return this;
    },
    greatThan: function (data) {
        setQueryOperation.call(this, data, 'greatThan');
        return this;
    },
    include: function (data) {
        setQueryOperation.call(this, data, 'include');
        return this;
    },
    find: findQuery
};
