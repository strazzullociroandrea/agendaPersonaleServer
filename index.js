const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const fs = require("fs");
const conf = JSON.parse(fs.readFileSync("./assets/conf.json"));
const bodyParser = require("body-parser");
const mail = require("./server/mail.js");
const Database = require("./server/database.js");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));

server.listen(conf.port, () => {
    ////console.log("Server avviato");
});
(async () => {
    const datab = await Database(conf);

    let associazioni = [];
    let eventiSospesi = [];
    let conta = 0;
    /**
     * Modulo per gestire la registrazione di un utente
     */
    app.post("/register", async (request, response) => {
        const { email, password, nome, cognome } = request.body;
        //console.log(email, password, nome, cognome );
        if (email && email != "" && password && password != "" && nome && nome != "" && cognome && cognome != "") {
            const rs = await datab.registrati(email, password, nome, cognome);
            if (rs.result) {
                mail.send(conf, email, "Notifica di registrazione",
                    "Email generata automaticamente.\n Ricevi questa email perchè hai effettuato la registrazione nella nostra area riservata.\n Di sequito trovi le credenziali:\n email: " + email + "\n password: " + password);
                response.json({ result: true });
            } else {
                response.json(rs);
            }
        } else {
            response.json({ result: false });
        }
    });
    app.post("/elimina", async (req,res) => {
        const {email}  = req.body;
        if (email != "" && email) {
            await datab.elimina(email);
            res.json({result: true});
        } else {
            res.json({result: false});
        }
    });
    /**
     * Modulo per gestire l'aggiornamento di dettagli dell'utente
     */
    app.post("/aggiorna", async (request, response) => {
        const { email, password, nome, cognome } = request.body;
        if (email != "") {
            if (password != "") {
                mail.send(conf, email, "Notifica di cambio password",
                    "Email generata automaticamente.\n Ricevi questa email perchè qualcuno ha effettuato la modifica della tua password.\n Nuova password:" + password + ".\nSe non sei stato tu cambia la password.");
            }
            const rs = await datab.update(email, password, nome, cognome);
            response.json(rs);
        } else {
            response.json({ result: false });
        }

    });

    /**
     * Modulo per recuperare le informazioni di un utente
     */
    app.post("/getInfo", async (request, response) => {
        const { email } = request.body;
        if (email && email != "") {
            const rs = await datab.getInfo(email);
            response.json(rs)
        } else {
            response.json({ result: "error" })
        }
    });

    app.post("/aggiornaPassword", async (request, response) => {
        const { email, password } = request.body;
        if (email && email != "" && password && password != "") {
            const rs = await datab.aggiornaPassword(email, password);
            if (rs.result) {
                mail.send(conf, email, "Notifica di cambio password",
                    "Email generata automaticamente.\n Ricevi questa email perchè qualcuno ha effettuato la modifica\n della tua password.\n Nuova password: " + password + ".Se non sei stato tu cambia la password.");
                response.json({ result: true });
            }else{
                response.json(rs);
            }
        } else {
            response.json({ result: false });
        }
    })

    const invita = (array, evento, ev) => {
        return new Promise((resolve, reject) => {
            array.forEach(utente => {
                const associazione = associazioni.find(element => {
                    return element?.email == utente;
                });
                if (associazione && associazione != null) {
                    mail.send(conf, associazione.email, "Notifica di invito ad un evento",
                        "Email generata automaticamente.\n Ricevi questa email perchè qualcuno ti ha invitato ad un evento,\n accedi alla tua area riservata per visualizzarlo.");
                    io.to(associazione.socket).emit(ev, { "message": "Sei stato invitato ad un nuovo evento", evento });
                } else {
                    //gestione eventi utente invitato - sospesi per offline
                    const user = eventiSospesi.findIndex(element => element?.email == utente);
                    if (user != -1) {
                        eventiSospesi[user]['eventi'].push(evento);
                    } else {
                        eventiSospesi.push({ email: utente, eventi: [evento] });
                        mail.send(conf, utente, "Notifica di invito ad un evento",
                            "Email generata automaticamente.\n Ricevi questa email perchè qualcuno ti ha invitato ad un evento,\n accedi alla tua area riservata per visualizzarlo.");
                    }
                }
            })
            resolve();
        })
    }

    io.on("connection", (socket) => {
        let emailGlobale;
        socket.on("login", async (dizionario) => {
            const { email, password } = dizionario;
            const rs = await datab.login(email, password);
            if (rs.result) {
                emailGlobale = email;
                const oldAssocIndex = associazioni.findIndex(a => a.email === emailGlobale);
                if (oldAssocIndex !== -1) {
                    mail.send(conf, emailGlobale, "Notifica di login",
                    "Email generata automaticamente.\n Ricevi questa email perchè qualcuno ha fatto l'accesso alla tua area riservata.\n Se non sei stato tu cambia la password.");
                    associazioni.splice(oldAssocIndex, 1);
                    associazioni.push({ email, socket: socket.id });
                    io.to(socket.id).emit("loginSuccess", { login: true });
                }else{
                    associazioni.push({ email, socket: socket.id });  
                    io.to(socket.id).emit("loginSuccess", { login: true });
                }
            } else {
                io.to(socket.id).emit("loginSuccess", { login: false });
            }
        });

        socket.on("creaEvento", async (evento) => {
            if (evento?.utenti) {
                await invita(JSON.parse(evento.utenti) || [], evento, "invito");
            }
            evento['id'] = conta;
            evento['proprietario'] = emailGlobale;
            evento['completato'] = false;
            const rs = await datab.creaEvento(evento);
            io.to(socket.id).emit("creaSuccess", rs.result);
        });

        socket.on("recuperaUser", async () => {
            const temp = await datab.recuperaUser(emailGlobale);
            io.to(socket.id).emit("userSuccess", temp.result);
        })

        socket.on("filtro", async (dizionario) => {
            const {email, titolo, descrizione, tipologia, scadenza } = dizionario;
            const temp = await datab.filtro(email, titolo, descrizione, tipologia, scadenza);
            io.to(socket.id).emit("ottieniFiltered", temp.result);
        });
        socket.on("ottieniEventi", async (email) => {
            const rs = await datab.getEventi(email);
            //console.log(rs);
            io.to(socket.id).emit("ottieniSuccess", rs.result || []);
        });

        socket.on("completaEvento", async (dizionario) => {
            const {idEvento,email} = dizionario
            if (idEvento != "" && email != "") {
                const rs = await datab.completa(email, idEvento); 
                if(rs.evento[0].utenti){
                    invita(rs.evento[0].utenti, rs.evento[0], "creaSuccess");
                }
                io.to(socket.id).emit("creaSuccess", rs.result);
            } else {
                io.to(socket.id).emit("creaSuccess", false); 
            }
        });

        socket.on("deleteEvento", async (dizionario) => {
            const {idEvento,email} = dizionario
            if (idEvento != "" && email != "") {
                const rs = await datab.cancella(email, idEvento);
                if(rs.evento[0].utenti){
                    invita(rs.evento[0].utenti, rs.evento[0], "creaSuccess");
                }
                io.to(socket.id).emit("creaSuccess", rs.result);
            } else {
                io.to(socket.id).emit("creaSuccess", false);
            }
        });
       
        socket.on("disconnect", () => {
            associazioni = associazioni.filter(a => a.socket !== socket.id);
        });
    });
})();
