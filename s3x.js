#!/usr/bin/env node

var AWS = require('aws-sdk');
var fs = require('fs');
var async = require('async');
var mime = require('mime');

var program = require('commander');

function getClient(next) {
    var path = program.config || 's3x.config.js';
    var configExists = fs.existsSync(path);

    if (!configExists) {
        return next('No config file. (s3x.config.js)');
    }

    path = fs.realpathSync(path);
    var config = require(path);

    AWS.config.update({
        accessKeyId: config.key,
        secretAccessKey: config.secret,
        region: 'eu-west-1'
    });

    next(null, new AWS.S3({params: {Bucket: config.bucket}}));
}

function next(err) {
    if (err) {
        console.error('[ERROR]', err);
        return process.exit(1);
    }

    console.log('done');
    console.log('');
    process.exit(0);
}


program
    .version('0.0.1')
    .option('-c, --config <path>', 'Credentials (s3x.config.js)');


program.command('upload <from-fs> <to-s3>')
    .action(function (from, to) {

        console.log('> upload', from, to);

        getClient(function (err, client) {
            if (err) {
                return next(err);
            }

            client.putObject({
                Key: to,
                Body: fs.createReadStream(from),
                ContentType: mime.lookup(from)
            }, function (err) {
                if (err) {
                    return next(err);
                }

                next();
            });
        });
    });

program.command('download <s3-path> <fs-path>')
    .action(function (s3path, fsPath) {

        getClient(function (err, client) {
            if (err) {
                return next(err);
            }

            var file = require('fs').createWriteStream(fsPath);

            var readStream = client
                .getObject({Key: s3path})
                .createReadStream();


            readStream.on('end', function () {
                next()
            });

            readStream.pipe(file);
        });
    });

program.command('ls [path]')
    .action(function (path) {
        path = path || '/';
        console.log('> ls', path);

        getClient(function (err, client) {
            if (err) {
                return next(err);
            }


            var files = [];
            var response = {IsTruncated: true, Marker: path};
            async.whilst(
                function test() {
                    return response.IsTruncated;
                },
                function getMore(cb) {
                    client.listObjects({Marker: response.Marker}, function (err, data) {
                        var _as = data.Contents.map(function (img) {
                            return '/' + img.Key;
                        });

                        files = files.concat(_as);
                        response = data;
                        response.Marker = data.Contents[data.Contents.length - 1].Key;
                        return cb(err);
                    });
                },
                function (err) {
                    if (err) {
                        return next(err);
                    }

                    files.forEach(function (file) {
                        console.log(file);
                    });

                    next();
                }
            );
        });
    });


program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
}


