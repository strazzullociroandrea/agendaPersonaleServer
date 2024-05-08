const email = document.getElementById("email");
const password = document.getElementById("password");
const reimposta = document.getElementById("reimposta");
const spinner = document.getElementById("spinner");

reimposta.onclick = async() =>{
    spinner.classList.remove("d-none");
    let rsp = await fetch("/aggiornaPassword",{
        method: "POST",
        headers:{
            "Content-type": "Application/json"
        },
        body: JSON.stringify({
            email: email.value,
            password: password.value
        })
    })
    rsp = await rsp.json();
    if(rsp.result){
        email.classList.remove("border-danger");
        password.classList.remove("border-danger");
        window.location.href = "./index.html";
    }else{
        email.classList.add("border-danger");
        password.classList.add("border-danger");
    }
    spinner.classList.add("d-none");
}