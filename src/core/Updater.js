'use strict';
const fs = require('fs');
const path = require('path');
const request = require('request');
const async = require('async');
const md5File = require('md5-file');
const exec = require('child_process').exec;

module.exports = class Updater {
  constructor(gameServer) {
    this.url = "http://raw.githubusercontent.com/AJS-development/Ogar-unlimited/" + "master" + "/";
    this.gameServer = gameServer;

    this.newFiles = {};
    this.updatedFiles = [];
    this.tobe = 0;
    this.dow = 0;
  }

  init() {

  }

  getFileByName(name) {
    this.newFiles.find((ele)=> {
      return ele.name === name;
    });
  }

  hashFiles() {
    try {
      let files = JSON.parse(fs.readFileSync('files.json'));
      files.forEach((ele, i)=> {
        files[i].hash = md5File(ele.dst);
      });
      // write to file pretty because this file will be edited by humans :D
      fs.writeFileSync('files.json', JSON.stringify(files, null, 2));
    } catch (err) {
      console.error(err);
    }
  }
  loading(action) {
    this.dow ++;
    var percent = Math.round(this.dow/this.tobe*10)
    var bar = ""
    for(var i = 0; i < percent; i++) {
      bar = bar + "===";
    }
    if (percent == 10) bar = bar + "="; else bar = bar + ">";
    var extras = 31 - bar.length;
    var extra = "";
    for (var i = 0; i < extras; i++) extra = extra + " ";
    process.stdout.write("[Update] [" + bar + extra + "] " +  percent*10 + "% " + action + "\r");
    
    
  }
  
downloadWithLoad(file, callback) {
    let url = this.url + file.src;
    request(url, function (error, response, body) {
      if (!error && response.statusCode == 200 && body != "") {
        this.loading("Downloading");
        fs.writeFile(file.dst, body, (err, res)=> {
          if (typeof callback === "function") {
            callback(err, res);
          }
        });
      } else {
        callback("[Update] [\x1b[31mFAIL\x1b[0m] Couldn't connect to servers. Failed to download: " + url);
      }
    }.bind(this));
  };
  downloadFile(file, callback) {
    let url = this.url + file.src;

    request(url, function (error, response, body) {
      if (!error && response.statusCode == 200 && body != "") {

        fs.writeFile(file.dst, body, (err, res)=> {
          if (typeof callback === "function") {
            callback(err, res);
          }
        });
      } else {
        callback("[Update] [\x1b[31mFAIL\x1b[0m] Couldn't connect to servers. Failed to download: " + url);
      }
    });
  }
setURL(optin) {
      if (optin) var branch = "optin"; else var branch = "master";
    this.url = "http://raw.githubusercontent.com/AJS-development/Ogar-unlimited/" + branch + "/";
    this.init()
}
  downloadAllFiles() {
    this.dow = 0;
    this.newFiles = JSON.parse(fs.readFileSync('filesTemp.json'));
    console.log("[Console] Updating...");
    this.tobe = 2;
    async.each(this.newFiles, (file, cb)=> {
      this.tobe ++;
      this.downloadWithLoad(file, cb);
    }, handleError(this.gameServer));


  }

  downloadUpdatedFiles() {
    async.each(this.updatedFiles, (file, cb)=> {
      this.downloadFile(file, cb);
    }, handleError(this.gameServer));
  }

  runNpmInstall() {
    // executes `pwd`
    this.loading("Running npm install");
    let child = exec("npm install", function (error, stdout, stderr) {
      if (error !== null) {
        console.error('[Execution Error] Failed to run npm install  Reason: ', error);
        console.error('[Execution Error] You should exit the server and run: npm install');
      }
    });
  }
};

// private functions
function handleError(gameServer) {
  return function (err) {
    if (err) {
      console.error("[Console] Error: failed to download some or all files. err msg: " + err);
      console.error("[Console] Error: server is likely not in a viable state. You should manually reinstall it!");
      console.error("[Console] Error: Shutting down!");
      gameServer.socketServer.close();
      process.exit(3);
    } else {
      gameServer.updater.runNpmInstall();
      gameServer.updater.loading("Done!                  ");
      console.log("\n[Update] Restarting...")
      setTimeout(function () {
        gameServer.socketServer.close();
        process.exit(3);
      }, 3000);
    }
  }
}
