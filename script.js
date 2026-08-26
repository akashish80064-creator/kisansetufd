/* =========================================
   KISANSETU - FARMER PROCUREMENT PORTAL
   JAVASCRIPT
========================================= */


/* =========================================
   ELEMENTS
========================================= */

const sidebar = document.getElementById("sidebar");
const menuButton = document.getElementById("menuButton");

const navItems = document.querySelectorAll(".nav-item");

const pageSections = document.querySelectorAll(".page-section");

const sectionButtons =
    document.querySelectorAll("[data-section-button]");

const toast =
    document.getElementById("toast");

const toastMessage =
    document.getElementById("toastMessage");


/* =========================================
   NAVIGATION
========================================= */

function showSection(sectionId) {

    pageSections.forEach(section => {

        section.classList.remove("active-section");

    });

    const selectedSection =
        document.getElementById(sectionId);

    if (selectedSection) {

        selectedSection.classList.add("active-section");

    }


    navItems.forEach(item => {

        item.classList.remove("active");

        if (item.dataset.section === sectionId) {

            item.classList.add("active");

        }

    });


    // Close mobile sidebar

    sidebar.classList.remove("open");


    // Scroll to top

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });
}


/* =========================================
   SIDEBAR NAVIGATION
========================================= */

navItems.forEach(item => {

    item.addEventListener("click", () => {

        const sectionId = item.dataset.section;

        showSection(sectionId);

    });

});


/* =========================================
   DASHBOARD BUTTONS
========================================= */

sectionButtons.forEach(button => {

    button.addEventListener("click", () => {

        const sectionId =
            button.dataset.sectionButton;

        showSection(sectionId);

    });

});


/* =========================================
   MOBILE MENU
========================================= */

menuButton.addEventListener("click", () => {

    sidebar.classList.toggle("open");

});


/* =========================================
   TOAST
========================================= */

function showToast(message) {

    toastMessage.textContent = message;

    toast.classList.add("show");


    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);
}


/* =========================================
   TOKEN BOOKING
========================================= */

const tokenForm =
    document.getElementById("tokenForm");

const tokenResult =
    document.getElementById("tokenResult");

const generatedToken =
    document.getElementById("generatedToken");


tokenForm.addEventListener("submit", function(event) {

    event.preventDefault();


    const crop =
        document.getElementById("crop").value;

    const quantity =
        document.getElementById("quantity").value;

    const visitDate =
        document.getElementById("visitDate").value;

    const timeSlot =
        document.getElementById("timeSlot").value;


    if (
        !crop ||
        !quantity ||
        !visitDate ||
        !timeSlot
    ) {

        showToast("Please fill all the fields.");

        return;

    }


    // Generate a demo token

    const tokenNumber =
        Math.floor(Math.random() * 50) + 128;

    generatedToken.textContent =
        "#" + tokenNumber;


    tokenResult.classList.remove("hidden");


    showToast(
        "Procurement token booked successfully!"
    );


    tokenForm.reset();

});


/* =========================================
   LIVE QUEUE
========================================= */

let farmersAhead = 17;

let currentQueueNumber = 110;

let waitingMinutes = 51;


const queueNumber =
    document.getElementById("queueNumber");

const dashboardAhead =
    document.getElementById("dashboardAhead");

const farmersAheadText =
    document.getElementById("farmersAhead");

const waitTime =
    document.getElementById("waitTime");

const liveQueuePosition =
    document.getElementById("liveQueuePosition");

const liveWaitTime =
    document.getElementById("liveWaitTime");

const progressBar =
    document.getElementById("progressBar");

const largeProgressBar =
    document.getElementById("largeProgressBar");


function updateQueueUI() {

    queueNumber.textContent =
        "#" + currentQueueNumber;

    dashboardAhead.textContent =
        farmersAhead;

    farmersAheadText.textContent =
        farmersAhead + " farmers ahead";

    waitTime.textContent =
        waitingMinutes + " minutes";

    liveQueuePosition.textContent =
        currentQueueNumber;

    liveWaitTime.textContent =
        waitingMinutes + " min";


    /*
       Demo calculation.

       As the number of farmers ahead
       becomes smaller, progress increases.
    */

    const progress =
        Math.max(
            20,
            Math.min(
                95,
                100 - (farmersAhead * 3.8)
            )
        );


    progressBar.style.width =
        progress + "%";

    largeProgressBar.style.width =
        progress + "%";
}


/* =========================================
   REFRESH QUEUE
========================================= */

const refreshQueue =
    document.getElementById("refreshQueue");


refreshQueue.addEventListener("click", () => {

    if (farmersAhead > 0) {

        farmersAhead--;

        currentQueueNumber++;

        waitingMinutes =
            Math.max(
                0,
                farmersAhead * 3
            );

    }


    updateQueueUI();


    showToast(
        "Queue updated successfully."
    );

});


/* =========================================
   AUTOMATIC QUEUE UPDATE
========================================= */

setInterval(() => {

    /*
       This is only a front-end demo.

       In a real project, this data would
       come from a backend/database/API.
    */

    if (farmersAhead > 0) {

        farmersAhead--;

        currentQueueNumber++;

        waitingMinutes =
            Math.max(
                0,
                farmersAhead * 3
            );

        updateQueueUI();

    }

}, 30000);


/* =========================================
   SET MINIMUM DATE FOR TOKEN BOOKING
========================================= */

const visitDate =
    document.getElementById("visitDate");


const today =
    new Date();


const year =
    today.getFullYear();

const month =
    String(
        today.getMonth() + 1
    ).padStart(2, "0");

const day =
    String(
        today.getDate()
    ).padStart(2, "0");


visitDate.min =
    `${year}-${month}-${day}`;


/* =========================================
   INITIALIZE
========================================= */

updateQueueUI();


/* =========================================
   CLICK OUTSIDE SIDEBAR ON MOBILE
========================================= */

document.addEventListener("click", event => {

    if (
        window.innerWidth <= 850 &&
        sidebar.classList.contains("open") &&
        !sidebar.contains(event.target) &&
        event.target !== menuButton
    ) {

        sidebar.classList.remove("open");

    }

});


/* =========================================
   WELCOME MESSAGE
========================================= */

console.log(
    "KisanSetu Farmer Procurement Portal loaded successfully."
);
// Switch between Login and Registration forms
const showRegisterBtn = document.getElementById("showRegister");
const showLoginBtn = document.getElementById("showLogin");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

if (showRegisterBtn) {
    showRegisterBtn.addEventListener("click", function () {
        loginForm.classList.add("hidden");
        registerForm.classList.remove("hidden");
    });
}

if (showLoginBtn) {
    showLoginBtn.addEventListener("click", function () {
        registerForm.classList.add("hidden");
        loginForm.classList.remove("hidden");
    });
}
