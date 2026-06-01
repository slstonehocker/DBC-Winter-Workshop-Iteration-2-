const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbz5ZuLfoXWVE8hoMukorze8-iWlFEE-IYh_UXXrkJE-HNSxuteB5q0wrBZkOesPnOnAWg/exec";

let allClasses = [];
let selectedClassForRegistration = null;
let adminSelectedClass = null;

// PUBLIC CLASS CATALOG
async function loadClasses() {
    const catalog = document.getElementById("classCatalog");

    if (!catalog) {
        return;
    }

    try {
        const response = await fetch(SCRIPT_URL);
        allClasses = await response.json();

        displayClassCatalog();
        populateBranchFilter();
    } catch (error) {
        console.error(error);
        catalog.innerHTML = "<p>Could not load classes. Please try again later.</p>";
    }
}

function displayClassCatalog() {
    const catalog = document.getElementById("classCatalog");

    const branches = [
        ...new Set(
            allClasses
                .map(c => (c.branch || "").trim())
                .filter(Boolean)
        )
    ].sort(function(a, b) {
        return a.localeCompare(b);
    });
    
    if (branches.length === 0) {
    catalog.innerHTML = `
        <div class="empty-state">
            <h2>No workshops are currently available.</h2>
            <p>Please check back soon for upcoming classes.</p>
        </div>
    `;
    return;
}
    

    let html = "";

    for (let i = 0; i < branches.length; i++) {
        const branch = branches[i];

        html += `<h2 class="branch-title">${branch}</h2>`;

        const branchClasses =
            allClasses
                .filter(c => (c.branch || "").trim() === branch)
                .sort(function(a, b) {
                    return (a.name || "").trim().localeCompare(
                        (b.name || "").trim()
                    );
                });

        html += `<div class="branch-grid">`;

        for (let j = 0; j < branchClasses.length; j++) {
            const classItem = branchClasses[j];

            html += `
                <div class="class-card">
                    <h3>${classItem.name}</h3>

                    <p>${classItem.description}</p>

                    <p><strong>Date:</strong> ${formatDisplayDate(classItem.date)}</p>
                    <p><strong>Time:</strong> ${classItem.time}</p>
                    <p><strong>Instructor:</strong> ${classItem.teacher}</p>
                    <p class="${classItem.lunch && classItem.lunch.toLowerCase() === 'yes' ? 'lunch-provided' : 'no-lunch'}">
                        ${classItem.lunch && classItem.lunch.toLowerCase() === 'yes' ? '🍕 Lunch Provided' : '🚫 No Lunch Provided'}
                    </p>
                    <p><strong>Seats Left:</strong> ${classItem.seatsLeft} of ${classItem.capacity}</p>

<a
    class="map-button"
    href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(classItem.address)}"
    target="_blank">
    View Branch Map
</a>

<button type="button" onclick='openRegistrationModal(${JSON.stringify(classItem)})'>
    Register
</button>
                </div>
            `;
        }

        html += `</div>`;
    }

    catalog.innerHTML = html;
}

function openRegistrationModal(classItem) {
    selectedClassForRegistration = classItem;

    document.getElementById("modalClassTitle").innerText =
        classItem.name;

    document.getElementById("modalClassDetails").innerHTML =
        "<p><strong>Branch:</strong> " + classItem.branch + "</p>" +
        "<p><strong>Date:</strong> " + formatDisplayDate(classItem.date) + "</p>" +
        "<p><strong>Time:</strong> " + classItem.time + "</p>" +
        "<p><strong>Instructor:</strong> " + classItem.teacher + "</p>" +
        "<p><strong>Lunch Provided:</strong> " + classItem.lunch + "</p>" +
        "<p><strong>Seats Left:</strong> " + classItem.seatsLeft + " of " + classItem.capacity + "</p>" +
        "<p><strong>Description:</strong><br>" + classItem.description + "</p>";

    document.getElementById("registrationModal").style.display = "block";
}

function closeRegistrationModal() {
    document.getElementById("registrationModal").style.display = "none";

    selectedClassForRegistration = null;

    document.getElementById("name").value = "";
    document.getElementById("email").value = "";
    document.getElementById("confirmEmail").value = "";
}

function registerEmployee() {
    if (!selectedClassForRegistration) {
        alert("Please select a class.");
        return;
    }

    const selectedClass = selectedClassForRegistration;

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const confirmEmail = document.getElementById("confirmEmail").value.trim();

    if (name === "") {
        alert("Please enter your name.");
        return;
    }

    if (email === "") {
        alert("Please enter your email.");
        return;
    }

    if (email !== confirmEmail) {
        alert("Emails do not match.");
        return;
    }

    if (Number(selectedClass.seatsLeft) <= 0) {
        alert("This class is full. You will be added to the waitlist.");
    }

    const employee = {
        type: "registration",
        name: name,
        email: email,
        branch: selectedClass.branch,
        trainingClass: selectedClass.name,
        date: formatDisplayDate(selectedClass.date),
        time: selectedClass.time,
        address: selectedClass.address,
        description: selectedClass.description,
        teacher: selectedClass.teacher,
        lunch: selectedClass.lunch,
        capacity: selectedClass.capacity
    };

    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(employee)
    });

    setTimeout(function () {
        window.location.replace("Confirmation.html");
    }, 1500);
}

// ADMIN FUNCTIONS
function addClass() {
    const branch = document.getElementById("adminBranch").value.trim();
    const className = document.getElementById("adminClass").value.trim();
    const date = document.getElementById("adminDate").value.trim();
    const time = document.getElementById("adminTime").value.trim();
    const description = document.getElementById("adminDescription").value.trim();
    const address = document.getElementById("adminAddress").value.trim();
    const teacher = document.getElementById("adminTeacher").value.trim();
    const lunch = document.getElementById("adminLunch").value.trim();
    const capacity = document.getElementById("adminCapacity").value.trim();

    if (branch === "" || className === "" || date === "" || time === "") {
        alert("Please fill out branch, class name, date, and time.");
        return;
    }

    const newClass = {
        type: "class",
        branch: branch,
        name: className,
        date: date,
        time: time,
        description: description,
        address: address,
        teacher: teacher,
        lunch: lunch,
        capacity: capacity
    };

    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(newClass)
    });

    setTimeout(function () {
        alert("Class added. Please see updated Google Sheet");
        clearAdminForm();
        loadAdminClasses();
    }, 1500);
}

async function loadAdminClasses() {
    const existingClassDropdown = document.getElementById("existingClass");

    if (!existingClassDropdown) {
        return;
    }

    try {
        const response = await fetch(SCRIPT_URL);
        allClasses = await response.json();

        existingClassDropdown.innerHTML =
            '<option value="">Select Existing Class</option>';

        for (let i = 0; i < allClasses.length; i++) {
            const option = document.createElement("option");

            option.value = JSON.stringify(allClasses[i]);
            option.textContent =
                allClasses[i].branch + " - " + allClasses[i].name;

            existingClassDropdown.appendChild(option);
        }
    } catch (error) {
        console.error(error);
        alert("Could not load admin classes.");
    }
}

function loadClassForEditing() {
    const existingClassDropdown = document.getElementById("existingClass");

    if (!existingClassDropdown || existingClassDropdown.value === "") {
        return;
    }

    adminSelectedClass = JSON.parse(existingClassDropdown.value);

    document.getElementById("adminBranch").value =
        adminSelectedClass.branch || "";

    document.getElementById("adminClass").value =
        adminSelectedClass.name || "";

    document.getElementById("adminDate").value =
        formatDisplayDate(adminSelectedClass.date);

    document.getElementById("adminTime").value =
        adminSelectedClass.time || "";

    document.getElementById("adminDescription").value =
        adminSelectedClass.description || "";

    document.getElementById("adminAddress").value =
        adminSelectedClass.address || "";

    document.getElementById("adminTeacher").value =
        adminSelectedClass.teacher || "";

    document.getElementById("adminLunch").value =
        adminSelectedClass.lunch || "";

    document.getElementById("adminCapacity").value =
        adminSelectedClass.capacity || "";
}

function updateClass() {
    if (!adminSelectedClass) {
        alert("Please select a class to update.");
        return;
    }

    const updatedClass = {
        type: "updateClass",
        rowNumber: adminSelectedClass.rowNumber,
        branch: document.getElementById("adminBranch").value.trim(),
        name: document.getElementById("adminClass").value.trim(),
        date: document.getElementById("adminDate").value.trim(),
        time: document.getElementById("adminTime").value.trim(),
        description: document.getElementById("adminDescription").value.trim(),
        address: document.getElementById("adminAddress").value.trim(),
        teacher: document.getElementById("adminTeacher").value.trim(),
        lunch: document.getElementById("adminLunch").value.trim(),
        capacity: document.getElementById("adminCapacity").value.trim()
    };

    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(updatedClass)
    });

    setTimeout(function () {
        alert("Class updated.");

        adminSelectedClass = null;
        clearAdminForm();

        const existingClassDropdown = document.getElementById("existingClass");

        if (existingClassDropdown) {
            existingClassDropdown.selectedIndex = 0;
        }

        loadAdminClasses();
    }, 1500);
}

function deleteClass() {
    if (!adminSelectedClass) {
        alert("Please select a class to delete.");
        return;
    }

    const confirmDelete = confirm(
        "Are you sure you want to cancel/delete this class?"
    );

    if (!confirmDelete) {
        return;
    }

    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
            type: "deleteClass",
            rowNumber: adminSelectedClass.rowNumber,
            branch: adminSelectedClass.branch,
            name: adminSelectedClass.name
        })
    });

    setTimeout(function () {
        alert("Class cancelled/deleted.");

        adminSelectedClass = null;
        clearAdminForm();

        const existingClassDropdown = document.getElementById("existingClass");

        if (existingClassDropdown) {
            existingClassDropdown.selectedIndex = 0;
        }

        loadAdminClasses();
    }, 1500);
}

function downloadRoster() {

    if (!adminSelectedClass) {
        alert("Please select a class first.");
        return;
    }

    const sheetName =
        cleanSheetName(
            adminSelectedClass.branch +
            " - " +
            adminSelectedClass.name
        );

    const rosterUrl =
        SCRIPT_URL +
        "?downloadRoster=true&sheetName=" +
        encodeURIComponent(sheetName);

    window.open(rosterUrl, "_blank");
}

function cleanSheetName(name) {
    return name
        .replace(/[\\\/\?\*\[\]\:]/g, "")
        .substring(0, 99);
}

function clearAdminForm() {
    const fields = [
        "adminBranch",
        "adminClass",
        "adminDate",
        "adminTime",
        "adminDescription",
        "adminAddress",
        "adminTeacher",
        "adminLunch",
        "adminCapacity"
    ];

    for (let i = 0; i < fields.length; i++) {
        const field = document.getElementById(fields[i]);

        if (field) {
            field.value = "";
        }
    }
}

// HELPERS
function formatDisplayDate(dateString) {
    const date = new Date(dateString);

    if (isNaN(date)) {
        return dateString || "";
    }

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();

    return month + "/" + day + "/" + year;
}

function searchClasses() {

    const searchTerm =
        document.getElementById("classSearch")
        .value
        .toLowerCase()
        .trim();

    const branchTitles =
        document.querySelectorAll(".branch-title");

    branchTitles.forEach(function(title) {

        const branchName =
            title.textContent.toLowerCase();

        const branchGrid =
            title.nextElementSibling;

        if (
            searchTerm === "" ||
            branchName.includes(searchTerm)
        ) {
            title.style.display = "";
            branchGrid.style.display = "grid";
        }
        else {
            title.style.display = "none";
            branchGrid.style.display = "none";
        }

    });
}

function populateBranchFilter() {
    const branchFilter = document.getElementById("branchFilter");

    if (!branchFilter) {
        return;
    }

    const branches = [
        ...new Set(
            allClasses
                .map(c => (c.branch || "").trim())
                .filter(Boolean)
        )
    ].sort();

    branchFilter.innerHTML =
        '<option value="">All Branches</option>';

    for (let i = 0; i < branches.length; i++) {
        const option = document.createElement("option");

        option.value = branches[i];
        option.textContent = branches[i];

        branchFilter.appendChild(option);
    }
}

function filterByBranch() {
    const selectedBranch =
        document.getElementById("branchFilter").value;

    const branchTitles =
        document.querySelectorAll(".branch-title");

    branchTitles.forEach(function(title) {
        const branchName = title.textContent.trim();
        const branchGrid = title.nextElementSibling;

        if (
            selectedBranch === "" ||
            branchName === selectedBranch
        ) {
            title.style.display = "";
            branchGrid.style.display = "grid";
        } else {
            title.style.display = "none";
            branchGrid.style.display = "none";
        }
    });
}

function startPage() {
    loadClasses();
    loadAdminClasses();
}


if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startPage);
} else {
    startPage();
}