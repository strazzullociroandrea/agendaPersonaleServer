const riservata = document.getElementById("riservata");
const form = document.getElementById("formLogin");
const spinner = document.getElementById("spinner");
const logout = document.getElementById("logout");
let socket = io();
//Gestione del button di logout
logout.onclick = () =>{
    sessionStorage.clear();
    window.location.href="index.html";
    riservata.classList.add("d-none");
    form.classList.remove("d-none");
}