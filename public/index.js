const email = document.getElementById("email");
const password = document.getElementById("password");
const login = document.getElementById("login");
const titolo = document.getElementById("titolo");
const descrizione = document.getElementById("descrizione");
const utenti = document.getElementById("utenti");
const creaEvento = document.getElementById("creaEvento");
const alert = document.getElementById("alert");
const crea = new bootstrap.Modal("#creaEventoForm");
const elencoEventi = document.getElementById("elencoEventi");
const evento = document.getElementById("evento");
const utentiInvitati = document.getElementById("utentiInvitati");
const tipologia = document.getElementById("tipologia");
const scadenza = document.getElementById("scadenza");
const ricTitolo = document.getElementById("ricTitolo");
const ricDescrizione = document.getElementById("ricDescrizione");
const ricTipologia = document.getElementById("ricTipologia");
const ricScadenza = document.getElementById("ricScadenza");
const ricFiltro = document.getElementById("ricFiltro");

let utentiDaInvitare = [];

const templateEvento = `
<section class="py-4">
    <div class="container">
        <div class="row">
            <div class="col-lg-8 mx-auto">
                <div class="card border-0 rounded shadow">
                    <div class="card-body p-4">
                        <h2 class="fw-bold mb-4 %COM">%TITOLO</h2>
                        <p class="mb-4">Descrizione: %DESCRIZIONE</p>
                        <p class="mb-4">Tipologia: %TIPOLOGIA</p>
                        <div class="row align-items-start">
                            <div class="col-8">
                                <div class="d-flex mb-3 align-items-center">
                                    <span class="me-3"><span><i class="bi bi-person-fill me-1"></i> Proprietario: <span class="fw-bold">%PRO</span></span></span>
                                    <span class="me-3"><i class="bi bi-people-fill me-1"></i> Scadenza: <span class="fw-bold">Il %SCA</span></span>
                                </div>
                                <span class="me-3"><i class="bi bi-people-fill me-1"></i> Invitati: <span class="fw-bold">%INV</span></span>
                            </div>
                            <div class="col-4"> 
                                <div class="d-flex flex-column">
                                    <button class="mb-2 btn btn-danger eliminaEvento" id="%ID" %BELIMINA>Elimina</button>
                                    <button class="mb-2 btn btn-warning text-light modificaEvento" %DIS id="%ID">Modifica</button>
                                    <button class="mb-2 btn btn-success completaEvento" id="%ID" %DIS>Completa</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
`;

const render = (element) => {
    spinner.classList.remove("d-none");
    if (element) {
        if (element.length > 0) {
            elencoEventi.innerHTML = "";
            element.reverse().map(val => {
                if (val) {
                    const email = sessionStorage.getItem("email");
                    const regex = new RegExp("\\b" + email + "\\b");
                    const { id, titolo, descrizione, completato, tipo, proprietario, utenti, dataOraScadenza } = val;
                    let ut = JSON.parse(utenti);
                    let risultato = "";
                    if (ut.length > 0) {
                        ut.forEach(utente =>{
                            risultato += utente.email;
                        })
                        if (risultato.includes(email)) {
                            risultato = risultato.toString().replace(regex, "Tu");
                        }
                    } else {
                        risultato = "Nessuno";
                    }
                    console.log(ut);
                    risultato = risultato.substring(0, 30);
                    const completatoClass = completato ? "text-success" : "text-black";
                    const disabledAttr = completato ? "disabled" : "";
                    const disElimina = proprietario != sessionStorage.getItem("email") ? "disabled" : "";
                    elencoEventi.innerHTML += templateEvento
                        .replaceAll("%COM", completatoClass)
                        .replaceAll("%DIS", disabledAttr)
                        .replaceAll("%ID", id)
                        .replace("%TITOLO", titolo)
                        .replace("%DESCRIZIONE", descrizione)
                        .replace("%PRO", proprietario == sessionStorage.getItem("email") ? "Tu" : proprietario)
                        .replace("%INV", risultato.substring(0, 30))
                        .replace("%TIPOLOGIA", tipo)
                        .replace("%BELIMINA", disElimina)
                        .replace("%SCA", dataOraScadenza.replace("T", " alle "));
                }
            })
            //Gestione click button - completa evento
            document.querySelectorAll(".completaEvento").forEach(button => {
                button.onclick = () => {
                    socket.emit("completaEvento", {email: sessionStorage.getItem("email") , idEvento:button.id});
                }
            })
            //Gestione click button - elimina evento
            document.querySelectorAll(".eliminaEvento").forEach(button =>{
                button.onclick = () =>{
                    socket.emit("deleteEvento", {idEvento:button.id, email: sessionStorage.getItem("email")});
                }
            })
            //Gestione click button - modifica evento
            document.querySelectorAll(".modificaEvento").forEach(button =>{
                button.onclick = () =>{
                    console.log("modifica evento");
                    socket.emit("recuperaUser");
                    //Compilo la card

                    //socket.emit("modificaEvento", button.id);
                }
            })
        }else{
            elencoEventi.innerHTML = "";
        }
    }
    spinner.classList.add("d-none");
}
window.onload = () => {
    if (sessionStorage.getItem("login")) {
        form.classList.add("d-none");
        riservata.classList.remove("d-none");
        titolo.value = descrizione.value = tipologia.value = scadenza.value = "";
        socket.emit("login", {
            email: sessionStorage.getItem("email"),
            password: sessionStorage.getItem("password")
        });
    } else {
        form.classList.remove("d-none");
        riservata.classList.add("d-none");
    }
    spinner.classList.add("d-none");
}


creaEvento.onclick = () => {
    if(titolo.value != "" && descrizione.value != "" && tipologia.value != "" && scadenza.value != ""){
        socket.emit("creaEvento", {
            titolo: titolo.value,
            descrizione: descrizione.value,
            utenti: JSON.stringify(utentiDaInvitare),
            tipologia: tipologia.value,
            scadenza: scadenza.value
        });
        crea.hide();
        utentiDaInvitare = [];
    }
}
evento.onclick = () =>{
    spinner.classList.remove("d-none");
    socket.emit("recuperaUser");
}

socket.on("userSuccess",(element)=>{
    utenti.innerHTML = "<option value='' selected>Inserisci un invitato</option>";
    element.forEach(user =>{
        utenti.innerHTML +=  ("<option value='%EMAIL'>%USER</option>").replace("%EMAIL",user.email).replace("%USER",user.nome);
    });
    spinner.classList.add("d-none");
    crea.show();
})
socket.on("loginSuccess", (message) => {
    alert.classList.add("d-none");
    if (message.login) {
        email.classList.remove("border-danger");
        password.classList.remove("border-danger");
        riservata.classList.remove("d-none");
        form.classList.add("d-none");
        sessionStorage.setItem("login", true);
        if (!sessionStorage.getItem("email")) {
            sessionStorage.setItem("email", email.value);
            sessionStorage.setItem("password", password.value);
        }
        socket.emit("ottieniEventi", {
            email: sessionStorage.getItem("email")
        });
    } else {
        alert.classList.remove("d-none");
        email.classList.add("border-danger");
        password.classList.add("border-danger");
    }
    spinner.classList.add("d-none");
})

socket.on("creaSuccess", (message) => {
    spinner.classList.add("d-none");
    socket.emit("ottieniEventi", {
        email: sessionStorage.getItem("email")
    });
})
socket.on("invito", (invito) => {
    spinner.classList.add("d-none");
    socket.emit("ottieniEventi", {
        email: sessionStorage.getItem("email")
    });
})
socket.on("ottieniSuccess", (data) => {
    render(data);
})

login.onclick = () => {
    spinner.classList.remove("d-none");
    socket.emit("login", {
        email: email.value,
        password: password.value
    });
}


utenti.addEventListener("change", (event) => {
    spinner.classList.remove("d-none");
    const selectedValue = event.target.value;
    if (selectedValue && selectedValue !== "") {
        if (!utentiDaInvitare.includes(selectedValue)) {
            utentiDaInvitare.push(selectedValue);
            let html = "";
            utentiDaInvitare.forEach(utente => {
                html += ("<p>%USER <button class='btn btn-danger btn-sm elUser' id='%USER'>Elimina</button></p>").replaceAll("%USER", utente);
            });
            utentiInvitati.innerHTML = html;
            document.querySelectorAll(".elUser").forEach(button =>{
                button.onclick = () =>{
                    utentiDaInvitare = utentiDaInvitare.filter(element => element != button.id);
                    let html = "";
                    utentiDaInvitare.forEach(utente => {
                        html += ("<p>%USER <button class='btn btn-danger btn-sm elUser' id='%USER'>Elimina</button></p>").replaceAll("%USER", utente);
                    });
                    utentiInvitati.innerHTML = html;
                }
            })
        } 
    }
    spinner.classList.add("d-none");
    utenti.value = "";
});
window.addEventListener('beforeunload', function(event) {
    spinner.classList.remove("d-none");
});
ricFiltro.onclick = () =>{
    spinner.classList.remove("d-none");
    if(ricTitolo.value == "" &&  ricDescrizione.value == "" && ricTipologia.value == "" && ricScadenza.value == "" ){
        socket.emit("ottieniEventi", {
            email: sessionStorage.getItem("email")
        });
    }else{
        socket.emit("filtro",({
            email: sessionStorage.getItem("email"),
            titolo: ricTitolo.value, 
            descrizione: ricDescrizione.value, 
            tipologia: ricTipologia.value, 
            scadenza: ricScadenza.value
        }));
        ricTitolo.value = ricDescrizione.value = ricTipologia.value = ricScadenza.value = "";
    }
}
socket.on("ottieniFiltered", (data) => {
    render(data);
})