const sqlite3 = require("sqlite3");

//da trasformare sequelize in sql 

const Database = async (conf) => {
    const db = new sqlite3.Database(conf.db);
    db.run(`CREATE TABLE IF NOT EXISTS User (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        nome TEXT,
        cognome TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS Evento (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT,
        titolo TEXT,
        descrizione TEXT,
        dataOraScadenza TEXT,
        completato TEXT,
        idUser INT,
        FOREIGN KEY (idUser) REFERENCES User(id) ON DELETE CASCADE ON UPDATE CASCADE
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS Invitare (
        idUser INTEGER,
        idEvento INTEGER,
        PRIMARY KEY (idUser, idEvento),
        FOREIGN KEY (idUser) REFERENCES User(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (idEvento) REFERENCES Evento(id) ON DELETE CASCADE ON UPDATE CASCADE
    )`);

    // Funzione per eseguire query SQLite in modo asincrono e restituire una promessa
    function queryAsync(query, params) {
        return new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    //Funzione per la gestione della registrazione di un utente
    const registrati = async function (email, password, nome, cognome) {
        try {
            const checkEmailQuery = "SELECT * FROM User WHERE email = ?";
            const rows = await queryAsync(checkEmailQuery, [email]);
            if (rows && rows.length > 0) {
                return { result: false };
            }
            const insertUserQuery = "INSERT INTO User(email, password, nome, cognome) VALUES (?, ?, ?, ?)";
            await queryAsync(insertUserQuery, [email, password, nome, cognome]);
            return { result: true };
        } catch (error) {
            return { result: false };
        }
    };

    // Funzione per aggiornare le informazioni dell'utente tranne l'email
    const update = async function (email, password, nome, cognome) {
        try {
            // Verifica se l'utente esiste nel database
            const user = await queryAsync('SELECT * FROM User WHERE email = ?', [email]);
            if (user.length > 0) {
                let updateQuery = 'UPDATE User SET ';
                let params = [];
                if (password !== "") {
                    updateQuery += 'password = ?, ';
                    params.push(password);
                }
                if (nome !== "") {
                    updateQuery += 'nome = ?, ';
                    params.push(nome);
                }
                if (cognome !== "") {
                    updateQuery += 'cognome = ?, ';
                    params.push(cognome);
                }
                updateQuery = updateQuery.slice(0, -2) + ' WHERE email = ?';
                params.push(email);
                await queryAsync(updateQuery, params);
                return { result: true };
            } else {
                return { result: false };
            }
        } catch (e) {
            return { result: false };
        }
    };
    //Funzione per ottenere le info di un utente
    const getInfo = async function (email) {
        try {
            const queryUno = "SELECT * FROM User WHERE email = ?";
            const rows = await queryAsync(queryUno, [email]);
            return { result: rows[0] || "error" };
        } catch (e) {
            return { result: false };
        }
    }

    //Funzione per aggiornare la password di un utente
    const aggiornaPassword = async function (email, password) {
        try {
            const queryUno = "SELECT * FROM User WHERE email = ?";
            const rows = await queryAsync(queryUno, [email]);
            if (rows && rows.length > 0) {
                const update = "UPDATE  User SET password = ? WHERE email = ?";
                await queryAsync(update, [password, email]);
                return { result: true };
            } else {
                return { result: false };
            }
        } catch (e) {
            return { result: false };
        }
    }

    //Funzione per effettuare il login
    const login = async function (email, password) {
        try {
            // Se l'email non esiste già, procedi con l'inserimento dell'utente
            const queryUno = "SELECT * FROM User WHERE email = ? AND PASSWORD = ?";
            const rows = await queryAsync(queryUno, [email, password]);
            if (rows && rows.length > 0) {
                return { result: true };
            } else {
                return { result: false };
            }
        } catch (e) {
            return { result: false };
        }
    }

    //Funzione per creare un evento - da finire
    const creaEvento = async function (evento) {
        try {
            const { tipologia, titolo, descrizione, dataOraScadenza, completato, proprietario, utenti, scadenza} = evento;
            const utenteProprietarioQuery = "SELECT * FROM User WHERE email = ?";
            const utenteProprietarioRows = await queryAsync(utenteProprietarioQuery, [proprietario]);
            if (!utenteProprietarioRows || utenteProprietarioRows.length === 0) {
                return { result: false, message: "Utente proprietario non trovato" };
            }
            const utenteProprietario = utenteProprietarioRows[0];
            const inserisciEventoQuery = `
                INSERT INTO Evento (tipo, titolo, descrizione, dataOraScadenza, completato, idUser)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            const nuovoEventoParams = [tipologia, titolo || "Nessun titolo", descrizione || "Nessuna descrizione", scadenza || new Date().toISOString(), completato || "false", utenteProprietario.id];
            await queryAsync(inserisciEventoQuery, nuovoEventoParams);
            const eventoAppenaCreatoQuery = "SELECT last_insert_rowid() AS lastID";
            const eventoAppenaCreatoRows = await queryAsync(eventoAppenaCreatoQuery);
            const eventoID = eventoAppenaCreatoRows[0].lastID;
            if (utenti && utenti.length > 0) {
                const utentiTemp = JSON.parse(utenti)
                for (const invitato of utentiTemp) {
                    const utenteInvitatoQuery = "SELECT * FROM User WHERE email = ?";
                    const utenteInvitatoRows = await queryAsync(utenteInvitatoQuery, [invitato]);
                    if (utenteInvitatoRows && utenteInvitatoRows.length > 0) {
                        const utenteInvitato = utenteInvitatoRows[0];
                        const aggiungiInvitatoQuery = "INSERT INTO Invitare (idUser, idEvento) VALUES (?, ?)";
                        await queryAsync(aggiungiInvitatoQuery, [utenteInvitato.id, eventoID]);
                    }
                }
            }
            return { result: true };
        } catch (error) {
            return { result: false }
        }
    }

    //Funzione di ricerca tramite filtro
    const filtro = async function (email, titolo, descrizione, tipologia, scadenza) {
        try {
            const params = [];
            let query = 'SELECT * FROM Evento WHERE 1=1 ';
            if (titolo && titolo != "") {
                query += 'AND titolo = ? ';
                params.push(titolo);
            }
            if (descrizione && descrizione != "") {
                query += 'AND descrizione = ? ';
                params.push(descrizione);
            }
            if (tipologia && tipologia != "") {
                query += 'AND tipo = ? ';
                params.push(tipologia);
            }
            if (scadenza && scadenza != "") {
                const scadenzaFormattata = scadenza.replace("T", " ");
                query += 'AND scadenza = ? ';
                params.push(scadenzaFormattata);
            }
            const utente = await queryAsync('SELECT * FROM User WHERE email = ?', [email]);
            if (!utente || utente.length === 0) {
                return { result: [] };
            }
            const eventi = await queryAsync(query, params);
            const temp = [];
            for (let i = 0; i < eventi.length; i++) {
                if(eventi[i].idUser == utente[0].id){
                    const evento = eventi[i];
                    const invitati = await queryAsync(`
                        SELECT User.* 
                        FROM Invitare 
                        INNER JOIN User ON Invitare.idUser = User.id
                        WHERE idEvento = ?
                    `, [evento.id]);
                    eventi[i].utenti = JSON.stringify(invitati || []);
                    eventi[i].proprietario = utente[0].nome;
                    eventi[i].completato = eventi[i].completato == "true" ? true : false;
                    temp.push(eventi[i]);
                }
            }
            return { result: temp };
        } catch (error) {
            return { result: [] };
        }
    };


    //Funzione per completare l'evento - manca la gestione degli invitati
    const completa = async function (idEvento) {
        try {
            const sql = "UPDATE Evento SET completato = 'true' WHERE id = ?";
            await queryAsync(sql, idEvento);
            return { result: true};
        } catch (e) {
            return { result: false};
        }
    }
    //Funzione per completare l'evento - manca la gestione degli invitati
    const elimina = async function (email) {
        try {
            const sql = "DELETE FROM User WHERE email = ?";
            await queryAsync(sql, email);
            return { result: true};
        } catch (e) {
            return { result: false};
        }
    }
    const recuperaUser = async function (email) {
        try {
            const queryUno = "SELECT nome, email FROM User WHERE email <> ?";
            const rows = await queryAsync(queryUno, [email]);
            const resultArray = [];
            rows.forEach(row => {
                const { nome, email } = row;
                resultArray.push({ nome, email });
            });
            return { result: resultArray };
        } catch (error) {
            return { result: [] };
        }
    };
    

    //Funzione per cancellare l'evento - quando lo cancello devo restituire gli invitati
    const cancella = async function (idEvento) {
        try {
            const sql = "DELETE FROM Evento WHERE id=?";
            await queryAsync(sql, [idEvento]);
            return {result: true};
        } catch (e) {
            return { result: false };
        }
    }

    const invitati = async (eventiInvitati) => {
        const eventi = [];
        for (let index = 0; index < eventiInvitati.length; index++) {
            const element = eventiInvitati[index];
            const eventoDettaglio = await queryAsync('SELECT * FROM Evento WHERE id = ?', [element.idEvento]);
            eventoDettaglio[0].completato = element.completato === "true" ? true : false;
            eventoDettaglio[0].proprietario = eventoDettaglio[0].idUser;
            const invitatiRows = await queryAsync('SELECT * FROM Invitare WHERE idEvento = ?', [element.idEvento]);
            const invitati = [];
            for (const invitatoRow of invitatiRows) {
                const invitato = await queryAsync('SELECT * FROM User WHERE id = ?', [invitatoRow.idUser]);
                invitati.push(invitato[0].email);
            }
            eventoDettaglio[0].utenti = JSON.stringify(invitati);
            const proprietarioEvento = await queryAsync('SELECT * FROM User WHERE id = ?', [eventoDettaglio[0].idUser]);
            eventoDettaglio[0].proprietario = proprietarioEvento[0].email;
            eventi.push(eventoDettaglio[0]);
        }
        return eventi;
    };
    
    //Funzione per ottenere gli eventi associati - non prende quelli a cui sono stato invitato
    const getEventi = async (email) => {
        try {
            const utente = await queryAsync('SELECT * FROM User WHERE email = ?', [email.email]);
            if (!utente || utente.length === 0) {
                return { result: [] };
            }
    
            // Recupero degli eventi diretti dell'utente
            const eventiDiretti = await queryAsync('SELECT * FROM Evento WHERE idUser = ?', [utente[0].id]);
            for (let i = 0; i < eventiDiretti.length; i++) {
                const evento = eventiDiretti[i];
                const invitati = await queryAsync(`
                    SELECT User.* 
                    FROM Invitare 
                    INNER JOIN User ON Invitare.idUser = User.id
                    WHERE idEvento = ?
                `, [evento.id]);
                evento.utenti = JSON.stringify(invitati || []);
                evento.proprietario = utente[0].nome;
                evento.completato = evento.completato == "true" ? true : false;
            }
    
            // Recupero degli eventi a cui l'utente è stato invitato
            const queryInviti = "SELECT * FROM Invitare WHERE idUser = ?";
            const eventiInvitati = await queryAsync(queryInviti, [utente[0].id]);
            const eventiInvitatiDettagliati = await invitati(eventiInvitati);
    
            return { result: [...eventiDiretti, ...eventiInvitatiDettagliati] };
        } catch (error) {
            return { result: [] };
        }
    };
    

    //gestione eventi invitati
    return {
        registrati,
        update,
        getInfo,
        aggiornaPassword,
        login,
        recuperaUser,
        filtro,
        getEventi,
        creaEvento,
        cancella,
        completa,
        elimina
    }

}
module.exports = Database;