const constants = require('./constants')
const express = require('express')
const promise = require('bluebird')
const formidable = require('formidable')
const http = require('http')
const util = require('util')
const fs = require('fs')

// Set up the cloud storage parameters
const GoogleCloudStorage = promise.promisifyAll(require('@google-cloud/storage'))
const storage = GoogleCloudStorage({
  projectId: constants.PROJECT_ID,
  keyFilename: constants.ADMIN_SDK_KEYFILE
})

const myBucket = storage.bucket(constants.BUCKET_NAME)

// Create a new HTTP server for handling uploads
http.createServer(function(req, res) {

    // If it's a post request to /upload
    if (req.url == '/upload' && req.method.toLowerCase() == 'post') {
        if (!req.headers.authorization) return return401(res)
        if (!req.headers.authorization.split(' ')[1]) return return401(res)
        if (req.headers.authorization.split(' ')[1]!=constants.AUTH_TOKEN) return return401(res)

        // Create the form object we can use to get values from
        const form = new formidable.IncomingForm()

        // Storage of our file
        let newFilePath = ''
        let newFileName = ''

        form.on('fileBegin', function(name, file) {
            console.log('Starting.')

            const filename = file.name
            const filenameParts = filename.split('.')
            const ext = filenameParts[filenameParts.length - 1]
            const path = file.path
            const rename = new Date().getTime()

            // This is the new file
            newFilePath = __dirname + '/'+rename+'.'+ext
            newFileName = rename+'.'+ext

            // Set it
            file.path = newFilePath

            console.log('Saved at: '+file.path)
        });

        // Once the file has been uploaded
        form.on('end', function() {
            myBucket.uploadAsync(newFilePath, {public: true}).then(file => {
                console.log('Done! Deleting local file.')
                console.log(`Accessed as https://storage.googleapis.com/${constants.BUCKET_NAME}/${newFileName}`)

                // Delete it
                fs.unlinkSync(newFilePath);

                return200(res)
            })
            .catch(error => console.log(error))
        });

        // Parse it for the files
        form.parse(req, function(err, fields, files) {
            // Do nothing here. Just for show.
        })

        return
    }
}).listen(8080)

const return401 = (res) => {
    res.writeHead(401, {'Content-Type': 'application/json'})
    res.end()

    return res
}

const return200 = (res) => {
    res.writeHead(200, {'Content-Type': 'application/json'})
    res.end()

    return res
}
