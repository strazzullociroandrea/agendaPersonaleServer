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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));

server.listen(conf.port, () => {
    console.log("Server avviato");
});

let associazioni = [];
let eventiSospesi = [];
let eventi = [];
const utentiRegistrati = [];
let conta = 0;
/**
 * Modulo per gestire la registrazione di un utente
 */
app.post("/register", (request, response) => {
    const { email, password, nome, cognome } = request.body;
    if (email && email != "" && password && password != "" && nome && nome != "" && cognome && cognome != "") {
        const utente = utentiRegistrati.find(element => element.email === email);
        if (utente) {
            response.json({ result: false });
        } else {
            utentiRegistrati.push({ email, password, nome, cognome });
            mail.send(conf,email, "Notifica di registrazione",
            "Email generata automaticamente.\n Ricevi questa email perchè hai effettuato la registrazione nella nostra area riservata.\n Di sequito trovi le credenziali:\n email: "+email+"\n password: "+password);
            response.json({ result: true });
        }
    } else {
        response.json({ result: false });
    }
});
/**
 * Modulo per gestire l'aggiornamento di dettagli dell'utente
 */
app.post("/aggiorna", (request, response) => {
    const { email, password, nome, cognome } = request.body;
    const utente = utentiRegistrati.find(element => element.email === email);
    if (utente) {
        if (email != "") {
            utente.email = email;
        }
        if (password != "") {
            utente.password = password;
            mail.send(conf,email, "Notifica di cambio password",
            "Email generata automaticamente.\n Ricevi questa email perchè qualcuno ha effettuato la modifica\n della tua password.\n Nuova password:"+password+".Se non sei stato tu cambia la password.");
        }
        if (nome != "") {
            utente.nome = nome;
        }
        if (cognome != "") {
            utente.cognome = cognome;
        }
    }
    response.json({ result: true });
});

/**
 * Modulo per recuperare le informazioni di un utente
 */
app.post("/getInfo", (request, response) => {
    const { email } = request.body;
    if (email && email != "") {
        const utente = utentiRegistrati.find(element => element.email === email);
        response.json({ result: utente })
    } else {
        response.json({ result: "error" })
    }
});

app.post("/aggiornaPassword",(request, response)=>{
    const { email, password } = request.body;
    if (email && email != "" && password && password != "") {
        const index = utentiRegistrati.findIndex(element => element.email === email);
        if(index != -1){
            utentiRegistrati[index]['password'] = password;
            mail.send(conf,email, "Notifica di cambio password",
            "Email generata automaticamente.\n Ricevi questa email perchè qualcuno ha effettuato la modifica\n della tua password.\n Nuova password: "+password+".Se non sei stato tu cambia la password.");
            response.json({ result: true });
        }else{
            response.json({ result: false });
        }
    }else{
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
                io.to(associazione.socket).emit(ev, { "message": "Sei stato invitato ad un nuovo evento", evento });
            } else {
                //gestione eventi utente invitato - sospesi per offline
                const user = eventiSospesi.findIndex(element => element?.email == utente);
                if (user != -1) {
                    eventiSospesi[user]['eventi'].push(evento);
                } else {
                    eventiSospesi.push({ email: utente, eventi: [evento] });
                }
            }
            mail.send(conf,emailGlobale, "Notifica di invito ad un evento",
            "Email generata automaticamente.\n Ricevi questa email perchè qualcuno ti ha invitato ad un evento,\n accedi alla tua area riservata per visualizzarlo.");
        })
        resolve();
    })
}

io.on("connection", (socket) => {
    let emailGlobale;
    socket.on("login", (dizionario) => {
        const { email, password } = dizionario;
        emailGlobale = email;
        const user = utentiRegistrati.find(element => element.email == email);
        if (user && user.password == password) {
            const oldAssocIndex = associazioni.findIndex(a => a.email === email);
            if (oldAssocIndex !== -1) {
                associazioni.splice(oldAssocIndex, 1);
            }
            associazioni.push({ email, socket: socket.id });
            mail.send(conf,emailGlobale, "Notifica di login",
            "Email generata automaticamente.\n Ricevi questa email perchè qualcuno ha fatto l'accesso\n alla tua area riservata. Se non sei stato tu cambia la password.");
            io.to(socket.id).emit("loginSuccess", { login: true });
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
        conta++;
        eventi.push(evento);
        io.to(socket.id).emit("creaSuccess", true); // Invia la risposta al client dopo la creazione dell'evento
    });

    socket.on("recuperaUser",()=>{
        const temp = utentiRegistrati.filter(element => element.email != emailGlobale);
        io.to(socket.id).emit("userSuccess", temp);
    })
    //da implementare con sql/orm
    socket.on("filtro", (dizionario) => {
        const { titolo, descrizione, tipologia, scadenza } = dizionario;
        
        const temp = eventi.filter(element => {
            return element.titolo === titolo ||
                   element.descrizione === descrizione ||
                   element.tipologia === tipologia ||
                   element.scadenza === scadenza.replace("T", " ");
        });
    
        io.to(socket.id).emit("ottieniFiltered", temp);
    });
    socket.on("ottieniEventi", (email) => {
        const temp = eventi.filter(element => {
            if (element.utenti && element.utenti.length > 4) {
                const tempUtenti = JSON.parse(element.utenti);
                if (tempUtenti.includes(email.email)) {
                    return true;
                } else {
                    return element.proprietario === email.email;
                }
            } else {
                return element.proprietario === email.email;
            }
        });
        io.to(socket.id).emit("ottieniSuccess", temp);
    });

    socket.on("completaEvento", async (idEvento) => {
        const evento = eventi.find(element => element.id == idEvento);
        if (evento && evento.proprietario === emailGlobale) {
            evento['completato'] = true;
            await invita(JSON.parse(evento.utenti) || [], evento,"creaSuccess");
            io.to(socket.id).emit("creaSuccess", true);
        } else {
            io.to(socket.id).emit("creaSuccess", false); // Invia un messaggio di errore al client
        }
    });
    
    socket.on("deleteEvento", async (idEvento) => {
        const evento = eventi.find(element => element.id == idEvento);
        if (evento && evento.proprietario === emailGlobale) {
            await invita(JSON.parse(evento.utenti) || [], evento, "creaSuccess");
            eventi = eventi.filter(element => element.id != idEvento);
            io.to(socket.id).emit("creaSuccess", true);
        } else {
            io.to(socket.id).emit("creaSuccess", false); // Invia un messaggio di errore al client
        }
    });

    socket.on("disconnect", () => {
        associazioni = associazioni.filter(a => a.socket !== socket.id);
    });
});