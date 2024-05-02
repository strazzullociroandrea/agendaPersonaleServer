const sqlite3 = require("sqlite3");
const { Sequelize, DataTypes } = require('sequelize');

const Database = async (conf) => {
    const sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: conf.db,
        logging: (sql) => {
            //  console.log(sql); //<-- per visualizzare in console le query sql che esegue
        }
    });
    //tabelle
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        email: {
            type: DataTypes.STRING,
            unique: true
        },
        password: DataTypes.STRING,
        nome: DataTypes.STRING,
        cognome: DataTypes.STRING,
    }, {
        timestamps: false
    });

    const Evento = sequelize.define('Evento', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        tipo: DataTypes.STRING,
        titolo: DataTypes.STRING,
        descrizione: DataTypes.TEXT,
        dataOraScadenza: DataTypes.STRING,
        completato: DataTypes.STRING
    }, {
        timestamps: false
    });

    const Invitare = sequelize.define('Invitare', {
        idUser: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        idEvento: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        }
    }, {
        timestamps: false
    });

    // Definizione delle chiavi esterne
    Evento.belongsTo(User, { foreignKey: { name: 'idUser', onDelete: 'CASCADE', onUpdate: 'CASCADE' } });
    User.hasMany(Evento, { foreignKey: { name: 'idUser', onDelete: 'CASCADE', onUpdate: 'CASCADE' } });
    User.belongsToMany(Evento, { through: Invitare, foreignKey: 'idUser', otherKey: 'idEvento', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    Evento.belongsToMany(User, { through: Invitare, foreignKey: 'idEvento', otherKey: 'idUser', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    await sequelize.sync();
    //Funzione per la gestione della registrazione di un utente
    const registrati = async function (email, password, nome, cognome) {
        try {
            let user = await User.findOne({
                where: {
                    email: email
                }
            })
            if (user) {
                return { result: false };
            } else {
                await User.create({ email: email, password: password, nome: nome, cognome: cognome });
                return { result: true };
            }
        } catch (e) {
            console.log(e);
            return { result: false };
        }

    }
    //funzione per aggiornare le informazioni dell'utente tranne l'email
    const update = async function (email, password, nome, cognome) {
        try {
            let user = await User.findOne({
                where: {
                    email: email
                }
            });
            if (user) {
                if (password !== "") {
                    user.password = password;
                }
                if (nome !== "") {
                    user.nome = nome;
                }
                if (cognome !== "") {
                    user.cognome = cognome;
                }
                await user.save();
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
            let user = await User.findOne({
                where: {
                    email: email
                }
            });
            return { result: user || "error" };
        } catch (e) {
            return { result: false };
        }
    }

    //Funzione per aggiornare la password di un utente
    const aggiornaPassword = async function (email, password) {
        try {
            let user = await User.findOne({
                where: {
                    email: email
                }
            });
            if (user) {
                await user.update({ password: password });
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
            let user = await User.findOne({
                where: {
                    email: email,
                    password: password
                }
            });
            if (user) {
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
    const { tipo, titolo, descrizione, dataOraScadenza, completato, proprietario, invitati } = evento;

    try {
        // Trova l'utente proprietario dell'evento
        const utenteProprietario = await User.findOne({
            where: {
                email: proprietario
            }
        });

        if (!utenteProprietario) {
            return { result: false, message: "Utente proprietario non trovato" };
        }

        // Crea l'evento associandolo all'utente proprietario
        const nuovoEvento = await utenteProprietario.createEvento({
            tipo: tipo,
            titolo: titolo || "Nessun titolo",
            descrizione: descrizione || "Nessuna descrizione",
            dataOraScadenza: dataOraScadenza || new Date().toISOString(),
            completato: completato || "false"
        });

        // Se sono stati forniti invitati, associa gli utenti invitati all'evento
        if (invitati && invitati.length > 0) {
            for (const invitato of invitati) {
                const utenteInvitato = await User.findOne({
                    where: {
                        email: invitato.email
                    }
                });

                if (utenteInvitato) {
                    await nuovoEvento.addUser(utenteInvitato);
                }
            }
        }

        return { result: true, message: "Evento creato con successo" };
    } catch (error) {
        console.error(error);
        return { result: false, message: "Errore durante la creazione dell'evento" };
    }
}

    //Funzione per recuperare gli user.email != email
    const recuperaUser = async function (email) {
        try {
            const users = await User.findAll({
                where: {
                    email: {
                        [Sequelize.Op.not]: email
                    }
                }
            });
            const array = [];
            users.forEach(element =>{
                array.push({
                    nome: element.dataValues.nome,
                    email: element.dataValues.email 
                })
            })
            return { result: array };
        } catch (error) {
            return { result: [] };
        }
    };

    //Funzione di ricerca tramite filtro
    const filtro = async function (titolo, descrizione, tipologia, scadenza) {
        try {
            const condizioni = {};
            if (titolo) {
                condizioni.titolo = titolo;
            }
            if (descrizione) {
                condizioni.descrizione = descrizione;
            }
            if (tipologia) {
                condizioni.tipologia = tipologia;
            }
            if (scadenza) {
                const scadenzaFormattata = scadenza.replace("T", " ");
                condizioni.scadenza = scadenzaFormattata;
            }
            const risultati = await Evento.findAll({
                where: condizioni
            });
            return { result: risultati || [] };
        } catch (error) {
            return { result: [] };
        }
    }

    //Funzione per completare l'evento - join da controllare
    const completa = async function(idEvento){
        try{
            // Esegui INNER JOIN tra la tabella degli eventi e quella di associazione (Invitare) per ottenere gli utenti invitati
            const risultato = await Evento.findOne({
                where: {
                    id: idEvento
                },
                include: [
                    {
                        model: User, // Modello degli utenti
                        attributes: ['id', 'email', 'nome', 'cognome'], // Seleziona solo i dettagli necessari degli utenti
                        through: { attributes: [] } // Escludi le colonne di associazione (idUser e idEvento) dalla query
                    }
                ]
            });
    
            if (risultato) {
                // Esegui il completamento dell'evento
                await risultato.update({ completato: "true" });
    
                // Ottieni l'elenco degli utenti invitati
                const invitati = risultato.Users.map(user => ({
                    id: user.id,
                    email: user.email,
                    nome: user.nome,
                    cognome: user.cognome
                }));
    
                return { result: true, evento: risultato, invitati: invitati };
            } else {
                return { result: false, evento: null, invitati: [] };
            }
        } catch(e) {
            return { result: false, evento: null, invitati: [] };
        }
    }
    

    //Funzione per cancellare l'evento - join da controllare
    const cancella = async function(idEvento){
        try{
            // Esegui INNER JOIN tra la tabella degli eventi e quella di associazione (Invitare) per ottenere gli utenti invitati
            const risultato = await Evento.findOne({
                where: {
                    id: idEvento
                },
                include: [
                    {
                        model: User, // Modello degli utenti
                        attributes: ['id', 'email', 'nome', 'cognome'], // Seleziona solo i dettagli necessari degli utenti
                        through: { attributes: [] } // Escludi le colonne di associazione (idUser e idEvento) dalla query
                    }
                ]
            });
    
            if (risultato) {
                // Esegui l'eliminazione dell'evento
                await Evento.destroy({
                    where: {
                        id: idEvento
                    }
                });
    
                // Ottieni l'elenco degli utenti invitati
                const invitati = risultato.Users.map(user => ({
                    id: user.id,
                    email: user.email,
                    nome: user.nome,
                    cognome: user.cognome
                }));
    
                return { result: true, evento: risultato, invitati: invitati };
            } else {
                return { result: false, evento: null, invitati: [] };
            }
        } catch(e) {
            return { result: false, evento: null, invitati: [] };
        }
    }
    
    //Funzione per ottenere gli eventi associati - join da controllare
    const getEventi = async (email) => {
        try {
            // Trova l'utente con l'email fornita
            const utente = await User.findOne({
                where: {
                    email: email
                }
            });
    
            if (!utente) {
                return { result: [], invitati: [] }; // Utente non trovato, restituisce un array vuoto di eventi e invitati
            }
    
            // Recupera tutti gli eventi associati all'utente
            const eventi = await utente.getEventos({
                include: [
                    {
                        model: User, // Modello degli utenti (per gli invitati)
                        attributes: ['id', 'email', 'nome', 'cognome'], // Seleziona solo i dettagli necessari degli utenti invitati
                        through: { attributes: [] } // Escludi le colonne di associazione (idUser e idEvento) dalla query
                    }
                ]
            });
    
            // Prepara un array per gli invitati di tutti gli eventi
            const invitati = eventi.flatMap(evento => evento.Users.map(user => ({
                id: user.id,
                email: user.email,
                nome: user.nome,
                cognome: user.cognome
            })));
            eventi["invitati"] = invitati
            return { result: eventi};
        } catch (error) {
            
            return { result: []}; // Restituisce un array vuoto in caso di errore
        }
    };
    

    return {
        registrati,
        update,
        getInfo,
        aggiornaPassword,
        login,
        recuperaUser,
        filtro,
        completa,
        cancella,
        getEventi,
        creaEvento
    }

}
module.exports = Database;