//load google script file
const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbz5ZuLfoXWVE8hoMukorze8-iWlFEE-IYh_UXXrkJE-HNSxuteB5q0wrBZkOesPnOnAWg/exec";

let allClasses = [];
let selectedClassForRegistration = null;
let adminSelectedClass = null;
let emailMessages = {};
let currentEmailMessageKey = "confirmation";

// class catalog shown on registration page 
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

                    ${Number(classItem.seatsLeft) <= 0 ? `<div class="waitlist-badge">Full • Waitlist: ${Number(classItem.waitlistCount) || 0}</div>` : ""}

                    <p>${classItem.description}</p>

                    <p><strong>Date:</strong> ${formatDisplayDate(classItem.date)}</p>
                    <p><strong>Time:</strong> ${classItem.time}</p>
                    <p><strong>Instructor:</strong> ${classItem.teacher}</p>

                    <p class="${String(classItem.lunch || "").toLowerCase() === 'yes' ? 'lunch-provided' : 'no-lunch'}">
                        ${String(classItem.lunch || "").toLowerCase() === 'yes' ? '🍕 Lunch Provided' : '🚫 No Lunch Provided'}
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

//pulls up branch class info in block
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

//close class detail block after clicking "X"
function closeRegistrationModal() {
    document.getElementById("registrationModal").style.display = "none";

    selectedClassForRegistration = null;

    document.getElementById("name").value = "";
    document.getElementById("email").value = "";
    document.getElementById("confirmEmail").value = "";
}

//user fills in personal informatin to register for selected class
function registerEmployee() {
    if (!selectedClassForRegistration) {
        alert("Please select a class.");
        return;
    }

    const selectedClass = selectedClassForRegistration;

    
    //user enters inputs 
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const confirmEmail = document.getElementById("confirmEmail").value.trim();
    const spotsRequested =  Number(document.getElementById("spotsRequested").value) || 1;

    //makes sure form isnt submitted with missing info
    if (name === ""){
        alert("Please enter your name.");
        return;
    }

    if (email === ""){
        alert("Please enter your email");
        return;
    }
    
    
  if (email !== confirmEmail){
      alert("Emails don not match. Please try again");
      return;
  }
    
    
    if (
    Number(selectedClass.seatsLeft) > 0 &&
    spotsRequested > Number(selectedClass.seatsLeft)
) {
    alert("There are only " + selectedClass.seatsLeft + " seats left.");
    return;
}

    if (Number(selectedClass.seatsLeft) <= 0) {
        alert("This class is full. You will be added to the waitlist.");
    }

    //stores employee information to be used in other functions 
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
        capacity: selectedClass.capacity,
        spotsRequested: spotsRequested,
    };

    
    //stores infoarmtion on computer using the script as a "backend"
    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(employee)
    });

    //loads confirmation page after 1.5 seconds 
    setTimeout(function () {
        window.location.replace("Confirmation.html");
    }, 1500);
}

//grabbing features from admin create class page
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

    //makes ure no inputs are left empty
    if (branch === "" || className === "" || date === "" || time === "") {
        alert("Please fill out branch, class name, date, and time.");
        return;
    }

    //groups together class info input by the admin throug hadmin page 
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

    //grabbing from google script and pushing info to the google sheet 
    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(newClass)
    });

//clear form once class is added and is on google sheet
    setTimeout(function () {
        alert("Class added. Please see updated Google Sheet");
        clearAdminForm();
        loadAdminClasses();
        loadSheetNames();
    }, 1500);
}

//loads existing classes on admin page to pick from to edit/delte/download
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

//pull classes from google sheet using scripts to show for editing
function loadClassForEditing() {
    const existingClassDropdown = document.getElementById("existingClass");
    const editFieldsContainer = document.getElementById("editFieldsContainer");

    //when there are no classes existing
    if (!existingClassDropdown || existingClassDropdown.value === "") {
        adminSelectedClass = null;

        if (editFieldsContainer) {
            editFieldsContainer.style.display = "none";
        }

        return;
    }

    adminSelectedClass = JSON.parse(existingClassDropdown.value);

    document.getElementById("editBranch").value =
        adminSelectedClass.branch || "";

    document.getElementById("editClass").value =
        adminSelectedClass.name || "";

    document.getElementById("editDate").value =
        formatDisplayDate(adminSelectedClass.date);

    document.getElementById("editTime").value =
        adminSelectedClass.time || "";

    document.getElementById("editDescription").value =
        adminSelectedClass.description || "";

    document.getElementById("editAddress").value =
        adminSelectedClass.address || "";

    document.getElementById("editTeacher").value =
        adminSelectedClass.teacher || "";

    document.getElementById("editLunch").value =
        adminSelectedClass.lunch || "";

    document.getElementById("editCapacity").value =
        adminSelectedClass.capacity || "";

    if (editFieldsContainer) {
        editFieldsContainer.style.display = "block";
    }

    loadRegistrationsForSelectedClass();
}

//update info on google sheet 
function updateClass() {
    if (!adminSelectedClass) {
        alert("Please select a class to update.");
        return;
    }

    const updatedClass = {
        type: "updateClass",
        rowNumber: adminSelectedClass.rowNumber,
        branch: document.getElementById("editBranch").value.trim(),
        name: document.getElementById("editClass").value.trim(),
        date: document.getElementById("editDate").value.trim(),
        time: document.getElementById("editTime").value.trim(),
        description: document.getElementById("editDescription").value.trim(),
        address: document.getElementById("editAddress").value.trim(),
        teacher: document.getElementById("editTeacher").value.trim(),
        lunch: document.getElementById("editLunch").value.trim(),
        capacity: document.getElementById("editCapacity").value.trim()
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
        clearEditFields();

        const existingClassDropdown = document.getElementById("existingClass");

        if (existingClassDropdown) {
            existingClassDropdown.selectedIndex = 0;
        }

        loadAdminClasses();
        loadSheetNames();

        const sheetSelect = document.getElementById("registrationsSheetSelect");

        if (sheetSelect) {
            loadSheetTable(sheetSelect.value);
        }
    }, 1500);
}

//delte a class. remove from class options and google sheet. removes created class tab
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

    //remove the class from the dropdown right away instead of waiting on a refresh
    const existingClassDropdown = document.getElementById("existingClass");

    if (existingClassDropdown && existingClassDropdown.selectedIndex > 0) {
        existingClassDropdown.options[existingClassDropdown.selectedIndex].remove();
        existingClassDropdown.selectedIndex = 0;
    }

    allClasses = allClasses.filter(function (c) {
        return !(
            c.branch === adminSelectedClass.branch &&
            c.name === adminSelectedClass.name
        );
    });

    adminSelectedClass = null;
    clearEditFields();

    //re-sync with the sheet a moment later in case anything else changed
    setTimeout(function () {
        alert("Class cancelled/deleted.");
        loadAdminClasses();
        loadSheetNames();
    }, 1500);
}


//download CSV file 
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

//clears admin inputs after functions are run 
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

//clears and hides the edit-existing-class fields after update/delete
function clearEditFields() {
    const fields = [
        "editBranch",
        "editClass",
        "editDate",
        "editTime",
        "editDescription",
        "editAddress",
        "editTeacher",
        "editLunch",
        "editCapacity"
    ];

    for (let i = 0; i < fields.length; i++) {
        const field = document.getElementById(fields[i]);

        if (field) {
            field.value = "";
        }
    }

    const editFieldsContainer = document.getElementById("editFieldsContainer");

    if (editFieldsContainer) {
        editFieldsContainer.style.display = "none";
    }
}



//displays the date in a mm/dd/year format
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

//allow search by branch on registration page
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


//filters branches by the selected choice from dropdown 
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

//pull up classess only from selected branch
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


//loads classes on registration page and form on the admin page
function startPage() {
    loadClasses();
    loadAdminClasses();
    loadSheetNames();
    loadEmailMessages();
}

//loads the current (or default) custom email messages, then displays
//whichever one is selected in the dropdown
async function loadEmailMessages() {
    const select = document.getElementById("emailMessageSelect");

    if (!select) {
        return;
    }

    try {
        const response = await fetch(SCRIPT_URL + "?getEmailMessages=true");
        emailMessages = await response.json();

        currentEmailMessageKey = select.value || "confirmation";
        displayCurrentEmailMessage();
    } catch (error) {
        console.error(error);
    }
}

//shows the message text for whichever email is currently selected
function displayCurrentEmailMessage() {
    const textArea = document.getElementById("emailMessageText");

    if (!textArea) {
        return;
    }

    textArea.value = emailMessages[currentEmailMessageKey] || "";
}

//saves whatever was typed for the email currently being edited into local
//state, then switches the textarea to show the newly selected email
function switchEmailMessage(newKey) {
    const textArea = document.getElementById("emailMessageText");

    if (textArea) {
        emailMessages[currentEmailMessageKey] = textArea.value;
    }

    currentEmailMessageKey = newKey;
    displayCurrentEmailMessage();
}

//saves the custom email messages typed into the admin page
function saveEmailMessages() {
    const textArea = document.getElementById("emailMessageText");

    if (textArea) {
        emailMessages[currentEmailMessageKey] = textArea.value;
    }

    const updatedMessages = {
        type: "updateEmailMessages",
        confirmation: emailMessages.confirmation || "",
        waitlist: emailMessages.waitlist || "",
        removal: emailMessages.removal || "",
        cancellation: emailMessages.cancellation || "",
        update: emailMessages.update || ""
    };

    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(updatedMessages)
    });

    setTimeout(function () {
        alert("Email messages saved.");
    }, 1000);
}

//populates the "View" dropdown on the admin page with every sheet in the
//spreadsheet (Master Registrations, Waitlist, Cancelled Classes, per-class
//rosters, etc.) and loads Master Registrations into the table by default
async function loadSheetNames() {
    const select = document.getElementById("registrationsSheetSelect");

    if (!select) {
        return;
    }

    try {
        const response = await fetch(SCRIPT_URL + "?getSheetNames=true");
        const names = await response.json();

        const orderedNames = [
            "Master Registrations",
            ...names.filter(function (name) {
                return name !== "Master Registrations";
            })
        ];

        select.innerHTML = "";

        for (let i = 0; i < orderedNames.length; i++) {
            const option = document.createElement("option");

            option.value = orderedNames[i];
            option.textContent = orderedNames[i];

            select.appendChild(option);
        }

        select.value = "Master Registrations";
        loadSheetTable("Master Registrations");
    } catch (error) {
        console.error(error);
    }
}

//fetches a sheet's data from the spreadsheet and renders it as a table
async function loadSheetTable(sheetName) {
    const wrapper = document.getElementById("registrationsTableWrapper");

    if (!wrapper) {
        return;
    }

    wrapper.innerHTML = "<p>Loading registrations...</p>";

    try {
        const response = await fetch(
            SCRIPT_URL +
            "?getSheetData=true&sheetName=" +
            encodeURIComponent(sheetName)
        );

        const data = await response.json();

        if (!data.headers || data.headers.length === 0) {
            wrapper.innerHTML = "<p>No data found for this sheet.</p>";
            return;
        }

        let html = '<table class="sheet-table"><thead><tr>';

        for (let i = 0; i < data.headers.length; i++) {
            html += "<th>" + data.headers[i] + "</th>";
        }

        html += "</tr></thead><tbody>";

        if (data.rows.length === 0) {
            html +=
                '<tr><td colspan="' + data.headers.length + '">No rows yet.</td></tr>';
        }

        for (let r = 0; r < data.rows.length; r++) {
            html += "<tr>";

            for (let c = 0; c < data.rows[r].length; c++) {
                html += "<td>" + data.rows[r][c] + "</td>";
            }

            html += "</tr>";
        }

        html += "</tbody></table>";

        wrapper.innerHTML = html;
    } catch (error) {
        console.error(error);
        wrapper.innerHTML = "<p>Could not load registrations.</p>";
    }
}

//downloads the currently viewed sheet as a real .xlsx Excel file
async function exportSheetToExcel() {
    const select = document.getElementById("registrationsSheetSelect");

    if (!select || !select.value) {
        alert("Please select a sheet to export.");
        return;
    }

    try {
        const response = await fetch(
            SCRIPT_URL +
            "?exportExcel=true&sheetName=" +
            encodeURIComponent(select.value)
        );

        const data = await response.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        const byteCharacters = atob(data.base64);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);

        const blob = new Blob([byteArray], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });

        const downloadUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error(error);
        alert("Could not export to Excel. Check the browser console for details.");
    }
}

//loading page while classes load onto screen
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startPage);
} else {
    startPage();
}

//refresh every 30 seconds
setInterval(function () {
    if (document.getElementById("classCatalog")) {
        loadClasses();
    }

    if (document.getElementById("existingClass") && !adminSelectedClass) {
        loadAdminClasses();
    }

    const sheetSelect = document.getElementById("registrationsSheetSelect");

    if (sheetSelect) {
        loadSheetTable(sheetSelect.value);
    }
}, 30000);

async function loadRegistrationsForSelectedClass() {
    const dropdown =
        document.getElementById("registrationToRemove");

    if (!dropdown || !adminSelectedClass) {
        return;
    }

    dropdown.innerHTML =
        '<option value="">Loading registrations...</option>';

    const url =
        SCRIPT_URL +
        "?getRegistrations=true&branch=" +
        encodeURIComponent(adminSelectedClass.branch) +
        "&className=" +
        encodeURIComponent(adminSelectedClass.name);

    const response =
        await fetch(url);

    const registrations =
        await response.json();

    dropdown.innerHTML =
        '<option value="">Select Registration</option>';

    for (let i = 0; i < registrations.length; i++) {
        const option =
            document.createElement("option");

        option.value =
            registrations[i].cancelId;

        option.textContent =
            registrations[i].name + " - " + registrations[i].email;

        dropdown.appendChild(option);
    }
}

//on admin page to select speciic registration and remove it from google sheet
function removeRegistration() {
    const dropdown =
        document.getElementById("registrationToRemove");

    if (!dropdown || dropdown.value === "") {
        alert("Please select a registration to remove.");
        return;
    }

    const cancelId = dropdown.value;

    const confirmRemove =
        confirm("Remove this person from the class?");

    if (!confirmRemove) {
        return;
    }

    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
            type: "removeRegistration",
            cancelId: cancelId
        })
    });

    // Remove registration from the dropdown as an option 
    dropdown.options[dropdown.selectedIndex].remove();

    setTimeout(function () {
        alert("Registration removed. Please check the Google Sheet.");

        loadRegistrationsForSelectedClass();
        loadAdminClasses();

    }, 2500);
}