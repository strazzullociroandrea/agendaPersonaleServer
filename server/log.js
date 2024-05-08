const fs = require('fs');

const log = (data) => {
   const datetime = new Date().toLocaleTimeString();
   const text = datetime + "-" + JSON.stringify(data) + "\r\n";
   console.log(text);   
   fs.appendFile('log.txt', text, function (err) {
      if (err) {
         throw err
      }
    });
}

module.exports = log;