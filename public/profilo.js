const nome = document.getElementById("nome");
const cognome = document.getElementById("cognome");
const username = document.getElementById("username");
const password = document.getElementById("password");
const aggiorna = document.getElementById("aggiorna");
const eliminami = document.getElementById("eliminami");


window.onload = async() =>{
    spinner.classList.remove("d-none");
    const email = sessionStorage.getItem("email")
    //if(email){
        let rsp = await fetch("/getInfo",{
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                email: email
            })
        });
        rsp = await rsp.json();
        if(rsp.result != "error"){
            if(rsp.result.nome && rsp.result.cognome && rsp.result.email){
                nome.value = rsp.result.nome;
                cognome.value = rsp.result.cognome;
                username.value = rsp.result.email;
            }
        }
    /*}else{
        window.location.href = "./index.html";
    }*/
    spinner.classList.add("d-none");
}
aggiorna.onclick = async() =>{
    spinner.classList.remove("d-none");
    let rsp = await fetch("/aggiorna",{
        method: "POST",
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify({
            nome: nome.value,
            cognome: cognome.value,
            email: username.value,
            password: password.value
        })
    });
    if(password.value != ""){
        sessionStorage.setItem("password", password.value);
    }
    rsp = await rsp.json();
    spinner.classList.add("d-none");
}

eliminami.onclick = async() =>{
    spinner.classList.remove("d-none");
    let rsp = await fetch("/elimina",{
        method: "POST",
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify({
            email: username.value
        })
    })
    rsp = await rsp.json();
    if(rsp.result){
        sessionStorage.clear();
        window.location.href = "./index.html";
    }
    spinner.classList.add("d-none");
}