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

function read_message_store_message_content(){
    platform.get('/account/~/extension/~/message-store', {
             dateFrom: '2018-01-01T00:00:00.000Z',
             dateTo: '2018-12-31T23:59:59.999Z',
        })
        .then(function (resp) {
          var jsonObj = resp.json()
          var count = jsonObj.records.length
          var index = 0
          var contentPath = "./content/"
          if(!fs.existsSync(contentPath)){
            fs.mkdirSync(contentPath)
          }
          // Limit API call to ~40 calls per minute to avoid exceeding API rate limit.
          var interval = setInterval(function() {
            var record = jsonObj.records[index]
            if (record.hasOwnProperty('attachments')){
              async.each(record.attachments,
                function(attachment, callback){
                  var fileName = ""
                  if (record.type == "VoiceMail"){
                      var fileExt = getFileExteensionFromMimeType(attachment.contentType)
                      if (attachment.type == "AudioRecording"){
                        fileName = "voicemail_recording_" + record.attachments[0].id + fileExt
                      }else if (attachment.type == "AudioTranscription" &&
                                record.vmTranscriptionStatus == "Completed"){
                          fileName = "voicemail_transcript_"+record.attachments[0].id+".txt"
                      }
                  }else if (record.type == "Fax"){
                      var fileExt = getFileExteensionFromMimeType(attachment.contentType)
                      fileName = "fax_attachment_" + attachment.id + fileExt
                  }else if (record.type == "SMS"){
                      if (attachment.type == "MmsAttachment"){
                          var fileExt = getFileExteensionFromMimeType(attachment.contentType)
                          fileName = "mms_attachment_" + record.attachments[0].id + fileExt
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

function getFileExteensionFromMimeType(mimeType){
  switch (mimeType){
    case "text/html": return "html"
    case "text/css": return ".css"
    case "text/xml": return ".xml"
    case "text/plain": return ".txt"
    case "text/x-vcard": return ".vcf"
    case "application/msword": return ".doc"
    case "application/pdf": return ".pdf"
    case "application/rtf": return ".rtf"
    case "application/vnd.ms-excel": return ".xls"
    case "application/vnd.ms-powerpoint": return ".ppt"
    case "application/zip": return ".zip"
    case "image/tiff": return ".tiff"
    case "image/gif": return ".gif"
    case "image/jpeg": return ".jpg"
    case "image/png": return ".png"
    case "image/x-ms-bmp": return ".bmp"
    case "image/svg+xml": return ".svg"
    case "audio/wav":
    case "audio/x-wav":
      return ".wav"
    case "audio/mpeg": return ".mp3"
    case "audio/ogg": return ".ogg"
    case "video/3gpp": return ".3gp"
    case "video/mpeg": return ".mpeg"
    case "video/quicktime": return ".mov"
    case "video/x-flv": return ".flv"
    case "video/x-ms-wmv": return ".wmv"
    case "video/mp4": return ".mp4"
    default: return ".unknown"
  }
}
