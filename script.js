import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. CONFIGURATION FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyBN6FZF8IsUVxR9MZLFP14Rr-MAZ6hVvzQ",
    authDomain: "hairtisticbarber.firebaseapp.com",
    projectId: "hairtisticbarber",
    storageBucket: "hairtisticbarber.firebasestorage.app",
    messagingSenderId: "414584902601",
    appId: "1:414584902601:web:f21b9e62d1ea4d144c0e18",
    measurementId: "G-CFE4JXP1VD"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let salesData = [];
let stockData = [];
let panier = [];

// 2. FONCTIONS GLOBALES (Accessibles depuis le HTML)
window.toggleModal = (id) => {
    const m = document.getElementById(id);
    if (m) m.style.display = (m.style.display === "block") ? "none" : "block";
};

window.toggleSidebar = () => {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.toggle('show');
    if (backdrop) backdrop.style.display = (backdrop.style.display === "block") ? "none" : "block";
};

// Gestion de la date en direct
function updateLiveDate() {
    const dateEl = document.getElementById('live-date');
    if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.innerText = new Date().toLocaleDateString('fr-FR', options);
    }
}

// 3. GESTION DES PRESTATIONS (ADMIN)
window.handleDashboardSale = async (e) => {
    e.preventDefault();
    const clientName = document.getElementById('client-name').value || "Client Passant";
    const priceValue = parseInt(document.getElementById('price-input').value);

    try {
        await addDoc(collection(db, "sales"), {
            client: clientName,
            service: document.getElementById('service-select').value,
            price: priceValue,
            payment: document.getElementById('payment-method').value,
            status: "Payé",
            date: new Date().toLocaleDateString('fr-FR'),
            time: new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}),
            timestamp: new Date()
        });
        window.toggleModal('modal-coupe');
        e.target.reset();
    } catch (err) { alert("Erreur : " + err.message); }
};

// 4. GESTION DES STOCKS (IMAGES EN BASE64)
const productForm = document.getElementById('product-form');
if (productForm) {
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = document.getElementById('prod-image').files[0];
        const reader = new FileReader();

        reader.onloadend = async () => {
            try {
                await addDoc(collection(db, "stock"), {
                    name: document.getElementById('prod-name').value,
                    description: document.getElementById('prod-desc').value,
                    price: parseInt(document.getElementById('prod-price').value),
                    quantity: parseInt(document.getElementById('prod-qty').value),
                    image: reader.result,
                    timestamp: new Date()
                });
                alert("Produit ajouté au catalogue !");
                window.toggleModal('modal-produit');
                productForm.reset();
            } catch (err) { alert("Erreur : " + err.message); }
        };
        if (file) reader.readAsDataURL(file);
    });
}

// 5. RENDU DES TABLES (Sécurisé)
function renderTables() {
    // Table Dashboard
    const homeTable = document.getElementById('home-sales-table');
    if (homeTable) {
        homeTable.innerHTML = salesData.slice(0, 5).map(s => `
            <tr>
                <td>${s.time}</td>
                <td>${s.client}</td>
                <td>${s.service}</td>
                <td><b>${s.price.toLocaleString()} F</b></td>
            </tr>`).join('');
    }

    // Table Stocks
    const stockTable = document.getElementById('stock-table');
    if (stockTable) {
        stockTable.innerHTML = stockData.map(p => `
            <tr>
                <td><img src="${p.image}" style="width:40px; height:40px; border-radius:5px; object-fit:cover;"></td>
                <td>${p.name}</td>
                <td>${p.price.toLocaleString()} F</td>
                <td>${p.quantity}</td>
                <td><button onclick="deleteProduct('${p.id}')" style="color:red; border:none; background:none; cursor:pointer;">Supprimer</button></td>
            </tr>`).join('');
    }
}

window.deleteProduct = async (id) => {
    if (confirm("Supprimer ce produit ?")) await deleteDoc(doc(db, "stock", id));
};

// 6. INITIALISATION
document.addEventListener('DOMContentLoaded', () => {
    updateLiveDate();

    // Formulaire Dashboard
    const saleForm = document.getElementById('sale-form');
    if (saleForm) saleForm.addEventListener('submit', window.handleDashboardSale);

    // Écoute des ventes
    onSnapshot(query(collection(db, "sales"), orderBy("timestamp", "desc")), (snap) => {
        salesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTables();
        
        // Mise à jour metrics Dashboard
        const today = new Date().toLocaleDateString('fr-FR');
        const todaySales = salesData.filter(s => s.date === today);
        const revEl = document.getElementById('total-revenue');
        if (revEl) revEl.innerText = todaySales.reduce((sum, s) => sum + s.price, 0).toLocaleString() + " FCFA";
        const cliEl = document.getElementById('total-clients');
        if (cliEl) cliEl.innerText = todaySales.length;
    });

    // Écoute des stocks
// Écoute des stocks
    onSnapshot(collection(db, "stock"), (snap) => {
        stockData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTables(); // Pour l'admin
        renderClientProducts(); // AJOUTE CETTE LIGNE pour le client
        
        const lowEl = document.getElementById('low-stock-count');
        if (lowEl) lowEl.innerText = stockData.filter(p => p.quantity < 5).length;
    });
});
// Fonction pour afficher les produits côté CLIENT (dans produit.html)
function renderClientProducts() {
    const grid = document.getElementById('product-list-client');
    if (grid && stockData) {
        grid.innerHTML = stockData.map(p => `
            <div class="product-card-luxe" onclick="ouvrirDetailProduit('${p.id}')" style="cursor:pointer;">
                <div style="height: 180px; overflow: hidden; border-radius: 15px; margin-bottom: 15px;">
                    <img src="${p.image}" style="width:100%; height:100%; object-fit:cover;" alt="${p.name}">
                </div>
                <h4 style="margin: 10px 0 5px 0; font-size: 1rem; color: white;">${p.name}</h4>
                <div style="color: var(--gold); font-weight: 800; font-size: 1.1rem;">${p.price.toLocaleString()} F</div>
                <button style="margin-top: 10px; background: transparent; border: 1px solid var(--gold); color: var(--gold); padding: 5px 15px; border-radius: 20px; font-size: 0.8rem; cursor: pointer;">
                    Voir détails
                </button>
            </div>
        `).join('');
    }
}
// Ouvre le détail du produit (Version Luxe)
window.ouvrirDetailProduit = (id) => {
    const produit = stockData.find(p => p.id === id);
    const detailContent = document.getElementById('detail-content');
    
    if (produit && detailContent) {
        detailContent.innerHTML = `
            <div style="background: #1a1a1c; color: white; border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                <img src="${produit.image}" style="width:100%; height:300px; object-fit:cover;">
                <div style="padding:25px;">
                    <h2 style="margin:0 0 10px 0; color: white; font-weight: 800;">${produit.name}</h2>
                    <p style="color:#a1a1aa; margin-bottom:20px; line-height:1.6;">${produit.description || 'Produit de qualité supérieure sélectionné par Hairtistique.'}</p>
                    
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <div>
                            <span style="display:block; font-size:0.8rem; color:var(--gold); text-transform:uppercase; letter-spacing:1px;">Prix</span>
                            <span style="font-size:1.5rem; font-weight:800; color:white;">${produit.price.toLocaleString()} F</span>
                        </div>
                        <div style="text-align:right;">
                            <label style="display:block; font-size:0.8rem; color:#71717a; margin-bottom:5px;">Quantité</label>
                            <input type="number" id="qte-achat" value="1" min="1" max="${produit.quantity}" 
                                style="width:60px; padding:8px; border-radius:8px; border:1px solid #444; background:#000; color:white; text-align:center;">
                        </div>
                    </div>
                    
                    <button class="btn-full" onclick="ajouterAuPanier('${produit.id}')" 
                        style="width:100%; background:var(--gold); color:black; padding:18px; border:none; border-radius:15px; font-weight:800; font-size:1rem; cursor:pointer; transition:0.3s;">
                        🛒 AJOUTER AU PANIER
                    </button>
                </div>
            </div>
        `;
        window.toggleModal('modal-produit-detail');
    }
};

// Gère le panier (Version Luxe)
window.ajouterAuPanier = (id) => {
    const produit = stockData.find(p => p.id === id);
    const qteInput = document.getElementById('qte-achat');
    const qte = parseInt(qteInput?.value || 1);

    if (produit) {
        // Vérifier si le produit est déjà dans le panier pour ne pas faire de doublons
        const indexExistant = panier.findIndex(item => item.id === id);
        if (indexExistant > -1) {
            panier[indexExistant].qte += qte;
        } else {
            panier.push({ ...produit, qte });
        }
        
        window.toggleModal('modal-produit-detail');
        document.getElementById('cart-count').innerText = panier.length;
        
        // Notification Wow au lieu d'un simple alert
        const toast = document.createElement('div');
        toast.innerHTML = `✅ ${produit.name} ajouté !`;
        toast.style = "position:fixed; bottom:100px; right:20px; background:var(--gold); color:black; padding:15px 25px; border-radius:10px; font-weight:800; z-index:3000; animation: slideIn 0.5s forwards;";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);

        renderPanier();
    }
};

function renderPanier() {
    const list = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total-price');
    if (!list) return;

    let total = 0;
    if (panier.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:#71717a; padding:20px;">Votre panier est vide</p>`;
    } else {
        list.innerHTML = panier.map((item, index) => {
            total += item.price * item.qte;
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background:rgba(255,255,255,0.03); padding:10px; border-radius:12px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${item.image}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;">
                        <div>
                            <strong style="display:block; color:white; font-size:0.9rem;">${item.name}</strong>
                            <small style="color:var(--gold);">${item.qte} x ${item.price.toLocaleString()} F</small>
                        </div>
                    </div>
                    <button onclick="retirerDuPanier(${index})" style="color:#ff4d4d; border:none; background:none; cursor:pointer; font-size:1.2rem;">&times;</button>
                </div>
            `;
        }).join('');
    }
    totalEl.innerText = total.toLocaleString();
}

// renderClientProducts();
window.handleSecretClick = () => {
    // 1. On récupère l'heure actuelle (0-23)
    const now = new Date();
    const currentHour = now.getHours(); 

    // 2. On définit la logique du mot de passe (Ex: HB + l'heure)
    // Si il est 15h30, le code sera "HB15"
    const correctPassword = "HB" + currentHour;

    // 3. On demande le code
    const userPass = prompt("Code de sécurité horaire requis :");

    if (userPass === correctPassword) {
        sessionStorage.setItem('adminAuthenticated', 'true'); // Optionnel: garde la session active
        window.location.href = "Dashboard.html";
    } else {
        alert("Code incorrect. Accès refusé.");
    }
};