const email = document.getElementById("email");
const password = document.getElementById("password");
const nome = document.getElementById("nome");
const cognome = document.getElementById("cognome");
const registrati = document.getElementById("registrati");
const alert = document.getElementById("alert");
const messageAlert = document.getElementById("messageAlert");
const spinner = document.getElementById("spinner");

registrati.onclick = async() =>{
    spinner.classList.remove("d-none");
    let rsp = await fetch("/register",{
        method: "POST",
        headers: {
            "content-type" : "Application/json"
        },
        body: JSON.stringify({email: email.value, password: password.value, nome: nome.value, cognome: cognome.value})
    });
    rsp = await rsp.json();
    alert.classList.add("d-none");
    if(rsp.result){
        email.value = password.value = nome.value = cognome.value = "";
        alert.classList.remove("d-none");
        messageAlert.innerText = "Utente creato con successo, a breve sarai reindirizzato alla pagina di login";
        setTimeout(()=>{
            window.location.href = "./index.html";
        }, 5000)
    }else{
        alert.classList.remove("d-none");
        messageAlert.innerText = "Non è stato possibile registrarsi";
    }
    spinner.classList.add("d-none");
}