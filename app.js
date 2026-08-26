const API = "/api";

let authToken =
    localStorage.getItem("kisanToken");

let farmer = null;

let myTokens = [];


// ========================================
// API HELPER
// ========================================

async function api(
    endpoint,
    options = {}
) {

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };


    if (authToken) {

        headers.Authorization =
            `Bearer ${authToken}`;

    }


    const response =
        await fetch(
            API + endpoint,
            {
                ...options,
                headers
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.error ||
            "Something went wrong"
        );

    }


    return data;
}


// ========================================
// LOGIN
// ========================================

const loginForm =
    document.getElementById("loginForm");


loginForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const phone =
            document.getElementById(
                "loginPhone"
            ).value;


        const password =
            document.getElementById(
                "loginPassword"
            ).value;


        try {

            const data =
                await api(
                    "/farmer/login",
                    {
                        method: "POST",

                        body: JSON.stringify({
                            phone,
                            password
                        })
                    }
                );


            authToken =
                data.token;

            farmer =
                data.farmer;


            localStorage.setItem(
                "kisanToken",
                authToken
            );


            showApplication();

        } catch (error) {

            document.getElementById(
                "loginError"
            ).textContent =
                error.message;

        }

    }
);


// ========================================
// REGISTRATION
// ========================================

const registerForm =
    document.getElementById("registerForm");

registerForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        const name =
            document.getElementById("registerName").value.trim();

        const phone =
            document.getElementById("registerPhone").value.trim();

        const village =
            document.getElementById("registerVillage").value.trim();

        const password =
            document.getElementById("registerPassword").value;

        const errorBox =
            document.getElementById("registerError");

        errorBox.textContent = "";

        try {

            const data =
                await api(
                    "/farmer/register",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            name,
                            phone,
                            village,
                            password
                        })
                    }
                );

            authToken = data.token;
            farmer = data.farmer;

            localStorage.setItem(
                "kisanToken",
                authToken
            );

            showApplication();

        } catch (error) {

            errorBox.textContent =
                error.message;

        }

    }
);


// ========================================
// LOGIN / REGISTER VIEW
// ========================================

document
    .getElementById("showRegister")
    .addEventListener(
        "click",
        () => {

            document
                .getElementById("loginForm")
                .classList.add("hidden");

            document
                .getElementById("registerForm")
                .classList.remove("hidden");

        }
    );


document
    .getElementById("showLogin")
    .addEventListener(
        "click",
        () => {

            document
                .getElementById("registerForm")
                .classList.add("hidden");

            document
                .getElementById("loginForm")
                .classList.remove("hidden");

        }
    );


// ========================================
// SHOW APP
// ========================================

async function showApplication() {

    // Show dashboard immediately after successful login
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("appPage").classList.remove("hidden");

    try {
        // Load the logged-in farmer's profile
        farmer = await api("/farmer/profile");

        document.getElementById("farmerName").textContent = farmer.name;

        document.querySelector("#dashboard h1").textContent =
            `Welcome, ${farmer.name}`;

    } catch (error) {

        // Only return to login if authentication really fails
        console.error("Profile loading error:", error);

        alert(
            "Login succeeded, but some profile data could not load. " +
            "Please refresh the page."
        );

        return;
    }

    // Load other dashboard information separately.
    // If one fails, the user remains logged in.
    try {
        await loadSchedules();
    } catch (error) {
        console.error("Schedule error:", error);
    }

    try {
        await loadTokens();
    } catch (error) {
        console.error("Token error:", error);
    }

    try {
        await loadPayments();
    } catch (error) {
        console.error("Payment error:", error);
    }

    try {
        await loadNotifications();
    } catch (error) {
        console.error("Notification error:", error);
    }
}


// ========================================
// NAVIGATION
// ========================================

document
    .querySelectorAll(".nav-button")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const section =
                    button.dataset.section;


                showSection(section);

            }
        );

    });


document
    .querySelectorAll("[data-go]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                showSection(
                    button.dataset.go
                );

            }
        );

    });


function showSection(section) {

    document
        .querySelectorAll(".section")
        .forEach(item => {

            item.classList.remove("active");

        });


    document
        .getElementById(section)
        .classList.add("active");


    document
        .querySelectorAll(".nav-button")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.section === section
            );

        });


    if (section === "queue") {

        loadQueue();

    }

    if (section === "status") {

        loadTokens();

    }

}


// ========================================
// LOAD SCHEDULES
// ========================================

async function loadSchedules() {

    const schedules =
        await api(
            "/schedules"
        );


    const list =
        document.getElementById(
            "scheduleList"
        );


    const select =
        document.getElementById(
            "scheduleId"
        );


    list.innerHTML = "";

    select.innerHTML =
        `<option value="">
            Select schedule
        </option>`;


    schedules.forEach(schedule => {

        const item =
            document.createElement(
                "div"
            );


        item.className =
            "schedule-item";


        item.innerHTML = `

            <h2>
                ${schedule.crop}
            </h2>

            <p>
                📅 ${schedule.date}
            </p>

            <p>
                🕐 ${schedule.start_time}
                - ${schedule.end_time}
            </p>

            <p>
                📍 ${schedule.center}
            </p>

            <p>
                🎟️ ${schedule.available_slots}
                slots available
            </p>

        `;


        list.appendChild(item);


        const option =
            document.createElement(
                "option"
            );


        option.value =
            schedule.id;


        option.textContent =
            `${schedule.crop} - ${schedule.date}
             (${schedule.available_slots} slots)`;


        select.appendChild(option);

    });

}


// ========================================
// BOOK TOKEN
// ========================================

document
    .getElementById("bookingForm")
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const crop =
                document.getElementById(
                    "crop"
                ).value;


            const quantity =
                document.getElementById(
                    "quantity"
                ).value;


            const scheduleId =
                document.getElementById(
                    "scheduleId"
                ).value;


            try {

                const result =
                    await api(
                        "/tokens",
                        {
                            method: "POST",

                            body:
                                JSON.stringify({
                                    crop,
                                    quantity:
                                        Number(
                                            quantity
                                        ),
                                    scheduleId:
                                        Number(
                                            scheduleId
                                        )
                                })
                        }
                    );


                const resultBox =
                    document.getElementById(
                        "bookingResult"
                    );


                resultBox.innerHTML = `

                    🎉 Token booked successfully!

                    <br><br>

                    Your Token Number:

                    <strong>
                        #${result.tokenNumber}
                    </strong>

                    <br><br>

                    Please arrive at the procurement
                    center according to your schedule.

                `;


                resultBox.classList.remove(
                    "hidden"
                );


                await loadTokens();

                await loadSchedules();

            } catch (error) {

                alert(error.message);

            }

        }
    );


// ========================================
// LOAD TOKENS
// ========================================

async function loadTokens() {

    myTokens =
        await api(
            "/tokens/my"
        );


    if (!myTokens.length) {

        document.getElementById(
            "currentProcurement"
        ).innerHTML =
            "You have not booked a procurement token yet.";

        return;

    }


    const latest =
        myTokens[0];


    document.getElementById(
        "dashCrop"
    ).textContent =
        latest.crop;


    document.getElementById(
        "dashToken"
    ).textContent =
        "#" + latest.token_number;


    document.getElementById(
        "currentProcurement"
    ).innerHTML = `

        <p>
            <strong>
                Token #${latest.token_number}
            </strong>
        </p>

        <p>
            Crop: ${latest.crop}
        </p>

        <p>
            Quantity: ${latest.quantity} Quintals
        </p>

        <p>
            Date: ${latest.date}
        </p>

        <p>
            Center: ${latest.center}
        </p>

        <br>

        <span class="status-badge">
            ${latest.procurement_status}
        </span>

    `;


    renderStatus();

}


// ========================================
// QUEUE
// ========================================

async function loadQueue() {

    if (!myTokens.length) {

        return;

    }


    const latest =
        myTokens[0];


    try {

        const queue =
            await api(
                `/queue/${latest.id}`
            );


        document.getElementById(
            "queueToken"
        ).textContent =
            "#" + queue.yourToken;


        document.getElementById(
            "currentToken"
        ).textContent =
            "#" + queue.currentToken;


        document.getElementById(
            "queueAhead"
        ).textContent =
            queue.farmersAhead;


        document.getElementById(
            "queueTime"
        ).textContent =
            queue.estimatedMinutes +
            " min";


        document.getElementById(
            "dashAhead"
        ).textContent =
            queue.farmersAhead;

    } catch {

        document.getElementById(
            "queueAhead"
        ).textContent =
            "—";

    }

}


document
    .getElementById("refreshQueue")
    .addEventListener(
        "click",
        loadQueue
    );


// ========================================
// STATUS
// ========================================

function renderStatus() {

    const container =
        document.getElementById(
            "statusList"
        );


    container.innerHTML = "";


    myTokens.forEach(token => {

        const item =
            document.createElement(
                "div"
            );


        item.className =
            "status-item";


        item.innerHTML = `

            <h2>
                Token #${token.token_number}
            </h2>

            <p>
                Crop:
                <strong>
                    ${token.crop}
                </strong>
            </p>

            <p>
                Quantity:
                ${token.quantity} Quintals
            </p>

            <br>

            <span class="status-badge">
                ${token.procurement_status}
            </span>

        `;


        container.appendChild(item);

    });

}


// ========================================
// PAYMENT
// ========================================

async function loadPayments() {

    const payments =
        await api(
            "/payments"
        );


    const container =
        document.getElementById(
            "paymentList"
        );


    container.innerHTML = "";


    if (!payments.length) {

        container.innerHTML =
            `<div class="panel">
                No payment records yet.
             </div>`;

        document.getElementById(
            "dashPayment"
        ).textContent =
            "No payment";

        return;

    }


    payments.forEach(payment => {

        const item =
            document.createElement(
                "div"
            );


        item.className =
            "payment-item";


        item.innerHTML = `

            <p>
                Token #${payment.token_number}
            </p>

            <div class="payment-amount">
                ₹${Number(
                    payment.amount
                ).toLocaleString("en-IN")}
            </div>

            <p>
                ${payment.crop}
                -
                ${payment.quantity}
                Quintals
            </p>

            <br>

            <span class="status-badge">
                ${payment.status}
            </span>

        `;


        container.appendChild(item);

    });


    document.getElementById(
        "dashPayment"
    ).textContent =
        "₹" +
        Number(
            payments[0].amount
        ).toLocaleString("en-IN");

}


// ========================================
// NOTIFICATIONS
// ========================================

async function loadNotifications() {

    const notifications =
        await api(
            "/notifications"
        );


    const container =
        document.getElementById(
            "notificationList"
        );


    container.innerHTML = "";


    notifications.forEach(notification => {

        const item =
            document.createElement(
                "div"
            );


        item.className =
            "notification";


        item.innerHTML = `

            <h3>
                🔔 ${notification.title}
            </h3>

            <p>
                ${notification.message}
            </p>

        `;


        container.appendChild(item);

    });

}


// ========================================
// LOGOUT
// ========================================

document
    .getElementById("logoutButton")
    .addEventListener(
        "click",
        logout
    );


function logout() {

    localStorage.removeItem(
        "kisanToken"
    );


    authToken = null;


    document
        .getElementById("appPage")
        .classList.add("hidden");


    document
        .getElementById("loginPage")
        .classList.remove("hidden");

}


// ========================================
// START
// ========================================

if (authToken) {

    showApplication();

}
