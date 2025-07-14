// --------- firebase-config.js ---------
const firebaseConfig = {
  apiKey: "AIzaSyCr8uXLpg7zEL9dyEejU0iGCGVdaouLaxw",
  authDomain: "hostel-hub-ddc70.firebaseapp.com",
  projectId: "hostel-hub-ddc70",
  storageBucket: "hostel-hub-ddc70.firebasestorage.app",
  messagingSenderId: "1098116148309",
  appId: "1:1098116148309:web:18096348cac2606152f8dc",
  measurementId: "G-Y4DZ9BFTRL",
};

firebase.initializeApp(firebaseConfig);
firebase.analytics();
const auth = firebase.auth();
const db = firebase.firestore();

// const SHEETS_API_KEY = "AIzaSyB4CdWe5D1_kTtmns0TsrvxQiP6WMMDTGA";
// const SHEET_ID = "1_4x0WpSeLBkcwo0Kk875qjjvMHQJAtL7KKHdzl4zw5I";

// Gemini API using REST
const GEMINI_API_KEY = "AIzaSyD-nT83lf0S8SHlacq8cX4GaO_nBpWRTg4";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

async function getGeminiResponse(prompt) {
  const requestBody = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  };

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
  } catch (error) {
    console.error(error);
    return "Sorry, I couldn't get a response from the AI.";
  }
}

// Wait for DOM before attaching listeners
document.addEventListener("DOMContentLoaded", () => {
  const authButton = document.getElementById("authButton");
  const authModal = document.getElementById("authModal");
  const closeAuthModal = document.getElementById("closeAuthModal");
  const loginForm = document.getElementById("loginForm");
  const googleSignIn = document.getElementById("googleSignIn");
  const signOutButton = document.getElementById("signOutButton");
  const adminLink = document.getElementById("adminLink");
  const userAvatar = document.getElementById("userAvatar");
  const userName = document.getElementById("userName");

  auth.onAuthStateChanged((user) => {
    if (!authButton) return;
    if (user) {
      authButton.textContent = "Admin Dashboard";
      authButton.classList.remove("btn--outline");
      authButton.classList.add("btn--primary");
      if (adminLink) adminLink.textContent = "Dashboard";
      if (userAvatar)
        userAvatar.src = user.photoURL || "assets/images/user-avatar.jpg";
      if (userName) userName.textContent = user.displayName || "Admin User";
    } else {
      authButton.textContent = "Admin Login";
      authButton.classList.remove("btn--primary");
      authButton.classList.add("btn--outline");
      if (adminLink) adminLink.textContent = "Admin";
    }
  });

  if (authButton) {
    authButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (auth.currentUser) {
        window.location.href = "dashboard.html";
      } else {
        if (authModal) authModal.classList.add("active");
      }
    });
  }

  if (closeAuthModal) {
    closeAuthModal.addEventListener("click", () => {
      if (authModal) authModal.classList.remove("active");
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;
      const submitButton = loginForm.querySelector('button[type="submit"]');
      const loader = submitButton.querySelector(".btn__loader");
      try {
        submitButton.disabled = true;
        if (loader) loader.style.display = "block";
        await auth.signInWithEmailAndPassword(email, password);
        if (authModal) authModal.classList.remove("active");
        window.location.href = "dashboard.html";
      } catch (error) {
        console.error("Login error:", error);
        alert(error.message);
      } finally {
        submitButton.disabled = false;
        if (loader) loader.style.display = "none";
      }
    });
  }

  if (googleSignIn) {
    googleSignIn.addEventListener("click", async () => {
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        await saveUserToSheets(result.user);
        if (authModal) authModal.classList.remove("active");
        window.location.href = "dashboard.html";
      } catch (error) {
        console.error("Google sign-in error:", error);
        alert(error.message);
      }
    });
  }

  if (signOutButton) {
    signOutButton.addEventListener("click", () => {
      auth.signOut().then(() => {
        window.location.href = "index.html";
      });
    });
  }
  // --------- CHATBOT ---------
  const chatbotToggle = document.querySelector(".chatbot__toggle");
  const chatbotContainer = document.querySelector(".chatbot__container");
  const chatbotClose = document.querySelector(".chatbot__close");
  const chatbotMessages = document.getElementById("chatbotMessages");
  const chatbotInput = document.getElementById("chatbotInput");
  const sendMessageButton = document.getElementById("sendMessage");

  const chatHistory = [
    {
      role: "model",
      parts: [
        { text: "Hello! I'm your HostelHub assistant. How can I help you?" },
      ],
    },
  ];

  if (chatbotToggle && chatbotContainer) {
    chatbotToggle.addEventListener("click", () => {
      chatbotContainer.classList.toggle("active");
    });
  }

  if (chatbotClose && chatbotContainer) {
    chatbotClose.addEventListener("click", () => {
      chatbotContainer.classList.remove("active");
    });
  }

  function addMessage(text, sender) {
    if (!chatbotMessages) return;
    const message = document.createElement("div");
    message.className = `chatbot__message chatbot__message--${sender}`;
    message.innerHTML = `<p>${text}</p>`;
    chatbotMessages.appendChild(message);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  async function sendMessage() {
    if (!chatbotInput) return;
    const message = chatbotInput.value.trim();
    if (!message) return;

    addMessage(message, "user");
    chatbotInput.value = "";
    chatHistory.push({ role: "user", parts: [{ text: message }] });
    const loader = document.createElement("div");
    loader.className = "chatbot__typing-indicator";
    loader.innerHTML = `
    <div class="wrapper">
      <div class="blue ball"></div>
      <div class="red ball"></div>
      <div class="yellow ball"></div>
      <div class="green ball"></div>
    </div>
  `;
    chatbotMessages.appendChild(loader);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    try {
      const reply = await getGeminiResponse(message);
      chatbotMessages.lastChild.remove();
      addMessage(reply, "bot");
      chatHistory.push({ role: "model", parts: [{ text: reply }] });
    } catch (err) {
      chatbotMessages.lastChild.remove();
      addMessage("Sorry, an error occurred.", "bot");
    }
  }

  if (sendMessageButton && chatbotInput) {
    sendMessageButton.addEventListener("click", sendMessage);
    chatbotInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }
});



// Elements
const form = document.getElementById("bookingForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const roomTypeSelect = document.getElementById("roomType");
const durationSelect = document.getElementById("duration");
const includeFoodCheckbox = document.getElementById("includeFood");

const summaryRoomType = document.getElementById("summaryRoomType");
const summaryDuration = document.getElementById("summaryDuration");
const summaryFood = document.getElementById("summaryFood");
const summaryTotal = document.getElementById("summaryTotal");

const gpayRoomType = document.getElementById("gpayRoomType");
const gpayDuration = document.getElementById("gpayDuration");
const gpayFood = document.getElementById("gpayFood");
const gpayTotal = document.getElementById("gpayTotal");

const ROOM_PRICES = {
  dormitory: 5000,
  private: 9000,
  deluxe: 12500,
};
const FOOD_COST = 2000;

// Update summaries
function updateSummary() {
  const room = roomTypeSelect.value;
  const duration = parseInt(durationSelect.value) || 0;
  const food = includeFoodCheckbox.checked;
  const total = ((ROOM_PRICES[room] || 0) + (food ? FOOD_COST : 0)) * duration;

  summaryRoomType.textContent = room || "-";
  summaryDuration.textContent = `${duration} months`;
  summaryFood.textContent = food ? "Yes" : "No";
  summaryTotal.textContent = `₹${total.toLocaleString()}`;

  gpayRoomType.textContent = room || "-";
  gpayDuration.textContent = `${duration} months`;
  gpayFood.textContent = food ? "Yes" : "No";
  gpayTotal.textContent = `₹${total.toLocaleString()}`;
}

roomTypeSelect.addEventListener("change", updateSummary);
durationSelect.addEventListener("change", updateSummary);
includeFoodCheckbox.addEventListener("change", updateSummary);


// Save data to Firestore
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const roomType = roomTypeSelect.value;
  const duration = parseInt(durationSelect.value);
  const includeFood = includeFoodCheckbox.checked;

  const totalCost =
    ((ROOM_PRICES[roomType] || 0) + (includeFood ? FOOD_COST : 0)) * duration;

  try {
    await db.collection("bookings").add({
      name,
      email,
      duration,
      roomType,
      food: includeFood ? "Yes" : "No",
      totalCost,
      timestamp: new Date(),
    });

    alert("Booking successful!");
    form.reset();
    updateSummary();
  } catch (error) {
    console.error("Error saving booking:", error);
    alert("Failed to save booking. Please try again.");
  }
});


// Google Pay
function initGooglePay() {
  const paymentsClient = new google.payments.api.PaymentsClient({ environment: "TEST" });

  const onGooglePayClicked = () => {
    const room = roomTypeSelect.value;
    const duration = parseInt(durationSelect.value) || 0;
    const food = includeFoodCheckbox.checked;
    const total = ((ROOM_PRICES[room] || 0) + (food ? FOOD_COST : 0)) * duration;

    const paymentDataRequest = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [{
        type: 'CARD',
        parameters: {
          allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
          allowedCardNetworks: ['AMEX', 'DISCOVER', 'MASTERCARD', 'VISA']
        },
        tokenizationSpecification: {
          type: 'PAYMENT_GATEWAY',
          parameters: {
            gateway: 'example',
            gatewayMerchantId: 'exampleMerchantId'
          }
        }
      }],
      merchantInfo: {
        merchantId: 'BCR2DN6TZ57J2ERF',
        merchantName: 'HostelHub'
      },
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: total.toString(),
        currencyCode: 'INR',
        countryCode: 'IN'
      }
    };

    paymentsClient.loadPaymentData(paymentDataRequest)
      .then(paymentData => {
        document.getElementById('success-message').style.display = 'block';
        document.getElementById('google-pay-button').style.display = 'none';
        document.getElementById('success-sound').play();
      })
      .catch(err => {
        alert('Payment failed. Please try again.');
      });
  };

  paymentsClient.isReadyToPay({
    apiVersion: 2,
    apiVersionMinor: 0,
    allowedPaymentMethods: [{
      type: 'CARD',
      parameters: {
        allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
        allowedCardNetworks: ['AMEX', 'DISCOVER', 'MASTERCARD', 'VISA']
      },
      tokenizationSpecification: {
        type: 'PAYMENT_GATEWAY',
        parameters: {
          gateway: 'example',
          gatewayMerchantId: 'exampleMerchantId'
        }
      }
    }]
  }).then(response => {
    if (response.result) {
      const gpayButton = paymentsClient.createButton({ onClick: onGooglePayClicked });
      document.getElementById("google-pay-button").appendChild(gpayButton);
    }
  });
}

function loadGooglePay() {
  const script = document.createElement("script");
  script.src = "https://pay.google.com/gp/p/js/pay.js";
  script.onload = initGooglePay;
  document.body.appendChild(script);
}

window.addEventListener("load", loadGooglePay);



window.addEventListener("load", () => {
  document.querySelector(".loader-wrapper").style.display = "none";
  document.querySelector(".page-content").style.display = "block";
});

