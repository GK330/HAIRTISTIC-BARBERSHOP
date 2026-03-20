import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ==========================================
// 1. CONFIGURATION FIREBASE
// ==========================================
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
const auth = getAuth(app); 

// Variables Globales
let salesData = [];
let stockData = [];
let panier = [];
let clientsData = [];
let expensesData = []; 

// ==========================================
// 2. SÉCURITÉ & AUTHENTIFICATION
// ==========================================

const currentPage = window.location.pathname;
const isAdminPage = currentPage.includes('Dashboard.html') || 
                    currentPage.includes('caisse.html') || 
                    currentPage.includes('stocks.html') || 
                    currentPage.includes('stats.html') || 
                    currentPage.includes('clients.html') ||
                    currentPage.includes('depense.html');

onAuthStateChanged(auth, (user) => {
    if (isAdminPage && !user) {
        window.location.href = "login.html";
    } else if (user && currentPage.includes('login.html')) {
        window.location.href = "Dashboard.html";
    }
});

window.logoutAdmin = () => {
    signOut(auth).then(() => {
        window.location.href = "login.html";
    });
};

// ==========================================
// 3. FONCTIONS UI & GLOBALES
// ==========================================
window.toggleModal = (id) => {
    const m = document.getElementById(id);
    if (m) {
        m.style.display = (m.style.display === "block") ? "none" : "block";

        if ((id === 'modal-coupe' || id === 'modal-depense') && m.style.display === "block") {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            
            const dateInput = document.getElementById(id === 'modal-coupe' ? 'date-input' : 'exp-date');
            if(dateInput) dateInput.value = `${year}-${month}-${day}`;
            
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            
            const timeInput = document.getElementById(id === 'modal-coupe' ? 'time-input' : 'exp-time');
            if(timeInput) timeInput.value = `${hours}:${minutes}`;
        }
    }
};

window.toggleSidebar = () => {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.toggle('show');
    if (backdrop) backdrop.style.display = (backdrop.style.display === "block") ? "none" : "block";
};

function updateLiveDate() {
    const dateEl = document.getElementById('live-date');
    if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.innerText = new Date().toLocaleDateString('fr-FR', options);
    }
}

window.showSuccessModal = (message) => {
    const overlay = document.createElement('div');
    overlay.className = 'success-modal-overlay';
    overlay.innerHTML = `
        <div class="success-modal-card">
            <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
            <h3 style="margin-bottom: 10px; color: var(--text-main); font-weight: 800;">Succès !</h3>
            <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5;">${message}</p>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        setTimeout(() => overlay.remove(), 300);
    }, 2500); // Disparaît tout seul après 2.5 secondes
};

window.showConfirmModal = (message, onConfirm) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-modal-overlay';
    overlay.innerHTML = `
        <div class="confirm-modal-card">
            <h3 style="margin-bottom: 10px; color: var(--text-main); font-weight: 800;">Attention</h3>
            <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5;">${message}</p>
            <div class="confirm-actions">
                <button class="btn-confirm-no" id="btn-cancel">Annuler</button>
                <button class="btn-confirm-yes" id="btn-confirm">Supprimer</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const closeOverlay = () => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.2s ease';
        setTimeout(() => overlay.remove(), 200);
    };

    document.getElementById('btn-cancel').onclick = closeOverlay;
    document.getElementById('btn-confirm').onclick = () => {
        closeOverlay();
        onConfirm();
    };
};

// ==========================================
// 4. BUSINESS INTELLIGENCE (STATS GLOBALES)
// ==========================================
window.updateGlobalStats = () => {
    const totalCA = salesData.reduce((sum, s) => sum + s.price, 0);
    const caEl = document.getElementById('grand-total');
    if (caEl) caEl.innerText = totalCA.toLocaleString() + " F";

    const totalExp = expensesData.reduce((sum, e) => sum + e.amount, 0);
    const expEl = document.getElementById('total-expenses');
    if (expEl) expEl.innerText = totalExp.toLocaleString() + " F";

    const net = totalCA - totalExp;
    const netEl = document.getElementById('net-profit');
    if (netEl) {
        netEl.innerText = net.toLocaleString() + " F";
        netEl.style.color = net >= 0 ? "#4ade80" : "#ff4d4d"; 
    }

    const cliCountEl = document.getElementById('stat-clients-count');
    if (cliCountEl) cliCountEl.innerText = clientsData.length;

    const prodCountEl = document.getElementById('stat-products-count');
    if (prodCountEl) prodCountEl.innerText = stockData.length;

    const avgEl = document.getElementById('avg-client');
    if (avgEl) {
        const avg = salesData.length > 0 ? (totalCA / salesData.length) : 0;
        avgEl.innerText = Math.round(avg).toLocaleString() + " F";
    }
};

// ==========================================
// 5. GESTION DES PRESTATIONS (ADMIN)
// ==========================================
window.handleDashboardSale = async (e) => {
    e.preventDefault();
    const clientName = document.getElementById('client-name').value || "Client Passant";
    const priceValue = parseInt(document.getElementById('price-input').value);
    
    const rawDate = document.getElementById('date-input').value; 
    const rawTime = document.getElementById('time-input').value; 
    const [year, month, day] = rawDate.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    const finalTimestamp = new Date(`${rawDate}T${rawTime}`);

    try {
        await addDoc(collection(db, "sales"), {
            client: clientName,
            service: document.getElementById('service-select').value,
            price: priceValue,
            payment: document.getElementById('payment-method').value,
            status: "Payé",
            date: formattedDate, 
            time: rawTime,       
            timestamp: finalTimestamp 
        });
        showSuccessModal("Prestation enregistrée avec succès !");
        window.toggleModal('modal-coupe');
        e.target.reset();
    } catch (err) { alert("Erreur : " + err.message); }
};

// ==========================================
// 6. RENDU DES TABLES ADMIN (Dashboard & Caisse)
// ==========================================
function renderTables() {
    const homeTable = document.getElementById('home-sales-table');
    if (homeTable) {
        homeTable.innerHTML = salesData.slice(0, 5).map(s => {
            const isKnown = clientsData.some(c => c.nom.toLowerCase() === s.client.toLowerCase());
            let actionHtml = (!isKnown && s.client !== "Client Passant") 
                ? `<button onclick="quickAddClientFromTable('${s.client.replace(/'/g, "\\'")}')" style="background:#c5a059; color:black; border:none; border-radius:4px; padding:6px 12px; cursor:pointer; font-weight:bold; font-size:12px; margin-right: 10px;" title="Ajouter au répertoire">Ajouter</button>`
                : ``;
            
            actionHtml += `<button onclick="deleteSale('${s.id}')" class="icon-btn" title="Supprimer la prestation">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>`;
            
            return `
                <tr>
                    <td>${s.time}</td>
                    <td>${s.client}</td>
                    <td>${s.service}</td>
                    <td><b>${s.price.toLocaleString()} F</b></td>
                    <td>${actionHtml}</td>
                </tr>`;
        }).join('');
    }

    const fullTable = document.getElementById('full-sales-table');
    if (fullTable) {
        const dataToDisplay = window.filteredSales || salesData;
        fullTable.innerHTML = dataToDisplay.map(s => {
            const isKnown = clientsData.some(c => c.nom.toLowerCase() === s.client.toLowerCase());
            const addBtn = (!isKnown && s.client !== "Client Passant") 
                ? `<button onclick="quickAddClientFromTable('${s.client.replace(/'/g, "\\'")}')" style="color:#c5a059; border:none; background:none; cursor:pointer; font-weight:bold; margin-right:15px;" title="Ajouter au répertoire">Ajouter</button>`
                : '';

            return `
                <tr>
                    <td>${s.date}</td>
                    <td>${s.time}</td>
                    <td>${s.client}</td>
                    <td>${s.service}</td>
                    <td><span style="background:#eee; padding:4px 8px; border-radius:6px; font-size:0.8rem;">${s.payment}</span></td>
                    <td><b>${s.price.toLocaleString()} F</b></td>
                    <td>
                        ${addBtn}
                        <button onclick="deleteSale('${s.id}')" class="icon-btn" title="Supprimer la prestation">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </td>
                </tr>`;
        }).join('');
    }

    const stockTable = document.getElementById('stock-table');
    if (stockTable) {
        stockTable.innerHTML = stockData.map(p => `
            <tr>
                <td><img src="${p.image}" style="width:40px; height:40px; border-radius:5px; object-fit:cover;"></td>
                <td>${p.name}</td>
                <td>${p.price.toLocaleString()} F</td>
                <td>${p.quantity}</td>
                <td>
                    <button onclick="deleteProduct('${p.id}')" class="icon-btn" title="Supprimer le produit">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </td>
            </tr>`).join('');
    }

    renderTopClients();
}

window.renderTopClients = () => {
    const tbody = document.getElementById('top-clients-table');
    if (!tbody) return;

    const clientTotals = {};
    salesData.forEach(s => {
        const name = s.client || "Client Passant";
        // On ignore les "Client Passant" car ce ne sont pas des clients fidélisables
        if (name !== "Client Passant") {
            clientTotals[name] = (clientTotals[name] || 0) + s.price;
        }
    });

    const top5 = Object.entries(clientTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    tbody.innerHTML = top5.map(([name, total], index) => {
        const rankColor = index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'var(--text-main)';
        return `
            <tr>
                <td style="font-weight:bold;"><span style="color:${rankColor}; font-size:1.1rem; margin-right:8px;">#${index+1}</span> ${name}</td>
                <td style="font-weight:bold; color:#c5a059;">${total.toLocaleString()} F</td>
            </tr>`;
    }).join('');
}

window.filterSales = () => {
    const searchName = document.getElementById('search-client').value.toLowerCase();
    const filterPay = document.getElementById('filter-payment').value;

    window.filteredSales = salesData.filter(s => {
        const matchName = s.client.toLowerCase().includes(searchName);
        const matchPay = (filterPay === 'all') || (s.payment === filterPay);
        return matchName && matchPay;
    });
    renderTables(); 
};

window.deleteSale = (id) => {
    window.showConfirmModal("Supprimer cette vente définitivement ?", async () => {
        await deleteDoc(doc(db, "sales", id));
    });
};

window.exportToExcel = () => {
    const table = document.querySelector("table");
    const wb = XLSX.utils.table_to_book(table, { sheet: "Ventes" });
    XLSX.writeFile(wb, `Rapport_Ventes_${new Date().toLocaleDateString()}.xlsx`);
};

window.deleteProduct = (id) => {
    window.showConfirmModal("Supprimer ce produit ?", async () => {
        await deleteDoc(doc(db, "stock", id));
    });
};

// ==========================================
// 7. INITIALISATION & LISTENERS FIREBASE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    updateLiveDate();

    // Connexion Admin (login.html)
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-password').value;
            const btn = loginForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "Chargement...";

            try {
                await signInWithEmailAndPassword(auth, email, password);
                window.location.href = "Dashboard.html"; 
            } catch (error) {
                alert("Erreur de connexion : Identifiants incorrects.");
                btn.innerText = originalText;
            }
        });
    }

    const saleForm = document.getElementById('sale-form');
    if (saleForm) saleForm.addEventListener('submit', window.handleDashboardSale);

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
                    showSuccessModal("Produit ajouté au catalogue !");
                    window.toggleModal('modal-produit');
                    productForm.reset();
                } catch (err) { alert("Erreur : " + err.message); }
            };
            if (file) reader.readAsDataURL(file);
        });
    }

    const clientAddForm = document.getElementById('client-add-form');
    if (clientAddForm) {
        clientAddForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await addDoc(collection(db, "clients"), {
                    nom: document.getElementById('new-client-name').value,
                    sexe: document.getElementById('new-client-sex').value,
                    numero: document.getElementById('new-client-phone').value,
                    quartier: document.getElementById('new-client-loc').value,
                    timestamp: new Date()
                });
                showSuccessModal("Client ajouté avec succès !");
                window.toggleModal('modal-add-client');
                clientAddForm.reset();
            } catch (err) { alert("Erreur : " + err.message); }
        });
    }

    const clientEditForm = document.getElementById('client-edit-form');
    if (clientEditForm) {
        clientEditForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-client-id').value;
            try {
                await updateDoc(doc(db, "clients", id), {
                    nom: document.getElementById('edit-client-name').value,
                    sexe: document.getElementById('edit-client-sex').value,
                    numero: document.getElementById('edit-client-phone').value || 'À compléter',
                    quartier: document.getElementById('edit-client-loc').value || 'À compléter'
                });
                showSuccessModal("Informations du client mises à jour !");
                window.toggleModal('modal-edit-client');
            } catch (err) { alert("Erreur : " + err.message); }
        });
    }

    const expenseForm = document.getElementById('expense-form');
    if (expenseForm) {
        expenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const rawDate = document.getElementById('exp-date').value;
            const rawTime = document.getElementById('exp-time').value;
            const [year, month, day] = rawDate.split('-');
            
            try {
                await addDoc(collection(db, "expenses"), {
                    description: document.getElementById('exp-desc').value,
                    category: document.getElementById('exp-category').value,
                    amount: parseInt(document.getElementById('exp-amount').value),
                    date: `${day}/${month}/${year}`,
                    time: rawTime,
                    timestamp: new Date(`${rawDate}T${rawTime}`)
                });
                showSuccessModal("Dépense enregistrée !");
                window.toggleModal('modal-depense');
                expenseForm.reset();
            } catch (err) { alert("Erreur : " + err.message); }
        });
    }

    // --- ECOUTES BASE DE DONNÉES (REALTIME) ---
    onSnapshot(query(collection(db, "sales"), orderBy("timestamp", "desc")), (snap) => {
        salesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTables();
        window.updateGlobalStats();
        
        const today = new Date().toLocaleDateString('fr-FR');
        const todaySales = salesData.filter(s => s.date === today);
        const revEl = document.getElementById('total-revenue');
        if (revEl) revEl.innerText = todaySales.reduce((sum, s) => sum + s.price, 0).toLocaleString() + " FCFA";
        const cliEl = document.getElementById('total-clients');
        if (cliEl) cliEl.innerText = todaySales.length;

        if (typeof updateCharts === "function") updateCharts();
    });

    onSnapshot(collection(db, "stock"), (snap) => {
        stockData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTables(); 
        if (typeof renderClientProducts === "function") renderClientProducts(); 
        
        const lowEl = document.getElementById('low-stock-count');
        if (lowEl) lowEl.innerText = stockData.filter(p => p.quantity < 5).length;
        window.updateGlobalStats();
    });

    onSnapshot(query(collection(db, "clients"), orderBy("timestamp", "desc")), (snap) => {
        clientsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (typeof window.renderClientsTable === "function") window.renderClientsTable();
        
        // Met à jour les tableaux de ventes en direct pour masquer le bouton "+" une fois le client ajouté
        try { renderTables(); } catch (e) {}

        const datalist = document.getElementById('clients-datalist');
        if (datalist) {
            datalist.innerHTML = clientsData.map(c => `<option value="${c.nom}">`).join('');
        }
        window.updateGlobalStats();
    });

    onSnapshot(collection(db, "expenses"), (snap) => {
        expensesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (typeof window.renderExpensesTable === "function") window.renderExpensesTable();
        window.updateGlobalStats();
    });
});

// ==========================================
// 8. FONCTIONS CÔTÉ CLIENT (BOUTIQUE / PANIER)
// ==========================================
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

window.ouvrirDetailProduit = (id) => {
    const produit = stockData.find(p => p.id === id);
    const detailContent = document.getElementById('detail-content');
    
    if (produit && detailContent) {
        detailContent.innerHTML = `
            <div style="background: #1a1a1c; color: white; border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                <img src="${produit.image}" style="width:100%; height:300px; object-fit:cover;">
                <div style="padding:25px;">
                    <h2 style="margin:0 0 10px 0; color: white; font-weight: 800;">${produit.name}</h2>
                    <p style="color:#a1a1aa; margin-bottom:20px; line-height:1.6;">${produit.description || 'Produit de qualité supérieure.'}</p>
                    
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

window.ajouterAuPanier = (id) => {
    const produit = stockData.find(p => p.id === id);
    const qteInput = document.getElementById('qte-achat');
    const qte = parseInt(qteInput?.value || 1);

    if (produit) {
        const indexExistant = panier.findIndex(item => item.id === id);
        if (indexExistant > -1) {
            panier[indexExistant].qte += qte;
        } else {
            panier.push({ ...produit, qte });
        }
        
        window.toggleModal('modal-produit-detail');
        document.getElementById('cart-count').innerText = panier.length;
        
        const toast = document.createElement('div');
        toast.innerHTML = ` ${produit.name} ajouté !`;
        toast.style = "position:fixed; bottom:100px; right:20px; background:var(--gold); color:black; padding:15px 25px; border-radius:10px; font-weight:800; z-index:3000; animation: slideIn 0.5s forwards;";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);

        renderPanier();
    }
};

window.retirerDuPanier = (index) => {
    panier.splice(index, 1); 
    document.getElementById('cart-count').innerText = panier.length; 
    renderPanier(); 
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
    if(totalEl) totalEl.innerText = total.toLocaleString();
}

window.finaliserCommande = () => {
    if (panier.length === 0) {
        alert("Votre panier est vide ! Ajoutez des produits avant de commander.");
        return;
    }

    const nom = document.getElementById('client-nom').value.trim();
    const tel = document.getElementById('client-tel').value.trim();
    const loc = document.getElementById('client-loc').value.trim();

    if (!nom || !tel || !loc) {
        alert("Veuillez remplir tous les champs (Nom, Téléphone et Localisation) pour valider votre commande.");
        return;
    }

    let message = `*NOUVELLE COMMANDE HAIRTISTIC* 💈\n\n`;
    message += `👤 *Client:* ${nom}\n`;
    message += `📞 *Tél:* ${tel}\n`;
    message += `📍 *Lieu:* ${loc}\n\n`;
    message += `*DÉTAILS DE LA COMMANDE:*\n`;

    let total = 0;
    panier.forEach(item => {
        const sousTotal = item.price * item.qte;
        total += sousTotal;
        message += `▪️ ${item.qte}x ${item.name} (${sousTotal.toLocaleString()} F)\n`;
    });

    message += `\n💰 *TOTAL À PAYER: ${total.toLocaleString()} F*`;

    const numeroWhatsApp = "22893701943";
    const lienWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(message)}`;
    
    window.open(lienWhatsApp, "_blank");

    panier = [];
    renderPanier();
    document.getElementById('cart-count').innerText = 0;
    if(document.getElementById('client-nom')) document.getElementById('client-nom').value = "";
    if(document.getElementById('client-tel')) document.getElementById('client-tel').value = "";
    if(document.getElementById('client-loc')) document.getElementById('client-loc').value = "";
    window.toggleModal('modal-panier'); 
};

// ==========================================
// 9. ACCÈS ADMIN & CHARTS
// ==========================================

// CORRECTION ICI : Retour en arrière d'un dossier pour trouver admin/login.html
window.handleSecretClick = () => {
    window.location.href = "../admin/login.html"; 
};

let revenueChartInstance = null;
let servicesChartInstance = null;

function updateCharts() {
    const ctxRev = document.getElementById('revenueChart');
    const ctxServ = document.getElementById('servicesChart');
    if (!ctxRev || !ctxServ) return;

    const last7Days = {};
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('fr-FR');
        last7Days[dateStr] = 0;
    }

    salesData.forEach(s => {
        if (last7Days[s.date] !== undefined) {
            last7Days[s.date] += s.price;
        }
    });

    const serviceCounts = {};
    salesData.forEach(s => {
        const serviceName = s.service || "Autre";
        serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;
    });

    if (revenueChartInstance) revenueChartInstance.destroy();
    revenueChartInstance = new Chart(ctxRev, {
        type: 'line',
        data: {
            labels: Object.keys(last7Days),
            datasets: [{
                label: 'Chiffre d\'Affaires (F)',
                data: Object.values(last7Days),
                borderColor: '#c5a059', 
                backgroundColor: 'rgba(197, 160, 89, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } } }
        }
    });

    if (servicesChartInstance) servicesChartInstance.destroy();
    servicesChartInstance = new Chart(ctxServ, {
        type: 'doughnut',
        data: {
            labels: Object.keys(serviceCounts),
            datasets: [{
                data: Object.values(serviceCounts),
                backgroundColor: ['#c5a059', '#2d3436', '#71717a', '#a1a1aa', '#1a1a1c'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#a1a1aa', padding: 20 } }
            }
        }
    });
}

// ==========================================
// 10. GESTION DU RÉPERTOIRE CLIENTS (Tableau)
// ==========================================
window.renderClientsTable = () => {
    const tableBody = document.getElementById('clients-table');
    if (!tableBody) return;

    const dataToDisplay = window.filteredClientsData || clientsData;

    tableBody.innerHTML = dataToDisplay.map(c => {
        const isIncomplete = c.numero === 'À compléter' || c.quartier === 'À compléter' || !c.numero || !c.quartier;
        const warningDot = isIncomplete ? `<span style="display:inline-block; width:10px; height:10px; background:#ff4d4d; border-radius:50%; margin-left:10px; box-shadow: 0 0 5px rgba(255, 77, 77, 0.5);" title="Profil incomplet (Numéro ou Quartier manquant)"></span>` : '';

        return `
            <tr>
                <td style="font-weight: bold; display: flex; align-items: center;">${c.nom} ${warningDot}</td>
                <td>${c.sexe}</td>
                <td>${c.numero}</td>
                <td>${c.quartier}</td>
                <td>
                    <button onclick="openEditClient('${c.id}')" style="color:#c5a059; border:none; background:none; cursor:pointer; font-weight:bold; margin-right:15px;">Compléter</button>
                    <button onclick="deleteClient('${c.id}')" class="icon-btn" title="Supprimer le client">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
};

window.deleteClient = (id) => {
    window.showConfirmModal("Supprimer ce client du répertoire ?", async () => {
        await deleteDoc(doc(db, "clients", id));
    });
};

window.openEditClient = (id) => {
    const client = clientsData.find(c => c.id === id);
    if (client) {
        document.getElementById('edit-client-id').value = client.id;
        document.getElementById('edit-client-name').value = client.nom;
        document.getElementById('edit-client-sex').value = client.sexe || 'Non précisé';
        document.getElementById('edit-client-phone').value = client.numero === 'À compléter' ? '' : client.numero;
        document.getElementById('edit-client-loc').value = client.quartier === 'À compléter' ? '' : client.quartier;
        window.toggleModal('modal-edit-client');
    }
};

window.filterClients = () => {
    const searchVal = document.getElementById('search-client-db').value.toLowerCase();
    window.filteredClientsData = clientsData.filter(c => 
        c.nom.toLowerCase().includes(searchVal) || 
        c.numero.includes(searchVal) ||
        c.quartier.toLowerCase().includes(searchVal)
    );
    renderClientsTable();
};

// ==========================================
// 11. GESTION DES DÉPENSES & AJOUT RAPIDE CLIENT
// ==========================================
window.renderExpensesTable = () => {
    const tbody = document.getElementById('expenses-table');
    if (!tbody) return;

    const sorted = [...expensesData].sort((a, b) => {
        const tA = a.timestamp?.seconds || 0;
        const tB = b.timestamp?.seconds || 0;
        return tB - tA;
    });

    tbody.innerHTML = sorted.map(e => `
        <tr>
            <td>${e.date}</td>
            <td>${e.time}</td>
            <td>${e.description}</td>
            <td><span class="badge">${e.category}</span></td>
            <td style="color:#ff4d4d; font-weight:bold;">${e.amount.toLocaleString()} F</td>
            <td>
                    <button onclick="deleteExpense('${e.id}')" class="icon-btn" title="Supprimer la dépense">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
            </td>
        </tr>
    `).join('');
};

window.deleteExpense = (id) => {
    window.showConfirmModal("Supprimer cette dépense définitivement ?", async () => {
        await deleteDoc(doc(db, "expenses", id));
    });
};

window.quickAddClient = async () => {
    const nom = document.getElementById('client-name').value.trim();
    if (!nom) {
        alert("Veuillez d'abord saisir un nom dans le champ ci-contre.");
        return;
    }
    const exists = clientsData.some(c => c.nom.toLowerCase() === nom.toLowerCase());
    if (exists) {
        alert("Ce client est déjà dans le répertoire.");
        return;
    }
    try {
        await addDoc(collection(db, "clients"), {
            nom: nom,
            sexe: "Non précisé",
            numero: "À compléter",
            quartier: "À compléter",
            timestamp: new Date()
        });
        showSuccessModal("Client ajouté au répertoire avec succès ! Vous pourrez compléter ses infos plus tard.");
    } catch (err) { alert("Erreur : " + err.message); }
};

window.quickAddClientFromTable = async (nom) => {
    if (!nom) return;
    const exists = clientsData.some(c => c.nom.toLowerCase() === nom.toLowerCase());
    if (exists) {
        alert("Ce client est déjà dans le répertoire.");
        return;
    }
    try {
        await addDoc(collection(db, "clients"), {
            nom: nom,
            sexe: "Non précisé",
            numero: "À compléter",
            quartier: "À compléter",
            timestamp: new Date()
        });
        showSuccessModal(`Le client <b>${nom}</b> a été ajouté au répertoire ! Vous pourrez compléter ses infos plus tard.`);
    } catch (err) { alert("Erreur : " + err.message); }
};