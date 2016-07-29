# s3x

### How to use

```

  Usage: s3x [options] [command]


  Commands:

    upload <from-fs> <to-s3>    
    download <s3-path> <fs-path>
    ls [path]                   

  Options:

    -h, --help           output usage information
    -V, --version        output the version number
    -c, --config <path>  Credentials (s3x.config.js)

```

## s3x.config.js
```
module.exports = {
  key: 'AWS-KEY',
  secret: 'AWS-SECRET',
  bucket: 'BUCKET'
};
```