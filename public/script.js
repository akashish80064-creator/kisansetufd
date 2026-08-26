const API = "/api";

let authToken =
    localStorage.getItem(
        "kisanToken"
    );

let farmer = null;


// ==========================================
// API HELPER
// ==========================================

async function api(
    endpoint,
    options = {}
) {

    const headers = {

        "Content-Type":
            "application/json",

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


    let data;


    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            "Server returned an invalid response"
        );

    }


    if (!response.ok) {

        throw new Error(
            data.error ||
            "Something went wrong"
        );

    }


    return data;

}


// ==========================================
// LOGIN
// ==========================================

const loginForm =
    document.getElementById(
        "loginForm"
    );


loginForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const phone =
            document
                .getElementById(
                    "loginPhone"
                )
                .value
                .trim();


        const password =
            document
                .getElementById(
                    "loginPassword"
                )
                .value;


        const errorBox =
            document.getElementById(
                "loginError"
            );


        errorBox.textContent = "";


        try {

            const data =
                await api(
                    "/farmer/login",
                    {
                        method:
                            "POST",

                        body:
                            JSON.stringify({
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


            await showApplication();

        } catch (error) {

            errorBox.textContent =
                error.message;

        }

    }
);


// ==========================================
// REGISTER
// ==========================================

const registerForm =
    document.getElementById(
        "registerForm"
    );


registerForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const name =
            document
                .getElementById(
                    "registerName"
                )
                .value
                .trim();


        const phone =
            document
                .getElementById(
                    "registerPhone"
                )
                .value
                .trim();


        const village =
            document
                .getElementById(
                    "registerVillage"
                )
                .value
                .trim();


        const password =
            document
                .getElementById(
                    "registerPassword"
                )
                .value;


        const errorBox =
            document.getElementById(
                "registerError"
            );


        errorBox.textContent = "";


        try {

            const data =
                await api(
                    "/farmer/register",
                    {
                        method:
                            "POST",

                        body:
                            JSON.stringify({

                                name,
                                phone,
                                village,
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


            await showApplication();

        } catch (error) {

            errorBox.textContent =
                error.message;

        }

    }
);


// ==========================================
// SHOW REGISTER
// ==========================================

document
    .getElementById(
        "showRegister"
    )
    .addEventListener(
        "click",
        () => {

            loginForm.classList.add(
                "hidden"
            );

            registerForm.classList.remove(
                "hidden"
            );

        }
    );


// ==========================================
// SHOW LOGIN
// ==========================================

document
    .getElementById(
        "showLogin"
    )
    .addEventListener(
        "click",
        () => {

            registerForm.classList.add(
                "hidden"
            );

            loginForm.classList.remove(
                "hidden"
            );

        }
    );


// ==========================================
// SHOW APPLICATION
// ==========================================

async function showApplication() {

    document
        .getElementById(
            "loginPage"
        )
        .classList.add(
            "hidden"
        );


    document
        .getElementById(
            "appPage"
        )
        .classList.remove(
            "hidden"
        );


    try {

        farmer =
            await api(
                "/farmer/profile"
            );


        document
            .getElementById(
                "farmerName"
            )
            .textContent =
            farmer.name;


        document
            .getElementById(
                "profileName"
            )
            .textContent =
            farmer.name;


        document
            .getElementById(
                "profileVillage"
            )
            .textContent =
            farmer.village;


        document
            .getElementById(
                "dashboardFarmer"
            )
            .textContent =
            farmer.name;


        document
            .getElementById(
                "dashboardVillage"
            )
            .textContent =
            farmer.village;


        await loadSchedules();

        await loadTokens();

        await loadPayments();

        await loadNotifications();


    } catch (error) {

        console.error(
            error
        );


        logout();

    }

}


// ==========================================
// LOGOUT
// ==========================================

function logout() {

    localStorage.removeItem(
        "kisanToken"
    );


    authToken = null;

    farmer = null;


    document
        .getElementById(
            "appPage"
        )
        .classList.add(
            "hidden"
        );


    document
        .getElementById(
            "loginPage"
        )
        .classList.remove(
            "hidden"
        );

}


document
    .getElementById(
        "logoutButton"
    )
    .addEventListener(
        "click",
        logout
    );


// ==========================================
// NAVIGATION
// ==========================================

document
    .querySelectorAll(
        ".nav-button"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const section =
                        button.dataset.section;


                    showSection(
                        section
                    );

                }
            );

        }
    );


function showSection(
    sectionName
) {

    document
        .querySelectorAll(
            ".section"
        )
        .forEach(
            section => {

                section.classList.remove(
                    "active"
                );

            }
        );


    const section =
        document.getElementById(
            sectionName
        );


    if (section) {

        section.classList.add(
            "active"
        );

    }


    document
        .querySelectorAll(
            ".nav-button"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.section ===
                    sectionName
                );

            }
        );


    if (
        sectionName === "status"
    ) {

        loadTokens();

    }


    if (
        sectionName === "payment"
    ) {

        loadPayments();

    }


    if (
        sectionName ===
        "notifications"
    ) {

        loadNotifications();

    }

}


// ==========================================
// LOAD SCHEDULES
// ==========================================

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
        `
        <option value="">
            Select schedule
        </option>
        `;


    schedules.forEach(
        schedule => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "content-card";


            card.innerHTML =
                `
                <h2>
                    ${schedule.crop}
                </h2>

                <p>
                    📅 ${schedule.date}
                </p>

                <p>
                    🕐
                    ${schedule.start_time}
                    -
                    ${schedule.end_time}
                </p>

                <p>
                    📍 ${schedule.center}
                </p>

                <p>
                    🎟️
                    ${schedule.available_slots}
                    slots available
                </p>
                `;


            list.appendChild(
                card
            );


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                schedule.id;


            option.textContent =
                `${schedule.crop} -
                ${schedule.date} -
                ${schedule.available_slots} slots`;


            select.appendChild(
                option
            );

        }
    );

}


// ==========================================
// BOOK TOKEN
// ==========================================

document
    .getElementById(
        "tokenForm"
    )
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const scheduleId =
                document
                    .getElementById(
                        "scheduleId"
                    )
                    .value;


            const quantity =
                document
                    .getElementById(
                        "quantity"
                    )
                    .value;


            const errorBox =
                document.getElementById(
                    "tokenError"
                );


            errorBox.textContent = "";


            try {

                const data =
                    await api(
                        "/tokens",
                        {
                            method:
                                "POST",

                            body:
                                JSON.stringify({
                                    scheduleId,
                                    quantity
                                })
                        }
                    );


                alert(
                    `Token booked successfully!

Token Number:
${data.token.token_number}`
                );


                document
                    .getElementById(
                        "tokenForm"
                    )
                    .reset();


                await loadSchedules();

                await loadTokens();


                showSection(
                    "status"
                );


            } catch (error) {

                errorBox.textContent =
                    error.message;

            }

        }
    );


// ==========================================
// LOAD TOKENS
// ==========================================

async function loadTokens() {

    const tokens =
        await api(
            "/tokens"
        );


    const list =
        document.getElementById(
            "tokenList"
        );


    list.innerHTML = "";


    document
        .getElementById(
            "tokenCount"
        )
        .textContent =
        tokens.length;


    if (
        tokens.length === 0
    ) {

        list.innerHTML =
            `
            <div class="content-card">

                <h3>
                    No tokens yet
                </h3>

                <p>
                    Book a procurement token to see it here.
                </p>

            </div>
            `;

        return;

    }


    tokens.forEach(
        token => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "content-card";


            card.innerHTML =
                `
                <h2>
                    🎟️ ${token.token_number}
                </h2>

                <p>
                    Crop:
                    <strong>
                        ${token.crop}
                    </strong>
                </p>

                <p>
                    Quantity:
                    <strong>
                        ${token.quantity}
                        Quintals
                    </strong>
                </p>

                <p>
                    Status:
                    <span class="status">
                        ${token.status}
                    </span>
                </p>
                `;


            list.appendChild(
                card
            );

        }
    );

}


// ==========================================
// LOAD PAYMENTS
// ==========================================

async function loadPayments() {

    const payments =
        await api(
            "/payments"
        );


    const list =
        document.getElementById(
            "paymentList"
        );


    list.innerHTML = "";


    if (
        payments.length === 0
    ) {

        list.innerHTML =
            `
            <div class="content-card">

                <h3>
                    No payments yet
                </h3>

                <p>
                    Payment information will appear after procurement.
                </p>

            </div>
            `;

        return;

    }


    payments.forEach(
        payment => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "content-card";


            card.innerHTML =
                `
                <h2>
                    ₹ ${payment.amount}
                </h2>

                <p>
                    Status:
                    ${payment.status}
                </p>
                `;


            list.appendChild(
                card
            );

        }
    );

}


// ==========================================
// NOTIFICATIONS
// ==========================================

async function loadNotifications() {

    const notifications =
        await api(
            "/notifications"
        );


    const list =
        document.getElementById(
            "notificationList"
        );


    list.innerHTML = "";


    notifications.forEach(
        notification => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "content-card";


            card.innerHTML =
                `
                <h2>
                    🔔 ${notification.title}
                </h2>

                <p>
                    ${notification.message}
                </p>
                `;


            list.appendChild(
                card
            );

        }
    );

}


// ==========================================
// AUTO LOGIN
// ==========================================

window.addEventListener(
    "DOMContentLoaded",
    async () => {

        if (authToken) {

            await showApplication();

        }

    }
);
