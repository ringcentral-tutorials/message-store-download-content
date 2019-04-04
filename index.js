var SDK = require('ringcentral')
var async = require('async')
var fs = require('fs')

require('dotenv').config()

if (process.env.ENVIRONMENT == "sandbox") {
    require('dotenv').config({path: "./environment/.env-sandbox"})
} else {
    require('dotenv').config({path: "./environment/.env-production"})
}
var rcsdk = new SDK({
      server: process.env.RC_SERVER_URL,
      appKey: process.env.RC_CLIENT_ID,
      appSecret: process.env.RC_CLIENT_SECRET
    });
var platform = rcsdk.platform()

platform.login({
      username: process.env.RC_USERNAME,
      password: process.env.RC_PASSWORD
      })
      .then(function(resp) {
          read_message_store_message_content()
      });

function read_message_store_sms_mms_limit(){
    platform.get('/account/~/extension/~/message-store', {
             dateFrom: '2018-01-01T00:00:00.000Z',
             dateTo: '2018-12-31T23:59:59.999Z',
             messageType: 'SMS'
        })
        .then(function (resp) {
          var jsonObj = resp.json()
          var count = jsonObj.records.length
          var index = 0
          var dir = "sms_mms_content/"
          if(!fs.existsSync(dir)){
            fs.mkdirSync(dir)
          }
          dir = "./" + dir
          // Limit API call to ~40 calls per minute to avoid exceeding API rate limit.
          var interval = setInterval(function() {
            var record = jsonObj.records[index]
            if (record.hasOwnProperty('attachments')){
              async.each(record.attachments,
                function(attachment, callback){
                  var fileName = record.attachments[0].id
                  if (attachment.type == "MmsAttachment"){
                    var fileNameExt = attachment.contentType.split("/")
                    fileName += "_mms_attachment." + fileNameExt[1]
                  }else{
                    fileName += "_mms_text.txt"
                  }
                  platform.get(attachment.uri)
                      .then(function(res) {
                          return res.response().buffer();
                      })
                      .then(function(buffer) {
                          fs.writeFile(dir + fileName, buffer, function(){
                            callback()
                          })
                      })
                      .catch(function(e){
                          console.log(e)
                          callback()
                      })
                })
            }
            index++
            if (index >= count){
                clearInterval(interval);
            }
          }, 2000);
        });
}

function read_message_store_fax_limit(){
    platform.get('/account/~/extension/~/message-store', {
          dateFrom: '2018-01-01T00:00:00.000Z',
          dateTo: '2018-12-31T23:59:59.999Z',
          messageType: 'Fax'
        })
        .then(function (resp) {
            var jsonObj = resp.json()
            var count = jsonObj.records.length
            var index = 0
            var dir = "fax_content/"
            if(!fs.existsSync(dir)){
              fs.mkdirSync(dir)
            }
            dir = "./" + dir
            // Limit API call to ~40 calls per minute to avoid exceeding API rate limit.
            var interval = setInterval(function() {
              var record = jsonObj.records[index]
                if (record.hasOwnProperty('attachments')){
                  async.each(record.attachments,
                    function(attachment, callback){
                      var fileName = attachment.id + "_fax_attachment"
                      var fileNameExt = attachment.contentType.split("/")
                      fileName += "." + fileNameExt[1]
                      platform.get(attachment.uri)
                          .then(function(res) {
                              return res.response().buffer();
                          })
                          .then(function(buffer) {
                              fs.writeFile(dir + fileName, buffer, function(){
                                callback()
                              })
                          })
                          .catch(function(e){
                              console.log(e)
                              callback()
                          })
                    })
                }
            index++
            if (index >= count){
                clearInterval(interval);
            }
          }, 2100);
        });
}

function read_message_store_voicemail_limit(){
    platform.get('/account/~/extension/~/message-store', {
             dateFrom: '2018-01-01T00:00:00.000Z',
             dateTo: '2018-12-31T23:59:59.999Z',
             messageType: 'VoiceMail'
        })
        .then(function (resp) {
          var jsonObj = resp.json()
          var count = jsonObj.records.length
          var index = 0
          var dir = "voicemail_content/"
          if(!fs.existsSync(dir)){
            fs.mkdirSync(dir)
          }
          dir = "./" + dir
          // Limit API call to ~40 calls per minute to avoid exceeding API rate limit.
          var interval = setInterval(function() {
            var record = jsonObj.records[index]
            if (record.hasOwnProperty('attachments')){
              async.each(record.attachments,
                function(attachment, callback){
                  var fileName = record.attachments[0].id + "_voicemail"
                  if (attachment.type == "AudioRecording"){
                      if (attachment.contentType == "audio/mpeg")
                          fileName += ".mp3"
                      else
                          fileName += ".wav"
                  }else if (attachment.type == "AudioTranscription" &&
                            record.vmTranscriptionStatus == "Completed"){
                      fileName += ".txt"
                  }
                  platform.get(attachment.uri)
                      .then(function(res) {
                          return res.response().buffer();
                      })
                      .then(function(buffer) {
                          fs.writeFile(dir + fileName, buffer, function(){
                            callback()
                          })
                      })
                      .catch(function(e){
                          console.log(e)
                          callback()
                      })
                })
            }
            index++
            if (index >= count){
                clearInterval(interval);
            }
          }, 2100);
        });

}

function read_message_store_message_content(){
    platform.get('/account/~/extension/~/message-store', {
             dateFrom: '2018-01-01T00:00:00.000Z',
             dateTo: '2018-12-31T23:59:59.999Z'
        })
        .then(function (resp) {
          var jsonObj = resp.json()
          var count = jsonObj.records.length
          var index = 0
          var contentPath = "content/"
          if(!fs.existsSync(contentPath)){
            fs.mkdirSync(contentPath)
          }
          contentPath = "./" + contentPath
          // Limit API call to ~40 calls per minute to avoid exceeding API rate limit.
          var interval = setInterval(function() {
            var record = jsonObj.records[index]
            if (record.hasOwnProperty('attachments')){
              async.each(record.attachments,
                function(attachment, callback){
                  var fileName = ""
                  if (record.type == "VoiceMail"){
                      if (attachment.type == "AudioRecording"){
                          if (attachment.contentType == "audio/mpeg")
                              fileName = "voicemail_recording_"+record.attachments[0].id+".mp3"
                          else
                              fileName = "voicemail_recording_"+record.attachments[0].id+".wav"
                      }else if (attachment.type == "AudioTranscription" &&
                                record.vmTranscriptionStatus == "Completed"){
                          fileName = "voicemail_transcript_"+record.attachments[0].id+".txt"
                      }
                  }else if (record.type == "Fax"){
                      var fileNameExt = attachment.contentType.split("/")
                      fileName = "fax_attachment_" + attachment.id + "." + fileNameExt[1]
                  }else if (record.type == "SMS"){
                      if (attachment.type == "MmsAttachment"){
                          var fileNameExt = attachment.contentType.split("/")
                          fileName = "mms_attachment_" + record.attachments[0].id + "." + fileNameExt[1]
                      }else{
                          fileName = "sms_text_" + record.attachments[0].id + ".txt"
                      }
                  }
                  platform.get(attachment.uri)
                      .then(function(res) {
                          return res.response().buffer();
                      })
                      .then(function(buffer) {
                          fs.writeFile(contentPath + fileName, buffer, function(){
                              callback()
                          })
                      })
                      .catch(function(e){
                          console.log(e)
                          callback()
                      })
                })
            }
            index++
            if (index >= count){
                clearInterval(interval);
            }
          }, 2100);
        });

}
