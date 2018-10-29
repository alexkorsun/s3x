#!/usr/bin/env node

const AWS = require('aws-sdk');
const fs = require('fs');
const async = require('async');
const mime = require('mime');
const program = require('commander');

async function getClient() {
   let path = program.config || 's3x.config.js';
   const configExists = fs.existsSync(path);

   if (!configExists) {
      throw new Error('No config file. (s3x.config.js)');
   }

   path = fs.realpathSync(path);

   const config = require(path);

   AWS.config.update({
      accessKeyId: config.key,
      secretAccessKey: config.secret,
      region: config.region
   });

   return new AWS.S3({
      params: {Bucket: config.bucket},
      signatureVersion: 'v4'
   });
}

function finish(err) {
   if (err) {
      console.error('[ERROR]', err);
      return process.exit(1);
   }

   console.log('done');
   process.exit(0);
}


program
   .version('0.0.1')
   .option('-c, --config <path>', 'Credentials (s3x.config.js)');


program.command('upload <from-fs> <to-s3>')
   .action(async function (from, to) {
      console.log('> upload', from, to);

      try {
         const client = await getClient();
         await client.putObject({
            Key: to,
            Body: fs.createReadStream(from),
            ContentType: mime.lookup(from)
         }).promise();

         finish();
      } catch (err) {
         finish(err);
      }
   });

program.command('download <s3-path> <fs-path>')
   .action(async function (s3path, fsPath) {
      try {
         const client = await getClient();
         const file = fs.createWriteStream(fsPath);

         const readStream = client
            .getObject({Key: s3path})
            .createReadStream();


         readStream.on('end', function () {
            finish();
         });

         readStream.pipe(file);
      } catch (err) {
         finish(err);
      }
   });

program.command('ls [path]')
   .action(async function (path) {
      path = path || '/';
      console.log('> ls', path);

      try {
         const client = await getClient();

         let files = [];
         let response = {
            IsTruncated: true, Marker: path
         };

         async.whilst(
            () => response.IsTruncated,
            async () => {
               const data = await client.listObjects({Marker: response.Marker}).promise();

               const _as = data.Contents.map(function (img) {
                  return '/' + img.Key;
               });

               files = files.concat(_as);
               response = data;
               response.Marker = data.Contents[data.Contents.length - 1].Key;
            },
            (err) => {
               if (err) {
                  return finish(err);
               }

               files.forEach(function (file) {
                  console.log(file);
               });

               finish();
            }
         );

      } catch (err) {
         finish(err);
      }
   });


program.parse(process.argv);

if (!process.argv.slice(2).length) {
   program.outputHelp();
}


