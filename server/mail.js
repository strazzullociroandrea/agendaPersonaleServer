const nodemailer = require('nodemailer');

const result = {
   send: async (conf, email, subject, body) => {
      try {
         const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: conf.mailFrom,
              pass: conf.mailSecret,
            },
          });
         return await transporter.sendMail({
            from: conf.mailFrom,
            to: email,
            subject: subject,
            text: body 
         });
      } catch (error) {
        // throw(error);
      } 
   },
   test: async () => {
      return transporter.verify();
   }
}

module.exports = result;